import React from "react";
import { PageProps } from '../../App';
import { useTranslation } from "react-i18next";
import { 
  Ribbon, 
  RibbonAction,
  createSaveAction,
  createSettingsAction
} from '../../components/ItemEditor';
import { ViewContext } from '../../components';
import { 
  Add24Regular,
  ArrowSync24Regular,
  DocumentAdd24Regular,
  BoxMultiple24Regular,
} from "@fluentui/react-icons";
import "./PackageInstallerItem.scss";

/**
 * Props interface for the PackageInstallerItem Ribbon component
 */
export interface PackageInstallerItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  isDeploymentInProgress?: boolean;
  viewContext: ViewContext;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  addInstallationCallback: () => void;
  refreshDeploymentsCallback: () => Promise<void>;
  uploadPackageCallback: () => Promise<void>;
  createPackageCallback: () => Promise<void>;
}

/**
 * PackageInstallerItemRibbon - Ribbon for Package Installer functionality
 * 
 * This follows the recommended pattern for creating consistent ribbons
 * using the simplified BaseRibbon API with homeActions.
 */
export function PackageInstallerItemRibbon(props: PackageInstallerItemRibbonProps) {
  const { t } = useTranslation();
  const { viewContext } = props;
  
  console.log('PackageInstallerItemRibbon: Rendering with props:', {
    isSaveButtonEnabled: props.isSaveButtonEnabled,
    isDeploymentInProgress: props.isDeploymentInProgress,
    saveItemCallback: typeof props.saveItemCallback,
    openSettingsCallback: typeof props.openSettingsCallback
  });
  
  // Define home toolbar actions - these appear on the mandatory Home toolbar
  const homeToolbarActions: RibbonAction[] = [
    // Standard Save action - disabled unless explicitly enabled
    createSaveAction(
      props.saveItemCallback,
      !props.isSaveButtonEnabled || props.isDeploymentInProgress,
      t("ItemEditor_Ribbon_Save_Label")
    ),
    
    // Standard Settings action - disabled during deployment
    createSettingsAction(
      props.openSettingsCallback,
      t("ItemEditor_Ribbon_Settings_Label"),
      props.isDeploymentInProgress
    ),
    
    // Refresh deployments action
    {
      key: 'refresh-deployments',
      icon: ArrowSync24Regular,
      label: t("Refresh Deployment Status", "Refresh Deployment Status"),
      onClick: props.refreshDeploymentsCallback,
      testId: 'item-editor-refresh-deployments-btn',
      disabled: props.isDeploymentInProgress
    },
    
    // Create installation action
    {
      key: 'create-installation',
      icon: Add24Regular,
      label: t("Create Installation", "Create Installation"),
      onClick: props.addInstallationCallback,
      testId: 'item-editor-add-package-btn',
      disabled: props.isDeploymentInProgress,
      showDividerAfter: true
    },
    
    // Create package action
    {
      key: 'create-package',
      icon: BoxMultiple24Regular,
      label: t("Create Package", "Create Package"),
      onClick: props.createPackageCallback,
      testId: 'item-editor-create-package-btn',
      disabled: props.isDeploymentInProgress
    },
    
    // Upload package action
    {
      key: 'upload-package',
      icon: DocumentAdd24Regular,
      label: t("Upload JSON Package", "Upload JSON Package"),
      onClick: props.uploadPackageCallback,
      testId: 'item-editor-upload-package-btn',
      disabled: props.isDeploymentInProgress
    }
  ];
  
  return (
    <Ribbon 
      homeToolbarActions={homeToolbarActions}
      viewContext={viewContext} 
    />
  );
}
