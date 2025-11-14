import React from 'react';
import { PageProps } from '../../App';
import { useTranslation } from 'react-i18next';
import '../../styles.scss'; // Import generic settings panel styles
import './PackageInstallerItem.scss'; // Import PackageInstaller-specific overrides

export function PackageInstallerItemSettingsView(props: PageProps) {
  const { t } = useTranslation();
  
  return (
    <div className="item-settings-panel-container package-installer-settings-panel-container">
      <div className="item-settings-placeholder">
        <span className="item-settings-placeholder-text">
          {t('Settings_PackageInstaller_PlaceholderText', 'This workload was built using the Microsoft Fabric Workload Client. If you want to see how it was built, contribute or change it to your needs, you can find the source code on GitHub.')}
        </span>
        <br />
        <a href="https://github.com/microsoft/Microsoft-Fabric-tools-workload/" target="_blank" rel="noopener noreferrer">
          {t('Settings_GitHubLink', 'View source code on GitHub')}
        </a>
      </div>
    </div>
  );
}

export default PackageInstallerItemSettingsView;