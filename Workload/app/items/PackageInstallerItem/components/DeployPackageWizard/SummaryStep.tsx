/**
 * @fileoverview Summary Step - Deployment summary step for DeployPackageWizard
 */

import React from 'react';
import { Text } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { WizardStepProps } from '../../../../components';

interface SummaryStepProps extends WizardStepProps {
    // Additional props specific to summary step
}

export function SummaryStep(props: SummaryStepProps) {
    const { wizardContext } = props;
    const { t } = useTranslation();

    // Extract context data
    const {
        packageId,
        deploymentId,
        itemCount,
        needsCapacitySelection,
        needsWorkspaceSelection,
        needsFolderName,
        workspaceName,
        selectedCapacityId,
        selectedWorkspaceId,
        folderName
    } = wizardContext;

    return (
        <div>
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

                {needsFolderName && folderName && (
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
    );
}