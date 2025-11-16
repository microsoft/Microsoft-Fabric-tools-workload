import React from "react";
import { PageProps } from "../../../../App";
import { useTranslation } from "react-i18next";
import { useParams, useLocation } from "react-router-dom";
import { callDialogClose } from "../../../../controller/DialogController";
import { CloseMode } from "@ms-fabric/workload-client";
import { DeploymentLocation, WorkspaceConfig, Package } from "../../PackageInstallerItemModel";
import { WizardControl, WizardStep } from '../../../../controls';
import { ConfigureStep, SummaryStep } from './index';

export interface DeployPackageWizardProps extends PageProps {
    packageId: string;
    deploymentId: string;
    itemObjectId: string;
    deploymentLocation?: DeploymentLocation; // Optional deployment location
    packageData?: Package; // Optional package data passed from editor
}

export interface DeployPackageWizardResult {
    state: 'deploy' | 'cancel';
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
    
    // Get item count from loaded package
    const itemCount = packageData?.items?.length || 0;

    // Check what kind of selection we need to show
    const needsCapacitySelection = deploymentLocation === DeploymentLocation.NewWorkspace;
    const needsWorkspaceSelection = deploymentLocation === DeploymentLocation.Default;
    const needsFolderName = deploymentLocation === DeploymentLocation.Default;

    const handleCancel = () => {
      // Close the dialog with a cancelled result
      var result = { state: 'cancel' } as DeployPackageWizardResult;
      callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    const handleStartDeployment = () => {
      // Close the dialog with a success result
      var result = { 
        state: 'deploy',
        workspaceConfig: {
          id: needsWorkspaceSelection ? selectedWorkspaceId : undefined,
          name: needsCapacitySelection ? workspaceName : undefined, // Set workspace name for new workspaces
          capacityId: needsCapacitySelection ? selectedCapacityId : undefined,
          createNew: !needsWorkspaceSelection,
          folder: {
            //TODO: change to a floder selector
            createNew: deploymentLocation === DeploymentLocation.Default,            
            parentFolderId: undefined,
            name: needsFolderName ? folderName : undefined
          }
        } as WorkspaceConfig,
      } as DeployPackageWizardResult;      
      callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    // Wizard configuration
    const wizardSteps: WizardStep[] = [
        {
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
        },
        {
            id: "summary",
            title: t('Review & Deploy'),
            description: t('Review your configuration and start the deployment'),
            component: SummaryStep
        }
    ];

    // Create initial wizard context with all necessary data
    const initialWizardContext = {
        workloadClient,
        packageId,
        deploymentId,
        itemCount,
        needsCapacitySelection,
        needsWorkspaceSelection,
        needsFolderName,
        selectedCapacityId,
        workspaceName,
        selectedWorkspaceId,
        folderName
    };

    // Handle wizard completion
    const handleWizardComplete = () => {
        handleStartDeployment();
    };

    return (
        <WizardControl
            title={t('Configure the installation')}
            steps={wizardSteps}
            initialStepId="configure"
            onComplete={handleWizardComplete}
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
    
    // Parse URL parameters
    const urlParams = new URLSearchParams(location.search);
    const packageId = urlParams.get('packageId') || '';
    const deploymentId = urlParams.get('deploymentId') || '';
    const deploymentLocationStr = urlParams.get('deploymentLocation') || 'NewWorkspace';
    const packageDataStr = urlParams.get('packageData');
    
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