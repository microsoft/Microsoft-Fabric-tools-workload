/**
 * ItemEditor Components
 * 
 * This module exports all ItemEditor-related components and types
 * for building consistent item editors in Microsoft Fabric workloads.
 */

// Core ItemEditor component
export { ItemEditor } from './ItemEditor';
export type { 
  ItemEditorProps, 
  RegisteredView,
  ViewContext
} from './ItemEditor';

// ItemEditor View components
export { ItemEditorDefaultView } from './ItemEditorDefaultView';
export type { ItemEditorDefaultViewProps, LeftPanelConfig, CentralPanelConfig, BottomPanelConfig } from './ItemEditorDefaultView';

// ItemEditor Empty View component
export { ItemEditorEmptyView } from './ItemEditorEmptyView';
export type { ItemEditorEmptyViewProps, EmptyStateTask } from './ItemEditorEmptyView';

// ItemEditor Detail View component  
export { ItemEditorDetailView } from './ItemEditorDetailView';
export type { ItemEditorDetailViewProps, DetailViewAction } from './ItemEditorDetailView';

// Item Editor Loading View (internal use only - handled by ItemEditor)
// export { ItemEditorLoadingView } from './ItemEditorLoadingView';

// Ribbon Controls - Standardized ribbon components
export { Ribbon } from './Ribbon';
export type { RibbonProps, RibbonTab } from './Ribbon';

export { RibbonToolbar } from './RibbonToolbar';
export type { RibbonToolbarProps, RibbonAction } from './RibbonToolbar';

export { RibbonToolbarAction } from './RibbonToolbarAction';
export type { RibbonToolbarActionProps, FluentIconComponent } from './RibbonToolbarAction';

export { RibbonActionButton } from './RibbonActionButton';
export type { RibbonActionButtonProps, RibbonActionButtonConfig, DropdownMenuItem } from './RibbonActionButton';

export { 
  createSaveAction,
  createSettingsAction,
  createAboutAction
} from './RibbonStandardActions';

// Re-export DetailViewActionsContext for consumers who need it
export { DetailViewActionsContext } from './ItemEditor';