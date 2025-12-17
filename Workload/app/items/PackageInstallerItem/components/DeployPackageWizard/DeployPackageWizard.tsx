import React from "react";
import { PageProps } from "../../../../App";
import { useTranslation } from "react-i18next";
import { useParams, useLocation } from "react-router-dom";
import { callDialogClose } from "../../../../controller/DialogController";
import { CloseMode } from "@ms-fabric/workload-client";
import { DeploymentLocation, WorkspaceConfig, Package } from "../../PackageInstallerItemModel";
import { WizardControl, WizardStep } from '../../../../components';
import { ConfigureStep, SummaryStep, PackageSelectionStep } from './index';

export interface DeployPackageWizardProps extends PageProps {
    packageId: string;
    deploymentId: string;
    itemObjectId: string;
    deploymentLocation?: DeploymentLocation; // Optional deployment location
    packageData?: Package; // Optional package data passed from editor
}

export interface DeployPackageWizardResult {
    state: 'deploy' | 'cancel';
    packageId?: string; // The selected package ID
    workspaceConfig?: WorkspaceConfig; // Optional workspace configuration if selected
}

export function DeployPackageWizard(props: DeployPackageWizardProps) {
    const { t } = useTranslation();
    const { workloadClient, deploymentLocation, packageId, deploymentId, packageData: propsPackageData } = props;
    
    // Initial state values for wizard context
    const selectedCapacityId = "";
    const selectedWorkspaceId = "";
    const workspaceName = `${packageId} - ${deploymentId}`;
    const folderName = `${packageId} - ${deploymentId}`;
    
    // Use package data from props
    const packageData = propsPackageData;

    // Check what kind of selection we need to show
    const needsPackageSelection = !packageId || packageId.trim() === '';
    const needsCapacitySelection = deploymentLocation === DeploymentLocation.NewWorkspace;
    const needsWorkspaceSelection = deploymentLocation === DeploymentLocation.Default;
    const needsFolderName = deploymentLocation === DeploymentLocation.Default;

    // Wizard configuration - conditionally include package selection step
    const wizardSteps: WizardStep[] = [];
    
    // Add package selection step if no package ID provided
    if (needsPackageSelection) {
        wizardSteps.push({
            id: "package-selection",
            title: t('Select Package'),
            description: t('Choose the package to deploy'),
            component: PackageSelectionStep,
            validate: (context: Record<string, any>) => {
                return !!(context.selectedPackageId && context.selectedPackageId.trim() !== '');
            }
        });
    }
    
    // Add configuration step
    wizardSteps.push({
        id: "configure",
        title: t('Configure Installation'),
        description: needsCapacitySelection 
            ? t('Select a capacity and configure the new workspace')
            : needsWorkspaceSelection 
            ? t('Select an existing workspace and configure the deployment')
            : t('Configure the deployment settings'),
        component: ConfigureStep,
        validate: (context: Record<string, any>) => {
            // Check deployment location requirements
            if (needsCapacitySelection) {
                // For new workspace deployment, check if capacity is selected and workspace name is provided
                if (!context.selectedCapacityId || context.selectedCapacityId.trim() === '') {
                    return false;
                }
                if (!context.workspaceName || context.workspaceName.trim() === '') {
                    return false;
                }
            } else if (needsWorkspaceSelection) {
                // For existing workspace deployment, check if workspace is selected
                if (!context.selectedWorkspaceId || context.selectedWorkspaceId.trim() === '') {
                    return false;
                }
            }
            
            return true;
        }
    });
    
    // Add summary step
    wizardSteps.push({
        id: "summary",
        title: t('Review & Deploy'),
        description: t('Review your configuration and start the deployment'),
        component: SummaryStep
    });

    // Create initial wizard context with all necessary data
    const initialWizardContext = {
        workloadClient,
        itemObjectId: props.itemObjectId,
        packageId: needsPackageSelection ? '' : packageId,
        selectedPackageId: needsPackageSelection ? '' : packageId,
        packageData: needsPackageSelection ? null : packageData,
        deploymentId,
        itemCount: needsPackageSelection ? 0 : (packageData?.items?.length || 0),
        needsCapacitySelection,
        needsWorkspaceSelection,
        needsFolderName,
        selectedCapacityId,
        workspaceName: needsPackageSelection ? '' : workspaceName,
        selectedWorkspaceId,
        folderName: needsPackageSelection ? '' : folderName
    };

    // Handle wizard completion
    const handleComplete = (context: Record<string, any>) => {
        // Use the package ID from context (either from props or selected in wizard)
        const finalPackageId = context.selectedPackageId || packageId;
        
        // Debug: Log the context values to verify they are correct
        console.log('DeployPackageWizard: Starting deployment with context:', {
            selectedPackageId: finalPackageId,
            selectedCapacityId: context.selectedCapacityId,
            selectedWorkspaceId: context.selectedWorkspaceId,
            workspaceName: context.workspaceName,
            folderName: context.folderName,
            needsCapacitySelection,
            needsWorkspaceSelection,
            needsFolderName
        });

        // Close the dialog with a success result
        var result = { 
            state: 'deploy',
            packageId: finalPackageId, // Include the selected package ID
            workspaceConfig: {
            id: needsWorkspaceSelection ? context.selectedWorkspaceId : undefined,
            // Set workspace name for new workspaces
            name: needsCapacitySelection ? context.workspaceName : undefined, 
            capacityId: needsCapacitySelection ? context.selectedCapacityId : undefined,
            createNew: !needsWorkspaceSelection,
            folder: {
                //TODO: change to a folder selector
                createNew: deploymentLocation === DeploymentLocation.Default,            
                parentFolderId: undefined,
                name: needsFolderName ? context.folderName : undefined
            }
            } as WorkspaceConfig,
        } as DeployPackageWizardResult;      
        
        console.log('DeployPackageWizard: Returning result:', result);
        callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    const handleCancel = () => {
      // Close the dialog with a cancelled result
      var result = { state: 'cancel' } as DeployPackageWizardResult;
      callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    return (
        <WizardControl
            title={t('Configure the installation')}
            steps={wizardSteps}
            initialStepId={needsPackageSelection ? "package-selection" : "configure"}
            onComplete={handleComplete}
            onCancel={handleCancel}
            initialContext={initialWizardContext}
            showNavigation={true}
            navigationLabels={{
                complete: t('Start Installation'),
                cancel: t('Cancel')
            }}
        />
    );
}

// Wrapper component to handle URL parameters for DeployPackageWizard
export function DeployPackageWizardWrapper({ workloadClient }: PageProps) {
    const { itemObjectId } = useParams<{ itemObjectId: string }>();
    const location = useLocation();
    
    // Helper function for generating unique IDs (same as in PackageInstallerItemEditor)
    const generateUniqueId = () => {
        return Math.random().toString(36).substr(2, 9);
    };
    
    // Parse URL parameters
    const urlParams = new URLSearchParams(location.search);
    const packageId = urlParams.get('packageId') || '';
    let deploymentId = urlParams.get('deploymentId') || '';
    const deploymentLocationStr = urlParams.get('deploymentLocation') || 'NewWorkspace';
    const packageDataStr = urlParams.get('packageData');
    
    // Generate deployment ID if not provided
    if (!deploymentId || deploymentId.trim() === '') {
        deploymentId = generateUniqueId();
    }
    
    // Convert string to enum
    const deploymentLocation = DeploymentLocation[deploymentLocationStr as keyof typeof DeploymentLocation] || DeploymentLocation.NewWorkspace;
    
    // Parse package data if provided
    let packageData: Package | undefined;
    if (packageDataStr) {
        try {
            packageData = JSON.parse(decodeURIComponent(packageDataStr));
        } catch (error) {
            console.error('Failed to parse package data from URL:', error);
        }
    }
    
    const props: DeployPackageWizardProps = {
        workloadClient,
        packageId,
        deploymentId,
        itemObjectId: itemObjectId || '',
        deploymentLocation,
        packageData
    };
    
    return <DeployPackageWizard {...props} />;
}

export default DeployPackageWizard;