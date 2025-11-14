import React from "react";
import { ArrowLeft20Regular } from "@fluentui/react-icons";
import { BaseItemEditorView, BaseItemEditorViewProps } from "./BaseItemEditorView";
import { RibbonAction } from "./Ribbon";
import { DetailViewActionsContext } from "./BaseItemEditor";
import "../styles.scss";

/**
 * Action item for the detail view ribbon
 * 
 * Direct alias to RibbonAction for semantic clarity in detail view context.
 * Since RibbonAction now has full tooltip support, no additional properties are needed.
 */
export interface DetailViewAction extends RibbonAction {
}

/**
 * BaseItemEditorDetailView Props Interface
 */
export interface BaseItemEditorDetailViewProps extends BaseItemEditorViewProps {
  /** Optional additional actions to display in the ribbon (back action is provided automatically) */
  actions?: DetailViewAction[];
  /** Callback to register actions with parent ribbon */
  onActionsChange?: (actions: DetailViewAction[]) => void;
  /** Callback for the back action */
  onBack?: () => void;
  /** Custom label for the back button (defaults to "Back") */
  backLabel?: string;
  /** Custom tooltip for the back button */
  backTooltip?: string;
}

/**
 * BaseItemEditorDetailView Component
 * 
 * A specialized view component for displaying detail pages within item editors.
 * Built on BaseItemEditorView with added support for context-specific ribbon actions.
 * 
 * ## Architecture
 * 
 * ```
 * ┌────────────────────────────────────────────────────┐
 * │  BaseItemEditor (Ribbon with dynamic actions)      │
 * │  ┌──────────────────────────────────────────────┐  │
 * │  │  BaseItemEditorDetailView                    │  │
 * │  │  ┌────────────┬───────────────────────────┐ │  │
 * │  │  │            │                           │ │  │
 * │  │  │   Left     │      Center Content       │ │  │
 * │  │  │ (Optional) │      (Required)           │ │  │
 * │  │  │            │                           │ │  │
 * │  │  │ Properties │   Detail form/content     │ │  │
 * │  │  │ Navigation │   Data visualization      │ │  │
 * │  │  │ Metadata   │   Editor workspace        │ │  │
 * │  │  │            │                           │ │  │
 * │  │  └────────────┴───────────────────────────┘ │  │
 * │  └──────────────────────────────────────────────┘  │
 * └────────────────────────────────────────────────────┘
 * ```
 * 
 * ## Key Features
 * - **Context-Specific Actions**: Define actions that appear in the ribbon for this view
 * - **Flexible Layout**: Optional left panel + required center content using panel config objects
 * - **Action Management**: Automatically notifies parent when actions change
 * - **Consistent Styling**: Uses BaseItemEditorView for layout consistency
 * - **Standardized Actions**: Uses RibbonAction interface with full tooltip support
 * 
 * ## Design Principles
 * - **Action-Driven**: Surface relevant actions in the ribbon based on view context
 * - **Composable**: Built on BaseItemEditorView for consistency
 * - **Flexible**: Left panel optional for simple or complex layouts
 * - **Accessible**: Inherits ARIA support from BaseItemEditorView
 * - **Fabric Compliant**: Uses design tokens and standard patterns
 * - **Type Safe**: Strong TypeScript interfaces throughout
 * 
 * ## Action System
 * 
 * DetailViewAction is a direct alias to RibbonAction, providing:
 * - **Unified Interface**: Same properties as RibbonAction
 * - **Tooltip Support**: Built-in tooltip with fallback to label
 * - **No Conversion**: Direct usage without transformation
 * - **Consistency**: Same API across all ribbon contexts
 * 
 * ## Usage Examples
 * 
 * ### Example 1: Simple Detail View with Actions
 * ```tsx
 * import { BaseItemEditorDetailView } from "../../controls";
 * import { Save24Regular, Delete24Regular } from "@fluentui/react-icons";
 * 
 * const actions = [
 *   {
 *     key: 'save',
 *     label: 'Save Changes',
 *     icon: Save24Regular,
 *     onClick: () => handleSave(),
 *     appearance: 'primary',
 *     tooltip: 'Save your current changes'
 *   },
 *   {
 *     key: 'delete',
 *     label: 'Delete',
 *     icon: Delete24Regular,
 *     onClick: () => handleDelete(),
 *     appearance: 'subtle',
 *     disabled: !canDelete,
 *     tooltip: 'Delete this item permanently'
 *   }
 * ];
 * 
 * <BaseItemEditorDetailView
 *   center={{
 *     content: <MyDetailContent />
 *   }}
 *   actions={actions}
 *   onActionsChange={handleActionsChange}  // Legacy callback support
 * />
 * ```
 * 
 * ### Example 2: With Left Properties Panel
 * ```tsx
 * <BaseItemEditorDetailView
 *   left={{
 *     content: <PropertiesPanel item={selectedItem} />,
 *     title: "Properties",
 *     width: 300,
 *     collapsible: true
 *   }}
 *   center={{
 *     content: <DetailEditor item={selectedItem} />
 *   }}
 *   actions={[
 *     {
 *       key: 'apply',
 *       label: 'Apply',
 *       icon: Save24Regular, // All actions require an icon
 *       onClick: () => applyChanges(),
 *       appearance: 'primary'
 *     }
 *   ]}
 * />
 * ```
 * 
 * ### Example 3: With BaseItemEditor View Registration (Recommended)
 * ```tsx
 * // In your item editor using the new ViewContext system
 * const views = (setCurrentView) => [
 *   {
 *     name: 'main',
 *     component: <MainView onShowDetail={(id) => setCurrentView(`detail-${id}`)} />
 *   },
 *   {
 *     name: 'detail-123',
 *     component: (
 *       <BaseItemEditorDetailView
 *         left={{
 *           content: <NavigationMenu onSelect={setSelectedPage} />,
 *           title: "Navigation",
 *           width: 240
 *         }}
 *         center={{
 *           content: <PageContent page="overview" />
 *         }}
 *         actions={[
 *           {
 *             key: 'export',
 *             label: 'Export',
 *             icon: ArrowDownload24Regular,
 *             onClick: () => handleExport(),
 *             tooltip: 'Export current page'
 *           },
 *           {
 *             key: 'share',
 *             label: 'Share', 
 *             icon: Share24Regular,
 *             onClick: () => handleShare(),
 *             tooltip: 'Share with others'
 *           }
 *         ]}
 *       />
 *     ),
 *     isDetailView: true  // ⭐ Automatic back navigation with ViewContext
 *   }
 * ];
 * 
 * // BaseItemEditor automatically handles back navigation and action registration
 * <BaseItemEditor
 *   views={views}
 *   initialView="main"
 *   ribbon={(context) => (
 *     <BaseRibbon
 *       homeActions={context.isDetailView ? [] : homeActions}  // Empty on detail views
 *       viewContext={context}  // Provides automatic back button and action integration
 *     />
 *   )}
 * />
 * ```
 * 
 * ## Action Management
 * 
 * The parent component (typically the item editor) should handle action updates:
 * 
 * ### Legacy Pattern (onActionsChange callback)
 * ```tsx
 * const [currentActions, setCurrentActions] = useState<DetailViewAction[]>([]);
 * 
 * // When view changes, update ribbon actions via callback
 * const handleActionsChange = (actions: DetailViewAction[]) => {
 *   setCurrentActions(actions);
 *   // Actions are now directly compatible with RibbonAction - no conversion needed
 *   updateRibbon(actions);
 * };
 * ```
 * 
 * ### Recommended Pattern (BaseItemEditor ViewContext)
 * ```tsx
 * // BaseItemEditor automatically manages detail view actions through ViewContext
 * // No manual action management needed - actions are automatically registered!
 * 
 * <BaseItemEditor
 *   views={views}  // Views register their own actions
 *   ribbon={(context) => (
 *     <BaseRibbon
 *       homeActions={[
 *         createSaveAction(handleSave, !canSave, 'Save'),
 *         createSettingsAction(handleSettings, 'Settings', false)  // No divider after
 *       ]}
 *       viewContext={context}  // Automatic action integration
 *       detailViewActions={context.detailViewActions}  // Actions from current detail view
 *     />
 *   )}
 * />
 * ```
 * 
 * ## Integration with Ribbon System
 * 
 * DetailViewActions are automatically compatible with the ribbon system:
 * 
 * ### Direct Compatibility with RibbonAction
 * ```tsx
 * // Define actions with full RibbonAction properties
 * const detailActions: DetailViewAction[] = [
 *   {
 *     key: 'save',
 *     label: 'Save',
 *     icon: Save24Regular,
 *     tooltip: 'Save your changes',
 *     onClick: handleSave,
 *     appearance: 'primary'
 *   }
 * ];
 * 
 * // Use directly in ribbon toolbar - no conversion needed
 * <BaseRibbonToolbar actions={detailActions} />
 * ```
 * 
 * ### Integration with Standard Actions
 * ```tsx
 * import { createSaveAction, createSettingsAction, createAboutAction } from '../../controls/Ribbon';
 * 
 * // Combine standard and custom actions
 * const actions = [
 *   createSaveAction(handleSave, !isDirty, 'Save Changes'),
 *   createSettingsAction(handleSettings, 'Properties', true),  // Show divider after (default)
 *   createAboutAction(handleAbout, 'Info'),
 *   // Custom actions
 *   {
 *     key: 'export',
 *     label: 'Export',
 *     icon: Download24Regular,
 *     onClick: handleExport
 *   }
 * ];
 * ```
 * 
 * ### New BaseRibbon Integration (Recommended)
 * ```tsx
 * // BaseRibbon now uses homeActions + additionalTabs architecture
 * <BaseRibbon
 *   homeActions={[
 *     createSaveAction(handleSave, !isDirty),
 *     createSettingsAction(handleSettings, 'Settings', false)  // ⭐ New: optional showDividerAfter parameter
 *   ]}
 *   additionalTabs={[
 *     {
 *       key: 'data',
 *       label: 'Data',
 *       actions: [refreshAction, importAction]
 *     }
 *   ]}
 *   viewContext={context}  // ⭐ ViewContext provides automatic detail view handling
 *   detailViewActions={context.detailViewActions}  // ⭐ Actions from BaseItemEditorDetailView
 * />
 * ```
 * 
 * ## Fabric UX Compliance
 * - Uses Fabric design tokens for consistent spacing
 * - Inherits responsive behavior from BaseItemEditorView
 * - Proper action button styling and states
 * - Semantic HTML structure with ARIA landmarks
 * - High contrast mode support
 * 
 * @component
 * @see {@link https://react.fluentui.dev/} Fluent UI v9 Documentation
 * @see {@link BaseItemEditorView} Base layout component
 */
export function BaseItemEditorDetailView({
  left,
  center,
  className,
  actions = [],
  onActionsChange,
  onBack,
  backLabel = "Back",
  backTooltip = "Return to previous view"
}: BaseItemEditorDetailViewProps) {

  // Get the context to register actions with BaseItemEditor
  const detailViewActionsContext = React.useContext(DetailViewActionsContext);

  // Create the back action
  const backAction: DetailViewAction = {
    key: 'back',
    label: backLabel,
    icon: ArrowLeft20Regular,
    onClick: onBack || (() => {}),
    appearance: 'subtle',
    disabled: !onBack,
    tooltip: backTooltip
  };

  // Combine back action with additional actions
  const allActions = [backAction, ...actions];

  // Notify parent when actions change (legacy onActionsChange prop)
  React.useEffect(() => {
    if (onActionsChange) {
      onActionsChange(allActions);
    }
  }, [actions, onActionsChange, onBack, backLabel, backTooltip]);

  // Register actions with BaseItemEditor through context
  React.useEffect(() => {
    if (detailViewActionsContext) {
      // Only pass the custom actions (not back action) to the toolbar
      // The back action is handled separately by the BaseRibbon
      detailViewActionsContext.setDetailViewActions(actions);
    }
    
    // Cleanup: clear actions when component unmounts
    return () => {
      if (detailViewActionsContext) {
        detailViewActionsContext.setDetailViewActions([]);
      }
    };
  }, [detailViewActionsContext, actions]);

  // Use BaseItemEditorView for consistent layout
  return (
    <BaseItemEditorView
      left={left}
      center={center}
      className={className}
    />
  );
}

export default BaseItemEditorDetailView;
