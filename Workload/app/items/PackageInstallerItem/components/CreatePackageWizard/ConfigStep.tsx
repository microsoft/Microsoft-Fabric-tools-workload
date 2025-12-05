/**
 * @fileoverview Config Step - Package configuration step for PackagingWizard
 */

import React from 'react';
import { Text, Input, Textarea, Dropdown, Option, Checkbox } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { WizardStepProps } from '../../../../components';
import { WorkspaceDropdown } from '../WorkspaceDropdown';
import { DeploymentLocation } from '../../PackageInstallerItemModel';

interface ConfigStepProps extends WizardStepProps {
    // Additional props specific to config step
}

export function ConfigStep(props: ConfigStepProps) {
    const { wizardContext, updateContext } = props;
    const { t } = useTranslation();

    // Extract context data
    const {
        workloadClient,
        description,
        selectedWorkspaceId,
        packageDisplayName,
        packageDescription,
        deploymentLocation,
        updateItemReferences
    } = wizardContext;

    const setSelectedWorkspaceId = (workspaceId: string) => {
        updateContext('selectedWorkspaceId', workspaceId);
        // Clear items when workspace changes to prevent showing stale data
        updateContext('items', []);
        updateContext('filteredItems', []);
        updateContext('selectedItems', new Set());
        updateContext('error', '');
        updateContext('isLoadingItems', false);
    };
    const setPackageDisplayName = (name: string) => updateContext('packageDisplayName', name);
    const setPackageDescription = (desc: string) => updateContext('packageDescription', desc);
    const setDeploymentLocation = (location: DeploymentLocation) => updateContext('deploymentLocation', location);
    const setUpdateItemReferences = (update: boolean) => updateContext('updateItemReferences', update);

    return (
        <div>
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
                    value={packageDisplayName || ''}
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
                    value={packageDescription || ''}
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
                    value={deploymentLocation ? DeploymentLocation[deploymentLocation as keyof typeof DeploymentLocation] : DeploymentLocation[DeploymentLocation.Default]}
                    selectedOptions={[deploymentLocation ? DeploymentLocation[deploymentLocation as keyof typeof DeploymentLocation] : DeploymentLocation[DeploymentLocation.Default]]}
                    onOptionSelect={(ev, data) => {
                        const selectedKey = data.optionValue as string;
                        const selectedLocation = Object.entries(DeploymentLocation).find(
                            ([key, value]) => value === selectedKey
                        )?.[0];
                        if (selectedLocation) {
                            setDeploymentLocation(DeploymentLocation[selectedLocation as keyof typeof DeploymentLocation]);
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
                    checked={updateItemReferences || false}
                    onChange={(ev, data) => setUpdateItemReferences(data.checked === true)}
                    label={
                        <div>
                            <Text weight="semibold" style={{ display: 'block' }}>
                                {t('Update Item References')}
                            </Text>
                            <Text size={200} style={{ color: '#616161', display: 'block', marginTop: '2px' }}>
                                {t('Automatically replace item IDs with placeholder tokens (e.g., {{ItemName}}) to make the package more portable')}
                            </Text>
                        </div>
                    }
                />
            </div>
        </div>
    );
}