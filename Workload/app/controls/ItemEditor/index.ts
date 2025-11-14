/**
 * BaseItemEditor Components
 * 
 * This module exports all BaseItemEditor-related components and types
 * for building consistent item editors in Microsoft Fabric workloads.
 */

// Core BaseItemEditor component
export { BaseItemEditor } from './BaseItemEditor';
export type { 
  BaseItemEditorProps, 
  RegisteredView,
  ViewContext
} from './BaseItemEditor';

// BaseItemEditor View components
export { BaseItemEditorView } from './BaseItemEditorView';
export type { BaseItemEditorViewProps, LeftPanelConfig, CentralPanelConfig } from './BaseItemEditorView';

// BaseItemEditor Empty View component
export { BaseItemEditorEmptyView } from './BaseItemEditorEmptyView';
export type { BaseItemEditorEmptyViewProps, EmptyStateTask } from './BaseItemEditorEmptyView';

// BaseItemEditor Detail View component  
export { BaseItemEditorDetailView } from './BaseItemEditorDetailView';
export type { BaseItemEditorDetailViewProps, DetailViewAction } from './BaseItemEditorDetailView';

// Item Editor Loading Progress Bar
export { ItemEditorLoadingProgressBar } from './ItemEditorLoadingProgressBar';

// Ribbon Controls - Standardized ribbon components
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

// Re-export DetailViewActionsContext for consumers who need it
export { DetailViewActionsContext } from './BaseItemEditor';