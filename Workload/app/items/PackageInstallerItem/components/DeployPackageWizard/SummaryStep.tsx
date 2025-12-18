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
        selectedPackageId,
        packageData,
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

    // Use selected package data if available, otherwise fall back to provided packageId
    const finalPackageId = selectedPackageId || packageId;
    const finalPackageData = packageData;
    const finalItemCount = packageData?.items?.length || itemCount || 0;
          

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <Text>
                    {t('Review your configuration and start the deployment. This package contains {{itemCount}} items that will be deployed to your selected workspace.', { itemCount: finalItemCount })}
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
                
                {/* Package Name */}
                <div style={{ marginBottom: '12px' }}>
                    <Text weight="semibold" style={{ marginRight: '8px' }}>
                        {t('Package Name:')}
                    </Text>
                    <Text>{finalPackageData?.id || finalPackageId}</Text>
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
                    <Text>{finalItemCount}</Text>
                </div>

                {/* Workspace Configuration */}
                {needsCapacitySelection && (
                    <>
                        <div style={{ marginBottom: '8px' }}>
                            <Text weight="semibold" style={{ marginRight: '8px' }}>
                                {t('Capacity ID:')}
                            </Text>
                            <Text>{selectedCapacityId}</Text>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <Text weight="semibold" style={{ marginRight: '8px' }}>
                                {t('Workspace Name:')}
                            </Text>
                            <Text>{workspaceName}</Text>
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
        </div>
    );
}