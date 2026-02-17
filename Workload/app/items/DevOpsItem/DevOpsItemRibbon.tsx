import React from "react";
import { PageProps } from '../../App';
import { 
  Ribbon, 
  RibbonAction,
  RibbonActionButton,
  createSaveAction,
  createSettingsAction
} from '../../components/ItemEditor';
import { ViewContext } from '../../components';
import { ArrowClockwise24Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";

/**
 * Props interface for the DevOps Ribbon component
 */
export interface DevOpsItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  viewContext: ViewContext;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  scanWorkspacesCallback: (() => Promise<void>) | null;
}

/**
 * DevOpsItemRibbon - Ribbon for the DevOps item editor
 * 
 * Provides standard actions plus a refresh action for reloading branch data
 */
export function DevOpsItemRibbon(props: DevOpsItemRibbonProps) {
  const { viewContext } = props;
  const { t } = useTranslation();
  
  // Use the action factories for automatic translation and consistent styling
  const saveAction = createSaveAction(
    props.saveItemCallback,
    !props.isSaveButtonEnabled
  );
  
  const settingsAction = createSettingsAction(
    props.openSettingsCallback
  );

  // Custom refresh action
  const refreshAction: RibbonAction = {
    key: 'refresh',
    icon: ArrowClockwise24Regular,
    label: t("DevOpsItem_Ribbon_Refresh_Label", "Refresh"),
    onClick: async () => {
      // Trigger a workspace rescan if the callback is available
      if (props.scanWorkspacesCallback) {
        await props.scanWorkspacesCallback();
      }
    },
    testId: 'ribbon-refresh-btn',
    tooltip: t("DevOpsItem_Ribbon_Refresh_Tooltip", "Re-scan workspaces for Git connections"),
    disabled: !props.scanWorkspacesCallback
  };

  // Define home toolbar actions - these appear on the mandatory Home toolbar
  const homeToolbarActions: RibbonAction[] = [
    saveAction,
    refreshAction,
    settingsAction,
  ];

  const ribbonActions: RibbonActionButton[] = [];

  return (
    <Ribbon 
      homeToolbarActions={homeToolbarActions} 
      rightActionButtons={ribbonActions}
      viewContext={viewContext} 
    />
  );
}
