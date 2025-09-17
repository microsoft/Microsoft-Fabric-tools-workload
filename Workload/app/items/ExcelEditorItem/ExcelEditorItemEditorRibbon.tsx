import React from "react";
import { Toolbar, ToolbarButton, Tooltip, ToolbarDivider } from "@fluentui/react-components";
import { 
  Save24Regular, 
  FolderOpen24Regular, 
  ArrowClockwise24Regular, 
  Settings24Regular,
} from "@fluentui/react-icons";

interface ExcelEditorItemRibbonProps {
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onRefresh: () => void;
  openItem: () => void;
  onSettings: () => void;
  isLoading?: boolean;
  isLoadingExcel?: boolean;
}

export function ExcelEditorItemRibbon({
  hasUnsavedChanges,
  onSave,
  onRefresh,
  openItem,
  onSettings,
  isLoading = false,
  isLoadingExcel = false
}: ExcelEditorItemRibbonProps) {
  return (
    <Toolbar>
      <Tooltip content="Save changes" relationship="label">
        <ToolbarButton
          icon={<Save24Regular />}
          onClick={onSave}
          disabled={!hasUnsavedChanges || isLoading}
          aria-label="Save changes"
          data-testid="save-btn"
        />
      </Tooltip>

      <ToolbarDivider />

      <Tooltip content="Open table from OneLake" relationship="label">
        <ToolbarButton
          icon={<FolderOpen24Regular />}
          onClick={openItem}
          disabled={isLoading}
          aria-label="Open table"
          data-testid="open-table-btn"
        />
      </Tooltip>

      <Tooltip content="Refresh table list" relationship="label">
        <ToolbarButton
          icon={<ArrowClockwise24Regular />}
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh"
          data-testid="refresh-btn"
        />
      </Tooltip>

      <ToolbarDivider />

      <Tooltip content="Settings" relationship="label">
        <ToolbarButton
          icon={<Settings24Regular />}
          onClick={onSettings}
          disabled={isLoading}
          aria-label="Settings"
          data-testid="settings-btn"
        />
      </Tooltip>
    </Toolbar>
  );
}