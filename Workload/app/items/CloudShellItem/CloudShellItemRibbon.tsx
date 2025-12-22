import React from "react";
import { useTranslation } from "react-i18next";
import { PageProps } from "../../App";
import { ExecutionMode } from "./SparkLivyCloudShellClient";
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
  ChevronDown24Regular,
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
  onSelectExecutionMode?: (mode: ExecutionMode) => void;
  selectedExecutionMode?: ExecutionMode;
  
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
    [ExecutionMode.PYTHON]: t("CloudShellItem_ExecutionMode_Python", "Python"),
    [ExecutionMode.BASH]: t("CloudShellItem_ExecutionMode_Bash", "Bash"),
    [ExecutionMode.FAB_CLI]: t("CloudShellItem_ExecutionMode_FabCLI", "Cloud Shell")
  };
  
  const currentExecutionMode = props.selectedExecutionMode || ExecutionMode.FAB_CLI;
  const executionModeLabel = executionModeLabels[currentExecutionMode];

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
    showDividerAfter: false
  };

  // Create execution mode dropdown action
  const executionModeDropdown: RibbonDropdownAction = {
    key: "select-execution-mode",
    label: executionModeLabel,
    icon: ChevronDown24Regular,
    onClick: () => {},
    //hidden: true,
    dropdownItems: [
      {
        key: ExecutionMode.BASH,
        label: executionModeLabels[ExecutionMode.BASH],
        onClick: () => props.onSelectExecutionMode?.(ExecutionMode.BASH)
      },
      {
        key: ExecutionMode.PYTHON,
        label: executionModeLabels[ExecutionMode.PYTHON],
        onClick: () => props.onSelectExecutionMode?.(ExecutionMode.PYTHON)
      },
      {
        key: ExecutionMode.FAB_CLI,
        label: executionModeLabels[ExecutionMode.FAB_CLI],
        onClick: () => props.onSelectExecutionMode?.(ExecutionMode.FAB_CLI)
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
      onClick: () => props.onCreateScript,
    }
  ];

  return (
    <Ribbon
      viewContext={viewContext}
      homeToolbarActions={homeToolbarActions}
    />
  );
}
