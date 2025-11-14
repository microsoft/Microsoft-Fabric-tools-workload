import React from 'react';
import { PageProps } from '../../App';
import { useTranslation } from 'react-i18next';
import '../../styles.scss'; // Import generic settings panel styles
import './PackageInstallerItem.scss'; // Import PackageInstaller-specific overrides

export function PackageInstallerItemAboutView(props: PageProps) {
    const { t } = useTranslation();
    
    return (
        <div className="item-settings-panel-container package-installer-settings-panel-container">
            <div className="item-settings-panel-content">
                <span className="item-settings-placeholder-text">
                    {t('About_PackageInstaller_PlaceholderText', 'This is a custom about page for the Package Installer Item. You can use this page to provide information about the item editor, its features, and how to use it.')}
                </span>
            </div>
        </div>
    );
}

export default PackageInstallerItemAboutView;