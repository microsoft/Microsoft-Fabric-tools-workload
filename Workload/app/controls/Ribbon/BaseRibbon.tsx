import React, { ReactNode } from "react";
import { Tab, TabList } from '@fluentui/react-tabs';
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
 * - Proper styling and shadow effects
 * - Accessibility support
 * 
 * @example
 * ```tsx
 * <BaseRibbon tabs={createRibbonTabs(t('Home'))}>
 *   <BaseRibbonToolbar actions={actions} />
 * </BaseRibbon>
 * ```
 */
export const BaseRibbon: React.FC<BaseRibbonProps> = ({
  children,
  tabs = [],
  defaultSelectedTab = 'home',
  showTabs = true,
  className = ''
}) => {
  return (
    <div className={`ribbon-container ${className}`.trim()}>
      {/* Tab Navigation - Only show if tabs are provided and showTabs is true */}
      {showTabs && tabs.length > 0 && (
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
      )}

      {/* Toolbar Container */}
      <div className="toolbarContainer">
        {children}
      </div>
    </div>
  );
};
