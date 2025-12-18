/**
 * @fileoverview Configure Step - Deployment configuration step for DeployPackageWizard
 */

import React from 'react';
import { Text, Input } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { WizardStepProps } from '../../../../components';
import { CapacityDropdown } from '../CapacityDropdown';
import { WorkspaceDropdown } from '../WorkspaceDropdown';

interface ConfigureStepProps extends WizardStepProps {
    // Additional props specific to configure step
}

export function ConfigureStep(props: ConfigureStepProps) {
    const { wizardContext, updateContext } = props;
    const { t } = useTranslation();

    // Extract context data
    const {
        workloadClient,
        needsCapacitySelection,
        needsWorkspaceSelection,
        needsFolderName,
        selectedCapacityId,
        workspaceName,
        selectedWorkspaceId,
        folderName,
        packageId,
        selectedPackageId,
        deploymentId,
    } = wizardContext;

    // Generate a user-friendly default workspace name if not properly set
    let displayWorkspaceName = workspaceName;
    if (!displayWorkspaceName || displayWorkspaceName.includes('undefined') || displayWorkspaceName.trim() === '') {
        const finalPackageId = selectedPackageId || packageId;
        const packageDisplayName = finalPackageId || 'Package';
        displayWorkspaceName = `${packageDisplayName} - ${deploymentId}`;
        
        // Update the context with the generated name
        if (updateContext) {
            updateContext('workspaceName', displayWorkspaceName);
        }
    }

    const setSelectedCapacityId = (capacityId: string) => updateContext('selectedCapacityId', capacityId);
    const setWorkspaceName = (name: string) => updateContext('workspaceName', name);
    const setSelectedWorkspaceId = (workspaceId: string) => updateContext('selectedWorkspaceId', workspaceId);
    const setFolderName = (name: string) => updateContext('folderName', name);

    return (
        <div>
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
                        value={displayWorkspaceName || ''}
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

            {/* Show folder name input if needed */}
            {needsFolderName && (
                <div style={{ marginBottom: '20px' }}>
                    <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                        {t('Folder Name')}
                    </Text>
                    <Input
                        value={folderName || ''}
                        onChange={(ev, data) => setFolderName(data.value)}
                        placeholder={t('Enter folder name')}
                        style={{ width: '100%' }}
                    />
                    <Text size={200} style={{ color: 'var(--colorNeutralForeground2)', marginTop: '4px' }}>
                        {t('Optional: Specify a folder name where the package items will be deployed.')}
                    </Text>
                </div>
            )}
        </div>
    );
}