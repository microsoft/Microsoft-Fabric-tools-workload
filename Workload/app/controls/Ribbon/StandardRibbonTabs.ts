import { RibbonTab } from './BaseRibbon';

/**
 * Standard Ribbon Tabs - Factory functions for creating consistent ribbon tabs
 * 
 * This module provides factory functions to create standardized ribbon tabs
 * that follow Microsoft Fabric design guidelines.
 * 
 * Key Features:
 * - Ensures Home tab is always present (mandatory)
 * - Provides helpers for common tab types
 * - Maintains consistent tab structure
 * 
 * @example Basic Usage
 * ```tsx
 * const tabs = createRibbonTabs(
 *   t('Home'),
 *   [
 *     createInsertTab(t('Insert')),
 *     createFormatTab(t('Format'))
 *   ]
 * );
 * ```
 */

/**
 * Creates a Home tab - the mandatory tab for all ribbons
 * 
 * @param label - The localized label for the Home tab
 * @param disabled - Optional disabled state
 * @returns A RibbonTab configured as the Home tab
 * 
 * @example
 * ```tsx
 * const homeTab = createHomeTab(t('ItemEditor_Ribbon_Home_Label'));
 * ```
 */
export function createHomeTab(label: string, disabled?: boolean): RibbonTab {
  return {
    value: 'home',
    label,
    testId: 'ribbon-home-tab-btn',
    disabled
  };
}

/**
 * Creates a complete ribbon tabs array with mandatory Home tab
 * 
 * This is the recommended way to create ribbon tabs as it ensures
 * the Home tab is always present as the first tab.
 * 
 * @param homeLabel - The localized label for the mandatory Home tab
 * @param additionalTabs - Optional array of additional tabs to include after Home
 * @returns Array of RibbonTab with Home tab always first
 * 
 * @example Simple usage with Home tab only
 * ```tsx
 * const tabs = createRibbonTabs(t('Home'));
 * ```
 * 
 * @example With additional tabs
 * ```tsx
 * const tabs = createRibbonTabs(
 *   t('Home'),
 *   [
 *     { value: 'insert', label: t('Insert') },
 *     { value: 'format', label: t('Format') }
 *   ]
 * );
 * ```
 */
export function createRibbonTabs(
  homeLabel: string,
  additionalTabs?: RibbonTab[]
): RibbonTab[] {
  const homeTab = createHomeTab(homeLabel);
  
  if (!additionalTabs || additionalTabs.length === 0) {
    return [homeTab];
  }
  
  return [homeTab, ...additionalTabs];
}

/**
 * Creates an Insert tab
 * 
 * @param label - The localized label for the Insert tab
 * @param disabled - Optional disabled state
 * @returns A RibbonTab configured as the Insert tab
 */
export function createInsertTab(label: string, disabled?: boolean): RibbonTab {
  return {
    value: 'insert',
    label,
    testId: 'ribbon-insert-tab-btn',
    disabled
  };
}

/**
 * Creates a Format tab
 * 
 * @param label - The localized label for the Format tab
 * @param disabled - Optional disabled state
 * @returns A RibbonTab configured as the Format tab
 */
export function createFormatTab(label: string, disabled?: boolean): RibbonTab {
  return {
    value: 'format',
    label,
    testId: 'ribbon-format-tab-btn',
    disabled
  };
}

/**
 * Creates a Data tab
 * 
 * @param label - The localized label for the Data tab
 * @param disabled - Optional disabled state
 * @returns A RibbonTab configured as the Data tab
 */
export function createDataTab(label: string, disabled?: boolean): RibbonTab {
  return {
    value: 'data',
    label,
    testId: 'ribbon-data-tab-btn',
    disabled
  };
}

/**
 * Creates a View tab
 * 
 * @param label - The localized label for the View tab
 * @param disabled - Optional disabled state
 * @returns A RibbonTab configured as the View tab
 */
export function createViewTab(label: string, disabled?: boolean): RibbonTab {
  return {
    value: 'view',
    label,
    testId: 'ribbon-view-tab-btn',
    disabled
  };
}

/**
 * Creates a custom tab with a specified value
 * 
 * @param value - The unique identifier for the tab
 * @param label - The localized label for the tab
 * @param disabled - Optional disabled state
 * @returns A RibbonTab with the specified configuration
 * 
 * @example
 * ```tsx
 * const customTab = createCustomTab('analytics', t('Analytics'));
 * ```
 */
export function createCustomTab(
  value: string, 
  label: string, 
  disabled?: boolean
): RibbonTab {
  return {
    value,
    label,
    testId: `ribbon-${value}-tab-btn`,
    disabled
  };
}
