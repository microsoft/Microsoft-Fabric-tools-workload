/**
 * @fileoverview Select Step - Item selection step for PackagingWizard
 */

import React, { useEffect} from 'react';
import { Text, Checkbox, Spinner, SearchBox, Button } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { WizardStepProps } from '../../../../controls';

interface SelectStepProps extends WizardStepProps {
    // Additional props specific to select step
}

export function SelectStep(props: SelectStepProps) {
    const { wizardContext, updateContext } = props;
    const { t } = useTranslation();

    // Extract context data
    const {
        selectedWorkspaceId,
        items,
        selectedItems,
        searchText,
        error,
        isLoadingItems,
        loadItems
    } = wizardContext;
    
    // Calculate filtered items directly (no useEffect needed)
    const actualFilteredItems = React.useMemo(() => {
        if (!items) return [];
        return items.filter((item: any) => 
            !searchText || item.displayName.toLowerCase().includes(searchText.toLowerCase())
        );
    }, [items, searchText]);
    
    // Calculate isAllSelected directly (no useEffect needed)
    const actualIsAllSelected = React.useMemo(() => {
        return actualFilteredItems.length > 0 && 
            actualFilteredItems.every((item: any) => selectedItems.has(item.id));
    }, [actualFilteredItems, selectedItems]);

    // Load items when component mounts and workspace is selected
    useEffect(() => {
        if (selectedWorkspaceId && loadItems && (!items || items.length === 0) && !isLoadingItems) {
            loadItems(selectedWorkspaceId, updateContext);
        }
    }, [selectedWorkspaceId]); // Only trigger when workspace changes
    
    const setSearchText = (text: string) => updateContext('searchText', text);
    const handleItemToggle = (itemId: string) => {
        const newSelectedItems = new Set(selectedItems);
        if (newSelectedItems.has(itemId)) {
            newSelectedItems.delete(itemId);
        } else {
            newSelectedItems.add(itemId);
        }
        updateContext('selectedItems', newSelectedItems);
    };

    const handleSelectAll = (ev: any, data: any) => {
        const newSelectedItems = new Set(selectedItems);
        if (data.checked) {
            // Add all filtered items
            actualFilteredItems.forEach((item: any) => newSelectedItems.add(item.id));
        } else {
            // Remove all filtered items
            actualFilteredItems.forEach((item: any) => newSelectedItems.delete(item.id));
        }
        updateContext('selectedItems', newSelectedItems);
    };

    return (
        <div>
            <div style={{ marginBottom: '16px' }}>
                <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
                    {t('Items from')} "{selectedWorkspaceId}" {items.length > 0 && `(${selectedItems.size}/${items.length} selected)`}
                </Text>
                
                {/* Search and Select All */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <SearchBox
                        placeholder={t('Search items...')}
                        value={searchText || ''}
                        onChange={(ev, data) => setSearchText(data.value)}
                        style={{ flex: 1 }}
                    />
                    {actualFilteredItems.length > 0 && (
                        <Checkbox
                            checked={actualIsAllSelected}
                            onChange={handleSelectAll}
                            label={t('Select All')}
                        />
                    )}
                </div>
            </div>

            {/* Items List */}
            <div style={{ 
                flex: 1,
                overflowY: 'auto',
                border: '1px solid #e1dfdd',
                borderRadius: '4px',
                padding: '8px',
                minHeight: '200px',
                position: 'relative'
            }}>
                {isLoadingItems && (
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
                        <Spinner label={t('Loading items...')} />
                    </div>
                )}

                {error && (
                    <div style={{ color: '#d13438', padding: '16px', textAlign: 'center' }}>
                        <Text>{error}</Text>
                        <div style={{ marginTop: '8px' }}>
                            <Button size="small" onClick={() => loadItems(selectedWorkspaceId, updateContext)}>
                                {t('Retry')}
                            </Button>
                        </div>
                    </div>
                )}

                {!isLoadingItems && !error && actualFilteredItems.length === 0 && items.length > 0 && (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#616161' }}>
                        <Text>{t('No items match your search.')}</Text>
                    </div>
                )}

                {!isLoadingItems && !error && items.length === 0 && selectedWorkspaceId && (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#616161' }}>
                        <Text>{t('No items found in this workspace.')}</Text>
                    </div>
                )}

                {!isLoadingItems && !error && actualFilteredItems.map((item: any) => (
                    <div 
                        key={item.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px',
                            borderBottom: '1px solid #f3f2f1'
                        }}
                    >
                        <Checkbox
                            checked={selectedItems.has(item.id)}
                            onChange={() => handleItemToggle(item.id)}
                            style={{ marginRight: '12px' }}
                        />
                        <div style={{ flex: 1 }}>
                            <Text weight="semibold" style={{ display: 'block' }}>
                                {item.displayName}
                            </Text>
                            <Text size={200} style={{ color: '#616161', display: 'block' }}>
                                {item.type}
                            </Text>
                            {item.description && (
                                <Text size={200} style={{ color: '#616161', display: 'block', marginTop: '4px' }}>
                                    {item.description}
                                </Text>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}