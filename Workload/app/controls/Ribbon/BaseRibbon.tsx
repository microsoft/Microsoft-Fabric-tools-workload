import React, { ReactNode } from "react";
import { Tab, TabList } from '@fluentui/react-tabs';
import { Button, Tooltip } from '@fluentui/react-components';
import { ArrowLeft24Regular } from '@fluentui/react-icons';
import { ViewContext } from '../';
import '../../styles.scss';

/**
 * Props for the BaseRibbon component
 */
export interface BaseRibbonProps {
  /**
   * The toolbar content to render in the ribbon
   */
  children: ReactNode;
  
  /**
   * Optional tabs to display in the ribbon
   */
  tabs?: RibbonTab[];
  
  /**
   * The default selected tab value
   * @default "home"
   */
  defaultSelectedTab?: string;
  
  /**
   * Whether to show tabs at all
   */
  showTabs?: boolean;
  
  /**
   * Additional CSS class name
   */
  className?: string;
  
  /**
   * Optional view context for automatic back button handling
   * When provided and isDetailView is true, shows back button instead of tabs
   */
  viewContext?: ViewContext;
}

/**
 * Interface for ribbon tabs
 */
export interface RibbonTab {
  /**
   * Unique identifier for the tab
   */
  value: string;
  
  /**
   * Display label for the tab
   */
  label: string;
  
  /**
   * Optional test ID for the tab
   */
  testId?: string;
  
  /**
   * Optional disabled state
   */
  disabled?: boolean;
}

/**
 * BaseRibbon - Reusable ribbon container component following Microsoft Fabric guidelines
 * 
 * This component provides:
 * - Consistent ribbon structure across all item editors
 * - Mandatory Home tab as default selected
 * - Optional tab navigation
 * - Automatic back button for detail views when ViewContext is provided
 * - Proper styling and shadow effects
 * - Accessibility support
 * - Integration with standardized RibbonAction system
 * 
 * ## Architecture Integration
 * 
 * BaseRibbon works seamlessly with:
 * - **BaseRibbonToolbar**: For action buttons with tooltip support
 * - **DetailViewAction**: Direct alias to RibbonAction for detail views
 * - **BaseItemEditorDetailView**: Automatic action registration and display
 * - **ViewContext**: Smart navigation between list and detail views
 * 
 * ## Action System
 * 
 * Actions are defined using the standardized RibbonAction interface:
 * ```typescript
 * const actions: RibbonAction[] = [
 *   {
 *     key: 'save',
 *     label: 'Save',
 *     icon: Save24Regular,
 *     tooltip: 'Save your changes',
 *     onClick: () => handleSave(),
 *     appearance: 'primary'
 *   }
 * ];
 * ```
 * 
 * ## View Context Integration
 * 
 * When ViewContext is provided:
 * - **List View**: Shows tab navigation
 * - **Detail View**: Automatically shows back button and hides tabs
 * - **Actions**: DetailViewActions are automatically converted and displayed
 * 
 * @example
 * ```tsx
 * // Standard ribbon with tabs and actions
 * <BaseRibbon tabs={createRibbonTabs(t('Home'))}>
 *   <BaseRibbonToolbar actions={standardActions} />
 * </BaseRibbon>
 * 
 * // With ViewContext - automatically handles detail view navigation
 * <BaseRibbon tabs={tabs} viewContext={context}>
 *   <BaseRibbonToolbar actions={contextActions} />
 * </BaseRibbon>
 * 
 * // Detail view with BaseItemEditorDetailView integration
 * <BaseRibbon viewContext={detailContext}>
 *   <BaseRibbonToolbar actions={detailActions} />
 * </BaseRibbon>
 * ```
 */
export const BaseRibbon: React.FC<BaseRibbonProps> = ({
  children,
  tabs = [],
  defaultSelectedTab = 'home',
  showTabs = true,
  className = '',
  viewContext
}) => {
  // Determine if we should show back button based on ViewContext
  const isDetailView = viewContext?.isDetailView || false;
  
  return (
    <div className={`ribbon-container ${className}`.trim()}>
      {/* Back Button for Detail Views - Replaces tab navigation */}
      {isDetailView ? (
        <div className="ribbon-back-button-container">
          <Tooltip content="Back" relationship="label">
            <Button
              appearance="subtle"
              icon={<ArrowLeft24Regular />}
              onClick={viewContext?.goBack}
              data-testid="ribbon-back-btn"
              aria-label="Back"
            >
              Back
            </Button>
          </Tooltip>
        </div>
      ) : (
        /* Tab Navigation - Only show if tabs are provided and showTabs is true */
        showTabs && tabs.length > 0 && (
          <TabList defaultSelectedValue={defaultSelectedTab}>
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                data-testid={tab.testId || `ribbon-${tab.value}-tab-btn`}
                disabled={tab.disabled}
              >
                {tab.label}
              </Tab>
            ))}
          </TabList>
        )
      )}

      {/* Toolbar Container */}
      <div className="toolbarContainer">
        {children}
      </div>
    </div>
  );
};
