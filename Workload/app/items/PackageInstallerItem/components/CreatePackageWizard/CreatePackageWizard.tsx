import React, { useState, useEffect } from "react";
import { useParams } from 'react-router-dom';
import { PageProps, ContextProps } from "../../../../App";
import { useTranslation } from "react-i18next";
import { callDialogClose } from "../../../../controller/DialogController";
import { CloseMode } from "@ms-fabric/workload-client";
import { Item } from "../../../../clients/FabricPlatformTypes";
import { DeploymentLocation, PackageInstallerItemDefinition } from "../../PackageInstallerItemModel";
import { WizardControl, WizardStep } from '../../../../components';
import { ConfigStep, SelectStep, SummaryStep } from './index';
import { getWorkloadItem, ItemWithDefinition } from '../../../../controller/ItemCRUDController';
import { FabricPlatformAPIClient } from "../../../../clients/FabricPlatformAPIClient";
import { PackageContext } from "../../package/PackageContext";

export interface CreatePackageWizardProps extends PageProps {
    title?: string;
    description?: string;
}

export interface CreatePackageWizardResult {
    state: 'package' | 'cancel';
    selectedItems?: Item[];
    workspaceId?: string;
    packageDisplayName?: string;
    packageDescription?: string;
    deploymentLocation?: DeploymentLocation;
    updateItemReferences?: boolean;
}

export function CreatePackageWizard(props: CreatePackageWizardProps) {
    const { t } = useTranslation();
    const { workloadClient, title, description } = props;

    const wizardSteps: WizardStep[] = [
        {
            id: "config",
            title: t("Package Configuration"),
            description: t("Configure your package settings"),
            component: ConfigStep,
            validate: (context: Record<string, any>) => {
                // Check if workspace and display name are provided
                if (!context.selectedWorkspaceId || context.selectedWorkspaceId.trim() === '') {
                    return false;
                }
                if (!context.packageDisplayName || context.packageDisplayName.trim() === '') {
                    return false;
                }
                return true;
            }
        },
        {
            id: "select", 
            title: t("Select Items"),
            description: t("Choose items to include"),
            component: SelectStep
        },
        {
            id: "summary",
            title: t("Review & Create"),
            description: t("Review your package and create it"),
            component: SummaryStep
        }
    ];    

    const initialWizardContext = {
        workloadClient,
        title,
        description,
        selectedWorkspaceId: "",
        packageDisplayName: "",
        packageDescription: "",
        deploymentLocation: DeploymentLocation.Default,
        items: [] as Item[],
        selectedItems: new Set<string>(),
        isLoadingItems: false,
        searchText: "",
        error: "",
        updateItemReferences: true,
        filteredItems: [] as Item[],
        isAllSelected: false,
        loadItems: async (workspaceId?: string, updateContext?: (key: string, value: any) => void) => {
            // This function will be called by the SelectStep
            if (!updateContext) return;
            
            const targetWorkspaceId = workspaceId || "";
            if (!targetWorkspaceId.trim()) {
                updateContext('isLoadingItems', false);
                return;
            }

            try {
                updateContext('isLoadingItems', true);
                updateContext('error', '');
                updateContext('items', []); // Clear existing items while loading
                updateContext('filteredItems', []); // Clear filtered items while loading
                updateContext('selectedItems', new Set()); // Clear selections while loading
                
                console.log('Loading items for workspace:', targetWorkspaceId);
                const fabricClient = new FabricPlatformAPIClient(workloadClient);
                const allItems = await fabricClient.items.getAllItems(targetWorkspaceId);
                
                // Filter out unsupported item types (like SQLEndpoint)
                const filteredItems = allItems.filter(item => 
                    !PackageContext.UNSUPPORTED_PACKAGE_ITEM_TYPES.includes(item.type)
                );
                
                console.log('Loaded items:', allItems.length, 'filtered to:', filteredItems.length);
                updateContext('items', filteredItems);
                updateContext('filteredItems', filteredItems);
            } catch (error) {
                console.error('Failed to load items:', error);
                updateContext('error', t('Failed to load items from workspace'));
                updateContext('items', []); // Ensure items are cleared on error
                updateContext('filteredItems', []); // Ensure filtered items are cleared on error
            } finally {
                updateContext('isLoadingItems', false);
            }
        }
    };

    const handleComplete = (context: Record<string, any>) => {
        const selectedItemsList = context.items?.filter((item: any) => context.selectedItems?.has(item.id)) || [];
        const result: CreatePackageWizardResult = { 
            state: 'package',
            selectedItems: selectedItemsList,
            workspaceId: context.selectedWorkspaceId,
            packageDisplayName: context.packageDisplayName,
            packageDescription: context.packageDescription,
            deploymentLocation: context.deploymentLocation,
            updateItemReferences: context.updateItemReferences
        };
        callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    const handleCancel = () => {
        const result: CreatePackageWizardResult = { state: 'cancel' };
        callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    return (
       <WizardControl
            title={title || t('Create a new Package')}
            steps={wizardSteps}
            initialStepId="config"
            onComplete={handleComplete}
            onCancel={handleCancel}
            initialContext={initialWizardContext}
            showNavigation={true}
            navigationLabels={{
                complete: t('Create Package'),
                cancel: t('Cancel')
            }}
        />
    );
}

// Wrapper component to handle URL parameters and provide a consistent interface
export function CreatePackageWizardWrapper(props: PageProps) {
    const pageContext = useParams<ContextProps>();
    const { workloadClient } = props;
    const [editorItem, setEditorItem] = useState<ItemWithDefinition<PackageInstallerItemDefinition> | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadItem();
    }, [pageContext.itemObjectId]);

    async function loadItem() {
        if (pageContext.itemObjectId) {
            try {
                const item = await getWorkloadItem<PackageInstallerItemDefinition>(
                    workloadClient,
                    pageContext.itemObjectId
                );
                setEditorItem(item);
            } catch (error) {
                console.error('Failed to load item:', error);
            }
        }
        setIsLoading(false);
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!editorItem) {
        return <div>Error loading item</div>;
    }

    return (
        <CreatePackageWizard
            workloadClient={workloadClient}
            title="Create a new Package"
            description="Package your workspace items for deployment to other environments"
        />
    );
}

export default CreatePackageWizard;