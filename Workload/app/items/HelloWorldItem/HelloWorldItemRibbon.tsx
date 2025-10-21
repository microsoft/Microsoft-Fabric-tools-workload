import React from "react";
import { PageProps } from '../../App';
import { useTranslation } from "react-i18next";
import { 
  BaseRibbon, 
  BaseRibbonToolbar, 
  RibbonAction,
  createSaveAction,
  createSettingsAction,
  createRibbonTabs
} from '../../controls/Ribbon';
import { ViewContext } from '../../controls';
import '../../styles.scss';

/**
 * Props interface for the HelloWorld Ribbon component
 */
export interface HelloWorldItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  viewContext: ViewContext;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
}

/**
 * HelloWorldItemRibbon - Demonstrates the recommended ribbon pattern
 * 
 * This demonstrates the recommended pattern for creating consistent ribbons
 * across all item editors in the Fabric Extensibility Toolkit.
 * 
 * Key Features:
 * - Uses BaseRibbon for consistent structure
 * - Leverages BaseRibbonToolbar for action rendering
 * - Employs standard action factories for common buttons (Save, Settings)
 * - Shows how to create CUSTOM actions (Getting Started)
 * - Maintains accessibility with Tooltip + ToolbarButton pattern
 * - Follows Fabric design guidelines
 * - MANDATORY Home tab using createRibbonTabs helper
 * - Supports additional custom tabs as needed
 */
export function HelloWorldItemRibbon(props: HelloWorldItemRibbonProps) {
  const { t } = useTranslation();
  const { viewContext } = props;
  
  // Define ribbon tabs - Home tab is mandatory, additional tabs can be added
  // Using createRibbonTabs ensures Home tab is always present
  // Tabs are hidden automatically when in detail view mode
  const tabs = createRibbonTabs(
    t("ItemEditor_Ribbon_Home_Label")
    // Additional tabs can be added here as second parameter:
    // [
    //   createDataTab(t("Data")),
    //   createFormatTab(t("Format"))
    // ]
  );
  
  // Define ribbon actions - mix of standard and custom actions
  const actions: RibbonAction[] = [
    // Standard Save action - disabled unless explicitly enabled
    createSaveAction(
      props.saveItemCallback,
      !props.isSaveButtonEnabled,
      t("ItemEditor_Ribbon_Save_Label")
    ),
    
    // Standard Settings action - always available
    createSettingsAction(
      props.openSettingsCallback,
      t("ItemEditor_Ribbon_Settings_Label")
    ),
    
    // CUSTOM ACTION EXAMPLE: Getting Started navigation
    // This demonstrates how to create custom actions for view navigation
    // Uses viewContext.setCurrentView for navigation
    /*{
      key: 'getting-started',
      icon: Rocket24Regular,
      label: t("ItemEditor_Ribbon_GettingStarted_Label", "Getting Started"),
      onClick: () => viewContext.setCurrentView(VIEW_TYPES.DEFAULT),
      testId: 'ribbon-getting-started-btn',
      hidden: viewContext.currentView !== VIEW_TYPES.EMPTY  // Only show in EMPTY view
    }*/
  ];
  
  return (
    <BaseRibbon tabs={tabs} viewContext={viewContext}>
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
}