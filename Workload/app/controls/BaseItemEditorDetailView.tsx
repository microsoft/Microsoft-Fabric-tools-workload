import React, { ReactNode } from "react";
import { BaseItemEditorView, LeftPanelConfig } from "./BaseItemEditorView";
import "../styles.scss";

/**
 * Action item for the detail view ribbon
 */
export interface DetailViewAction {
  /** Unique identifier for the action */
  id: string;
  /** Action label/button text */
  label: string;
  /** Click handler for the action */
  onClick: () => void;
  /** Icon component (Fluent UI icon) */
  icon?: React.ReactElement;
  /** Button appearance */
  appearance?: "primary" | "secondary" | "outline" | "subtle" | "transparent";
  /** Whether the action is disabled */
  disabled?: boolean;
  /** Tooltip text for the action */
  tooltip?: string;
}

/**
 * BaseItemEditorDetailView Props Interface
 */
export interface BaseItemEditorDetailViewProps {
  /** Optional left panel configuration (supports both ReactNode for simple usage and LeftPanelConfig for advanced) */
  left?: ReactNode | LeftPanelConfig;
  /** Required center content area (main detail content) */
  center: ReactNode;
  /** Optional actions to display in the ribbon when this view is active */
  actions?: DetailViewAction[];
  /** Callback to register actions with parent ribbon */
  onActionsChange?: (actions: DetailViewAction[]) => void;
  /** Optional className for custom styling */
  className?: string;
  /** @deprecated Use left.width instead - Width of the left panel in pixels (default: 280px) */
  leftPanelWidth?: number;
  /** @deprecated Use left.minWidth instead - Minimum width of the left panel for resizing (default: 200px) */
  leftPanelMinWidth?: number;
  /** @deprecated Use left.collapsible instead - Whether the left panel is collapsible (default: false) */
  isLeftPanelCollapsible?: boolean;
  /** @deprecated Use left.collapsed instead - Initial collapsed state of left panel (default: false) */
  isLeftPanelCollapsed?: boolean;
  /** @deprecated Use left.onCollapseChange instead - Callback when left panel collapse state changes */
  onLeftPanelCollapseChange?: (isCollapsed: boolean) => void;
  /** @deprecated Use left.title instead - Optional title for the left panel header */
  leftPanelTitle?: string;
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
 * - **Flexible Layout**: Optional left panel + required center content
 * - **Action Management**: Automatically notifies parent when actions change
 * - **Consistent Styling**: Uses BaseItemEditorView for layout consistency
 * 
 * ## Design Principles
 * - **Action-Driven**: Surface relevant actions in the ribbon based on view context
 * - **Composable**: Built on BaseItemEditorView for consistency
 * - **Flexible**: Left panel optional for simple or complex layouts
 * - **Accessible**: Inherits ARIA support from BaseItemEditorView
 * - **Fabric Compliant**: Uses design tokens and standard patterns
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
 *     id: 'save',
 *     label: 'Save Changes',
 *     icon: <Save24Regular />,
 *     onClick: () => handleSave(),
 *     appearance: 'primary'
 *   },
 *   {
 *     id: 'delete',
 *     label: 'Delete',
 *     icon: <Delete24Regular />,
 *     onClick: () => handleDelete(),
 *     appearance: 'secondary',
 *     disabled: !canDelete
 *   }
 * ];
 * 
 * <BaseItemEditorDetailView
 *   center={<MyDetailContent />}
 *   actions={actions}
 *   onActionsChange={handleActionsChange}
 * />
 * ```
 * 
 * ### Example 2: With Left Properties Panel
 * ```tsx
 * <BaseItemEditorDetailView
 *   left={<PropertiesPanel item={selectedItem} />}
 *   center={<DetailEditor item={selectedItem} />}
 *   actions={[
 *     {
 *       id: 'apply',
 *       label: 'Apply',
 *       onClick: () => applyChanges(),
 *       appearance: 'primary'
 *     }
 *   ]}
 *   leftPanelWidth={300}
 *   isLeftPanelCollapsible={true}
 * />
 * ```
 * 
 * ### Example 3: With Navigation Panel
 * ```tsx
 * const [selectedPage, setSelectedPage] = useState('overview');
 * 
 * const actions = [
 *   {
 *     id: 'export',
 *     label: 'Export',
 *     icon: <ArrowDownload24Regular />,
 *     onClick: () => handleExport(),
 *     tooltip: 'Export current page'
 *   },
 *   {
 *     id: 'share',
 *     label: 'Share',
 *     icon: <Share24Regular />,
 *     onClick: () => handleShare(),
 *     tooltip: 'Share with others'
 *   }
 * ];
 * 
 * <BaseItemEditorDetailView
 *   left={
 *     <NavigationMenu
 *       items={pages}
 *       selected={selectedPage}
 *       onSelect={setSelectedPage}
 *     />
 *   }
 *   center={<PageContent page={selectedPage} />}
 *   actions={actions}
 *   leftPanelWidth={240}
 * />
 * ```
 * 
 * ## Action Management
 * 
 * The parent component (typically the item editor) should handle action updates:
 * 
 * ```tsx
 * const [currentActions, setCurrentActions] = useState<DetailViewAction[]>([]);
 * 
 * // When view changes, update ribbon actions
 * const handleActionsChange = (actions: DetailViewAction[]) => {
 *   setCurrentActions(actions);
 *   // Update ribbon to show these actions
 * };
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
  actions = [],
  onActionsChange,
  className = "",
  leftPanelWidth = 280,
  leftPanelMinWidth = 200,
  isLeftPanelCollapsible = false,
  isLeftPanelCollapsed = false,
  onLeftPanelCollapseChange,
  leftPanelTitle
}: BaseItemEditorDetailViewProps) {

  // Convert legacy props to new LeftPanelConfig format
  const leftPanelConfig = React.useMemo((): LeftPanelConfig | undefined => {
    if (!left) return undefined;
    
    // If left is already a LeftPanelConfig object
    if (typeof left === 'object' && left !== null && 'content' in left) {
      return left as LeftPanelConfig;
    }
    
    // Convert legacy ReactNode to LeftPanelConfig
    return {
      content: left as ReactNode,
      title: leftPanelTitle,
      width: leftPanelWidth,
      minWidth: leftPanelMinWidth,
      collapsible: isLeftPanelCollapsible,
      collapsed: isLeftPanelCollapsed,
      onCollapseChange: onLeftPanelCollapseChange
    };
  }, [left, leftPanelTitle, leftPanelWidth, leftPanelMinWidth, isLeftPanelCollapsible, isLeftPanelCollapsed, onLeftPanelCollapseChange]);

  // Notify parent when actions change
  React.useEffect(() => {
    if (onActionsChange) {
      onActionsChange(actions);
    }
  }, [actions, onActionsChange]);

  // Use BaseItemEditorView for consistent layout
  return (
    <BaseItemEditorView
      left={leftPanelConfig}
      center={center}
      className={className}
    />
  );
}

export default BaseItemEditorDetailView;
