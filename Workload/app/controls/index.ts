/**
 * Reusable Controls for Microsoft Fabric Workload Items
 * 
 * This module exports commonly used UI controls that maintain consistency
 * across all item editors in the workload.
 */

// Base Item Editor - Foundation for all item editors
export { BaseItemEditor } from './BaseItemEditor';
export type { 
  BaseItemEditorProps, 
  BaseItemEditorPropsLegacy, 
  BaseItemEditorPropsWithViews,
  RegisteredView,
  ViewContext
} from './BaseItemEditor';

// Base Item Editor Empty View - Reusable empty state component
export { BaseItemEditorEmptyView } from './BaseItemEditorEmptyView';
export type { BaseItemEditorEmptyViewProps, EmptyStateTask } from './BaseItemEditorEmptyView';

// Base Item Editor View - Layout component for editor content
export { BaseItemEditorView } from './BaseItemEditorView';
export type { BaseItemEditorViewProps } from './BaseItemEditorView';

// Base Item Editor Detail View - Detail view with ribbon actions support
export { BaseItemEditorDetailView } from './BaseItemEditorDetailView';
export type { BaseItemEditorDetailViewProps, DetailViewAction } from './BaseItemEditorDetailView';

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
