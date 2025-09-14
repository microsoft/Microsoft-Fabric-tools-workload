import { Stack } from "@fluentui/react";
import {
    TabValue,
    Button,
    DataGrid,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridBody,
    DataGridRow,
    DataGridCell,
    TableCellLayout,
    TableColumnDefinition,
    createTableColumn,
    Badge,
    Spinner,
    Text,
    Card,
    Checkbox
} from "@fluentui/react-components";
import React, { useEffect, useState, useCallback } from "react";
import { ContextProps, PageProps } from "../../App";
import { IcebergCatalogItemEditorRibbon } from "./IcebergCatalogItemEditorRibbon";
import { callGetItem, getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { useLocation, useParams } from "react-router-dom";
import "../../styles.scss";
import { useTranslation } from "react-i18next";
import { IcebergCatalogItemDefinition, ShortcutInfo } from "./IcebergCatalogItemModel";
import { IcebergCatalogItemEmpty } from "./IcebergCatalogItemEditorEmpty";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { NotificationType } from "@ms-fabric/workload-client";
import { Delete24Regular, CheckmarkCircle24Regular, ErrorCircle24Regular, Clock24Regular } from "@fluentui/react-icons";
import { IcebergShortcutController } from "./IcebergShortcutController";
import { TableInfo } from "./IcebergRestApiController";
import { OneLakeItemExplorerComponent } from "../../samples/views/SampleOneLakeItemExplorer/SampleOneLakeItemExplorer";

export function IcebergCatalogItemEditor(props: PageProps) {
    const pageContext = useParams<ContextProps>();
    const { pathname } = useLocation();
    const { t } = useTranslation();
    const { workloadClient } = props;
    const [isUnsaved, setIsUnsaved] = useState<boolean>(true);
    const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [editorItem, setEditorItem] = useState<ItemWithDefinition<IcebergCatalogItemDefinition>>(undefined);
    const [selectedView, setSelectedView] = useState<TabValue>("home");
    const [selectedShortcuts, setSelectedShortcuts] = useState<Set<string>>(new Set());
    const [refreshTrigger, setRefreshTrigger] = useState<number>(Date.now());

    // Initialize shortcut controller - will be updated when configuration changes
    const [shortcutController, setShortcutController] = useState<IcebergShortcutController>(
        () => new IcebergShortcutController(workloadClient)
    );

    // Update shortcut controller when iceberg config changes
    useEffect(() => {
        if (editorItem?.definition?.icebergConfig) {
            setShortcutController(new IcebergShortcutController(workloadClient, editorItem.definition.icebergConfig));
        }
    }, [editorItem?.definition?.icebergConfig, workloadClient]);

    // Helper function to update item definition immutably
    const updateItemDefinition = useCallback((updates: Partial<IcebergCatalogItemDefinition>) => {
        setEditorItem(prevItem => {
            if (!prevItem) return prevItem;

            return {
                ...prevItem,
                definition: {
                    ...prevItem.definition,
                    ...updates
                }
            };
        });
        setIsUnsaved(true);
    }, []);

    useEffect(() => {
        loadDataFromUrl(pageContext, pathname);
    }, [pageContext, pathname]);

    const refreshOneLakeExplorer = useCallback(() => {
        setRefreshTrigger(Date.now());
    }, []);

    async function SaveItem(definition?: IcebergCatalogItemDefinition) {
        const successResult = await saveItemDefinition<IcebergCatalogItemDefinition>(
            workloadClient,
            editorItem.id,
            definition || editorItem.definition
        );
        setIsUnsaved(!successResult);
        callNotificationOpen(
            workloadClient,
            t("ItemEditor_Saved_Notification_Title"),
            t("ItemEditor_Saved_Notification_Text", { itemName: editorItem.displayName }),
            undefined,
            undefined
        );
    }

    async function openSettings() {
        if (editorItem) {
            const item = await callGetItem(workloadClient, editorItem.id);
            await callOpenSettings(workloadClient, item.item, 'About');
        }
    }

    async function syncShortcuts(definition?: IcebergCatalogItemDefinition) {
        const config = definition || editorItem.definition;

        if (!config?.icebergConfig || !config?.fabricConfig) {
            callNotificationOpen(
                workloadClient,
                "Configuration Required",
                "Please configure Iceberg Catalog settings first.",
                NotificationType.Error,
                undefined
            );
            return;
        }

        setIsSyncing(true);
        try {
            // Get all namespaces from the Iceberg catalog
            const icebergTables = await shortcutController.getIcebergApi().getTablesInNamespace(config.icebergConfig.namespace);
            const existingShortcuts = editorItem.definition.shortcuts || [];
            var newShortcuts: ShortcutInfo[] = [];

            if (icebergTables) {
                // Create all new shortcuts
                newShortcuts = await Promise.all(
                    icebergTables.map((table: TableInfo) => checkIcebergTable(config, table))
                );
                //delete missing shortcuts
                const missingShortcuts = existingShortcuts.filter(s => !icebergTables.find(
                    (t: TableInfo) =>
                    t.namespace === s.icebergCatalog.namespace &&
                    t.name === s.icebergCatalog.tableName));
                await Promise.all(missingShortcuts.map(s => shortcutController.deleteShortcut(s)));
            }
            
            // Update item definition
            updateItemDefinition({
                shortcuts: newShortcuts,
                lastSyncDate: new Date()
            });
            SaveItem();

            callNotificationOpen(
                workloadClient,
                "Sync Complete",
                `Successfully synchronized ${newShortcuts.length} shortcuts from Iceberg Catalog.`,
                NotificationType.Success,
                undefined
            );

        } catch (error) {
            callNotificationOpen(
                workloadClient,
                "Sync Failed",
                "Failed to synchronize shortcuts. Please check your configuration.",
                NotificationType.Error,
                undefined
            );
        } finally {
            refreshOneLakeExplorer();
            setIsSyncing(false);
        }
    }

    async function checkIcebergTable(config: IcebergCatalogItemDefinition, table: TableInfo): Promise<ShortcutInfo> {
        const tableName = table.name;
        const existingShortcut = config.shortcuts?.find(s => s.icebergCatalog.tableName === tableName
            && s.icebergCatalog.namespace === table.namespace
        );

        if (!existingShortcut) {
            const shortcutInfo = shortcutController.convertTable(table);         
            await shortcutController.createIcebergShortcut(editorItem, config, shortcutInfo);
            return shortcutInfo;
        }
        return { ...existingShortcut, lastSyncDate: new Date(), status: 'active' };
    }

    async function deleteSelectedShortcuts() {
        if (selectedShortcuts.size === 0) return;

        const remainingShortcuts = (editorItem.definition.shortcuts || []).filter(
            shortcut => !selectedShortcuts.has(shortcut.id)
        );

        updateItemDefinition({
            shortcuts: remainingShortcuts
        });

        setSelectedShortcuts(new Set());

        // Refresh OneLake explorer to reflect deletions
        refreshOneLakeExplorer();

        callNotificationOpen(
            workloadClient,
            "Shortcuts Deleted",
            `Deleted ${selectedShortcuts.size} shortcuts.`,
            NotificationType.Success,
            undefined
        );
    }

    async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
        setIsLoadingData(true);
        let item: ItemWithDefinition<IcebergCatalogItemDefinition> = undefined;

        if (pageContext.itemObjectId) {
            try {
                item = await getWorkloadItem<IcebergCatalogItemDefinition>(
                    workloadClient,
                    pageContext.itemObjectId
                );

                if (!item.definition) {
                    item = {
                        ...item,
                        definition: {
                            icebergConfig: undefined,
                            shortcuts: [],
                            lastSyncDate: undefined
                        }
                    };
                }
                setEditorItem(item);
                setSelectedView("home");
            } catch (error) {
                setEditorItem(undefined);
            }
        } else {
            console.log(`non-editor context. Current Path: ${pathname}`);
        }
        setIsUnsaved(false);
        setIsLoadingData(false);
    }

    const onFinishEmpty = useCallback((definition: IcebergCatalogItemDefinition) => {
        // Update the editor item with the new definition
        setEditorItem(prevItem => ({
            ...prevItem,
            definition: definition
        }));
        
        // Save the item with the new definition
        SaveItem(definition);
        
        // Sync shortcuts with the new definition
        syncShortcuts(definition);
        
        // Switch to home view
        setSelectedView("home");
    }, [syncShortcuts]);

    // Show loading state
    if (isLoadingData) {
        return <ItemEditorLoadingProgressBar message="Loading Iceberg Catalog item..." />;
    }

    // Show empty state if no configuration
    if (!editorItem?.definition?.icebergConfig) {
        return (
            <IcebergCatalogItemEmpty
                workloadClient={workloadClient}
                onFinishEmpty={onFinishEmpty}
            />
        );
    }

    const shortcuts = editorItem.definition.shortcuts || [];

    // Define columns for the shortcuts table
    const columns: TableColumnDefinition<ShortcutInfo>[] = [
        createTableColumn<ShortcutInfo>({
            columnId: "select",
            renderHeaderCell: () => (
                <Checkbox
                    checked={selectedShortcuts.size === shortcuts.length && shortcuts.length > 0}
                    onChange={(_, data) => {
                        if (data.checked) {
                            setSelectedShortcuts(new Set(shortcuts.map(s => s.id)));
                        } else {
                            setSelectedShortcuts(new Set());
                        }
                    }}
                />
            ),
            renderCell: (item) => (
                <Checkbox
                    checked={selectedShortcuts.has(item.id)}
                    onChange={(_, data) => {
                        const newSelected = new Set(selectedShortcuts);
                        if (data.checked) {
                            newSelected.add(item.id);
                        } else {
                            newSelected.delete(item.id);
                        }
                        setSelectedShortcuts(newSelected);
                    }}
                />
            ),
        }),
        createTableColumn<ShortcutInfo>({
            columnId: "name",
            renderHeaderCell: () => "Shortcut Name",
            renderCell: (item) => (
                <TableCellLayout>
                    <Text weight="semibold">{item.icebergCatalog.tableName}</Text>
                </TableCellLayout>
            ),
        }),
        createTableColumn<ShortcutInfo>({
            columnId: "table",
            renderHeaderCell: () => "Iceberg Table",
            renderCell: (item) => (
                <TableCellLayout>
                    {`${item.icebergCatalog.namespace}.${item.icebergCatalog.tableName}`}
                </TableCellLayout>
            ),
        }),
        createTableColumn<ShortcutInfo>({
            columnId: "format",
            renderHeaderCell: () => "Format",
            renderCell: (item) => (
                <TableCellLayout>
                    <Badge appearance="outline">{item.icebergCatalog.fileFormat}</Badge>
                </TableCellLayout>
            ),
        }),
        createTableColumn<ShortcutInfo>({
            columnId: "status",
            renderHeaderCell: () => "Status",
            renderCell: (item) => (
                <TableCellLayout>
                    <Badge
                        appearance={item.status === 'active' ? 'filled' : item.status === 'failed' ? 'ghost' : 'outline'}
                        color={item.status === 'active' ? 'brand' : item.status === 'failed' ? 'danger' : 'warning'}
                        icon={
                            item.status === 'active' ? <CheckmarkCircle24Regular /> :
                                item.status === 'failed' ? <ErrorCircle24Regular /> :
                                    <Clock24Regular />
                        }
                    >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Badge>
                </TableCellLayout>
            ),
        }),
        createTableColumn<ShortcutInfo>({
            columnId: "created",
            renderHeaderCell: () => "Created",
            renderCell: (item) => (
                <TableCellLayout>
                    {new Date(item.createdDate).toLocaleDateString()}
                </TableCellLayout>
            ),
        }),
        createTableColumn<ShortcutInfo>({
            columnId: "lastSync",
            renderHeaderCell: () => "Last Sync",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.lastSyncDate ? new Date(item.lastSyncDate).toLocaleDateString() : 'Never'}
                </TableCellLayout>
            ),
        }),
    ];

    return (
        <div className="item-editor-container">
            <IcebergCatalogItemEditorRibbon
                workloadClient={workloadClient}
                isRibbonDisabled={selectedView == "empty"}
                isSaveButtonEnabled={isUnsaved}
                saveItemCallback={SaveItem}
                openSettingsCallback={openSettings}
                syncShortcutsCallback={syncShortcuts}
                isLoading={isSyncing}
            />
            <div className="item-editor-content">
                <Stack horizontal tokens={{ childrenGap: 20 }} style={{ padding: '20px', height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
                    {/* Left side - OneLake Item Explorer */}
                    <Stack.Item style={{ width: '300px', minWidth: '200px', maxWidth: '300px', height: '100%', overflow: 'hidden' }}>
                        <Stack tokens={{ childrenGap: 16 }} style={{ height: '100%' }}>
                            <OneLakeItemExplorerComponent
                                workloadClient={workloadClient}
                                onFileSelected={async () => { }}
                                onTableSelected={async () => { }}
                                onItemChanged={async () => { }}
                                config={{
                                    initialItem: {
                                        ...editorItem
                                    },
                                    allowedItemTypes: [], // Allow all item types
                                    allowItemSelection: true,
                                    refreshTrigger: refreshTrigger
                                }}
                            />
                        </Stack>
                    </Stack.Item>

                    {/* Right side - Iceberg Catalog Shortcuts */}
                    <Stack.Item grow style={{ minWidth: '600px', height: '100%', overflow: 'hidden' }}>
                        <Stack tokens={{ childrenGap: 20 }} style={{ height: '100%' }}>
                            <Stack horizontal horizontalAlign="space-between" verticalAlign="center" style={{ flexShrink: 0 }}>
                                <Stack>
                                    <Text size={600} weight="semibold">Iceberg Catalog Shortcuts</Text>
                                    <Text size={300}>
                                        Manage shortcuts to your Apache Iceberg tables.
                                        Last sync: {editorItem.definition.lastSyncDate ?
                                            new Date(editorItem.definition.lastSyncDate).toLocaleString() : 'Never'}
                                    </Text>
                                </Stack>
                                <Stack horizontal tokens={{ childrenGap: 10 }}>
                                    {selectedShortcuts.size > 0 && (
                                        <Button
                                            appearance="subtle"
                                            icon={<Delete24Regular />}
                                            onClick={deleteSelectedShortcuts}
                                        >
                                            Delete Selected ({selectedShortcuts.size})
                                        </Button>
                                    )}
                                    {isSyncing && <Spinner size="small" />}
                                </Stack>
                            </Stack>

                            <Stack.Item grow style={{ overflow: 'auto', minHeight: 0 }}>
                                {shortcuts.length === 0 ? (
                                    <Card style={{ padding: '40px', textAlign: 'center' }}>
                                        <Text size={500} weight="semibold">No shortcuts created yet</Text>
                                        <Text size={300} style={{ marginTop: '8px', display: 'block' }}>
                                            Click "Sync Shortcuts" to create shortcuts from your Iceberg Catalog tables.
                                        </Text>
                                    </Card>
                                ) : (
                                    <DataGrid
                                        items={shortcuts}
                                        columns={columns}
                                        sortable
                                        getRowId={(item) => item.id}
                                        style={{ height: '100%' }}
                                    >
                                        <DataGridHeader>
                                            <DataGridRow>
                                                {({ renderHeaderCell }) => (
                                                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                                                )}
                                            </DataGridRow>
                                        </DataGridHeader>
                                        <DataGridBody<ShortcutInfo>>
                                            {({ item, rowId }) => (
                                                <DataGridRow<ShortcutInfo> key={rowId}>
                                                    {({ renderCell }) => (
                                                        <DataGridCell>{renderCell(item)}</DataGridCell>
                                                    )}
                                                </DataGridRow>
                                            )}
                                        </DataGridBody>
                                    </DataGrid>
                                )}
                            </Stack.Item>
                        </Stack>
                    </Stack.Item>
                </Stack>
            </div>
        </div>
    );
}
