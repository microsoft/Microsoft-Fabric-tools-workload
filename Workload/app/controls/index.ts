/**
 * Reusable Controls for Microsoft Fabric Workload Items
 * 
 * This module exports commonly used UI controls that maintain consistency
 * across all item editors in the workload.
 */

// Base Item Editor - Foundation for all item editors
export { BaseItemEditor } from './BaseItemEditor';
export type { BaseItemEditorProps } from './BaseItemEditor';

// Item Editor Loading Progress Bar
export { ItemEditorLoadingProgressBar } from './ItemEditorLoadingProgressBar';

// Ribbon Controls - Standardized ribbon components
export { 
  BaseRibbon,
  BaseRibbonToolbar,
  RibbonButton,
  createSaveAction,
  createSettingsAction,
  createAboutAction
} from './Ribbon';

export type { 
  BaseRibbonProps,
  RibbonTab,
  BaseRibbonToolbarProps,
  RibbonAction,
  RibbonButtonProps,
  FluentIconComponent
} from './Ribbon';
