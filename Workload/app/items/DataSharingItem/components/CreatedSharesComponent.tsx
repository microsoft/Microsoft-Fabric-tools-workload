import React, { useState } from "react";
import { Stack } from "@fluentui/react";
import {
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
    Text,
    Card,
    Checkbox
} from "@fluentui/react-components";
import { Add24Regular, Delete24Regular, Share24Regular, CheckmarkCircle24Regular, ErrorCircle24Regular, Clock24Regular } from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { DataSharingItemDefinition, CreatedShare } from "../DataSharingItemModel";
import { callNotificationOpen } from "../../../controller/NotificationController";
import { callDialogOpen, callDialogOpenMsgBox } from "../../../controller/DialogController";
import { NotificationType } from "@ms-fabric/workload-client";
import { FabricPlatformAPIClient } from "../../../clients/FabricPlatformAPIClient";
import { DataSharingItemCreateShareResult } from "../DataSharingItemCreateShareDialog";
import { CreateExternalDataShareRequest } from "../../../clients/FabricPlatformTypes";

interface CreatedSharesComponentProps {
    createdShares: CreatedShare[];
    editorItem: ItemWithDefinition<DataSharingItemDefinition>;
    updateItemDefinition: (updates: Partial<DataSharingItemDefinition>) => void;
    workloadClient: WorkloadClientAPI;
    refreshOneLakeExplorer: () => void;
}

export const CreatedSharesComponent: React.FC<CreatedSharesComponentProps> = ({
    createdShares,
    editorItem,
    updateItemDefinition,
    workloadClient,
    refreshOneLakeExplorer,
}) => {
    const [selectedShares, setSelectedShares] = useState<Set<string>>(new Set());

    const handleCreateShare = async () => {
        try {
            const dialogResult = await callDialogOpen(
                workloadClient,
                process.env.WORKLOAD_NAME,
                `/DataSharingItem-create-share-dialog/${editorItem.id}`,
                650, 500,
                true
            );

            if (dialogResult && dialogResult.value) {
                const result = dialogResult.value as DataSharingItemCreateShareResult;
                
                if (result.state === 'create' && result.shareData) {
                    const { basicInfo, selectedItems, recipientInfo } = result.shareData;
                    
                    try {
                        const apiClient = new FabricPlatformAPIClient(workloadClient);
                        
                        // Prepare the external data share request
                        const createRequest = {
                            paths: selectedItems.map(item => item.path),
                            recipient: {
                                tenantId: recipientInfo.tenantId,
                                userPrincipalName: recipientInfo.email,
                            }
                        } as CreateExternalDataShareRequest;

                        // Create the external data share using the API
                        const externalShare = await apiClient.externalDataShares.createExternalDataShare(
                            editorItem.workspaceId,
                            editorItem.id,
                            createRequest
                        );

                        // Create our internal share representation
                        const newShare: CreatedShare = {
                            ...externalShare,
                            // CreatedShare additional properties
                            displayName: basicInfo.displayName,
                            description: basicInfo.description || '',
                            creationDate: new Date()
                        };

                        // Update the editor state
                        const updatedShares = [...createdShares, newShare];
                        updateItemDefinition({ createdShares: updatedShares });

                        callNotificationOpen(
                            workloadClient,
                            "Share Created",
                            `Successfully created share "${newShare.displayName}".`,
                            NotificationType.Success,
                            undefined
                        );

                        refreshOneLakeExplorer();
                    } catch (apiError) {
                        callNotificationOpen(
                            workloadClient,
                            "Share Creation Failed",
                            "Failed to create external data share: " + (apiError as Error).message,
                            NotificationType.Error,
                            undefined
                        );
                    }
                }
            }
        } catch (error) {
            callNotificationOpen(
                workloadClient,
                "Create Share Failed",
                "Failed to open create share dialog. Please try again.",
                NotificationType.Error,
                undefined
            );
        }
    };

    const handleRevokeSelectedShares = async () => {
        if (selectedShares.size === 0) return;

        const sharesToRevoke = createdShares.filter(share => 
            selectedShares.has(share.id) && share.status !== 'Revoked'
        );

        if (sharesToRevoke.length === 0) return;

        try {
            // Show confirmation dialog first
            const confirmResult = await callDialogOpenMsgBox(
                workloadClient,
                "Confirm Revoke Shares",
                `Are you sure you want to revoke ${sharesToRevoke.length} share(s)? This action will immediately remove external access to the shared data and cannot be undone.`,
                ["Revoke", "Cancel"]
            );

            // Check if user confirmed the action
            if (confirmResult !== "Revoke") {
                return; // User cancelled
            }

            const apiClient = new FabricPlatformAPIClient(workloadClient);
            
            // Revoke shares from API
            for (const share of sharesToRevoke) {
                if (share.workspaceId && share.itemId) {
                    try {
                        await apiClient.externalDataShares.revokeExternalDataShare(
                            share.workspaceId,
                            share.itemId,
                            share.id
                        );
                    } catch (apiError) {
                        console.warn(`Failed to revoke external share ${share.id} via API:`, apiError);
                    }
                }
            }

            // Update share status to 'Revoked' instead of removing from definition
            const updatedShares = createdShares.map(share => 
                selectedShares.has(share.id) && share.status !== 'Revoked'
                    ? { ...share, status: 'Revoked' as const }
                    : share
            );
            updateItemDefinition({ createdShares: updatedShares });
            setSelectedShares(new Set());

            callNotificationOpen(
                workloadClient,
                "Shares Revoked",
                `Successfully revoked ${sharesToRevoke.length} share(s) and removed external access.`,
                NotificationType.Success,
                undefined
            );

            refreshOneLakeExplorer();
        } catch (error) {
            callNotificationOpen(
                workloadClient,
                "Revoke Failed",
                "Failed to revoke some shares. Please try again.",
                NotificationType.Error,
                undefined
            );
        }
    };

    // Define columns for the created shares table
    const columns: TableColumnDefinition<CreatedShare>[] = [
        createTableColumn<CreatedShare>({
            columnId: "select",
            renderHeaderCell: () => {
                const activeShares = createdShares.filter(s => s.status !== 'Revoked');
                const selectedActiveShares = activeShares.filter(s => selectedShares.has(s.id));
                return (
                    <Checkbox
                        checked={selectedActiveShares.length === activeShares.length && activeShares.length > 0}
                        onChange={(_, data) => {
                            if (data.checked) {
                                setSelectedShares(new Set(activeShares.map(s => s.id)));
                            } else {
                                setSelectedShares(new Set());
                            }
                        }}
                    />
                );
            },
            renderCell: (item) => (
                <Checkbox
                    checked={selectedShares.has(item.id)}
                    disabled={item.status === 'Revoked'}
                    onChange={(_, data) => {
                        if (item.status === 'Revoked') return;
                        
                        const newSelected = new Set(selectedShares);
                        if (data.checked) {
                            newSelected.add(item.id);
                        } else {
                            newSelected.delete(item.id);
                        }
                        setSelectedShares(newSelected);
                    }}
                />
            ),
        }),
        createTableColumn<CreatedShare>({
            columnId: "name",
            renderHeaderCell: () => "Share Name",
            renderCell: (item) => (
                <TableCellLayout>
                    <Text weight="semibold">{item.displayName}</Text>
                </TableCellLayout>
            ),
        }),
        createTableColumn<CreatedShare>({
            columnId: "description",
            renderHeaderCell: () => "Description",
            renderCell: (item) => (
                <TableCellLayout>
                    <Text size={300}>{item.description || "No description"}</Text>
                </TableCellLayout>
            ),
        }),
        createTableColumn<CreatedShare>({
            columnId: "creationDate",
            renderHeaderCell: () => "Creation Date",
            renderCell: (item) => (
                <TableCellLayout>
                    <Text>{new Date(item.creationDate).toLocaleDateString()}</Text>
                </TableCellLayout>
            ),
        }),
        createTableColumn<CreatedShare>({
            columnId: "paths",
            renderHeaderCell: () => "Shared Paths",
            renderCell: (item) => (
                <TableCellLayout>
                    <Text size={300}>
                        {item.paths?.length > 0 ? `${item.paths.length} path(s)` : "No paths"}
                    </Text>
                </TableCellLayout>
            ),
        }),
        createTableColumn<CreatedShare>({
            columnId: "recipientTenantId",
            renderHeaderCell: () => "Recipient TenantId",
            renderCell: (item) => (
                <TableCellLayout>
                    <Text>{item.recipient?.tenantId || "Unknown"}</Text>
                </TableCellLayout>
            ),
        }),
        createTableColumn<CreatedShare>({
            columnId: "recipientPrincipalName",
            renderHeaderCell: () => "Recipient Principal Name",
            renderCell: (item) => (
                <TableCellLayout>
                    <Text>{item.recipient?.userPrincipalName || "Unknown"}</Text>
                </TableCellLayout>
            ),
        }),
        createTableColumn<CreatedShare>({
            columnId: "status",
            renderHeaderCell: () => "Status",
            renderCell: (item) => (
                <TableCellLayout>
                    <Badge
                        appearance={item.status === 'Active' ? 'filled' : item.status === 'Revoked' ? 'ghost' : 'outline'}
                        color={item.status === 'Active' ? 'brand' : item.status === 'Revoked' ? 'danger' : 'warning'}
                        icon={
                            item.status === 'Active' ? <CheckmarkCircle24Regular /> :
                                item.status === 'Revoked' ? <ErrorCircle24Regular /> :
                                    <Clock24Regular />
                        }
                    >
                        {item.status}
                    </Badge>
                </TableCellLayout>
            ),
        }),
        
    ];

    return (
        <Card style={{ height: '100%', padding: '16px' }}>
            <Stack tokens={{ childrenGap: 16 }} style={{ height: '100%' }}>
                <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                    <Text size={500} weight="semibold">Created Shares ({createdShares.length})</Text>
                    <Stack horizontal tokens={{ childrenGap: 10 }}>
                        {selectedShares.size > 0 && (
                            <Button
                                appearance="subtle"
                                icon={<Delete24Regular />}
                                onClick={handleRevokeSelectedShares}
                            >
                                Revoke ({Array.from(selectedShares).filter(id => 
                                    createdShares.find(s => s.id === id)?.status !== 'Revoked'
                                ).length})
                            </Button>
                        )}
                        <Button
                            appearance="primary"
                            icon={<Add24Regular />}
                            onClick={handleCreateShare}
                        >
                            Create Share
                        </Button>
                    </Stack>
                </Stack>

                <Stack.Item grow style={{ overflow: 'auto', minHeight: 0 }}>
                    {createdShares.length === 0 ? (
                        <Stack style={{ padding: '40px', textAlign: 'center' }}>
                            <Share24Regular style={{ fontSize: '48px', color: '#666', marginBottom: '16px' }} />
                            <Text size={500} weight="semibold">No shares created yet</Text>
                            <Text size={300} style={{ marginTop: '8px' }}>
                                Click "Create Share" to share data with external organizations.
                            </Text>
                        </Stack>
                    ) : (
                        <DataGrid
                            items={createdShares}
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
                            <DataGridBody<CreatedShare>>
                                {({ item, rowId }) => (
                                    <DataGridRow<CreatedShare> key={rowId}>
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
        </Card>
    );
};
