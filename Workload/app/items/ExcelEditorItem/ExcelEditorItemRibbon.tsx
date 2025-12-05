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
  Add20Regular,
  CheckmarkCircle20Filled
} from "@fluentui/react-icons";
import { Spinner } from '@fluentui/react-components';
import "./ExcelEditorItem.scss";

/**
 * Props interface for the ExcelEditorItem Ribbon component
 */
export interface ExcelEditorItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  viewContext: ViewContext;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  addTableCallback?: () => Promise<void>;
  startSparkSessionCallback?: () => Promise<void>;
  isSparkSessionStarting?: boolean;
  sparkSessionId?: string | null;
}

/**
 * ExcelEditorItemRibbon - Ribbon for Excel Editor functionality
 * 
 * This follows the recommended pattern for creating consistent ribbons
 * using the simplified Ribbon API with homeToolbarActions.
 */
export function ExcelEditorItemRibbon(props: ExcelEditorItemRibbonProps) {
  const { t } = useTranslation();
  
  // Define home toolbar actions - these appear on the mandatory Home toolbar
  // Detail view actions are defined in the detail view itself
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
    
    // Add Table Button
    ...(props.addTableCallback ? [{
      key: 'add-table',
      icon: Add20Regular,
      label: t("Add Table", "Add Table"),
      onClick: props.addTableCallback,
      testId: 'item-editor-add-table-btn'
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
      disabled: props.isSparkSessionStarting || !!props.sparkSessionId
    }] : [])
  ];

  return (
    <Ribbon
      homeToolbarActions={homeToolbarActions}
      viewContext={props.viewContext}
    />
  );
}
