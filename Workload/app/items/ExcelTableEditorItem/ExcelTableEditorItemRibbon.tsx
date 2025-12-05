import React from "react";
import { PageProps } from '../../App';
import { useTranslation } from "react-i18next";
import { 
  Ribbon, 
  RibbonAction,
  createSaveAction,
  createSettingsAction,
  ViewContext
} from '../../components/ItemEditor';
import {
  Flash24Regular,
  WindowNew24Regular,
  DatabaseArrowUp20Regular,
  Add20Regular,
  ArrowClockwise20Regular,
  CheckmarkCircle20Filled
} from "@fluentui/react-icons";
import { Spinner } from '@fluentui/react-components';
import "./ExcelTableEditorItem.scss";

/**
 * Props interface for the ExcelTableEditorItem Ribbon component
 */
export interface ExcelTableEditorItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  viewContext: ViewContext;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  addTableCallback?: () => Promise<void>;
  startSparkSessionCallback?: () => Promise<void>;
  isSparkSessionStarting?: boolean;
  sparkSessionId?: string | null;
  openInExcelOnlineCallback?: () => void;
  saveToLakehouseCallback?: () => Promise<void>;
  excelWebUrl?: string;
  refreshExcelCallback?: () => Promise<void>;
}

/**
 * ExcelTableEditorItemRibbon - Ribbon for Excel Table Editor functionality
 * 
 * This follows the recommended pattern for creating consistent ribbons
 * using the simplified Ribbon API with homeToolbarActions.
 */
export function ExcelTableEditorItemRibbon(props: ExcelTableEditorItemRibbonProps) {
  const { t } = useTranslation();
  const { viewContext } = props;
  const currentView = viewContext.currentView;
  
  // Define home toolbar actions - these appear on the mandatory Home toolbar
  const homeToolbarActions: RibbonAction[] = [
    // Standard Save action
    createSaveAction(
      props.saveItemCallback,
      !props.isSaveButtonEnabled,
      t("ItemEditor_Ribbon_Save_Label")
    ),
    
    // Standard Settings action
    createSettingsAction(
      props.openSettingsCallback,
      t("ItemEditor_Ribbon_Settings_Label")
    ),
    
    // Add Table Button - Show in Empty and Default views
    ...(currentView !== 'detail' && props.addTableCallback ? [{
      key: 'add-table',
      icon: Add20Regular,
      label: t("Add Table", "Add Table"),
      onClick: props.addTableCallback,
      testId: 'item-editor-add-table-btn',
      appearance: 'primary' as const
    }] : []),
    
    // Start Spark Session Button
    ...(props.startSparkSessionCallback ? [{
      key: 'start-spark',
      icon: props.sparkSessionId 
        ? CheckmarkCircle20Filled
        : props.isSparkSessionStarting 
        ? () => <Spinner size="tiny" />
        : Flash24Regular,
      label: props.isSparkSessionStarting 
        ? t("Connecting", "Connecting")
        : props.sparkSessionId 
        ? t("Spark Session", "Spark Session") 
        : t("Start Spark Session", "Start Spark Session"),
      onClick: props.startSparkSessionCallback,
      testId: 'item-editor-start-spark-btn',
      disabled: currentView === 'empty' || props.isSparkSessionStarting || !!props.sparkSessionId
    }] : []),
    
    // Open in Excel Online Button - Only in detail view
    ...(currentView === 'detail' && props.openInExcelOnlineCallback ? [{
      key: 'open-excel-online',
      icon: WindowNew24Regular,
      label: t("Open in Excel Online", "Open in Excel Online"),
      onClick: props.openInExcelOnlineCallback,
      testId: 'open-excel-online-btn',
      appearance: 'primary' as const,
      disabled: !props.excelWebUrl
    }] : []),
    
    // Refresh Excel Button - Show in detail view when Excel URL exists
    ...(currentView === 'detail' && props.refreshExcelCallback && props.excelWebUrl ? [{
      key: 'refresh-excel',
      icon: ArrowClockwise20Regular,
      label: t("Refresh", "Refresh"),
      onClick: props.refreshExcelCallback,
      testId: 'refresh-excel-btn'
    }] : []),
    
    // Save to Lakehouse Button - Only in detail view
    ...(currentView === 'detail' && props.saveToLakehouseCallback ? [{
      key: 'save-to-lakehouse',
      icon: DatabaseArrowUp20Regular,
      label: t("Save to Lakehouse", "Save to Lakehouse"),
      onClick: props.saveToLakehouseCallback,
      testId: 'save-to-lakehouse-btn'
    }] : [])
  ];

  return (
    <Ribbon
      homeToolbarActions={homeToolbarActions}
    />
  );
}
