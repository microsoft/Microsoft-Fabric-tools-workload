/**
 * @fileoverview Summary Step - Package summary step for PackagingWizard
 */

import React from 'react';
import { Text } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { WizardStepProps } from '../../../../components';
import { DeploymentLocation } from '../../PackageInstallerItemModel';

interface SummaryStepProps extends WizardStepProps {
    // Additional props specific to summary step
}

export function SummaryStep(props: SummaryStepProps) {
    const { wizardContext } = props;
    const { t } = useTranslation();

    // Extract context data
    const {
        packageDisplayName,
        packageDescription,
        selectedWorkspaceId,
        deploymentLocation,
        updateItemReferences,
        selectedItems,
        items
    } = wizardContext;

    // Get selected items details
    const selectedItemsList = items.filter((item: any) => selectedItems.has(item.id));

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <Text>
                    {t('Review your package configuration and the selected items. Click "Create Package" to generate the package.')}
                </Text>
            </div>

            {/* Package Configuration Summary */}
            <div style={{ 
                padding: '16px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px', 
                border: '1px solid #e1dfdd',
                marginBottom: '20px'
            }}>
                <Text weight="semibold" style={{ display: 'block', marginBottom: '12px' }}>
                    {t('Package Configuration')}
                </Text>
                
                <div style={{ marginBottom: '8px' }}>
                    <Text weight="semibold" style={{ marginRight: '8px' }}>
                        {t('Package Name:')}
                    </Text>
                    <Text>{packageDisplayName}</Text>
                </div>

                {packageDescription && (
                    <div style={{ marginBottom: '8px' }}>
                        <Text weight="semibold" style={{ marginRight: '8px' }}>
                            {t('Description:')}
                        </Text>
                        <Text>{packageDescription}</Text>
                    </div>
                )}

                <div style={{ marginBottom: '8px' }}>
                    <Text weight="semibold" style={{ marginRight: '8px' }}>
                        {t('Source Workspace:')}
                    </Text>
                    <Text>{selectedWorkspaceId}</Text>
                </div>

                <div style={{ marginBottom: '8px' }}>
                    <Text weight="semibold" style={{ marginRight: '8px' }}>
                        {t('Deployment Location:')}
                    </Text>
                    <Text>
                        {deploymentLocation === DeploymentLocation.Default ? 
                            t('Default - Use default deployment location') :
                            t('New Workspace - Create a new workspace for this package')
                        }
                    </Text>
                </div>

                <div style={{ marginBottom: '8px' }}>
                    <Text weight="semibold" style={{ marginRight: '8px' }}>
                        {t('Update Item References:')}
                    </Text>
                    <Text>{updateItemReferences ? t('Yes') : t('No')}</Text>
                </div>
            </div>

            {/* Selected Items Summary */}
            <div style={{ 
                padding: '16px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '4px', 
                border: '1px solid #e1dfdd',
                marginBottom: '20px'
            }}>
                <Text weight="semibold" style={{ display: 'block', marginBottom: '12px' }}>
                    {t('Selected Items')} ({selectedItemsList.length})
                </Text>
                
                {selectedItemsList.length === 0 ? (
                    <Text style={{ color: '#616161', fontStyle: 'italic' }}>
                        {t('No items selected')}
                    </Text>
                ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {selectedItemsList.map((item: any, index: number) => (
                            <div key={item.id} style={{ 
                                padding: '8px 0', 
                                borderBottom: index < selectedItemsList.length - 1 ? '1px solid #f3f2f1' : 'none' 
                            }}>
                                <Text weight="semibold" style={{ display: 'block' }}>
                                    {item.displayName}
                                </Text>
                                <Text size={200} style={{ color: '#616161', display: 'block' }}>
                                    {item.type}
                                </Text>
                                {item.description && (
                                    <Text size={200} style={{ color: '#616161', display: 'block', marginTop: '2px' }}>
                                        {item.description}
                                    </Text>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Warning/Info Box */}
            <div style={{ 
                padding: '12px', 
                backgroundColor: '#fff4ce', 
                borderRadius: '4px', 
                border: '1px solid #fde047'
            }}>
                <Text size={200} style={{ color: '#92400e' }}>
                    <strong>{t('Note:')}</strong> {t('This will create a package containing {{count}} items that can be deployed to other workspaces.', { count: selectedItemsList.length })}
                </Text>
            </div>
        </div>
    );
}