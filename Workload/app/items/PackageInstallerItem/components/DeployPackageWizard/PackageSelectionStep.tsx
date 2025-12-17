/**
 * @fileoverview Package Selection Step - Package selection step for DeployPackageWizard
 */

import React, { useEffect, useState } from 'react';
import { Text, Spinner, RadioGroup, Radio, SearchBox } from '@fluentui/react-components';
import { Archive24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { WizardStepProps } from '../../../../components';
import { PackageInstallerContext } from '../../package/PackageInstallerContext';
import { Package, PackageInstallerItemDefinition } from '../../PackageInstallerItemModel';
import { getWorkloadItem } from "../../../../controller/ItemCRUDController";
import { OneLakeStorageClient } from "../../../../clients/OneLakeStorageClient";

interface PackageSelectionStepProps extends WizardStepProps {
    // Additional props specific to package selection step
}

export function PackageSelectionStep(props: PackageSelectionStepProps) {
    const { wizardContext, updateContext } = props;
    const { t } = useTranslation();

    // Extract context data
    const {
        workloadClient
    } = wizardContext;

    const [isLoading, setIsLoading] = useState(true);
    const [packages, setPackages] = useState<Package[]>([]);
    const [searchText, setSearchText] = useState('');

    // Load packages when component mounts
    useEffect(() => {
        const loadPackages = async () => {
            try {
                setIsLoading(true);
                
                // Create a temporary context to load packages
                const tempContext = new PackageInstallerContext(workloadClient);
                await tempContext.packageRegistry.loadFromAssets();
                
                // Load packages from OneLake if itemObjectId is available
                if (wizardContext.itemObjectId) {
                    try {
                        const item = await getWorkloadItem<PackageInstallerItemDefinition>(
                            workloadClient, 
                            wizardContext.itemObjectId
                        );
                        
                        if (item?.definition?.oneLakePackages) {
                            const oneLakeClient = new OneLakeStorageClient(workloadClient).createItemWrapper(item);
                            
                            await Promise.all(item.definition.oneLakePackages.map(async (path) => {
                                try {
                                    const content = await oneLakeClient.readFileAsText(path);
                                    const pack = JSON.parse(content);
                                    tempContext.packageRegistry.addPackage(pack);
                                } catch (err) {
                                    console.error(`Failed to load package from ${path}:`, err);
                                }
                            }));
                        }
                    } catch (err) {
                        console.error('Failed to load item definition:', err);
                    }
                }

                // Get all available packages as array
                const allPackages = tempContext.packageRegistry.getPackagesArray();
                
                setPackages(allPackages);
                
                // Set the first package as default selection if available
                if (allPackages.length > 0 && !wizardContext.selectedPackageId) {
                    updateContext('selectedPackageId', allPackages[0].id);
                    updateContext('packageData', allPackages[0]);
                    updateContext('itemCount', allPackages[0].items?.length || 0);
                }
            } catch (error) {
                console.error('Error loading packages:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadPackages();
    }, [workloadClient, updateContext, wizardContext.selectedPackageId]);

    // Filter packages based on search text
    const filteredPackages = React.useMemo(() => {
        if (!searchText) return packages;
        return packages.filter(pkg => 
            pkg.displayName?.toLowerCase().includes(searchText.toLowerCase()) ||
            pkg.description?.toLowerCase().includes(searchText.toLowerCase()) ||
            pkg.id.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [packages, searchText]);

    const handlePackageSelect = (packageId: string) => {
        const selectedPackage = packages.find(pkg => pkg.id === packageId);
        if (selectedPackage) {
            updateContext('selectedPackageId', packageId);
            updateContext('packageData', selectedPackage);
            updateContext('itemCount', selectedPackage.items?.length || 0);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
            <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                    {t('Select Package to Deploy')} {packages.length > 0 && `(${packages.length} available)`}
                </Text>
                
                {/* Search */}
                <SearchBox
                    placeholder={t('Search packages...')}
                    value={searchText}
                    onChange={(ev, data) => setSearchText(data.value)}
                    style={{ marginBottom: '12px' }}
                />
            </div>

            {/* Packages List */}
            <div style={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                border: '1px solid #e1dfdd',
                borderRadius: '4px',
                padding: '8px',
                position: 'relative'
            }}>
                {isLoading && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        minHeight: '200px',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%'
                    }}>
                        <Spinner label={t('Loading packages...')} />
                    </div>
                )}

                {!isLoading && filteredPackages.length === 0 && packages.length > 0 && (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#616161' }}>
                        <Text>{t('No packages match your search.')}</Text>
                    </div>
                )}

                {!isLoading && packages.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#616161' }}>
                        <Text>{t('No packages available for deployment.')}</Text>
                    </div>
                )}

                {!isLoading && filteredPackages.length > 0 && (
                    <RadioGroup
                        value={wizardContext.selectedPackageId || ''}
                        onChange={(ev, data) => handlePackageSelect(data.value)}
                    >
                        {filteredPackages.map((pkg: Package) => (
                            <div 
                                key={pkg.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    padding: '12px',
                                    borderBottom: '1px solid #f3f2f1',
                                    cursor: 'pointer'
                                }}
                                onClick={() => handlePackageSelect(pkg.id)}
                            >
                                <Radio
                                    value={pkg.id}
                                    style={{ marginRight: '12px', marginTop: '2px' }}
                                />
                                {/* Package Icon */}
                                <div style={{ marginRight: '12px', marginTop: '2px' }}>
                                    {pkg.icon ? (
                                        <img 
                                            src={pkg.icon} 
                                            alt={pkg.displayName || pkg.id}
                                            style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                            onError={(e) => {
                                                // Fallback to default icon if image fails to load
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                target.parentElement!.innerHTML = '<div style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M5.5 7A1.5 1.5 0 0 0 4 8.5v7A1.5 1.5 0 0 0 5.5 17h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 18.5 7h-13ZM5.5 8h13a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5ZM8.5 6a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7ZM10 4.5a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0v-1ZM15 4.5a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0v-1Z"/></svg></div>';
                                            }}
                                        />
                                    ) : (
                                        <Archive24Regular style={{ color: '#616161' }} />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <Text weight="semibold" style={{ display: 'block' }}>
                                        {pkg.displayName || pkg.id}
                                    </Text>
                                    <Text size={200} style={{ color: '#616161', display: 'block' }}>
                                        {pkg.items?.length || 0} items • Version {pkg.version || '1.0.0'}
                                    </Text>
                                    {pkg.description && (
                                        <Text size={200} style={{ color: '#616161', display: 'block', marginTop: '4px' }}>
                                            {pkg.description}
                                        </Text>
                                    )}
                                </div>
                            </div>
                        ))}
                    </RadioGroup>
                )}
            </div>
        </div>
    );
}