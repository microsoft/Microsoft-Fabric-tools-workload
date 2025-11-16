import React from "react";
import { PageProps } from '../../App';
import { 
  Ribbon, 
  RibbonAction,
  createSaveAction,
  createSettingsAction
} from '../../controls/ItemEditor';
import { ViewContext } from '../../controls';

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
 * - Uses Ribbon with clean API pattern
 * - Uses action factories with automatic internationalization
 * - Defines homeToolbarActions (mandatory Home tab actions)
 * - Demonstrates additional toolbars with Test tab
 * - Shows how to add custom actions
 * - Maintains accessibility with built-in Tooltip + ToolbarButton pattern
 * - Follows Fabric design guidelines
 */
export function HelloWorldItemRibbon(props: HelloWorldItemRibbonProps) {
  const { viewContext } = props;
  
  // Use the action factories for automatic translation and consistent styling
  const saveAction = createSaveAction(
    props.saveItemCallback,
    !props.isSaveButtonEnabled
  );
  
  const settingsAction = createSettingsAction(
    props.openSettingsCallback
  );
  
  // Define home toolbar actions - these appear on the mandatory Home toolbar
  const homeToolbarActions: RibbonAction[] = [
    saveAction,
    settingsAction
    
    // CUSTOM ACTION EXAMPLE: Getting Started navigation
    // This demonstrates how to create custom actions for view navigation
    /*,{
      key: 'getting-started',
      icon: Rocket24Regular,
      label: t("ItemEditor_Ribbon_GettingStarted_Label", "Getting Started"),
      onClick: () => viewContext.setCurrentView(VIEW_TYPES.DEFAULT),
      testId: 'ribbon-getting-started-btn',
      hidden: viewContext.currentView !== VIEW_TYPES.EMPTY  // Only show in EMPTY view
    }*/
  ];

  
  return (
    <Ribbon 
      homeToolbarActions={homeToolbarActions} 
      // ADDITIONAL TOOLBAR EXAMPLE
      // This demonstrates how you can add an addtional toolbar
      /*additionalToolbars={[
        {
          key: 'edit',
          label: "Edit",
          actions: [
                    settingsAction
                  ]
        }
      ]}*/
      viewContext={viewContext} 
    />
  );
}