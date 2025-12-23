import React from "react";
import { useTranslation } from "react-i18next";
import { PageProps } from "../../App";
import { CommandType } from "./CloudShellItemModel";
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
  Eraser24Regular,
  Database24Regular,
  DocumentAdd24Regular
} from "@fluentui/react-icons";

export interface CloudShellItemRibbonProps extends PageProps {
  viewContext: ViewContext;
  isSaveButtonEnabled?: boolean;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  
  // Custom actions
  onStartTerminal?: () => void;
  onStopSession?: () => void;
  onClearTerminal?: () => void;
  sessionActive?: boolean;
  
  // Configuration
  onSelectLakehouse?: () => void;
  onSelectEnvironment?: (environmentId: string) => void;
  availableEnvironments?: Array<{ id: string; displayName: string }>;
  selectedEnvironmentId?: string;
  
  // Execution mode
  onSelectExecutionMode?: (mode: CommandType) => void;
  selectedExecutionMode?: CommandType;
  
  // Script management
  onCreateScript?: () => void;
}

export function CloudShellItemRibbon(props: CloudShellItemRibbonProps) {
  const { t } = useTranslation();
  const { viewContext } = props;

  // Find selected environment to display in dropdown label
  const selectedEnvironment = props.availableEnvironments?.find(env => env.id === props.selectedEnvironmentId);
  const environmentLabel = selectedEnvironment 
    ? selectedEnvironment.displayName 
    : t("CloudShellItem_SparkEnvironment", "Spark Environment");

  // Get execution mode label
  const executionModeLabels = {
    [CommandType.PYTHON]: t("CloudShellItem_ExecutionMode_Python", "Python"),
    [CommandType.SHELL]: t("CloudShellItem_ExecutionMode_Bash", "Bash"),
    [CommandType.FAB_CLI]: t("CloudShellItem_ExecutionMode_FabCLI", "Cloud Shell")
  };
  
  const currentExecutionMode = props.selectedExecutionMode || CommandType.FAB_CLI;
  const executionModeLabel = executionModeLabels[currentExecutionMode];

  // Create environment dropdown action
  const environmentDropdown: RibbonDropdownAction = {
    key: "select-environment",
    label: environmentLabel,
    onClick: () => {}, // Required but overridden by dropdown items
    dropdownItems: props.availableEnvironments?.map(env => ({
      key: env.id,
      label: env.displayName,
      onClick: () => props.onSelectEnvironment?.(env.id),
      checked: env.id === props.selectedEnvironmentId
    })) || [],
    showDividerAfter: false
  };

  // Create execution mode dropdown action
  const executionModeDropdown: RibbonDropdownAction = {
    key: "select-execution-mode",
    label: executionModeLabel,
    onClick: () => {},
    dropdownItems: [
      {
        key: CommandType.FAB_CLI,
        label: executionModeLabels[CommandType.FAB_CLI],
        onClick: () => props.onSelectExecutionMode?.(CommandType.FAB_CLI)
      },
      {
        key: CommandType.PYTHON,
        label: executionModeLabels[CommandType.PYTHON],
        onClick: () => props.onSelectExecutionMode?.(CommandType.PYTHON)
      },      {
        key: CommandType.SHELL,
        label: executionModeLabels[CommandType.SHELL],
        onClick: () => props.onSelectExecutionMode?.(CommandType.SHELL)
      }
    ],
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
      label: t("CloudShellItem_SelectLakehouse", "Change Lakehouse"),
      icon: Database24Regular,
      onClick: props.onSelectLakehouse,
      disabled: props.sessionActive
    },
    environmentDropdown,
    executionModeDropdown,
    {
      key: "start-terminal",
      label: t("CloudShellItem_StartTerminal", "Start Session"),
      icon: Play24Regular,
      onClick: props.onStartTerminal,
      disabled: props.sessionActive
    },
    {
      key: "stop-terminal",
      label: t("CloudShellItem_StopTerminal", "Stop Session"),
      icon: Stop24Regular,
      onClick: props.onStopSession,
      disabled: !props.sessionActive,
      showDividerAfter: true
    },
    {
      key: "clear-terminal",
      label: t("CloudShellItem_ClearTerminal", "Clear Terminal"),
      icon: Eraser24Regular,
      onClick: props.onClearTerminal,
    },
    {
      key: "create-script",
      label: t("CloudShellItem_CreateScript", "Create Script"),
      icon: DocumentAdd24Regular,
      onClick: props.onCreateScript,
    }
  ];

  return (
    <Ribbon
      viewContext={viewContext}
      homeToolbarActions={homeToolbarActions}
    />
  );
}
