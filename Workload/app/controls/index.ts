/**
 * Reusable Controls for Microsoft Fabric Workload Items
 * 
 * This module exports commonly used UI controls that maintain consistency
 * across all item editors in the workload.
 * 
 * @see {@link ../../docs/controls/README.md} - Complete controls documentation overview
 * @see {@link ../../docs/controls/ItemEditor.md} - ItemEditor component and architecture
 * @see {@link ../../docs/controls/Wizard.md} - Wizard component for step-by-step workflows
 * @see {@link ../../docs/controls/OneLakeView.md} - OneLakeView component for data browsing
 */

// Base Item Editor - Foundation for all item editors
export { 
  ItemEditor,
  ItemEditorDefaultView,
  ItemEditorEmptyView,
  ItemEditorDetailView,
  Ribbon,
  RibbonToolbar,
  RibbonToolbarAction,
  createSaveAction,
  createSettingsAction,
  createAboutAction
} from './ItemEditor/';

export type { 
  ItemEditorProps, 
  RegisteredView,
  ViewContext,
  LeftPanelConfig,
  CentralPanelConfig,
  EmptyStateTask,
  DetailViewAction,
  RibbonProps,
  RibbonAction,
  RibbonActionButton,
  FluentIconComponent
} from './ItemEditor/';

// Wizard Control - Step-by-step guided workflows
export { 
  WizardControl
} from './Wizard/';

export type { 
  WizardStep, 
  WizardControlProps,
  WizardStepProps,
  WizardNavigationProps
} from './Wizard/';

// OneLakeView Control - OneLake item browsing and selection
export { 
  OneLakeView
} from './OneLakeView/';

export type { 
  OneLakeViewProps,
  OneLakeViewItem,
  TableMetadata,
  FileMetadata,
  LoadingStatus
} from './OneLakeView/';
