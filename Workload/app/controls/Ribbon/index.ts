/**
 * Ribbon Controls - Reusable ribbon components for Microsoft Fabric workload items
 * 
 * This module provides a set of standardized ribbon components that follow
 * Microsoft Fabric design guidelines and ensure consistency across all item editors.
 * 
 * Key Components:
 * - BaseRibbon: Main ribbon container with clean homeActions + additionalTabs API
 * - BaseRibbonToolbar: Toolbar component that renders actions (internal use)
 * - RibbonButton: Standardized button with Tooltip (accessibility compliant)
 * - StandardRibbonActions: Factory functions for common actions
 * 
 * ⚠️ IMPORTANT: All ribbons MUST include homeActions (mandatory Home tab).
 * Use the new clean API pattern for consistent ribbons.
 * 
 * @example Simple Pattern (Recommended for most items)
 * ```tsx
 * import { 
 *   BaseRibbon,
 *   createSaveAction, 
 *   createSettingsAction 
 * } from '../../controls/Ribbon';
 * 
 * const MyItemRibbon = (props) => {
 *   const { t } = useTranslation();
 *   
 *   // Mandatory home actions
 *   const homeActions = [
 *     createSaveAction(handleSave, !hasChanges, t('Save')),
 *     createSettingsAction(handleSettings, t('Settings'))
 *   ];
 *   
 *   return (
 *     <BaseRibbon 
 *       homeActions={homeActions}
 *       viewContext={viewContext} 
 *     />
 *   );
 * };
 * ```
 * 
 * @example Complex Pattern with Additional Tabs
 * ```tsx
 * import { BaseRibbon, createSaveAction, RibbonAction } from '../../controls/Ribbon';
 * import { Share24Regular } from '@fluentui/react-icons';
 * 
 * const homeActions = [
 *   createSaveAction(handleSave, !hasChanges, t('Save')),
 *   createSettingsAction(handleSettings, t('Settings'))
 * ];
 * 
 * const additionalTabs = [
 *   {
 *     key: 'data',
 *     label: t('Data'),
 *     actions: [
 *       {
 *         key: 'export',
 *         icon: Share24Regular,
 *         label: t('Export'),
 *         onClick: handleExport
 *       }
 *     ]
 *   }
 * ];
 * 
 * <BaseRibbon 
 *   homeActions={homeActions}
 *   additionalTabs={additionalTabs}
 *   viewContext={viewContext} 
 * />
 * ```
 */

export { BaseRibbon } from './BaseRibbon';
export type { BaseRibbonProps, RibbonTabToolbar } from './BaseRibbon';

export { BaseRibbonToolbar } from './BaseRibbonToolbar';
export type { BaseRibbonToolbarProps, RibbonAction } from './BaseRibbonToolbar';

export { RibbonButton } from './RibbonButton';
export type { RibbonButtonProps, FluentIconComponent } from './RibbonButton';

export {
  createSaveAction,
  createSettingsAction,
  createAboutAction
} from './StandardRibbonActions';
