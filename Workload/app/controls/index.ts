/**
 * Reusable Controls for Microsoft Fabric Workload Items
 * 
 * This module exports commonly used UI controls that maintain consistency
 * across all item editors in the workload.
 */

// Base Item Editor - Foundation for all item editors
export { 
  ItemEditor,
  ItemEditorView,
  ItemEditorEmptyView,
  ItemEditorDetailView,
  Ribbon,
  RibbonToolbar,
  RibbonToolbarAction,
  RibbonActionButton,
  createSaveAction,
  createSettingsAction,
  createAboutAction
} from './ItemEditor/';

export type { 
  ItemEditorProps, 
  RegisteredView,
  ViewContext,
  ItemEditorViewProps,
  LeftPanelConfig,
  CentralPanelConfig,
  ItemEditorEmptyViewProps,
  EmptyStateTask,
  ItemEditorDetailViewProps,
  DetailViewAction,
  RibbonProps,
  RibbonToolbarProps,
  RibbonAction,
  RibbonToolbarActionProps,
  RibbonActionButtonProps,
  FluentIconComponent
} from './ItemEditor/';
