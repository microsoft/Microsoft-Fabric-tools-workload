/**
 * Reusable Controls for Microsoft Fabric Workload Items
 * 
 * This module exports commonly used UI controls that maintain consistency
 * across all item editors in the workload.
 */

// Base Item Editor - Foundation for all item editors
export { 
  BaseItemEditor,
  BaseItemEditorView,
  BaseItemEditorEmptyView,
  BaseItemEditorDetailView,
  ItemEditorLoadingProgressBar,
  BaseRibbon,
  BaseRibbonToolbar,
  RibbonButton,
  createSaveAction,
  createSettingsAction,
  createAboutAction
} from './ItemEditor/';

export type { 
  BaseItemEditorProps, 
  RegisteredView,
  ViewContext,
  BaseItemEditorViewProps,
  LeftPanelConfig,
  CentralPanelConfig,
  BaseItemEditorEmptyViewProps,
  EmptyStateTask,
  BaseItemEditorDetailViewProps,
  DetailViewAction,
  BaseRibbonProps,
  BaseRibbonToolbarProps,
  RibbonAction,
  RibbonButtonProps,
  FluentIconComponent,
  RibbonTabToolbar
} from './ItemEditor/';
