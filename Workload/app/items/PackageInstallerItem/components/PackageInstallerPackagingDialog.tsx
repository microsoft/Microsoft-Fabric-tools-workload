import React, { useState } from "react";
import { PageProps } from "../../../App";
import { Button, Text, Checkbox, Spinner, SearchBox, Input, Textarea, Dropdown, Option } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { callDialogClose } from "../../../controller/DialogController";
import { CloseMode } from "@ms-fabric/workload-client";
import { WorkspaceDropdown } from "./WorkspaceDropdown";
import { FabricPlatformAPIClient } from "../../../clients/FabricPlatformAPIClient";
import { Item } from "../../../clients/FabricPlatformTypes";
import { DeploymentLocation } from "../PackageInstallerItemModel";

export interface PackageInstallerPackagingProps extends PageProps {
    title?: string;
    description?: string;
}

export interface PackageInstallerPackagingResult {
    state: 'package' | 'cancel';
    selectedItems?: Item[];
    workspaceId?: string;
    packageDisplayName?: string;
    packageDescription?: string;
    deploymentLocation?: DeploymentLocation;
    updateItemReferences?: boolean;
}

export function PackageInstallerPackagingDialog(props: PackageInstallerPackagingProps) {
    const { t } = useTranslation();
    const { workloadClient, title, description } = props;
    
    // Wizard state
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    
    // Step 1 - Package Configuration
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
    const [packageDisplayName, setPackageDisplayName] = useState<string>("");
    const [packageDescription, setPackageDescription] = useState<string>("");
    const [deploymentLocation, setDeploymentLocation] = useState<DeploymentLocation>(DeploymentLocation.Default);
    
    // Step 2 - Item Selection
    const [items, setItems] = useState<Item[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isLoadingItems, setIsLoadingItems] = useState<boolean>(false);
    const [searchText, setSearchText] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [updateItemReferences, setUpdateItemReferences] = useState<boolean>(true);

    // Load items when moving to step 2
    const loadItems = async () => {
        if (!selectedWorkspaceId) return;
        
        try {
            setIsLoadingItems(true);
            setError("");
            const fabricAPI = new FabricPlatformAPIClient(workloadClient);
            const itemList = await fabricAPI.items.getAllItems(selectedWorkspaceId);
            setItems(itemList);
            setSelectedItems(new Set());
        } catch (err) {
            setError(t('Failed to load items from workspace. Please try again.'));
            console.error('Error loading items:', err);
        } finally {
            setIsLoadingItems(false);
        }
    };

    // Filter items based on search text
    const filteredItems = items.filter(item => {
        if (!searchText) return true;
        return item.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
               item.type.toLowerCase().includes(searchText.toLowerCase()) ||
               (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()));
    });

    const handleCancel = () => {
        const result: PackageInstallerPackagingResult = { state: 'cancel' };
        callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    const handleNext = async () => {
        if (currentStep === 1) {
            // Move to step 2 and load items
            setCurrentStep(2);
            await loadItems();
        }
    };

    const handleBack = () => {
        if (currentStep === 2) {
            setCurrentStep(1);
        }
    };

    const handleCreatePackage = () => {
        const selectedItemsList = items.filter(item => selectedItems.has(item.id));
        const result: PackageInstallerPackagingResult = { 
            state: 'package',
            selectedItems: selectedItemsList,
            workspaceId: selectedWorkspaceId,
            packageDisplayName,
            packageDescription,
            deploymentLocation,
            updateItemReferences
        };
        callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    const handleItemToggle = (itemId: string) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
        } else {
            newSelection.add(itemId);
        }
        setSelectedItems(newSelection);
    };

    const handleSelectAll = () => {
        if (selectedItems.size === filteredItems.length) {
            // Deselect all
            setSelectedItems(new Set());
        } else {
            // Select all filtered items
            const newSelection = new Set(filteredItems.map(item => item.id));
            setSelectedItems(newSelection);
        }
    };

    const isCreateButtonDisabled = !selectedWorkspaceId || selectedItems.size === 0;
    const isNextButtonDisabled = !selectedWorkspaceId || !packageDisplayName.trim();
    const isAllSelected = filteredItems.length > 0 && selectedItems.size === filteredItems.length;    return (
        <div style={{ padding: '20px', minWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            {/* Wizard Header */}
            <div style={{ marginBottom: '20px' }}>
                <Text size={500} weight="semibold">
                    {title || t('Create Package from Workspace Items')}
                </Text>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        backgroundColor: currentStep === 1 ? '#0078d4' : '#e1dfdd',
                        color: currentStep === 1 ? 'white' : '#616161',
                        fontSize: '12px',
                        fontWeight: '600'
                    }}>
                        1
                    </div>
                    <Text size={200} style={{ color: currentStep === 1 ? '#0078d4' : '#616161' }}>
                        {t('Package Configuration')}
                    </Text>
                    <div style={{ width: '40px', height: '2px', backgroundColor: '#e1dfdd' }} />
                    <div style={{ 
                        padding: '4px 8px', 
                        borderRadius: '12px', 
                        backgroundColor: currentStep === 2 ? '#0078d4' : '#e1dfdd',
                        color: currentStep === 2 ? 'white' : '#616161',
                        fontSize: '12px',
                        fontWeight: '600'
                    }}>
                        2
                    </div>
                    <Text size={200} style={{ color: currentStep === 2 ? '#0078d4' : '#616161' }}>
                        {t('Select Items')}
                    </Text>
                </div>
            </div>

            {/* Step 1: Package Configuration */}
            {currentStep === 1 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <Text>
                            {description || t('Configure your package by selecting a workspace and providing basic information.')}
                        </Text>
                    </div>

                    {/* Workspace Selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                            {t('Workspace')} *
                        </Text>
                        <WorkspaceDropdown
                            workloadClient={workloadClient}
                            selectedWorkspaceId={selectedWorkspaceId}
                            onWorkspaceSelect={setSelectedWorkspaceId}
                            placeholder={t('Select a workspace')}
                        />
                    </div>

                    {/* Package Display Name */}
                    <div style={{ marginBottom: '20px' }}>
                        <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                            {t('Package Display Name')} *
                        </Text>
                        <Input
                            value={packageDisplayName}
                            onChange={(ev, data) => setPackageDisplayName(data.value)}
                            placeholder={t('Enter package display name')}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Package Description */}
                    <div style={{ marginBottom: '20px' }}>
                        <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                            {t('Package Description')}
                        </Text>
                        <Textarea
                            value={packageDescription}
                            onChange={(ev, data) => setPackageDescription(data.value)}
                            placeholder={t('Enter package description')}
                            style={{ width: '100%' }}
                            rows={3}
                        />
                    </div>

                    {/* Deployment Location */}
                    <div style={{ marginBottom: '20px' }}>
                        <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                            {t('Deployment Location')}
                        </Text>
                        <Dropdown
                            value={DeploymentLocation[deploymentLocation]}
                            selectedOptions={[DeploymentLocation[deploymentLocation]]}
                            onOptionSelect={(ev, data) => {
                                const selectedLocation = Object.values(DeploymentLocation).find(
                                    location => DeploymentLocation[location] === data.optionValue
                                );
                                if (selectedLocation !== undefined) {
                                    setDeploymentLocation(selectedLocation);
                                }
                            }}
                            style={{ width: '100%' }}
                        >
                            <Option value={DeploymentLocation[DeploymentLocation.Default]}>
                                {t('Default - Use default deployment location')}
                            </Option>
                            <Option value={DeploymentLocation[DeploymentLocation.NewWorkspace]}>
                                {t('New Workspace - Create a new workspace for this package')}
                            </Option>
                        </Dropdown>
                    </div>

                    {/* Update Item References Option */}
                    <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #e1dfdd' }}>
                        <Checkbox
                            checked={updateItemReferences}
                            onChange={(ev, data) => setUpdateItemReferences(data.checked === true)}
                            label={
                                <div>
                                    <Text weight="semibold" style={{ display: 'block' }}>
                                        {t('Update Item References')}
                                    </Text>
                                    <Text size={200} style={{ color: '#616161', display: 'block', marginTop: '2px' }}>
                                        {t('Automatically update item references on deployment to the newly created items.')}
                                    </Text>
                                </div>
                            }
                        />
                    </div>
                </div>
            )}

            {/* Step 2: Item Selection */}
            {currentStep === 2 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ marginBottom: '16px' }}>
                        <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                            {t('Items from')} "{selectedWorkspaceId}" {items.length > 0 && `(${selectedItems.size}/${items.length} selected)`}
                        </Text>
                        
                        {/* Search and Select All */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                            <SearchBox
                                placeholder={t('Search items...')}
                                value={searchText}
                                onChange={(ev, data) => setSearchText(data.value)}
                                style={{ flex: 1 }}
                            />
                            {filteredItems.length > 0 && (
                                <Checkbox
                                    checked={isAllSelected}
                                    onChange={handleSelectAll}
                                    label={t('Select All')}
                                />
                            )}
                        </div>
                    </div>

                    {/* Items List */}
                    <div style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        border: '1px solid #e1dfdd', 
                        borderRadius: '4px',
                        padding: '8px',
                        minHeight: '200px'
                    }}>
                        {isLoadingItems && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
                                <Spinner label={t('Loading items...')} />
                            </div>
                        )}

                        {error && (
                            <div style={{ color: '#d13438', padding: '16px', textAlign: 'center' }}>
                                <Text>{error}</Text>
                                <div style={{ marginTop: '8px' }}>
                                    <Button size="small" onClick={loadItems}>
                                        {t('Retry')}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {!isLoadingItems && !error && filteredItems.length === 0 && items.length > 0 && (
                            <div style={{ textAlign: 'center', padding: '32px', color: '#616161' }}>
                                <Text>{t('No items match your search.')}</Text>
                            </div>
                        )}

                        {!isLoadingItems && !error && items.length === 0 && selectedWorkspaceId && (
                            <div style={{ textAlign: 'center', padding: '32px', color: '#616161' }}>
                                <Text>{t('No items found in this workspace.')}</Text>
                            </div>
                        )}

                        {!isLoadingItems && !error && filteredItems.map((item) => (
                            <div 
                                key={item.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '12px',
                                    borderBottom: '1px solid #f3f2f1',
                                    cursor: 'pointer'
                                }}
                                onClick={() => handleItemToggle(item.id)}
                            >
                                <Checkbox
                                    checked={selectedItems.has(item.id)}
                                    onChange={() => handleItemToggle(item.id)}
                                    style={{ marginRight: '12px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <Text weight="semibold" style={{ display: 'block' }}>
                                        {item.displayName}
                                    </Text>
                                    <Text size={200} style={{ color: '#616161', display: 'block' }}>
                                        {item.type}
                                    </Text>
                                    {item.description && (
                                        <Text size={200} style={{ color: '#616161', display: 'block', marginTop: '4px' }}>
                                            {item.description}
                                        </Text>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Dialog Actions */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #e1dfdd'
            }}>
                <div>
                    {currentStep === 2 && (
                        <Button appearance="secondary" onClick={handleBack}>
                            {t('Back')}
                        </Button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button appearance="secondary" onClick={handleCancel}>
                        {t('Cancel')}
                    </Button>
                    {currentStep === 1 && (
                        <Button 
                            appearance="primary" 
                            onClick={handleNext}
                            disabled={isNextButtonDisabled}
                        >
                            {t('Next')}
                        </Button>
                    )}
                    {currentStep === 2 && (
                        <Button 
                            appearance="primary" 
                            onClick={handleCreatePackage}
                            disabled={isCreateButtonDisabled}
                        >
                            {t('Create Package')} {selectedItems.size > 0 && `(${selectedItems.size})`}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
