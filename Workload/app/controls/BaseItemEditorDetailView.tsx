import React from "react";
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
  /** Optional additional actions to display in the ribbon */
  actions?: DetailViewAction[];
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
 * - **Automatic Back Navigation**: Back button handled automatically when view is marked as `isDetailView: true`
 * - **Action Management**: Automatically registers actions with parent through context
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
 *       icon: Save24Regular, // Requires an icon
 *       onClick: () => applyChanges(),
 *       appearance: 'primary'
 *     }
 *   ]}
 * />
 * ```
 * 
 * ### Example 3: With Navigation Panel
 * ```tsx
 * const [selectedPage, setSelectedPage] = useState('overview');
 * 
 * import { ArrowDownload24Regular, Share24Regular } from "@fluentui/react-icons";
 * 
 * const actions = [
 *   {
 *     key: 'export',
 *     label: 'Export',
 *     icon: ArrowDownload24Regular,
 *     onClick: () => handleExport(),
 *     tooltip: 'Export current page'
 *   },
 *   {
 *     key: 'share',
 *     label: 'Share',
 *     icon: Share24Regular,
 *     onClick: () => handleShare(),
 *     tooltip: 'Share with others'
 *   }
 * ];
 * 
 * <BaseItemEditorDetailView
 *   left={{
 *     content: (
 *       <NavigationMenu
 *         items={pages}
 *         selected={selectedPage}
 *         onSelect={setSelectedPage}
 *       />
 *     ),
 *     title: "Navigation",
 *     width: 240
 *   }}
 *   center={{
 *     content: <PageContent page={selectedPage} />
 *   }}
 *   actions={actions}
 * />
 * ```
 * 
 * ## Action Management
 * 
 * Actions are automatically registered with the parent BaseItemEditor through the DetailViewActionsContext.
 * When a detail view is active, its actions appear in the ribbon toolbar automatically.
 * 
 * ```tsx
 * // Just define your actions - registration is automatic
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
 * // Actions automatically appear in ribbon when this view is active
 * <BaseItemEditorDetailView
 *   center={{ content: <MyContent /> }}
 *   actions={detailActions}
 * />
 * ```
 * 
 * ## Integration with Ribbon System
 * 
 * DetailViewActions are automatically compatible with the ribbon system:
 * 
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
  actions = []
}: BaseItemEditorDetailViewProps) {

  // Get the context to register actions with BaseItemEditor
  const detailViewActionsContext = React.useContext(DetailViewActionsContext);

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
