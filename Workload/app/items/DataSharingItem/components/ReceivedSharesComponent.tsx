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
    ArrowDownload24Regular
} from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { DataSharingItemDefinition, ReceivedShare, ReceivedShareStatus } from "../DataSharingItemModel";
import { callNotificationOpen } from "../../../controller/NotificationController";
import { NotificationType } from "@ms-fabric/workload-client";

interface ReceivedSharesComponentProps {
    receivedShares: ReceivedShare[];
    editorItem: ItemWithDefinition<DataSharingItemDefinition>;
    updateItemDefinition: (updates: Partial<DataSharingItemDefinition>) => void;
    workloadClient: WorkloadClientAPI;
    refreshOneLakeExplorer: () => void;
}

export const ReceivedSharesComponent: React.FC<ReceivedSharesComponentProps> = ({
    receivedShares,
    editorItem,
    updateItemDefinition,
    workloadClient,
    refreshOneLakeExplorer
}) => {
    const [selectedShares, setSelectedShares] = useState<Set<string>>(new Set());
    const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
    const [selectedShareForAccept, setSelectedShareForAccept] = useState<ReceivedShare | null>(null);
    const [acceptLocation, setAcceptLocation] = useState("");
    const [acceptName, setAcceptName] = useState("");

    const handleAcceptShare = async (share: ReceivedShare) => {
        setSelectedShareForAccept(share);
        setAcceptName(share.name);
        setAcceptLocation(`/Items/${editorItem.displayName}/AcceptedShares/${share.name}`);
        setIsAcceptDialogOpen(true);
    };

    const confirmAcceptShare = async () => {
        if (!selectedShareForAccept || !acceptLocation) return;

        const updatedShares = receivedShares.map(share => 
            share.id === selectedShareForAccept.id 
                ? { 
                    ...share, 
                    status: 'accepted' as ReceivedShareStatus,
                    acceptedDate: new Date(),
                    dataLocation: acceptLocation
                  }
                : share
        );

        updateItemDefinition({ receivedShares: updatedShares });
        setIsAcceptDialogOpen(false);
        setSelectedShareForAccept(null);

        callNotificationOpen(
            workloadClient,
            "Share Accepted",
            `Successfully accepted share "${selectedShareForAccept.name}".`,
            NotificationType.Success,
            undefined
        );

        refreshOneLakeExplorer();
    };

    const handleDeclineShare = async (share: ReceivedShare) => {
        const updatedShares = receivedShares.map(s => 
            s.id === share.id 
                ? { ...s, status: 'declined' as ReceivedShareStatus }
                : s
        );

        updateItemDefinition({ receivedShares: updatedShares });

        callNotificationOpen(
            workloadClient,
            "Share Declined",
            `Declined share "${share.name}".`,
            NotificationType.Warning,
            undefined
        );
    };

    const handleDeleteSelectedShares = async () => {
        if (selectedShares.size === 0) return;

        const remainingShares = receivedShares.filter(share => !selectedShares.has(share.id));
        updateItemDefinition({ receivedShares: remainingShares });
        setSelectedShares(new Set());

        callNotificationOpen(
            workloadClient,
            "Shares Removed",
            `Removed ${selectedShares.size} shares.`,
            NotificationType.Success,
            undefined
        );

        refreshOneLakeExplorer();
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
                    <Text weight="semibold">{item.name}</Text>
                </TableCellLayout>
            ),
        }),
        createTableColumn<ReceivedShare>({
            columnId: "type",
            renderHeaderCell: () => "Type",
            renderCell: (item) => (
                <TableCellLayout>
                    <Badge appearance="outline">{item.shareType}</Badge>
                </TableCellLayout>
            ),
        }),
        createTableColumn<ReceivedShare>({
            columnId: "sender",
            renderHeaderCell: () => "Sender",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.senderEmail || "Unknown"}
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
                                    Accept "{selectedShareForAccept?.name}" from {selectedShareForAccept?.senderEmail}?
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
