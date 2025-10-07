/**
 * Ribbon Controls - Reusable ribbon components for Microsoft Fabric workload items
 * 
 * This module provides a set of standardized ribbon components that follow
 * Microsoft Fabric design guidelines and ensure consistency across all item editors.
 * 
 * Key Components:
 * - BaseRibbon: Main ribbon container with tabs
 * - BaseRibbonToolbar: Toolbar component that renders actions
 * - RibbonButton: Standardized button with Tooltip (accessibility compliant)
 * - StandardRibbonActions: Factory functions for common actions
 * - StandardRibbonTabs: Factory functions for tab creation (MANDATORY Home tab)
 * 
 * ⚠️ IMPORTANT: All ribbons MUST include a Home tab as the first tab.
 * Use createRibbonTabs() to ensure this requirement is met automatically.
 * 
 * @example Basic Usage with Mandatory Home Tab
 * ```tsx
 * import { 
 *   BaseRibbon, 
 *   BaseRibbonToolbar, 
 *   createRibbonTabs,
 *   createSaveAction, 
 *   createSettingsAction 
 * } from '../../controls/Ribbon';
 * 
 * const MyItemRibbon = (props) => {
 *   const { t } = useTranslation();
 *   
 *   // Home tab is mandatory - createRibbonTabs ensures it's always first
 *   const tabs = createRibbonTabs(t('Home'));
 *   
 *   const actions = [
 *     createSaveAction(handleSave, !hasChanges, t('Save')),
 *     createSettingsAction(handleSettings, t('Settings'))
 *   ];
 *   
 *   return (
 *     <BaseRibbon tabs={tabs}>
 *       <BaseRibbonToolbar actions={actions} />
 *     </BaseRibbon>
 *   );
 * };
 * ```
 * 
 * @example Advanced Usage with Additional Tabs
 * ```tsx
 * import { 
 *   BaseRibbon, 
 *   BaseRibbonToolbar, 
 *   createRibbonTabs,
 *   createDataTab,
 *   createFormatTab,
 *   RibbonAction 
 * } from '../../controls/Ribbon';
 * import { Sparkle24Regular } from '@fluentui/react-icons';
 * 
 * // Home tab + additional tabs
 * const tabs = createRibbonTabs(
 *   t('Home'),
 *   [
 *     createDataTab(t('Data')),
 *     createFormatTab(t('Format'))
 *   ]
 * );
 * 
 * const customActions: RibbonAction[] = [
 *   {
 *     key: 'custom',
 *     icon: Sparkle24Regular,
 *     label: 'Custom Action',
 *     onClick: handleCustom,
 *     testId: 'custom-btn',
 *     showDividerAfter: true
 *   }
 * ];
 * 
 * <BaseRibbon tabs={tabs}>
 *   <BaseRibbonToolbar actions={customActions} />
 * </BaseRibbon>
 * ```
 */

export { BaseRibbon } from './BaseRibbon';
export type { BaseRibbonProps, RibbonTab } from './BaseRibbon';

export { BaseRibbonToolbar } from './BaseRibbonToolbar';
export type { BaseRibbonToolbarProps, RibbonAction } from './BaseRibbonToolbar';

export { RibbonButton } from './RibbonButton';
export type { RibbonButtonProps, FluentIconComponent } from './RibbonButton';

export {
  createSaveAction,
  createSettingsAction,
  createAboutAction
} from './StandardRibbonActions';

export {
  createHomeTab,
  createRibbonTabs,
  createInsertTab,
  createFormatTab,
  createDataTab,
  createViewTab,
  createCustomTab
} from './StandardRibbonTabs';
