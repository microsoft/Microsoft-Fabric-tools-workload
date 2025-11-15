import React, { ReactNode } from "react";
import { Button, Text } from "@fluentui/react-components";
import { ChevronDoubleLeft20Regular, ChevronDoubleRight20Regular } from "@fluentui/react-icons";
import "../../styles.scss";

/**
 * Left Panel Configuration Interface
 * 
 * Defines the configuration for the optional left panel in ItemEditorView.
 * The left panel provides a consistent layout for navigation, properties, file explorers,
 * and other secondary content areas.
 * 
 * ## Collapse Behavior
 * - **State Management**: Toggle state is always managed internally by ItemEditorView
 * - **Initial State**: Use `collapsed` to set the initial collapsed state (default: false)
 * - **Notification**: Use `onCollapseChange` to receive notifications when state changes
 * - **No External Control**: External components cannot control the collapse state after initialization
 * 
 * ## Header Behavior
 * - **Expanded**: Shows title on left, collapse button (⏷) on right
 * - **Collapsed**: Shows only expand button (⏵) in vertical strip
 * - **Pattern**: Follows SampleOneLakeItemExplorer design for consistency
 * 
 * @example
 * ```tsx
 * // Basic collapsible panel
 * const leftConfig: LeftPanelConfig = {
 *   content: <MyNavigationTree />,
 *   title: "Navigation",
 *   collapsible: true
 * };
 * 
 * // Panel with custom width and notification
 * const leftConfig: LeftPanelConfig = {
 *   content: <FileExplorer />,
 *   title: "Files",
 *   width: 320,
 *   minWidth: 240,
 *   collapsible: true,
 *   collapsed: false, // Start expanded
 *   onCollapseChange: (collapsed) => {
 *     console.log(`Panel ${collapsed ? 'collapsed' : 'expanded'}`);
 *   }
 * };
 * ```
 */
export interface LeftPanelConfig {
  /** Left panel content (e.g., navigation, tree view, file explorer) */
  content: ReactNode;
  /** Optional title for the left panel header (default: "Panel") */
  title?: string;
  /** Width of the left panel in pixels (default: 280px) */
  width?: number;
  /** Minimum width of the left panel for resizing (default: 200px) */
  minWidth?: number;
  /** Whether the left panel is collapsible (default: false) */
  collapsible?: boolean;
  /** Initial collapsed state of left panel (default: false) - state is managed internally after initialization */
  collapsed?: boolean;
  /** Callback when left panel collapse state changes (notification only) - does not control state */
  onCollapseChange?: (isCollapsed: boolean) => void;
}

/**
 * Central Panel Configuration Interface
 * 
 * Defines the configuration for the required center content area in ItemEditorView.
 * The center panel is the main workspace area for content editing, forms, canvases, and primary user interactions.
 * 
 * ## Design Principles
 * - **Main Content**: Always visible and takes remaining space after left panel
 * - **Flexible**: Adapts to various content types (editors, forms, canvases, etc.)
 * - **Scrollable**: Handles overflow with proper scroll behavior
 * - **Accessible**: Uses proper ARIA roles and semantic HTML
 * 
 * @example
 * ```tsx
 * // Basic center content
 * const centerConfig: CentralPanelConfig = {
 *   content: <MyMainEditor />
 * };
 * 
 * // Center content with custom styling and accessibility
 * const centerConfig: CentralPanelConfig = {
 *   content: <DesignCanvas />,
 *   className: "custom-canvas-area",
 *   ariaLabel: "Design canvas workspace"
 * };
 * ```
 */
export interface CentralPanelConfig {
  /** Main content area (e.g., editor, form, canvas, workspace) */
  content: ReactNode;
  /** Optional className for custom styling */
  className?: string;
  /** Optional ARIA label for accessibility (default: "Main content") */
  ariaLabel?: string;
}

/**
 * ItemEditorView Props Interface
 */
export interface ItemEditorViewProps {
  /** Optional left panel configuration */
  left?: LeftPanelConfig;
  /** Required center content area configuration */
  center: CentralPanelConfig;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * ItemEditorView Component
 * 
 * A flexible layout component for item editor content areas with optional left panel and required center content.
 * This component is designed to be used WITHIN ItemEditor's children area.
 * 
 * ## Architecture
 * 
 * ```
 * ┌────────────────────────────────────────────────────┐
 * │  ItemEditor (Ribbon at top)                        │
 * │  ┌──────────────────────────────────────────────┐  │
 * │  │  ItemEditorView                              │  │
 * │  │  ┌────────────┬───────────────────────────┐ │  │
 * │  │  │ ┌──────────┐│                           │ │  │
 * │  │  │ │Title  [⏷]││      Center Content       │ │  │
 * │  │  │ └──────────┘│      (Required)           │ │  │
 * │  │  │            │                           │ │  │
 * │  │  │   Left     │   Main workspace/canvas   │ │  │
 * │  │  │ (Optional) │   Editor area             │ │  │
 * │  │  │  Content   │   Form/Details            │ │  │
 * │  │  │            │                           │ │  │
 * │  │  └────────────┴───────────────────────────┘ │  │
 * │  │                                              │  │
 * │  │  Collapsed: [⏵] (vertical strip only)       │  │
 * │  └──────────────────────────────────────────────┘  │
 * └────────────────────────────────────────────────────┘
 * ```
 * 
 * ## Design Principles
 * - **Left Panel (Optional)**: 280px default width for navigation/explorer with unified configuration
 * - **Center Area (Required)**: Flexible width, takes remaining space
 * - **Responsive**: Proper spacing and overflow handling
 * - **Accessible**: Semantic HTML with ARIA regions
 * - **Fabric Compliant**: Uses design tokens for spacing and colors
 * - **Header-Based Toggle**: Follows SampleOneLakeItemExplorer pattern with title and toggle button
 * 
 * ## Usage Examples
 * 
 * ### Example 1: Center Content Only (No Left Panel)
 * ```tsx
 * import { ItemEditor, ItemEditorView } from "../../controls/ItemEditor";
 * 
 * <ItemEditor ribbon={<MyRibbon />}>
 *   <ItemEditorView
 *     center={{
 *       content: <MyMainContent />
 *     }}
 *   />
 * </ItemEditor>
 * ```
 * 
 * ### Example 2: With Left Navigation Panel
 * ```tsx
 * <ItemEditor ribbon={<MyRibbon />}>
 *   <ItemEditorView
 *     left={{
 *       content: <NavigationTree items={navItems} />,
 *       title: "Navigation"
 *     }}
 *     center={{
 *       content: <DetailView selectedItem={selectedItem} />
 *     }}
 *   />
 * </ItemEditor>
 * ```
 * 
 * ### Example 3: With Custom Left Panel Width
 * ```tsx
 * <ItemEditor ribbon={<MyRibbon />}>
 *   <ItemEditorView
 *     left={{
 *       content: <FileExplorer files={files} />,
 *       title: "Files",
 *       width: 320,
 *       minWidth: 240
 *     }}
 *     center={{
 *       content: <CodeEditor file={currentFile} />
 *     }}
 *   />
 * </ItemEditor>
 * ```
 * 
 * ### Example 4: With Collapsible Left Panel
 * ```tsx
 * <ItemEditor ribbon={<MyRibbon />}>
 *   <ItemEditorView
 *     left={{
 *       content: <PropertiesPanel properties={props} />,
 *       title: "Properties",
 *       collapsible: true,
 *       collapsed: false, // Initial state
 *       onCollapseChange: (collapsed) => console.log('Panel collapsed:', collapsed)
 *     }}
 *     center={{
 *       content: <DesignCanvas elements={elements} />
 *     }}
 *   />
 * </ItemEditor>
 * ```
 * 
 * ### Example 5: With Collapsible Left Panel (No Initial State)
 * ```tsx
 * <ItemEditor ribbon={<MyRibbon />}>
 *   <ItemEditorView
 *     left={{
 *       content: <PropertiesPanel properties={props} />,
 *       title: "Properties",
 *       collapsible: true
 *       // collapsed defaults to false, state managed internally
 *     }}
 *     center={{
 *       content: <DesignCanvas elements={elements} />
 *     }}
 *   />
 * </ItemEditor>
 * ```
 * 
 * ## Fabric UX Compliance
 * - Uses Fabric design tokens for consistent spacing
 * - Proper overflow handling for scrollable areas
 * - Semantic HTML structure with ARIA landmarks
 * - Responsive layout patterns
 * - High contrast mode support
 * 
 * @component
 * @see {@link https://react.fluentui.dev/} Fluent UI v9 Documentation
 */
export function ItemEditorView({
  left,
  center,
  className = ""
}: ItemEditorViewProps) {

  // Extract left panel configuration with defaults
  const leftPanelWidth = left?.width ?? 280;
  const leftPanelMinWidth = left?.minWidth ?? 200;
  const isLeftPanelCollapsible = left?.collapsible ?? false;
  const onLeftPanelCollapseChange = left?.onCollapseChange;
  const leftPanelTitle = left?.title ?? "Panel";

  // Extract center panel configuration with defaults
  const centerClassName = center.className ?? "";
  const centerAriaLabel = center.ariaLabel ?? "Main content";

  // Internal state for collapse - always managed internally
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = React.useState(left?.collapsed ?? false);

  const handleToggleCollapse = () => {
    if (isLeftPanelCollapsible) {
      const newCollapsedState = !isLeftPanelCollapsed;
      
      // Always update internal state
      setIsLeftPanelCollapsed(newCollapsedState);
      
      // Notify external callback if provided
      if (onLeftPanelCollapseChange) {
        onLeftPanelCollapseChange(newCollapsedState);
      }
    }
  };

  return (
    <div 
      className={`item-editor-view ${className}`.trim()}
      data-testid="item-editor-view"
    >
      {/* Left Panel (Optional) */}
      {left && (
        <aside 
          className={`item-editor-view__left ${isLeftPanelCollapsed ? "collapsed" : ""}`}
          style={{ 
            width: isLeftPanelCollapsed ? "auto" : `${leftPanelWidth}px`,
            minWidth: isLeftPanelCollapsed ? "auto" : `${leftPanelMinWidth}px`
          }}
          role="complementary"
          aria-label="Navigation panel"
          data-testid="item-editor-view-left"
        >
          {/* Header with title and toggle button */}
          <div className={`item-editor-view__left-header ${isLeftPanelCollapsed ? "collapsed" : ""}`}>
            {isLeftPanelCollapsed && (
              <>
                {isLeftPanelCollapsible && (
                  <Button 
                    appearance="subtle" 
                    icon={<ChevronDoubleRight20Regular />}
                    onClick={handleToggleCollapse}
                    aria-label="Expand panel"
                    title="Expand panel"
                    className="item-editor-view__left-expand-button"
                  />
                )}
                <Text weight="semibold" size={500} className="item-editor-view__left-title-vertical">{leftPanelTitle}</Text>
              </>
            )}
            {!isLeftPanelCollapsed && (
              <>
                <Text weight="semibold" size={400} className="item-editor-view__left-title-horizontal">{leftPanelTitle}</Text>
                {isLeftPanelCollapsible && (
                  <Button 
                    appearance="subtle" 
                    icon={<ChevronDoubleLeft20Regular />}
                    onClick={handleToggleCollapse}
                    aria-label="Collapse panel"
                    title="Collapse panel"
                    className="item-editor-view__left-collapse-button"
                  />
                )}
              </>
            )}
          </div>
          
          {/* Content area - only show when not collapsed */}
          {!isLeftPanelCollapsed && (
            <div className="item-editor-view__left-content">
              {left.content}
            </div>
          )}
        </aside>
      )}

      {/* Center Content Area (Required) */}
      <main 
        className={`item-editor-view__center ${centerClassName}`.trim()}
        role="main"
        aria-label={centerAriaLabel}
        data-testid="item-editor-view-center"
      >
        {center.content}
      </main>
    </div>
  );
}

export default ItemEditorView;