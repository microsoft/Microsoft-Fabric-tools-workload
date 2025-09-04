import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    Text,
    Button,
    Input,
    Field,
    Card,
    Spinner
} from '@fluentui/react-components';
import { Stack } from '@fluentui/react';
import { callGetItem } from '../../controller/ItemCRUDController';
import { callDialogClose } from '../../controller/DialogController';
import { WorkloadClientAPI, CloseMode } from '@ms-fabric/workload-client';

interface ImportShareDialogProps {
    workloadClient: WorkloadClientAPI;
}

interface ImportShareResult {
    state: 'import' | 'cancel';
    shareData?: {
        shareId: string;
        shareLink: string;
        displayName: string;
        description?: string;
    };
}

const ExternalDataShareItemImportShareDialog: React.FC<ImportShareDialogProps> = ({ workloadClient }) => {
    const { itemObjectId } = useParams<{ itemObjectId: string }>();
    const [shareLink, setShareLink] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [description, setDescription] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadItem() {
            try {
                if (!itemObjectId) {
                    throw new Error('No item ID provided');
                }

                await callGetItem(workloadClient, itemObjectId);
                setIsLoading(false);
            } catch (error) {
                console.error('Failed to load item:', error);
                setValidationError('Failed to load item information');
                setIsLoading(false);
            }
        }

        loadItem();
    }, [itemObjectId, workloadClient]);

    const validateShareLink = (link: string): { isValid: boolean; shareId?: string; error?: string } => {
        if (!link.trim()) {
            return { isValid: false, error: 'Share link cannot be empty' };
        }

        // Basic URL validation
        let url: URL;
        try {
            url = new URL(link);
        } catch {
            return { isValid: false, error: 'Please enter a valid URL' };
        }

        // Check for required parameters
        const invitationId = url.searchParams.get('invitationId');
        const providerTenantId = url.searchParams.get('providerTenantId') || url.searchParams.get('tenantId');

        if (!invitationId) {
            return { isValid: false, error: 'Share link must contain an invitationId parameter' };
        }

        if (!providerTenantId) {
            return { isValid: false, error: 'Share link must contain a providerTenantId or tenantId parameter' };
        }

        return { isValid: true, shareId: invitationId };
    };

    const handleImport = async () => {
        const validation = validateShareLink(shareLink);
        
        if (!validation.isValid) {
            setValidationError(validation.error || 'Invalid share link');
            return;
        }

        if (!displayName.trim()) {
            setValidationError('Display name is required');
            return;
        }

        setIsValidating(true);
        setValidationError(null);

        try {
            // In a real implementation, you would validate the share link with the API
            // For now, we'll just simulate validation
            await new Promise(resolve => setTimeout(resolve, 1000));

            const result: ImportShareResult = {
                state: 'import',
                shareData: {
                    shareId: validation.shareId!,
                    shareLink: shareLink,
                    displayName: displayName.trim(),
                    description: description.trim() || undefined
                }
            };

            callDialogClose(workloadClient, CloseMode.PopOne, result);
        } catch (error) {
            setValidationError('Failed to validate share link. Please check the link and try again.');
        } finally {
            setIsValidating(false);
        }
    };

    const handleCancel = () => {
        const result: ImportShareResult = {
            state: 'cancel'
        };
        callDialogClose(workloadClient, CloseMode.PopOne, result);
    };

    if (isLoading) {
        return (
            <Stack
                horizontalAlign="center"
                verticalAlign="center"
                tokens={{ padding: 40, childrenGap: 20 }}
                style={{ height: '100%', minHeight: 300 }}
            >
                <Spinner size="large" />
                <Text>Loading...</Text>
            </Stack>
        );
    }

    return (
        <Stack tokens={{ childrenGap: 20, padding: 24 }} style={{ height: '100%' }}>
            {/* Header */}
            <Stack>
                <Text weight="semibold" size={500}>Import Share</Text>
                <Text>Import a data share by entering the sharing link provided by the data owner.</Text>
            </Stack>

            {/* Content */}
            <Stack tokens={{ childrenGap: 16 }} style={{ flex: 1 }}>
                <Card>
                    <Stack tokens={{ childrenGap: 12, padding: 16 }}>
                        <Field label="Share Link" required>
                            <Input
                                placeholder="https://app.fabric.microsoft.com/...?invitationId=abc123&providerTenantId=xyz789"
                                value={shareLink}
                                onChange={(e, data) => {
                                    setShareLink(data.value);
                                    setValidationError(null);
                                    
                                    // Auto-suggest display name based on invitation ID
                                    if (data.value && !displayName) {
                                        const validation = validateShareLink(data.value);
                                        if (validation.isValid && validation.shareId) {
                                            setDisplayName(`Imported Share ${validation.shareId.substring(0, 8)}`);
                                        }
                                    }
                                }}
                                disabled={isValidating}
                            />
                        </Field>

                        <Field label="Display Name" required>
                            <Input
                                placeholder="Enter a name for this share"
                                value={displayName}
                                onChange={(e, data) => setDisplayName(data.value)}
                                disabled={isValidating}
                            />
                        </Field>

                        <Field label="Description">
                            <Input
                                placeholder="Optional description for this share"
                                value={description}
                                onChange={(e, data) => setDescription(data.value)}
                                disabled={isValidating}
                            />
                        </Field>

                        {validationError && (
                            <Text role="alert" style={{ color: 'var(--colorPaletteRedForeground1)' }}>
                                {validationError}
                            </Text>
                        )}

                        <Text size={200} style={{ color: 'var(--colorNeutralForeground3)' }}>
                            Enter the complete invitation link provided by the data owner. 
                            The link must include both invitationId and providerTenantId parameters.
                        </Text>
                    </Stack>
                </Card>
            </Stack>

            {/* Footer */}
            <Stack 
                horizontal 
                horizontalAlign="end" 
                tokens={{ childrenGap: 12 }}
                style={{ 
                    borderTop: '1px solid var(--colorNeutralStroke2)',
                    paddingTop: 16 
                }}
            >
                <Button
                    appearance="secondary"
                    onClick={handleCancel}
                    disabled={isValidating}
                >
                    Cancel
                </Button>
                <Button
                    appearance="primary"
                    onClick={handleImport}
                    disabled={!shareLink.trim() || !displayName.trim() || isValidating}
                >
                    {isValidating ? 'Importing...' : 'Import Share'}
                </Button>
            </Stack>
        </Stack>
    );
};

export { ImportShareResult as ExternalDataShareItemImportShareResult };
export default ExternalDataShareItemImportShareDialog;
