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
    Checkbox,
    Dialog,
    DialogSurface,
    DialogTitle,
    DialogContent,
    DialogBody,
    DialogActions,
    Field,
    Input
} from "@fluentui/react-components";
import { 
    Delete24Regular, 
    CheckmarkCircle24Regular, 
    ErrorCircle24Regular, 
    Clock24Regular,
    CloudSync24Regular,
    Dismiss24Regular,
    ArrowDownload24Regular,
    Add24Regular
} from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { ExternalDataShareItemDefinition, ReceivedShare, ReceivedShareStatus, getReceivedShareDisplayName, getReceivedShareSenderInfo } from "../ExternalDataShareItemModel";
import { callNotificationOpen } from "../../../controller/NotificationController";
import { callDialogOpen } from "../../../controller/DialogController";
import { NotificationType } from "@ms-fabric/workload-client";
import { FabricPlatformAPIClient } from "../../../clients/FabricPlatformAPIClient";
import { ExternalDataShareItemImportShareResult } from "../ExternalDataShareItemImportShareDialog";

interface ReceivedSharesComponentProps {
    receivedShares: ReceivedShare[];
    editorItem: ItemWithDefinition<ExternalDataShareItemDefinition>;
    updateItemDefinition: (updates: Partial<ExternalDataShareItemDefinition>) => void;
    workloadClient: WorkloadClientAPI;
    refreshOneLakeExplorer: () => void;
    workspaceId: string; // Add workspace ID for API calls
}

export const ReceivedSharesComponent: React.FC<ReceivedSharesComponentProps> = ({
    receivedShares,
    editorItem,
    updateItemDefinition,
    workloadClient,
    refreshOneLakeExplorer,
    workspaceId
}) => {
    const [selectedShares, setSelectedShares] = useState<Set<string>>(new Set());
    const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
    const [selectedShareForAccept, setSelectedShareForAccept] = useState<ReceivedShare | null>(null);
    const [acceptLocation, setAcceptLocation] = useState("");
    const [acceptName, setAcceptName] = useState("");

    const handleImportShare = async () => {
        try {
            const dialogResult = await callDialogOpen(
                workloadClient,
                process.env.WORKLOAD_NAME,
                `/ExternalDataShareItem-import-share-dialog/${editorItem.id}`,
                500, 500,
                true
            );

            if (dialogResult && dialogResult.value) {
                const result = dialogResult.value as ExternalDataShareItemImportShareResult;
                
                if (result.state === 'import' && result.shareData) {
                    try {
                        const apiClient = new FabricPlatformAPIClient(workloadClient);
                        
                        // Parse the share link to extract invitation details
                        const url = new URL(result.shareData.shareLink);
                        const invitationId = url.searchParams.get('invitationId') || url.searchParams.get('invitation');
                        const providerTenantId = url.searchParams.get('providerTenantId') || url.searchParams.get('tenantId');
                        
                        if (!invitationId || !providerTenantId) {
                            throw new Error('Invalid share link: missing invitation ID or provider tenant ID');
                        }

                        // Get detailed share information from the API
                        const shareDetails = await apiClient.externalDataSharesRecipient.getInvitationDetails(
                            invitationId,
                            providerTenantId
                        );

                        // Create a new received share based on the API response
                        const newReceivedShare: ReceivedShare = {
                            ...shareDetails,
                            id: invitationId, // Use invitation ID as the share ID
                            displayName: result.shareData.displayName,
                            description: result.shareData.description,
                            receivedDate: new Date(),
                            status: 'pending' as ReceivedShareStatus
                        };

                        // Add to the item definition
                        const updatedShares = [...receivedShares, newReceivedShare];
                        updateItemDefinition({ receivedShares: updatedShares });

                        callNotificationOpen(
                            workloadClient,
                            "Share Imported",
                            `Successfully imported share "${result.shareData.displayName}".`,
                            NotificationType.Success,
                            undefined
                        );
                    } catch (error) {
                        console.error('Failed to import share:', error);
                        callNotificationOpen(
                            workloadClient,
                            "Import Failed",
                            `Failed to import share: ${(error as Error).message}`,
                            NotificationType.Error,
                            undefined
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Dialog error:', error);
            callNotificationOpen(
                workloadClient,
                "Dialog Error",
                "Failed to open import dialog.",
                NotificationType.Error,
                undefined
            );
        }
    };

    const handleAcceptShare = async (share: ReceivedShare) => {
        setSelectedShareForAccept(share);
        setAcceptName(getReceivedShareDisplayName(share));
        setAcceptLocation(`/Items/${editorItem.displayName}/AcceptedShares/${getReceivedShareDisplayName(share)}`);
        setIsAcceptDialogOpen(true);
    };

    const confirmAcceptShare = async () => {
        if (!selectedShareForAccept || !acceptLocation) return;

        try {
            const apiClient = new FabricPlatformAPIClient(workloadClient);

            // If this is an external data share invitation, accept it via API
            if (selectedShareForAccept.id && selectedShareForAccept.providerTenantDetails?.tenantId) {
                try {
                    // Use the invitation details that are already part of the received share
                    const createShortcutRequests = selectedShareForAccept.pathsDetails.map(path => ({
                        pathId: path.pathId,
                        shortcutName: path.name
                    }));

                    // Prepare the accept request
                    const acceptRequest = {
                        workspaceId: workspaceId,
                        itemId: editorItem.id,
                        providerTenantId: selectedShareForAccept.providerTenantDetails.tenantId,
                        payload: {
                            payloadType: 'ShortcutCreation' as const,
                            path: acceptLocation || 'Files', // Use user-specified location or default
                            createShortcutRequests: createShortcutRequests
                        }
                    };

                    const acceptResponse = await apiClient.externalDataSharesRecipient.acceptInvitation(
                        selectedShareForAccept.id, // Using id which contains the invitationId
                        acceptRequest
                    );

                    callNotificationOpen(
                        workloadClient,
                        "Share Accepted",
                        `Successfully accepted external data share "${getReceivedShareDisplayName(selectedShareForAccept)}" and created ${acceptResponse.value?.length || 0} shortcuts.`,
                        NotificationType.Success,
                        undefined
                    );
                } catch (apiError) {
                    // Log the API error but continue with local update for demo purposes
                    console.warn("Failed to accept share via API, updating locally:", apiError);
                    
                    callNotificationOpen(
                        workloadClient,
                        "Partial Success",
                        `Share updated locally but API acceptance failed: ${(apiError as Error).message}`,
                        NotificationType.Warning,
                        undefined
                    );
                }
            }

            // Update the local state regardless of API success
            const updatedShares = receivedShares.map(share => 
                share.id === selectedShareForAccept.id 
                    ? { 
                        ...share, 
                        status: 'accepted' as ReceivedShareStatus,
                        acceptedDate: new Date()
                      }
                    : share
            );

            updateItemDefinition({ receivedShares: updatedShares });

            // Show success notification if not already shown (for non-API shares)
            if (!selectedShareForAccept.id) {
                callNotificationOpen(
                    workloadClient,
                    "Share Accepted",
                    `Successfully accepted share "${getReceivedShareDisplayName(selectedShareForAccept)}".`,
                    NotificationType.Success,
                    undefined
                );
            }

        } catch (error) {
            callNotificationOpen(
                workloadClient,
                "Accept Failed",
                "Failed to accept share. Please try again.",
                NotificationType.Error,
                undefined
            );
        } finally {
            setIsAcceptDialogOpen(false);
            setSelectedShareForAccept(null);
            refreshOneLakeExplorer();
        }
    };

    const handleDeclineShare = async (share: ReceivedShare) => {
        try {
            // Update the local state
            const updatedShares = receivedShares.map(s => 
                s.id === share.id 
                    ? { ...s, status: 'declined' as ReceivedShareStatus }
                    : s
            );

            updateItemDefinition({ receivedShares: updatedShares });

            callNotificationOpen(
                workloadClient,
                "Share Declined",
                `Declined share "${getReceivedShareDisplayName(share)}".`,
                NotificationType.Warning,
                undefined
            );

            refreshOneLakeExplorer();
        } catch (error) {
            callNotificationOpen(
                workloadClient,
                "Decline Failed",
                "Failed to decline share. Please try again.",
                NotificationType.Error,
                undefined
            );
        }
    };

    const handleDeleteSelectedShares = async () => {
        if (selectedShares.size === 0) return;

        try {
            // Remove from local definition
            const remainingShares = receivedShares.filter(share => !selectedShares.has(share.id));
            updateItemDefinition({ receivedShares: remainingShares });
            setSelectedShares(new Set());

            callNotificationOpen(
                workloadClient,
                "Shares Removed",
                `Removed ${selectedShares.size} share(s) from local list.`,
                NotificationType.Success,
                undefined
            );

            refreshOneLakeExplorer();
        } catch (error) {
            callNotificationOpen(
                workloadClient,
                "Remove Failed",
                "Failed to remove some shares. Please try again.",
                NotificationType.Error,
                undefined
            );
        }
    };

    const getStatusIcon = (status: ReceivedShareStatus) => {
        switch (status) {
            case 'accepted':
            case 'synced':
                return <CheckmarkCircle24Regular />;
            case 'declined':
            case 'failed':
                return <ErrorCircle24Regular />;
            case 'syncing':
                return <CloudSync24Regular />;
            default:
                return <Clock24Regular />;
        }
    };

    const getStatusColor = (status: ReceivedShareStatus) => {
        switch (status) {
            case 'accepted':
            case 'synced':
                return 'brand';
            case 'declined':
            case 'failed':
                return 'danger';
            case 'syncing':
                return 'warning';
            default:
                return 'subtle';
        }
    };

    // Define columns for the received shares table
    const columns: TableColumnDefinition<ReceivedShare>[] = [
        createTableColumn<ReceivedShare>({
            columnId: "select",
            renderHeaderCell: () => (
                <Checkbox
                    checked={selectedShares.size === receivedShares.length && receivedShares.length > 0}
                    onChange={(_, data) => {
                        if (data.checked) {
                            setSelectedShares(new Set(receivedShares.map(s => s.id)));
                        } else {
                            setSelectedShares(new Set());
                        }
                    }}
                />
            ),
            renderCell: (item) => (
                <Checkbox
                    checked={selectedShares.has(item.id)}
                    onChange={(_, data) => {
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
        createTableColumn<ReceivedShare>({
            columnId: "name",
            renderHeaderCell: () => "Share Name",
            renderCell: (item) => (
                <TableCellLayout>
                    <Text weight="semibold">{getReceivedShareDisplayName(item)}</Text>
                </TableCellLayout>
            ),
        }),
        createTableColumn<ReceivedShare>({
            columnId: "provider",
            renderHeaderCell: () => "Provider",
            renderCell: (item) => (
                <TableCellLayout>
                    <Stack>
                        <Text weight="semibold">{getReceivedShareSenderInfo(item)}</Text>
                        <Text size={200} style={{ color: '#666' }}>
                            {item.providerTenantDetails?.verifiedDomainName || "Unknown domain"}
                        </Text>
                    </Stack>
                </TableCellLayout>
            ),
        }),
        createTableColumn<ReceivedShare>({
            columnId: "paths",
            renderHeaderCell: () => "Shared Paths",
            renderCell: (item) => (
                <TableCellLayout>
                    <Stack tokens={{ childrenGap: 2 }}>
                        {item.pathsDetails?.map((path, index) => (
                            <Text key={index} size={300}>
                                <Badge appearance="outline" size="small">{path.type}</Badge> {path.name}
                            </Text>
                        )) || <Text size={300}>No paths</Text>}
                    </Stack>
                </TableCellLayout>
            ),
        }),
        createTableColumn<ReceivedShare>({
            columnId: "status",
            renderHeaderCell: () => "Status",
            renderCell: (item) => (
                <TableCellLayout>
                    <Badge
                        appearance={item.status === 'accepted' || item.status === 'synced' ? 'filled' : 'outline'}
                        color={getStatusColor(item.status)}
                        icon={getStatusIcon(item.status)}
                    >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Badge>
                </TableCellLayout>
            ),
        }),
        createTableColumn<ReceivedShare>({
            columnId: "received",
            renderHeaderCell: () => "Received",
            renderCell: (item) => (
                <TableCellLayout>
                    {new Date(item.receivedDate).toLocaleDateString()}
                </TableCellLayout>
            ),
        }),
        createTableColumn<ReceivedShare>({
            columnId: "size",
            renderHeaderCell: () => "Size",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.estimatedSize || "Unknown"}
                </TableCellLayout>
            ),
        }),
        createTableColumn<ReceivedShare>({
            columnId: "actions",
            renderHeaderCell: () => "Actions",
            renderCell: (item) => (
                <TableCellLayout>
                    <Stack horizontal tokens={{ childrenGap: 4 }}>
                        {item.status === 'pending' && (
                            <>
                                <Button 
                                    size="small" 
                                    appearance="primary" 
                                    icon={<CheckmarkCircle24Regular />}
                                    onClick={() => handleAcceptShare(item)}
                                >
                                    Accept
                                </Button>
                                <Button 
                                    size="small" 
                                    appearance="subtle" 
                                    icon={<Dismiss24Regular />}
                                    onClick={() => handleDeclineShare(item)}
                                >
                                    Decline
                                </Button>
                            </>
                        )}
                    </Stack>
                </TableCellLayout>
            ),
        }),
    ];

    return (
        <Card style={{ height: '100%', padding: '16px' }}>
            <Stack tokens={{ childrenGap: 16 }} style={{ height: '100%' }}>
                <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                    <Text size={500} weight="semibold">Received Shares ({receivedShares.length})</Text>
                    <Stack horizontal tokens={{ childrenGap: 10 }}>
                        <Button
                            appearance="primary"
                            icon={<Add24Regular />}
                            onClick={handleImportShare}
                        >
                            Import Share
                        </Button>
                        {selectedShares.size > 0 && (
                            <Button
                                appearance="subtle"
                                icon={<Delete24Regular />}
                                onClick={handleDeleteSelectedShares}
                            >
                                Remove ({selectedShares.size})
                            </Button>
                        )}
                    </Stack>
                </Stack>

                <Stack.Item grow style={{ overflow: 'auto', minHeight: 0 }}>
                    {receivedShares.length === 0 ? (
                        <Stack style={{ padding: '40px', textAlign: 'center' }}>
                            <ArrowDownload24Regular style={{ fontSize: '48px', color: '#666', marginBottom: '16px' }} />
                            <Text size={500} weight="semibold">No received shares</Text>
                            <Text size={300} style={{ marginTop: '8px' }}>
                                Shares from external organizations will appear here.
                            </Text>
                        </Stack>
                    ) : (
                        <DataGrid
                            items={receivedShares}
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
                            <DataGridBody<ReceivedShare>>
                                {({ item, rowId }) => (
                                    <DataGridRow<ReceivedShare> key={rowId}>
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

            {/* Accept Share Dialog */}
            <Dialog open={isAcceptDialogOpen} onOpenChange={(_, data) => setIsAcceptDialogOpen(data.open)}>
                <DialogSurface style={{ maxWidth: '500px' }}>
                    <DialogTitle>Accept Data Share</DialogTitle>
                    <DialogContent>
                        <DialogBody>
                            <Stack tokens={{ childrenGap: 12 }}>
                                <Text>
                                    Accept "{selectedShareForAccept ? getReceivedShareDisplayName(selectedShareForAccept) : ''}"
                                </Text>
                                <Field label="Target Location" required>
                                    <Input
                                        value={acceptLocation}
                                        onChange={(e, data) => setAcceptLocation(data.value)}
                                        placeholder="OneLake path where the share will be stored"
                                    />
                                </Field>
                                <Field label="Local Name">
                                    <Input
                                        value={acceptName}
                                        onChange={(e, data) => setAcceptName(data.value)}
                                        placeholder="Optional custom name for the accepted share"
                                    />
                                </Field>
                            </Stack>
                        </DialogBody>
                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" onClick={() => setIsAcceptDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            appearance="primary" 
                            onClick={confirmAcceptShare}
                            disabled={!acceptLocation}
                        >
                            Accept Share
                        </Button>
                    </DialogActions>
                </DialogSurface>
            </Dialog>
        </Card>
    );
};
