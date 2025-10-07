import React from "react";
import { PageProps } from '../../App';
import { CurrentView, VIEW_TYPES } from "./HelloWorldItemModel";
import { useTranslation } from "react-i18next";
import { 
  BaseRibbon, 
  BaseRibbonToolbar, 
  RibbonAction,
  createSaveAction,
  createSettingsAction,
  createRibbonTabs
} from '../../controls/Ribbon';
import { Rocket24Regular } from '@fluentui/react-icons';
import '../../styles.scss';

/**
 * Props interface for the HelloWorld Ribbon component
 */
export interface HelloWorldItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  currentView: CurrentView;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  navigateToGettingStartedCallback: () => void;
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
  
  // Define ribbon tabs - Home tab is mandatory, additional tabs can be added
  // Using createRibbonTabs ensures Home tab is always present
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
    
    // CUSTOM ACTION EXAMPLE: Getting Started
    // This demonstrates how to create custom actions that are specific to your item editor
    // Custom actions should be defined inline rather than in StandardRibbonActions
    {
      key: 'getting-started',
      icon: Rocket24Regular,
      label: t("ItemEditor_Ribbon_GettingStarted_Label", "Getting Started"),
      onClick: props.navigateToGettingStartedCallback,
      testId: 'item-editor-getting-started-btn',
      hidden: props.currentView !== VIEW_TYPES.EMPTY  // Only show in EMPTY view
    }
  ];
  
  return (
    <BaseRibbon tabs={tabs}>
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
}