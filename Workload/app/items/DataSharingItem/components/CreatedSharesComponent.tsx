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
    DialogTrigger,
    DialogSurface,
    DialogTitle,
    DialogContent,
    DialogBody,
    DialogActions,
    Field,
    Input,
    Textarea,
    Dropdown,
    Option
} from "@fluentui/react-components";
import { Add24Regular, Delete24Regular, Share24Regular, CheckmarkCircle24Regular, ErrorCircle24Regular, Clock24Regular } from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { DataSharingItemDefinition, CreatedShare, ShareType, DEFAULT_PERMISSIONS } from "../DataSharingItemModel";
import { callNotificationOpen } from "../../../controller/NotificationController";
import { NotificationType } from "@ms-fabric/workload-client";
import { v4 as uuidv4 } from 'uuid';

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
    refreshOneLakeExplorer
}) => {
    const [selectedShares, setSelectedShares] = useState<Set<string>>(new Set());
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newShareName, setNewShareName] = useState("");
    const [newShareDescription, setNewShareDescription] = useState("");
    const [newShareType, setNewShareType] = useState<ShareType>("folder");
    const [newShareRecipient, setNewShareRecipient] = useState("");
    const [newShareDataLocation, setNewShareDataLocation] = useState("");

    const handleCreateShare = async () => {
        if (!newShareName || !newShareRecipient || !newShareDataLocation) return;

        const newShare: CreatedShare = {
            id: uuidv4(),
            name: newShareName,
            description: newShareDescription,
            status: 'creating',
            shareType: newShareType,
            createdDate: new Date(),
            recipientEmail: newShareRecipient,
            dataLocation: newShareDataLocation,
            permissions: { ...DEFAULT_PERMISSIONS }
        };

        const updatedShares = [...createdShares, newShare];
        updateItemDefinition({ createdShares: updatedShares });

        // Reset form
        setNewShareName("");
        setNewShareDescription("");
        setNewShareRecipient("");
        setNewShareDataLocation("");
        setIsCreateDialogOpen(false);

        callNotificationOpen(
            workloadClient,
            "Share Created",
            `Successfully created share "${newShare.name}".`,
            NotificationType.Success,
            undefined
        );

        refreshOneLakeExplorer();
    };

    const handleDeleteSelectedShares = async () => {
        if (selectedShares.size === 0) return;

        const remainingShares = createdShares.filter(share => !selectedShares.has(share.id));
        updateItemDefinition({ createdShares: remainingShares });
        setSelectedShares(new Set());

        callNotificationOpen(
            workloadClient,
            "Shares Deleted",
            `Deleted ${selectedShares.size} shares.`,
            NotificationType.Success,
            undefined
        );

        refreshOneLakeExplorer();
    };

    // Define columns for the created shares table
    const columns: TableColumnDefinition<CreatedShare>[] = [
        createTableColumn<CreatedShare>({
            columnId: "select",
            renderHeaderCell: () => (
                <Checkbox
                    checked={selectedShares.size === createdShares.length && createdShares.length > 0}
                    onChange={(_, data) => {
                        if (data.checked) {
                            setSelectedShares(new Set(createdShares.map(s => s.id)));
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
        createTableColumn<CreatedShare>({
            columnId: "name",
            renderHeaderCell: () => "Share Name",
            renderCell: (item) => (
                <TableCellLayout>
                    <Text weight="semibold">{item.name}</Text>
                </TableCellLayout>
            ),
        }),
        createTableColumn<CreatedShare>({
            columnId: "type",
            renderHeaderCell: () => "Type",
            renderCell: (item) => (
                <TableCellLayout>
                    <Badge appearance="outline">{item.shareType}</Badge>
                </TableCellLayout>
            ),
        }),
        createTableColumn<CreatedShare>({
            columnId: "recipient",
            renderHeaderCell: () => "Recipient",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.recipientEmail || "Unknown"}
                </TableCellLayout>
            ),
        }),
        createTableColumn<CreatedShare>({
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
        createTableColumn<CreatedShare>({
            columnId: "created",
            renderHeaderCell: () => "Created",
            renderCell: (item) => (
                <TableCellLayout>
                    {new Date(item.createdDate).toLocaleDateString()}
                </TableCellLayout>
            ),
        }),
        createTableColumn<CreatedShare>({
            columnId: "downloads",
            renderHeaderCell: () => "Downloads",
            renderCell: (item) => (
                <TableCellLayout>
                    {item.downloadCount || 0}
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
                                onClick={handleDeleteSelectedShares}
                            >
                                Delete ({selectedShares.size})
                            </Button>
                        )}
                        <Dialog open={isCreateDialogOpen} onOpenChange={(_, data) => setIsCreateDialogOpen(data.open)}>
                            <DialogTrigger>
                                <Button appearance="primary" icon={<Add24Regular />}>
                                    Create Share
                                </Button>
                            </DialogTrigger>
                            <DialogSurface style={{ maxWidth: '500px' }}>
                                <DialogTitle>Create New Data Share</DialogTitle>
                                <DialogContent>
                                    <DialogBody>
                                        <Stack tokens={{ childrenGap: 12 }}>
                                            <Field label="Share Name" required>
                                                <Input
                                                    value={newShareName}
                                                    onChange={(e, data) => setNewShareName(data.value)}
                                                    placeholder="Enter share name"
                                                />
                                            </Field>
                                            <Field label="Description">
                                                <Textarea
                                                    value={newShareDescription}
                                                    onChange={(e, data) => setNewShareDescription(data.value)}
                                                    placeholder="Describe what you're sharing"
                                                    rows={2}
                                                />
                                            </Field>
                                            <Field label="Share Type">
                                                <Dropdown
                                                    value={newShareType}
                                                    onOptionSelect={(e, data) => setNewShareType(data.optionValue as ShareType)}
                                                >
                                                    <Option value="folder">Folder</Option>
                                                    <Option value="file">File</Option>
                                                    <Option value="table">Table</Option>
                                                    <Option value="dataset">Dataset</Option>
                                                    <Option value="lakehouse">Lakehouse</Option>
                                                    <Option value="warehouse">Warehouse</Option>
                                                </Dropdown>
                                            </Field>
                                            <Field label="Data Location" required>
                                                <Input
                                                    value={newShareDataLocation}
                                                    onChange={(e, data) => setNewShareDataLocation(data.value)}
                                                    placeholder="OneLake path or external location"
                                                />
                                            </Field>
                                            <Field label="Recipient Email" required>
                                                <Input
                                                    value={newShareRecipient}
                                                    onChange={(e, data) => setNewShareRecipient(data.value)}
                                                    placeholder="recipient@organization.com"
                                                />
                                            </Field>
                                        </Stack>
                                    </DialogBody>
                                </DialogContent>
                                <DialogActions>
                                    <Button appearance="secondary" onClick={() => setIsCreateDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button 
                                        appearance="primary" 
                                        onClick={handleCreateShare}
                                        disabled={!newShareName || !newShareRecipient || !newShareDataLocation}
                                    >
                                        Create Share
                                    </Button>
                                </DialogActions>
                            </DialogSurface>
                        </Dialog>
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
