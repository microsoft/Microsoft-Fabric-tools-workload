import React from "react";
import { useTranslation } from "react-i18next";
import {
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  Tooltip,
} from "@fluentui/react-components";
import {
  Play24Regular,
  Stop24Regular,
  Settings24Regular,
  DatabaseSearch24Regular,
  History24Regular,
  ClearFormatting24Regular,
  Save24Regular
} from "@fluentui/react-icons";

import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { SparkTerminalItemDefinition } from "./SparkTerminalItemModel";

interface SparkTerminalItemEditorRibbonProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<SparkTerminalItemDefinition>;
  openSettingsCallback?: () => void;
  onSaveAsClicked?: () => void;
  isSaveButtonEnabled?: boolean;
  onStartTerminal?: () => void;
  onStopSession?: () => void;
  onSelectLakehouse?: () => void;
  onShowHistory?: () => void;
  onClearTerminal?: () => void;
  isEmptyState?: boolean;
  sessionActive?: boolean;
  isConnecting?: boolean;
}

/**
 * Ribbon component for SparkTerminal item editor
 * Provides toolbar actions for terminal management
 */
export function SparkTerminalItemEditorRibbon({
  workloadClient,
  item,
  onSaveAsClicked,
  openSettingsCallback,
  onStartTerminal,
  onStopSession,
  onSelectLakehouse,
  onShowHistory,
  onClearTerminal,
  isSaveButtonEnabled,
  isEmptyState = false,
  sessionActive = false,
  isConnecting = false
}: SparkTerminalItemEditorRibbonProps) {
  const { t } = useTranslation();

  return (
    <Toolbar aria-label="Spark Terminal actions" size="small">

        <Tooltip
            content={t("ItemEditor_Ribbon_Save_Label")}
            relationship="label">
            <ToolbarButton
                disabled={!isSaveButtonEnabled}
                aria-label={t("ItemEditor_Ribbon_Save_Label")}
                data-testid="item-editor-save-btn"
                icon={<Save24Regular />}
                onClick={onSaveAsClicked} />
        </Tooltip>
        {/* Settings */}
        <Tooltip
            content={t("SparkTerminalItem_Settings", "Settings")}
            relationship="label">
            <ToolbarButton
                icon={<Settings24Regular />}
                onClick={openSettingsCallback}
            >
                {t("SparkTerminalItem_Settings", "Settings")}
            </ToolbarButton>
        </Tooltip>

        {/* Data Source */}
        <Tooltip
            content={t("SparkTerminalItem_SelectLakehouse", "Select Lakehouse")}
            relationship="label">
            <ToolbarButton
                icon={<DatabaseSearch24Regular />}
                onClick={onSelectLakehouse}
            >
                {t("SparkTerminalItem_SelectLakehouse", "Select Lakehouse")}
            </ToolbarButton>
        </Tooltip>
        
        <ToolbarDivider />


        {/* Session Control */}
        {!sessionActive ? (
            <Tooltip
                content={t("SparkTerminalItem_StartTerminal", "Start Terminal")}
                relationship="label">
                <ToolbarButton
                    icon={<Play24Regular />}
                    onClick={onStartTerminal}
                    disabled={isConnecting}
                >
                    {isConnecting
                    ? t("SparkTerminalItem_Connecting", "Connecting...")
                    : t("SparkTerminalItem_StartTerminal", "Start Terminal")
                    }
                </ToolbarButton>
            </Tooltip>
        ) : (
            <Tooltip
                content={t("SparkTerminalItem_StopSession", "Stop Session")}
                relationship="label">
                <ToolbarButton
                    icon={<Stop24Regular />}
                    onClick={onStopSession}
                    disabled={isConnecting}
                >
                    {t("SparkTerminalItem_StopSession", "Stop Session")}
                </ToolbarButton>
            </Tooltip>
        )}

        <ToolbarDivider />

        {/* Terminal Actions */}
        <Tooltip
            content={t("SparkTerminalItem_History", "History")}
            relationship="label">
            <ToolbarButton
                icon={<History24Regular />}
                onClick={onShowHistory}
                disabled={isEmptyState}
            >
                {t("SparkTerminalItem_History", "History")}
            </ToolbarButton>
        </Tooltip>

        <Tooltip
            content={t("SparkTerminalItem_Clear", "Clear")}
            relationship="label">
            <ToolbarButton
                icon={<ClearFormatting24Regular />}
                onClick={onClearTerminal}
                disabled={isEmptyState}
            >
                {t("SparkTerminalItem_Clear", "Clear")}
            </ToolbarButton>
        </Tooltip>

    </Toolbar>
  );
}
