import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageProps, ContextProps } from '../../../App';
import { PackageInstallerPackagingDialog } from './PackageInstallerPackagingDialog';
import { getWorkloadItem } from '../../../controller/ItemCRUDController';
import { PackageInstallerItemDefinition } from '../PackageInstallerItemModel';
import { ItemWithDefinition } from '../../../controller/ItemCRUDController';

export function PackageInstallerPackagingDialogWrapper(props: PageProps) {
    const pageContext = useParams<ContextProps>();
    const { workloadClient } = props;
    const [editorItem, setEditorItem] = useState<ItemWithDefinition<PackageInstallerItemDefinition> | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadItem();
    }, [pageContext.itemObjectId]);

    async function loadItem() {
        if (pageContext.itemObjectId) {
            try {
                const item = await getWorkloadItem<PackageInstallerItemDefinition>(
                    workloadClient,
                    pageContext.itemObjectId
                );
                setEditorItem(item);
            } catch (error) {
                console.error('Failed to load item:', error);
            }
        }
        setIsLoading(false);
    }

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!editorItem) {
        return <div>Error loading item</div>;
    }

    return (
        <PackageInstallerPackagingDialog
            workloadClient={workloadClient}
        />
    );
}
