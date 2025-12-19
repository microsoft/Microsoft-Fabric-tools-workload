import React from "react";
import { useTranslation } from "react-i18next";
import { PageProps } from "../../App";
import { 
  Ribbon, 
  RibbonAction,
  RibbonDropdownAction,
  createSaveAction,
  createSettingsAction,
  ViewContext
} from "../../components/ItemEditor";
import {
  Play24Regular,
  Stop24Regular,
  Delete24Regular,
  Database24Regular,
  ChevronDown24Regular
} from "@fluentui/react-icons";

export interface FabricCLIItemRibbonProps extends PageProps {
  viewContext: ViewContext;
  isSaveButtonEnabled?: boolean;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  
  // Custom actions
  onStartTerminal?: () => void;
  onStopSession?: () => void;
  onShowHistory?: () => void;
  onClearTerminal?: () => void;
  sessionActive?: boolean;
  
  // Configuration
  onSelectLakehouse?: () => void;
  onSelectEnvironment?: (environmentId: string) => void;
  availableEnvironments?: Array<{ id: string; displayName: string }>;
  selectedEnvironmentId?: string;
}

export function FabricCLIItemRibbon(props: FabricCLIItemRibbonProps) {
  const { t } = useTranslation();
  const { viewContext } = props;

  // Find selected environment to display in dropdown label
  const selectedEnvironment = props.availableEnvironments?.find(env => env.id === props.selectedEnvironmentId);
  const environmentLabel = selectedEnvironment 
    ? selectedEnvironment.displayName 
    : t("FabricCLIItem_SparkEnvironment", "Spark Environment");

  // Create environment dropdown action
  const environmentDropdown: RibbonDropdownAction = {
    key: "select-environment",
    label: environmentLabel,
    icon: ChevronDown24Regular,
    onClick: () => {}, // Required but overridden by dropdown items
    disabled: props.sessionActive || !props.availableEnvironments?.length,
    dropdownItems: props.availableEnvironments?.map(env => ({
      key: env.id,
      label: env.displayName,
      onClick: () => props.onSelectEnvironment?.(env.id),
      checked: env.id === props.selectedEnvironmentId
    })) || [],
    showDividerAfter: true
  };

  const homeToolbarActions: RibbonAction[] = [
    createSaveAction(
      props.saveItemCallback,
      !props.isSaveButtonEnabled,
    ),
    createSettingsAction(
      props.openSettingsCallback,
    ),
    {
      key: "select-lakehouse",
      label: t("FabricCLIItem_SelectLakehouse", "Change Lakehouse"),
      icon: Database24Regular,
      onClick: props.onSelectLakehouse,
      disabled: props.sessionActive
    },
    environmentDropdown,
    {
      key: "start-terminal",
      label: t("FabricCLIItem_StartTerminal", "Start Session"),
      icon: Play24Regular,
      onClick: props.onStartTerminal,
      disabled: props.sessionActive
    },
    {
      key: "stop-terminal",
      label: t("FabricCLIItem_StopTerminal", "Stop Session"),
      icon: Stop24Regular,
      onClick: props.onStopSession,
      disabled: !props.sessionActive,
      showDividerAfter: true
    },
    {
      key: "clear-terminal",
      label: t("FabricCLIItem_ClearTerminal", "Clear Terminal"),
      icon: Delete24Regular,
      onClick: props.onClearTerminal,
      disabled: !props.sessionActive
    }
  ];

  return (
    <Ribbon
      viewContext={viewContext}
      homeToolbarActions={homeToolbarActions}
    />
  );
}
