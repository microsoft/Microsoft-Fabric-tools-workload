import React from "react";
import { useTranslation } from "react-i18next";
import { PageProps } from "../../App";
import { 
  Ribbon, 
  RibbonAction,
  createSaveAction,
  createSettingsAction,
  ViewContext
} from "../../components/ItemEditor";
import {
  Play24Regular,
  Stop24Regular,
  Delete24Regular
} from "@fluentui/react-icons";

export interface SparkTerminalItemRibbonProps extends PageProps {
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
}

export function SparkTerminalItemRibbon(props: SparkTerminalItemRibbonProps) {
  const { t } = useTranslation();
  const { viewContext } = props;

  const homeToolbarActions: RibbonAction[] = [
    createSaveAction(
      props.saveItemCallback,
      !props.isSaveButtonEnabled,
    ),
    createSettingsAction(
      props.openSettingsCallback,
    ),
    {
      key: "start-terminal",
      label: t("SparkTerminalItem_StartTerminal", "Start Session"),
      icon: Play24Regular,
      onClick: props.onStartTerminal,
      disabled: props.sessionActive
    },
    {
      key: "stop-terminal",
      label: t("SparkTerminalItem_StopTerminal", "Stop Session"),
      icon: Stop24Regular,
      onClick: props.onStopSession,
      disabled: !props.sessionActive
    },
    {
      key: "clear-terminal",
      label: t("SparkTerminalItem_ClearTerminal", "Clear Terminal"),
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
