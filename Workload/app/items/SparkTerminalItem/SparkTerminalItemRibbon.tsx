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
  DatabaseSearch24Regular,
  History24Regular,
  Delete24Regular
} from "@fluentui/react-icons";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { SparkTerminalItemDefinition } from "./SparkTerminalItemModel";

export interface SparkTerminalItemRibbonProps extends PageProps {
  item?: ItemWithDefinition<SparkTerminalItemDefinition>;
  viewContext: ViewContext;
  isSaveButtonEnabled?: boolean;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  
  // Custom actions
  onStartTerminal?: () => void;
  onStopSession?: () => void;
  onSelectLakehouse?: () => void;
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
      t("ItemEditor_Ribbon_Save_Label")
    ),
    {
      id: "start-terminal",
      text: t("SparkTerminalItem_StartTerminal", "Start Session"),
      icon: <Play24Regular />,
      onClick: props.onStartTerminal,
      disabled: props.sessionActive
    },
    {
      id: "stop-terminal",
      text: t("SparkTerminalItem_StopTerminal", "Stop Session"),
      icon: <Stop24Regular />,
      onClick: props.onStopSession,
      disabled: !props.sessionActive
    },
    {
      id: "select-lakehouse",
      text: t("SparkTerminalItem_SelectLakehouse", "Select Lakehouse"),
      icon: <DatabaseSearch24Regular />,
      onClick: props.onSelectLakehouse
    },
    {
      id: "clear-terminal",
      text: t("SparkTerminalItem_ClearTerminal", "Clear Terminal"),
      icon: <Delete24Regular />,
      onClick: props.onClearTerminal,
      disabled: !props.sessionActive
    },
    {
      id: "show-history",
      text: t("SparkTerminalItem_History", "History"),
      icon: <History24Regular />,
      onClick: props.onShowHistory
    },
    createSettingsAction(props.openSettingsCallback, t("ItemEditor_Ribbon_Settings_Label"))
  ];

  return (
    <Ribbon
      viewContext={viewContext}
      homeToolbarActions={homeToolbarActions}
    />
  );
}
