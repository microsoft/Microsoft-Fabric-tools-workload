import React, { useEffect, useState, useCallback } from "react";
import { Stack } from "@fluentui/react";
import {
    Text,
    TabValue
} from "@fluentui/react-components";
import { ContextProps, PageProps } from "../../App";
import { callGetItem, getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { useLocation, useParams } from "react-router-dom";
import "../../styles.scss";
import { useTranslation } from "react-i18next";
import { ExternalDataShareItemDefinition } from "./ExternalDataShareItemModel";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { OneLakeItemExplorerComponent } from "../../samples/views/SampleOneLakeItemExplorer/SampleOneLakeItemExplorer";
import { ExternalDataShareItemEditorRibbon } from "./ExternalDataShareItemEditorRibbon";
import { CreatedSharesComponent } from "./components/CreatedSharesComponent";
import { ReceivedSharesComponent } from "./components/ReceivedSharesComponent";

export function ExternalDataShareItemEditor(props: PageProps) {
    const pageContext = useParams<ContextProps>();
    const { pathname } = useLocation();
    const { t } = useTranslation();
    const { workloadClient } = props;
    const [isUnsaved, setIsUnsaved] = useState<boolean>(true);
    const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
    const [editorItem, setEditorItem] = useState<ItemWithDefinition<ExternalDataShareItemDefinition>>(undefined);
    const [selectedView, setSelectedView] = useState<TabValue>("home");
    const [refreshTrigger, setRefreshTrigger] = useState<number>(Date.now());

    // Helper function to update item definition immutably
    const updateItemDefinition = useCallback((updates: Partial<ExternalDataShareItemDefinition>) => {
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

    async function SaveItem(definition?: ExternalDataShareItemDefinition) {
        const successResult = await saveItemDefinition<ExternalDataShareItemDefinition>(
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

    async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
        setIsLoadingData(true);
        let item: ItemWithDefinition<ExternalDataShareItemDefinition> = undefined;

        if (pageContext.itemObjectId) {
            try {
                item = await getWorkloadItem<ExternalDataShareItemDefinition>(
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
        setSelectedView("home")
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
        <Stack style={{ height: "100vh" }}>
            <ExternalDataShareItemEditorRibbon
                workloadClient={workloadClient}
                isRibbonDisabled={false}
                isSaveButtonEnabled={isUnsaved}
                saveItemCallback={SaveItem}
                openSettingsCallback={openSettings}
            />
            {["home"].includes(selectedView as string) && (
                <span style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', width: '100%' }}>
                    {/* Data Sharing Management Section */}
                    <Stack horizontal tokens={{ childrenGap: 32 }} style={{ padding: '20px', height: 'calc(100vh - 120px)' }}>
                        {/* Left side - OneLake Item Explorer */}
                        <Stack.Item style={{ maxWidth: '300px', height: '100%', overflow: "hidden" }}>
                            <OneLakeItemExplorerComponent
                                workloadClient={workloadClient}
                                onFileSelected={async () => { }}
                                onTableSelected={async () => { }}
                                onItemChanged={async () => { }}
                                config={{
                                    initialItem: { ...editorItem },
                                    allowedItemTypes: ["Lakehouse"],
                                    allowItemSelection: false,
                                    refreshTrigger: refreshTrigger
                                }}
                            />
                        </Stack.Item>

                        {/* Right side - Data Shares Overview */}
                        <Stack.Item grow style={{ minWidth: '300px', height: '100%' }}>
                                <Stack tokens={{ childrenGap: 20 }} style={{ height: '100%' }}>
                                    <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                                        <Stack>
                                            <Text size={600} weight="semibold">Data Sharing Management</Text>
                                            <Text size={300}>
                                                Manage external data shares and accept shared data from other organizations.
                                                Last sync: {editorItem.definition.lastSyncDate ?
                                                    new Date(editorItem.definition.lastSyncDate).toLocaleString() : 'Never'}
                                            </Text>
                                        </Stack>
                                    </Stack>

                                    {/* Created and Received Shares */}
                                    <Stack.Item grow style={{ overflow: 'auto', minHeight: 0 }}>
                                        <Stack tokens={{ childrenGap: 20 }} style={{ height: '100%' }}>
                                            {/* Created Shares Section */}
                                            <Stack.Item style={{ flex: '1 1 50%', minHeight: '250px' }}>
                                                <CreatedSharesComponent
                                                    createdShares={createdShares}
                                                    editorItem={editorItem}
                                                    updateItemDefinition={updateItemDefinition}
                                                    workloadClient={workloadClient}
                                                    refreshOneLakeExplorer={refreshOneLakeExplorer}
                                                />
                                            </Stack.Item>

                                            {/* Received Shares Section */}
                                            <Stack.Item style={{ flex: '1 1 50%', minHeight: '250px' }}>
                                                <ReceivedSharesComponent
                                                    receivedShares={receivedShares}
                                                    editorItem={editorItem}
                                                    updateItemDefinition={updateItemDefinition}
                                                    workloadClient={workloadClient}
                                                    refreshOneLakeExplorer={refreshOneLakeExplorer}
                                                    workspaceId={pageContext.workspaceObjectId}
                                                />
                                            </Stack.Item>
                                        </Stack>
                                    </Stack.Item>
                </Stack>
                        </Stack.Item>
                    </Stack>
                </span>
            )}
        </Stack>
    );
}