import React, { useEffect, useState, useCallback } from "react";
import { Stack } from "@fluentui/react";
import {
    Text,
    Spinner,
    Card,
    Button
} from "@fluentui/react-components";
import { ContextProps, PageProps } from "../../App";
import { callGetItem, getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { useLocation, useParams } from "react-router-dom";
import "../../styles.scss";
import { useTranslation } from "react-i18next";
import { DataSharingItemDefinition } from "./DataSharingItemModel";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { NotificationType } from "@ms-fabric/workload-client";
import { OneLakeItemExplorerComponent } from "../../samples/views/SampleOneLakeItemExplorer/SampleOneLakeItemExplorer";

export function DataSharingItemEditor(props: PageProps) {
    const pageContext = useParams<ContextProps>();
    const { pathname } = useLocation();
    const { t } = useTranslation();
    const { workloadClient } = props;
    const [isUnsaved, setIsUnsaved] = useState<boolean>(true);
    const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const [editorItem, setEditorItem] = useState<ItemWithDefinition<DataSharingItemDefinition>>(undefined);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(Date.now());

    // Helper function to update item definition immutably
    const updateItemDefinition = useCallback((updates: Partial<DataSharingItemDefinition>) => {
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

    async function SaveItem(definition?: DataSharingItemDefinition) {
        const successResult = await saveItemDefinition<DataSharingItemDefinition>(
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
            await callOpenSettings(workloadClient, item, 'About');
        }
    }

    async function syncShares(definition?: DataSharingItemDefinition) {
        setIsSyncing(true);
        try {
            // Simulate syncing shares - in real implementation, this would:
            // 1. Check status of created shares
            // 2. Look for new received shares
            // 3. Update share statuses
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update last sync date
            updateItemDefinition({
                lastSyncDate: new Date()
            });
            SaveItem();

            callNotificationOpen(
                workloadClient,
                "Sync Complete",
                "Successfully synchronized data shares.",
                NotificationType.Success,
                undefined
            );

        } catch (error) {
            callNotificationOpen(
                workloadClient,
                "Sync Failed",
                "Failed to synchronize data shares. Please try again.",
                NotificationType.Error,
                undefined
            );
        } finally {
            refreshOneLakeExplorer();
            setIsSyncing(false);
        }
    }

    async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
        setIsLoadingData(true);
        let item: ItemWithDefinition<DataSharingItemDefinition> = undefined;

        if (pageContext.itemObjectId) {
            try {
                item = await getWorkloadItem<DataSharingItemDefinition>(
                    workloadClient,
                    pageContext.itemObjectId
                );

                if (!item.definition) {
                    item = {
                        ...item,
                        definition: {
                            title: "",
                            description: "",
                            createdShares: [],
                            receivedShares: [],
                            configuration: {
                                allowExternalSharing: true,
                                autoAcceptShares: false,
                                defaultShareExpiration: 30,
                                allowedDomains: [],
                                sharePrefixNaming: "DataShare_"
                            }
                        }
                    };
                }
                setEditorItem(item);
            } catch (error) {
                setEditorItem(undefined);
            }
        } else {
            console.log(`non-editor context. Current Path: ${pathname}`);
        }
        setIsUnsaved(false);
        setIsLoadingData(false);
    }

    // Show loading state
    if (isLoadingData) {
        return <ItemEditorLoadingProgressBar message="Loading Data Sharing item..." />;
    }

    // Show basic message if no item
    if (!editorItem) {
        return (
            <div className="item-editor-container">
                <Text size={600} weight="semibold">Data Sharing Item</Text>
                <Text>Item not found or failed to load.</Text>
            </div>
        );
    }

    const createdShares = editorItem.definition.createdShares || [];
    const receivedShares = editorItem.definition.receivedShares || [];

    return (
        <div className="item-editor-container">
            {/* Simple ribbon */}
            <div className="ribbon-container">
                <Stack horizontal tokens={{ childrenGap: 16 }} verticalAlign="center" style={{ padding: '8px 16px', borderBottom: '1px solid #ccc' }}>
                    <Button
                        appearance="primary"
                        disabled={!isUnsaved}
                        onClick={() => SaveItem()}
                    >
                        Save
                    </Button>
                    <Button
                        appearance="secondary"
                        disabled={isSyncing}
                        onClick={() => syncShares()}
                    >
                        {isSyncing ? "Syncing..." : "Sync Shares"}
                    </Button>
                    <Button
                        appearance="subtle"
                        onClick={openSettings}
                    >
                        Settings
                    </Button>
                    <Text size={400} weight="semibold" style={{ marginLeft: '16px' }}>
                        Data Sharing Management
                    </Text>
                    {isSyncing && <Spinner size="small" />}
                </Stack>
            </div>
            
            <div className="item-editor-content">
                <Stack horizontal tokens={{ childrenGap: 20 }} style={{ padding: '20px', height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
                    {/* Left side - OneLake Item Explorer */}
                    <Stack.Item style={{ width: '300px', minWidth: '200px', maxWidth: '300px', height: '100%', overflow: 'hidden' }}>
                        <Stack tokens={{ childrenGap: 16 }} style={{ height: '100%' }}>
                            <Text size={500} weight="semibold">OneLake Explorer</Text>
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
                                    allowItemSelection: false, // Don't allow changing the selected item
                                    refreshTrigger: refreshTrigger
                                }}
                            />
                        </Stack>
                    </Stack.Item>

                    {/* Right side - Data Shares Overview */}
                    <Stack.Item grow style={{ minWidth: '800px', height: '100%', overflow: 'hidden' }}>
                        <Stack tokens={{ childrenGap: 20 }} style={{ height: '100%' }}>
                            <Stack horizontal horizontalAlign="space-between" verticalAlign="center" style={{ flexShrink: 0 }}>
                                <Stack>
                                    <Text size={600} weight="semibold">Data Sharing Management</Text>
                                    <Text size={300}>
                                        Manage external data shares and accept shared data from other organizations.
                                        Last sync: {editorItem.definition.lastSyncDate ?
                                            new Date(editorItem.definition.lastSyncDate).toLocaleString() : 'Never'}
                                    </Text>
                                </Stack>
                            </Stack>

                            {/* Created and Received Shares in simple cards */}
                            <Stack.Item grow style={{ overflow: 'auto', minHeight: 0 }}>
                                <Stack tokens={{ childrenGap: 20 }} style={{ height: '100%' }}>
                                    {/* Created Shares Section */}
                                    <Stack.Item style={{ flex: '1 1 50%', minHeight: '300px' }}>
                                        <Card style={{ height: '100%', padding: '16px' }}>
                                            <Stack tokens={{ childrenGap: 16 }} style={{ height: '100%' }}>
                                                <Text size={500} weight="semibold">Created Shares ({createdShares.length})</Text>
                                                {createdShares.length === 0 ? (
                                                    <Stack style={{ padding: '40px', textAlign: 'center' }}>
                                                        <Text size={500} weight="semibold">No shares created yet</Text>
                                                        <Text size={300} style={{ marginTop: '8px' }}>
                                                            Click "Create Share" to share data with external organizations.
                                                        </Text>
                                                        <Button appearance="primary" style={{ marginTop: '16px' }}>
                                                            Create Share
                                                        </Button>
                                                    </Stack>
                                                ) : (
                                                    <Text>Created shares will appear here</Text>
                                                )}
                                            </Stack>
                                        </Card>
                                    </Stack.Item>

                                    {/* Received Shares Section */}
                                    <Stack.Item style={{ flex: '1 1 50%', minHeight: '300px' }}>
                                        <Card style={{ height: '100%', padding: '16px' }}>
                                            <Stack tokens={{ childrenGap: 16 }} style={{ height: '100%' }}>
                                                <Text size={500} weight="semibold">Received Shares ({receivedShares.length})</Text>
                                                {receivedShares.length === 0 ? (
                                                    <Stack style={{ padding: '40px', textAlign: 'center' }}>
                                                        <Text size={500} weight="semibold">No received shares</Text>
                                                        <Text size={300} style={{ marginTop: '8px' }}>
                                                            Shares from external organizations will appear here.
                                                        </Text>
                                                    </Stack>
                                                ) : (
                                                    <Text>Received shares will appear here</Text>
                                                )}
                                            </Stack>
                                        </Card>
                                    </Stack.Item>
                                </Stack>
                            </Stack.Item>
                        </Stack>
                    </Stack.Item>
                </Stack>
            </div>
        </div>
    );
}
