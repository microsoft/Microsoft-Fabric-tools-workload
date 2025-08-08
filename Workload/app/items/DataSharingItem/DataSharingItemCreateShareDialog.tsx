import React, { useState, useEffect } from "react";
import {
    Button,
    Text,
    Field,
    Input,
    Textarea,
    DataGrid,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridBody,
    DataGridRow,
    DataGridCell,
    TableCellLayout,
    TableColumnDefinition,
    createTableColumn,
    Checkbox,
    Card,
    Badge
} from "@fluentui/react-components";
import { Stack } from "@fluentui/react";
import { CloseMode } from "@ms-fabric/workload-client";
import { 
    Item
} from "../../clients/FabricPlatformTypes";
import { TableMetadata, FileMetadata } from "../../samples/views/SampleOneLakeItemExplorer/SampleOneLakeItemExplorerModel";
import { getTables, getFiles } from "../../samples/views/SampleOneLakeItemExplorer/SampleOneLakeItemExplorerController";
import { callDialogClose } from "../../controller/DialogController";
import { useParams } from "react-router-dom";
import { PageProps } from "../../App";

export interface DataSharingItemCreateShareDialogProps extends PageProps {
    item: Item;
}

export interface DataSharingItemCreateShareResult {
    state: 'create' | 'cancel';
    shareData?: {
        basicInfo: BasicShareInfo;
        selectedItems: ShareableItemPath[];
        recipientInfo: RecipientInfo;
    };
}

interface BasicShareInfo {
    displayName: string;
    description: string;
}

interface ShareableItemPath {   
    path: string;
    type: "File" | "Folder" | "Table";
    selected?: boolean;
}

interface RecipientInfo {
    tenantId: string;
    email: string;
}

type WizardStep = 'basic' | 'selection' | 'recipient';

export function DataSharingItemCreateShareDialog(props: DataSharingItemCreateShareDialogProps) {
    const { workloadClient, item } = props;
    const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    // Step 1: Basic Information
    const [basicInfo, setBasicInfo] = useState<BasicShareInfo>({
        displayName: "",
        description: ""
    });

    // Step 2: File/Table Selection
    const [availableItems, setAvailableItems] = useState<ShareableItemPath[]>([]);
    const [loadingItems, setLoadingItems] = useState<boolean>(false);
    const [selectedItems, setSelectedItems] = useState<ShareableItemPath[]>([]);

    // Step 3: Recipient Information
    const [recipientInfo, setRecipientInfo] = useState<RecipientInfo>({
        tenantId: "",
        email: ""
    });

    useEffect(() => {
        if (currentStep === 'selection') {
            loadShareableItems();
        }
    }, [currentStep]);

    // Clear selected items when share type changes to avoid mismatched selections
    useEffect(() => {
        if (selectedItems.length > 0) {
            const validSelectedItems = selectedItems.filter(selected =>
                availableItems.some(available => available.path === selected.path)
            );
            
            if (validSelectedItems.length !== selectedItems.length) {
                setSelectedItems(validSelectedItems);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Load items once when dialog opens


    const loadShareableItems = async () => {
        setLoadingItems(true);
        setError(""); // Clear any previous errors
        try {
            const items: ShareableItemPath[] = [];
            let hasLoadingErrors = false;
            const loadingErrors: string[] = [];

            // Load tables from the current item
            try {
                const tables = await getTables(workloadClient, item.workspaceId, item.id);
                tables.forEach((table: TableMetadata) => {
                    items.push({
                        path: table.path,
                        type: "Table"
                    });
                });
            } catch (tableError) {
                console.error("Failed to load tables:", tableError);
                hasLoadingErrors = true;
                loadingErrors.push("Failed to load tables from the item");
            }

            // Load files from the current item
            try {
                const files = await getFiles(workloadClient, item.workspaceId, item.id);
                files.forEach((file: FileMetadata) => {
                    // Only include directories and non-hidden files
                    if (file.isDirectory || (!file.name.startsWith('.') && !file.name.startsWith('_'))) {
                        items.push({
                            path: file.path,
                            type: file.isDirectory ? "Folder" : "File"
                        });
                    }
                });
            } catch (fileError) {
                console.error("Failed to load files:", fileError);
                hasLoadingErrors = true;
                loadingErrors.push("Failed to load files from the item");
            }

            // If we have loading errors and no items were loaded, show error
            if (hasLoadingErrors && items.length === 0) {
                throw new Error(loadingErrors.join(". ") + ". Please check your permissions and try again.");
            }

            // If we have partial failures but some items loaded, show warning
            if (hasLoadingErrors && items.length > 0) {
                setError(`Warning: ${loadingErrors.join(". ")}. Showing available items.`);
            }

            // If no items were loaded but no errors occurred, it means the item is empty
            if (!hasLoadingErrors && items.length === 0) {
                throw new Error("No shareable items found in this workspace item. Please add some files or tables before creating a share.");
            }

            setAvailableItems(items);
        } catch (err) {
            setError((err as Error).message);
            setAvailableItems([]); // Clear any existing items
        } finally {
            setLoadingItems(false);
        }
    };

    const getStepTitle = () => {
        switch (currentStep) {
            case 'basic':
                return "Basic Information";
            case 'selection':
                return "Select Data to Share";
            case 'recipient':
                return "Recipient Information";
            default:
                return "Create Data Share";
        }
    };

    const getStepContent = () => {
        switch (currentStep) {
            case 'basic':
                return renderBasicInfoStep();
            case 'selection':
                return renderSelectionStep();
            case 'recipient':
                return renderRecipientStep();
            default:
                return null;
        }
    };

    const renderBasicInfoStep = () => (
        <Stack tokens={{ childrenGap: 16 }}>
            <Field label="Share Name" required>
                <Input
                    value={basicInfo.displayName}
                    onChange={(e, data) => setBasicInfo(prev => ({ ...prev, displayName: data.value }))}
                    placeholder="Enter a name for this data share"
                />
            </Field>

            <Field label="Description">
                <Textarea
                    value={basicInfo.description}
                    onChange={(e, data) => setBasicInfo(prev => ({ ...prev, description: data.value }))}
                    placeholder="Describe what data is being shared"
                    rows={3}
                />
            </Field>
        </Stack>
    );

    const renderSelectionStep = () => {
        
        const columns: TableColumnDefinition<ShareableItemPath>[] = [
            createTableColumn<ShareableItemPath>({
                columnId: "selected",
                compare: (a, b) => Number(b.selected) - Number(a.selected),
                renderHeaderCell: () => (
                    <Checkbox
                        checked={selectedItems.length > 0 && selectedItems.length === availableItems.length}
                        onChange={(e, data) => {
                            const newSelected = data.checked ? [...availableItems] : [];
                            setSelectedItems(newSelected);
                            setAvailableItems(prev => 
                                prev.map(item => ({ ...item, selected: data.checked === true }))
                            );
                        }}
                    />
                ),
                renderCell: (item) => (
                    <TableCellLayout>
                        <Checkbox
                            checked={item.selected}
                            onChange={(e, data) => {
                                const isSelected = data.checked === true;
                                setAvailableItems(prev => 
                                    prev.map(i => i.path === item.path ? { ...i, selected: isSelected } : i)
                                );
                                if (isSelected) {
                                    setSelectedItems(prev => [...prev, { ...item, selected: true }]);
                                } else {
                                    setSelectedItems(prev => prev.filter(i => i.path !== item.path));
                                }
                            }}
                        />
                    </TableCellLayout>
                ),
            }),
            createTableColumn<ShareableItemPath>({
                columnId: "path",
                compare: (a, b) => a.path.localeCompare(b.path),
                renderHeaderCell: () => "Path",
                renderCell: (item) => (
                    <TableCellLayout>
                        <Stack horizontal tokens={{ childrenGap: 8 }}>
                            <Badge appearance="outline" color="brand">
                                {item.type}
                            </Badge>
                            <Text weight="semibold">{item.path.split('/').pop() || item.path}</Text>
                            <Text style={{ color: '#424242' }}>({item.path})</Text>
                        </Stack>
                    </TableCellLayout>
                ),
            }),
        ];

        return (
            <Stack tokens={{ childrenGap: 16 }}>
                <Text>Select the paths you want to include in this data share:</Text>
                
                {selectedItems.length > 0 && (
                    <Card>
                        <Text weight="semibold">
                            {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                        </Text>
                    </Card>
                )}

                {loadingItems ? (
                    <Stack tokens={{ childrenGap: 16 }} style={{ padding: '40px', textAlign: 'center' }}>
                        <Text>Loading available items...</Text>
                    </Stack>
                ) : error && availableItems.length === 0 ? (
                    <Card appearance="filled-alternative" style={{ padding: '20px' }}>
                        <Stack tokens={{ childrenGap: 16 }} style={{ textAlign: 'center' }}>
                            <Text weight="semibold" style={{ color: '#d13438' }}>
                                Unable to Load Items
                            </Text>
                            <Text style={{ color: '#424242' }}>
                                {error}
                            </Text>
                            <Button 
                                appearance="primary" 
                                onClick={loadShareableItems}
                                disabled={loadingItems}
                            >
                                Retry Loading Items
                            </Button>
                        </Stack>
                    </Card>
                ) : availableItems.length === 0 ? (
                    <Card appearance="filled-alternative" style={{ padding: '20px' }}>
                        <Stack tokens={{ childrenGap: 16 }} style={{ textAlign: 'center' }}>
                            <Text weight="semibold" style={{ color: '#8a8886' }}>
                                No Items Available
                            </Text>
                            <Text style={{ color: '#424242' }}>
                                This workspace item doesn't contain any files or tables that can be shared.
                                Please add some content to the item before creating a share.
                            </Text>
                            <Button 
                                onClick={loadShareableItems}
                                disabled={loadingItems}
                            >
                                Refresh
                            </Button>
                        </Stack>
                    </Card>
                ) : (
                    <DataGrid
                        items={availableItems}
                        columns={columns}
                        sortable
                        style={{ minHeight: '300px' }}
                    >
                        <DataGridHeader>
                            <DataGridRow>
                                {(column) => (
                                    <DataGridHeaderCell key={column.columnId}>
                                        {column.renderHeaderCell()}
                                    </DataGridHeaderCell>
                                )}
                            </DataGridRow>
                        </DataGridHeader>
                        <DataGridBody<ShareableItemPath>>
                            {({ item, rowId }) => (
                                <DataGridRow<ShareableItemPath> key={rowId}>
                                    {(column) => (
                                        <DataGridCell key={column.columnId}>
                                            {column.renderCell(item)}
                                        </DataGridCell>
                                    )}
                                </DataGridRow>
                            )}
                        </DataGridBody>
                    </DataGrid>
                )}
            </Stack>
        );
    };

    const renderRecipientStep = () => (
        <Stack tokens={{ childrenGap: 16 }}>
            <Field label="Tenant ID" required>
                <Input
                    value={recipientInfo.tenantId}
                    onChange={(e, data) => setRecipientInfo(prev => ({ ...prev, tenantId: data.value }))}
                    placeholder="Enter the recipient's tenant ID"
                />
            </Field>

            <Field label="Recipient Email" required>
                <Input
                    type="email"
                    value={recipientInfo.email}
                    onChange={(e, data) => setRecipientInfo(prev => ({ ...prev, email: data.value }))}
                    placeholder="recipient@example.com"
                />
            </Field>

            <Card>
                <Stack tokens={{ childrenGap: 8 }}>
                    <Text weight="semibold">Share Summary</Text>
                    <Text>Name: {basicInfo.displayName}</Text>
                    <Text>Description: {basicInfo.description || "No description"}</Text>
                    <Text>Items: {selectedItems.length} selected</Text>
                </Stack>
            </Card>
        </Stack>
    );

    const canGoNext = () => {
        switch (currentStep) {
            case 'basic':
                return basicInfo.displayName.trim().length > 0;
            case 'selection':
                return selectedItems.length > 0 && availableItems.length > 0 && !loadingItems;
            case 'recipient':
                return recipientInfo.tenantId.trim().length > 0 && 
                       recipientInfo.email.trim().length > 0 && 
                       recipientInfo.email.includes('@');
            default:
                return false;
        }
    };

    const handleNext = () => {
        switch (currentStep) {
            case 'basic':
                setCurrentStep('selection');
                break;
            case 'selection':
                setCurrentStep('recipient');
                break;
            case 'recipient':
                handleCreateShare();
                break;
        }
    };

    const handleBack = () => {
        switch (currentStep) {
            case 'selection':
                setCurrentStep('basic');
                break;
            case 'recipient':
                setCurrentStep('selection');
                // If we're going back to selection and there are no items, try to reload them
                if (availableItems.length === 0 && !loadingItems) {
                    loadShareableItems();
                }
                break;
        }
    };

    const handleCreateShare = async () => {
        setIsLoading(true);
        setError("");

        try {
            // Return the form data to the editor for processing
            const result: DataSharingItemCreateShareResult = {
                state: 'create',
                shareData: {
                    basicInfo,
                    selectedItems,
                    recipientInfo
                }
            };
            callDialogClose(workloadClient, CloseMode.PopOne, result);
        } catch (err) {
            setError("Failed to prepare share data: " + (err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        // Close dialog with cancel result
        const result: DataSharingItemCreateShareResult = {
            state: 'cancel'
        };
        callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    const getActionButtons = () => {
        const buttons = [];

        if (currentStep !== 'basic') {
            buttons.push(
                <Button key="back" onClick={handleBack} disabled={isLoading}>
                    Back
                </Button>
            );
        }

        buttons.push(
            <Button key="cancel" onClick={handleCancel} disabled={isLoading}>
                Cancel
            </Button>
        );

        if (currentStep === 'recipient') {
            buttons.push(
                <Button 
                    key="create" 
                    appearance="primary" 
                    onClick={handleNext} 
                    disabled={!canGoNext() || isLoading}
                >
                    {isLoading ? "Creating..." : "Create Share"}
                </Button>
            );
        } else {
            buttons.push(
                <Button 
                    key="next" 
                    appearance="primary" 
                    onClick={handleNext} 
                    disabled={!canGoNext()}
                >
                    Next
                </Button>
            );
        }

        return buttons;
    };

    return (
        <div style={{ padding: '20px', minWidth: '600px', minHeight: '500px' }}>
            <div style={{ marginBottom: '20px' }}>
                <Text size={500} weight="semibold">
                    {getStepTitle()}
                </Text>
            </div>
            
            <Stack tokens={{ childrenGap: 16 }}>
                {/* Step indicator */}
                <Stack horizontal tokens={{ childrenGap: 16 }}>
                    <Badge 
                        appearance={currentStep === 'basic' ? 'filled' : 'outline'}
                        color={currentStep === 'basic' ? 'brand' : 'subtle'}
                    >
                        1. Basic Info
                    </Badge>
                    <Badge 
                        appearance={currentStep === 'selection' ? 'filled' : 'outline'}
                        color={currentStep === 'selection' ? 'brand' : 'subtle'}
                    >
                        2. Select Data
                    </Badge>
                    <Badge 
                        appearance={currentStep === 'recipient' ? 'filled' : 'outline'}
                        color={currentStep === 'recipient' ? 'brand' : 'subtle'}
                    >
                        3. Recipient
                    </Badge>
                </Stack>

                {error && currentStep !== 'selection' && (
                    <Card appearance="filled-alternative">
                        <Text style={{ color: 'red' }}>{error}</Text>
                    </Card>
                )}

                {getStepContent()}
            </Stack>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                {getActionButtons()}
            </div>
        </div>
    );
}

// Wrapper component to handle URL parameters for DataSharingItemCreateShareDialog
export function DataSharingItemCreateShareDialogWrapper({ workloadClient }: PageProps) {
    const { itemObjectId } = useParams<{ itemObjectId: string }>();
    const [item, setItem] = useState<Item | null>(null);

    useEffect(() => {
        const fetchItem = async () => {
            if (!itemObjectId) {
                return;
            }            
            const fetchedItem = await workloadClient.itemCrud.getItem({ objectId: itemObjectId });
            // Convert GetItemResult to our Item type
            const convertedItem: Item = {
                id: fetchedItem.objectId,
                workspaceId: fetchedItem.folderObjectId,
                type: fetchedItem.itemType,
                displayName: fetchedItem.displayName,
                description: fetchedItem.description
            };
            setItem(convertedItem);            
        };

        fetchItem();
    }, [itemObjectId, workloadClient]);


    const props: DataSharingItemCreateShareDialogProps = {
        workloadClient,
        item,
    };
    
    return <DataSharingItemCreateShareDialog {...props} />;
}
