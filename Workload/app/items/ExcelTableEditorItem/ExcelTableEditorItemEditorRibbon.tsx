import React from "react";
import { Toolbar, ToolbarButton, Tooltip, ToolbarDivider } from "@fluentui/react-components";
import { 
  Save24Regular, 
  FolderOpen24Regular, 
  ArrowClockwise24Regular, 
  Settings24Regular,
  Table24Regular,
  CloudSync24Regular
} from "@fluentui/react-icons";
import { OneLakeTable } from "./ExcelTableEditorItemModel";

interface ExcelTableEditorItemRibbonProps {
  hasUnsavedChanges: boolean;
  selectedTable: OneLakeTable | null;
  onSave: () => void;
  onRefresh: () => void;
  onOpenTable: () => void;
  onSettings: () => void;
  onCreateRealExcel?: () => void;
  onSaveToLakehouse?: () => void;
  onRefreshData?: () => void;
  isLoading?: boolean;
  isLoadingExcel?: boolean;
}

export function ExcelTableEditorItemRibbon({
  hasUnsavedChanges,
  selectedTable,
  onSave,
  onRefresh,
  onOpenTable,
  onSettings,
  onCreateRealExcel,
  onSaveToLakehouse,
  onRefreshData,
  isLoading = false,
  isLoadingExcel = false
}: ExcelTableEditorItemRibbonProps) {
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
          onClick={onOpenTable}
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

      {/* Excel-specific actions - only show when table is selected */}
      {selectedTable && (
        <>
          <ToolbarDivider />

          {onCreateRealExcel && (
            <Tooltip content="Create real Excel workbook" relationship="label">
              <ToolbarButton
                icon={<Table24Regular />}
                onClick={onCreateRealExcel}
                disabled={isLoading || isLoadingExcel}
                aria-label="Create Real Excel"
                data-testid="create-real-excel-btn"
              />
            </Tooltip>
          )}

          {onSaveToLakehouse && (
            <Tooltip content="Save changes to lakehouse" relationship="label">
              <ToolbarButton
                icon={<CloudSync24Regular />}
                onClick={onSaveToLakehouse}
                disabled={isLoading || isLoadingExcel}
                aria-label="Save to Lakehouse"
                data-testid="save-to-lakehouse-btn"
              />
            </Tooltip>
          )}

          {onRefreshData && (
            <Tooltip content="Refresh data from lakehouse" relationship="label">
              <ToolbarButton
                icon={<ArrowClockwise24Regular />}
                onClick={onRefreshData}
                disabled={isLoading || isLoadingExcel}
                aria-label="Refresh Data"
                data-testid="refresh-data-btn"
              />
            </Tooltip>
          )}
        </>
      )}

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