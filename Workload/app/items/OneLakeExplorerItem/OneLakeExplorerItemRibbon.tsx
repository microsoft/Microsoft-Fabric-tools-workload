import React from "react";
import { PageProps } from '../../App';
import { useTranslation } from "react-i18next";
import { 
  ViewContext,
  BaseRibbon, 
  RibbonAction,
  createSaveAction,
  createSettingsAction
} from '../../controls/ItemEditor';
import { 
  DocumentAdd24Regular,
  Open24Regular,
  ArrowUpload24Regular,
} from "@fluentui/react-icons";
import '../../styles.scss';

/**
 * Props interface for the OneLakeExplorerItem Ribbon component
 */
export interface OneLakeExplorerItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  viewContext: ViewContext;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  onNewFile: () => Promise<void>;
  onOpenItem: () => Promise<void>;
  onUploadFile: () => Promise<void>;
}

/**
 * OneLakeExplorerItemRibbon - Ribbon for OneLake Explorer functionality
 * 
 * This follows the recommended pattern for creating consistent ribbons
 * using the simplified BaseRibbon API with homeActions.
 */
export function OneLakeExplorerItemRibbon(props: OneLakeExplorerItemRibbonProps) {
  const { t } = useTranslation();
  const { viewContext } = props;
  
  // Define home actions - these appear on the mandatory Home tab
  const homeActions: RibbonAction[] = [
    // Standard Save action - disabled unless explicitly enabled
    createSaveAction(
      props.saveItemCallback,
      !props.isSaveButtonEnabled,
      t("ItemEditor_Ribbon_Save_Label")
    ),

    // Standard Settings action
    createSettingsAction(
      props.openSettingsCallback,
      t("ItemEditor_Ribbon_Settings_Label")
    ),
    
    // Custom action: Open Item
    {
      key: 'open-item',
      icon: Open24Regular,
      label: t("Open Item", "Open Item"),
      onClick: props.onOpenItem,
      testId: 'ribbon-open-item-btn',
      showDividerAfter: true
    },

    // Custom action: Create New File
    {
      key: 'new-file',
      icon: DocumentAdd24Regular,
      label: t("Create New File", "Create New File"),
      onClick: props.onNewFile,
      testId: 'ribbon-new-file-btn'
    },
    
    // Custom action: Upload File
    {
      key: 'upload-file',
      icon: ArrowUpload24Regular,
      label: t("Upload File", "Upload File"),
      onClick: props.onUploadFile,
      testId: 'ribbon-upload-file-btn'
    }
  ];
  
  return (
    <BaseRibbon 
      homeActions={homeActions} 
      viewContext={viewContext} 
    />
  );
}
