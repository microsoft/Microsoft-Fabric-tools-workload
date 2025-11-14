import React from "react";
import { Tab, TabList } from '@fluentui/react-tabs';
import { Button, Tooltip } from '@fluentui/react-components';
import { ArrowLeft24Regular } from '@fluentui/react-icons';
import { ViewContext } from '../';
import { BaseRibbonToolbar, RibbonAction } from './BaseRibbonToolbar';
import '../../styles.scss';

/**
 * Definition for additional ribbon tabs beyond Home
 */
export interface RibbonTabToolbar {
  /**
   * Unique key for the tab
   */
  key: string;
  
  /**
   * Display label for the tab
   */
  label: string;
  
  /**
   * Actions for this tab
   */
  actions: RibbonAction[];
  
  /**
   * Optional test ID
   */
  testId?: string;
  
  /**
   * Optional disabled state
   */
  disabled?: boolean;
}

/**
 * Props for the BaseRibbon component
 */
export interface BaseRibbonProps {
  /**
   * Actions for the Home tab (always present)
   */
  homeActions: RibbonAction[];
  
  /**
   * Optional additional tabs with their actions
   */
  additionalTabs?: RibbonTabToolbar[];
  
  /**
   * The default selected tab key
   * @default "home"
   */
  defaultSelectedTab?: string;
  
  /**
   * Additional CSS class name
   */
  className?: string;
  
  /**
   * Optional view context for automatic back button handling
   * When provided and isDetailView is true, shows back button instead of tabs
   */
  viewContext?: ViewContext;
  
  /**
   * Home tab label
   * @default "Home"
   */
  homeLabel?: string;
}

/**
 * BaseRibbon - Clean ribbon with mandatory Home tab and optional additional tabs
 * 
 * This component provides:
 * - Mandatory Home tab with actions
 * - Optional additional tabs with their own actions
 * - Automatic tab switching and action display
 * - Back button support for detail views
 * - Clean API without complex configuration
 * 
 * ## Simple Architecture
 * 
 * ```
 * BaseRibbon
 * ├── Home Tab (always present) → homeActions
 * ├── Data Tab (optional) → additionalTabs[0].actions  
 * ├── Format Tab (optional) → additionalTabs[1].actions
 * └── Back Button (detail view only)
 * ```
 * 
 * @example
 * ```tsx
 * // Simple: Just Home tab
 * <BaseRibbon 
 *   homeActions={[saveAction, settingsAction]}
 * />
 * 
 * // With additional tabs
 * <BaseRibbon 
 *   homeActions={[saveAction, settingsAction]}
 *   additionalTabs={[
 *     {
 *       key: 'data',
 *       label: 'Data', 
 *       actions: [refreshAction, exportAction]
 *     },
 *     {
 *       key: 'format',
 *       label: 'Format',
 *       actions: [fontAction, colorAction]
 *     }
 *   ]}
 * />
 * ```
 */
export const BaseRibbon: React.FC<BaseRibbonProps> = ({
  homeActions,
  additionalTabs = [],
  defaultSelectedTab = 'home',
  className = '',
  viewContext,
  homeLabel = 'Home'
}) => {
  const [selectedTab, setSelectedTab] = React.useState<string>(defaultSelectedTab);
  
  // Build all available tabs
  const allTabs = React.useMemo(() => {
    const tabs = [
      {
        key: 'home',
        label: homeLabel,
        actions: homeActions
      },
      ...additionalTabs
    ];
    return tabs;
  }, [homeLabel, homeActions, additionalTabs]);
  
  // Get actions for currently selected tab
  const currentActions = React.useMemo(() => {
    const activeTab = allTabs.find(tab => tab.key === selectedTab);
    return activeTab?.actions || homeActions;
  }, [selectedTab, allTabs, homeActions]);
  
  // Determine if we should show back button
  const isDetailView = viewContext?.isDetailView || false;
  const showTabs = allTabs.length > 1 && !isDetailView;
  
  return (
    <div className={`ribbon-container ${className}`.trim()}>
      {/* Back Button for Detail Views */}
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
        /* Tab Navigation */
        showTabs && (
          <TabList 
            selectedValue={selectedTab}
            onTabSelect={(_, data) => setSelectedTab(data.value as string)}
          >
            {allTabs.map((tab) => (
              <Tab
                key={tab.key}
                value={tab.key}
                data-testid={tab.testId || `ribbon-${tab.key}-tab-btn`}
                disabled={tab.disabled}
              >
                {tab.label}
              </Tab>
            ))}
          </TabList>
        )
      )}

      {/* Current Tab Toolbar */}
      <div className="toolbarContainer">
        <BaseRibbonToolbar actions={currentActions} />
      </div>
    </div>
  );
};
