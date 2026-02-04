import React from "react";
import { useTranslation } from "react-i18next";
import { PageProps } from "../../App";
import { ViewContext } from "../../components/ItemEditor";
import { 
  Ribbon, 
  RibbonAction,
  RibbonDropdownAction,
  createSaveAction,
  createSettingsAction,
} from "../../components/ItemEditor";
import { 
  Delete24Regular,
  Database24Regular,
  Play24Regular,
  Stop24Regular
} from "@fluentui/react-icons";
import { EDITOR_VIEW_TYPES } from "./GithubCopilotCLIItemEditor";

export interface GithubCopilotCLIItemRibbonProps extends PageProps {
  viewContext: ViewContext;
  isSaveButtonEnabled?: boolean;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => void;
  onClearTerminal?: () => void;
  
  // Lakehouse and session controls
  onSelectLakehouse?: () => void;
  onStartSession?: () => void;
  onStopSession?: () => void;
  sessionActive?: boolean;
  isConnecting?: boolean;
  selectedLakehouseName?: string;
  
  // Environment selection
  onSelectEnvironment?: (environmentId: string) => void;
  availableEnvironments?: Array<{ id: string; displayName: string }>;
  selectedEnvironmentId?: string;
}

export function GithubCopilotCLIItemRibbon({
  viewContext,
  isSaveButtonEnabled = false,
  saveItemCallback,
  openSettingsCallback,
  onClearTerminal,
  onSelectLakehouse,
  onStartSession,
  onStopSession,
  sessionActive = false,
  isConnecting = false,
  selectedLakehouseName,
  onSelectEnvironment,
  availableEnvironments,
  selectedEnvironmentId
}: GithubCopilotCLIItemRibbonProps) {
  const { t } = useTranslation();
  const { currentView } = viewContext;

  // Find selected environment to display in dropdown label
  const selectedEnvironment = availableEnvironments?.find(env => env.id === selectedEnvironmentId);
  const environmentLabel = selectedEnvironment 
    ? selectedEnvironment.displayName 
    : t("GithubCopilotCLIItem_SparkEnvironment", "Environment");

  // Create environment dropdown items - include "No environments" if empty
  const environmentDropdownItems = (availableEnvironments && availableEnvironments.length > 0)
    ? availableEnvironments.map(env => ({
        key: env.id,
        label: env.displayName,
        onClick: () => onSelectEnvironment?.(env.id),
        checked: env.id === selectedEnvironmentId
      }))
    : [{
        key: 'no-environments',
        label: t("GithubCopilotCLIItem_NoEnvironments", "No environments in workspace"),
        onClick: () => {},
        disabled: true
      }];

  // Create environment dropdown action
  const environmentDropdown: RibbonDropdownAction = {
    key: "select-environment",
    label: environmentLabel,
    onClick: () => {}, // Required but overridden by dropdown items
    dropdownItems: environmentDropdownItems,
    showDividerAfter: false,
    disabled: sessionActive || isConnecting
  };

  // Lakehouse button label
  const lakehouseLabel = selectedLakehouseName 
    ? `Lakehouse: ${selectedLakehouseName}` 
    : t("GithubCopilotCLIItem_SelectLakehouse", "Select Lakehouse");

  const homeToolbarActions: RibbonAction[] = [
    createSaveAction(
      saveItemCallback, 
      !isSaveButtonEnabled, 
    ),
    createSettingsAction(
      openSettingsCallback, 
    ),
  ];

  // Add lakehouse and session controls only in default view
  if (currentView === EDITOR_VIEW_TYPES.DEFAULT) {
    homeToolbarActions.push(
      {
        key: 'select-lakehouse',
        icon: Database24Regular,
        label: lakehouseLabel,
        onClick: onSelectLakehouse,
        disabled: sessionActive || isConnecting,
        testId: 'github-copilot-cli-lakehouse-btn'
      },
      environmentDropdown,
      {
        key: 'start-session',
        icon: Play24Regular,
        label: isConnecting 
          ? t("GithubCopilotCLIItem_Ribbon_Connecting", "Connecting...") 
          : t("GithubCopilotCLIItem_Ribbon_StartSession", "Start Session"),
        onClick: onStartSession,
        disabled: sessionActive || isConnecting || !selectedLakehouseName,
        testId: 'github-copilot-cli-start-btn'
      },
      {
        key: 'stop-session',
        icon: Stop24Regular,
        label: t("GithubCopilotCLIItem_Ribbon_StopSession", "Stop Session"),
        onClick: onStopSession,
        disabled: !sessionActive || isConnecting,
        testId: 'github-copilot-cli-stop-btn',
        showDividerAfter: true
      }
    );

    if (onClearTerminal) {
      homeToolbarActions.push({
        key: 'clear',
        icon: Delete24Regular,
        label: t("GithubCopilotCLIItem_Ribbon_Clear", "Clear"),
        onClick: onClearTerminal,
        testId: 'github-copilot-cli-clear-btn'
      });
    }
  }

  return (
    <Ribbon
      viewContext={viewContext}
      homeToolbarActions={homeToolbarActions}
    />
  );
}
