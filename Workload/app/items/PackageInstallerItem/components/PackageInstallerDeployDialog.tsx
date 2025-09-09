import React, { useState } from "react";
import { PageProps } from "../../../App";
import { Button, Text, Input } from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { useParams, useLocation } from "react-router-dom";
import { callDialogClose } from "../../../controller/DialogController";
import { CloseMode } from "@ms-fabric/workload-client";
import { DeploymentLocation, WorkspaceConfig, Package } from "../PackageInstallerItemModel";
import { CapacityDropdown } from "./CapacityDropdown";
import { WorkspaceDropdown } from "./WorkspaceDropdown";
import { WizardControl, WizardStep } from "../../../controls/WizardControl";


export interface PackageInstallerDeployProps extends PageProps {
    packageId: string;
    deploymentId: string;
    itemObjectId: string;
    deploymentLocation?: DeploymentLocation; // Optional deployment location
    packageData?: Package; // Optional package data passed from editor
}

export interface PackageInstallerDeployResult {
    state: 'deploy' | 'cancel';
    workspaceConfig?: WorkspaceConfig; // Optional workspace configuration if selected
}

export function PackageInstallerDeployDialog(props: PackageInstallerDeployProps) {
    const { t } = useTranslation();
    const { workloadClient, deploymentLocation, packageId, deploymentId, packageData: propsPackageData } = props;
    
    const [currentStepId, setCurrentStepId] = useState<string>("configure");
    const [selectedCapacityId, setSelectedCapacityId] = useState<string>("");
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
    const [workspaceName, setWorkspaceName] = useState<string>(`${packageId} - ${deploymentId}`);
    const [folderName, setFolderName] = useState<string>(`${packageId} - ${deploymentId}`);
    
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
      var result = { state: 'cancel' } as PackageInstallerDeployResult;
      callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    const handleNext = () => {
        setCurrentStepId("summary");
    };

    const handleBack = () => {
        setCurrentStepId("configure");
    };

    const handleStepChange = (stepId: string) => {
        // Only allow navigation to completed steps or current step
        if (stepId === "configure" || (stepId === "summary" && isConfigurationComplete)) {
            setCurrentStepId(stepId);
        }
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
      } as PackageInstallerDeployResult;      
      callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    const isStartButtonDisabled = 
        (needsCapacitySelection && !selectedCapacityId) || 
        (needsWorkspaceSelection && !selectedWorkspaceId) ||
        (needsCapacitySelection && !workspaceName.trim()) || // Require workspace name for new workspaces
        (needsFolderName && !folderName.trim()); // Require folder name for new folders

    const isConfigurationComplete = !isStartButtonDisabled;

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
            completed: currentStepId !== "configure"
        },
        {
            id: "summary",
            title: t('Review & Deploy'),
            description: t('Review your configuration and start the deployment'),
            completed: false
        }
    ];

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '20px 20px 0 20px' }}>
                <Text size={500} weight="semibold">
                    {t('Configure the installation')}
                </Text>
            </div>

            {/* Main Content */}
            <WizardControl
                    steps={wizardSteps}
                    currentStepId={currentStepId}
                    onStepChange={handleStepChange}
                    style={{ flex: 1 }}
                    footer={
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: '16px 20px 20px 20px'
                    }}>
                        <div>
                            {currentStepId === "summary" && (
                                <Button appearance="secondary" onClick={handleBack}>
                                    {t('Back')}
                                </Button>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Button 
                                appearance="secondary" 
                                onClick={handleCancel}
                            >
                                {t('Cancel')}
                            </Button>
                            {currentStepId === "configure" && (
                                <Button 
                                    appearance="primary" 
                                    onClick={handleNext}
                                    disabled={isStartButtonDisabled}
                                >
                                    {t('Next')}
                                </Button>
                            )}
                            {currentStepId === "summary" && (
                                <Button 
                                    appearance="primary" 
                                    onClick={handleStartDeployment}
                                >
                                    {t('Start Installation')}
                                </Button>
                            )}
                        </div>
                    </div>
                }
            >
                {currentStepId === "configure" ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <Text>
                                {needsCapacitySelection 
                                    ? t('Select a capacity for the new workspace and start the deployment.')
                                    : needsWorkspaceSelection && needsFolderName
                                    ? t('Select an existing workspace and specify the folder name for deployment.')
                                    : needsWorkspaceSelection
                                    ? t('Select an existing workspace and start the deployment.')
                                    : t('This will deploy the package to your selected workspace.')
                                }
                            </Text>
                        </div>
                        
                        {/* Show capacity selection if needed */}
                        {needsCapacitySelection && (
                            <div style={{ marginBottom: '20px' }}>
                                <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                                    {t('Capacity')}
                                </Text>
                                <CapacityDropdown
                                    workloadClient={workloadClient}
                                    selectedCapacityId={selectedCapacityId}
                                    onCapacitySelect={setSelectedCapacityId}
                                    placeholder={t('Select a capacity')}
                                />
                            </div>
                        )}

                        {/* Show workspace name input for new workspaces */}
                        {needsCapacitySelection && (
                            <div style={{ marginBottom: '20px' }}>
                                <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                                    {t('Workspace Name')}
                                </Text>
                                <Input
                                    value={workspaceName}
                                    onChange={(ev, data) => setWorkspaceName(data.value)}
                                    placeholder={t('Enter workspace name')}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        )}

                        {/* Show workspace selection if needed */}
                        {needsWorkspaceSelection && (
                            <div style={{ marginBottom: '20px' }}>
                                <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                                    {t('Workspace')}
                                </Text>
                                <WorkspaceDropdown
                                    workloadClient={workloadClient}
                                    selectedWorkspaceId={selectedWorkspaceId}
                                    onWorkspaceSelect={setSelectedWorkspaceId}
                                    placeholder={t('Select a workspace')}
                                />
                            </div>
                        )}

                        {/* Show folder name input for new folders */}
                        {needsFolderName && (
                            <div style={{ marginBottom: '20px' }}>
                                <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                                    {t('Folder Name')}
                                </Text>
                                <Input
                                    value={folderName}
                                    onChange={(ev, data) => setFolderName(data.value)}
                                    placeholder={t('Enter folder name')}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <Text>
                                {t('Review your configuration and start the deployment. This package contains {{itemCount}} items that will be deployed to your selected workspace.', { itemCount })}
                            </Text>
                        </div>

                        {/* Configuration Summary */}
                        <div style={{ 
                            padding: '16px', 
                            backgroundColor: '#f8f9fa', 
                            borderRadius: '4px', 
                            border: '1px solid #e1dfdd',
                            marginBottom: '20px'
                        }}>
                            <Text weight="semibold" style={{ display: 'block', marginBottom: '12px' }}>
                                {t('Configuration Summary')}
                            </Text>
                            
                            {/* Package Information */}
                            <div style={{ marginBottom: '12px' }}>
                                <Text weight="semibold" style={{ marginRight: '8px' }}>
                                    {t('Package:')}
                                </Text>
                                <Text>{packageId}</Text>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <Text weight="semibold" style={{ marginRight: '8px' }}>
                                    {t('Deployment ID:')}
                                </Text>
                                <Text>{deploymentId}</Text>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                                <Text weight="semibold" style={{ marginRight: '8px' }}>
                                    {t('Items to Deploy:')}
                                </Text>
                                <Text>{itemCount}</Text>
                            </div>

                            {/* Workspace Configuration */}
                            {needsCapacitySelection && (
                                <>
                                    <div style={{ marginBottom: '8px' }}>
                                        <Text weight="semibold" style={{ marginRight: '8px' }}>
                                            {t('New Workspace Name:')}
                                        </Text>
                                        <Text>{workspaceName}</Text>
                                    </div>
                                    <div style={{ marginBottom: '8px' }}>
                                        <Text weight="semibold" style={{ marginRight: '8px' }}>
                                            {t('Capacity ID:')}
                                        </Text>
                                        <Text>{selectedCapacityId}</Text>
                                    </div>
                                </>
                            )}

                            {needsWorkspaceSelection && (
                                <div style={{ marginBottom: '8px' }}>
                                    <Text weight="semibold" style={{ marginRight: '8px' }}>
                                        {t('Target Workspace:')}
                                    </Text>
                                    <Text>{selectedWorkspaceId}</Text>
                                </div>
                            )}

                            {needsFolderName && (
                                <div style={{ marginBottom: '8px' }}>
                                    <Text weight="semibold" style={{ marginRight: '8px' }}>
                                        {t('Folder Name:')}
                                    </Text>
                                    <Text>{folderName}</Text>
                                </div>
                            )}
                        </div>

                        {/* Warning/Info Box */}
                        <div style={{ 
                            padding: '12px', 
                            backgroundColor: '#fff4ce', 
                            borderRadius: '4px', 
                            border: '1px solid #fde047',
                            marginBottom: '20px'
                        }}>
                            <Text size={200} style={{ color: '#92400e' }}>
                                <strong>{t('Note:')}</strong> {t('This deployment will create {{itemCount}} new items in your workspace. Make sure you have the necessary permissions and capacity.', { itemCount })}
                            </Text>
                        </div>
                    </div>
                )}
            </WizardControl>
        </div>
    );
}

// Wrapper component to handle URL parameters for PackageInstallerDeployDialog
export function PackageInstallerDeployDialogWrapper({ workloadClient }: PageProps) {
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
    
    const props: PackageInstallerDeployProps = {
        workloadClient,
        packageId,
        deploymentId,
        itemObjectId: itemObjectId || '',
        deploymentLocation,
        packageData
    };
    
    return <PackageInstallerDeployDialog {...props} />;
}

export default PackageInstallerDeployDialog;