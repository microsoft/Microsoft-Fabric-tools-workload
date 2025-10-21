import React, { ReactNode } from "react";
import "../styles.scss";

/**
 * BaseItemEditorView Props Interface
 */
export interface BaseItemEditorViewProps {
  /** Optional left panel content (e.g., navigation, tree view, file explorer) */
  left?: ReactNode;
  /** Required center content area (main canvas/workspace) */
  center: ReactNode;
  /** Optional className for custom styling */
  className?: string;
  /** Width of the left panel in pixels (default: 280px) */
  leftPanelWidth?: number;
  /** Minimum width of the left panel for resizing (default: 200px) */
  leftPanelMinWidth?: number;
  /** Whether the left panel is collapsible (default: false) */
  isLeftPanelCollapsible?: boolean;
  /** Initial collapsed state of left panel (default: false) */
  isLeftPanelCollapsed?: boolean;
  /** Callback when left panel collapse state changes */
  onLeftPanelCollapseChange?: (isCollapsed: boolean) => void;
}

/**
 * BaseItemEditorView Component
 * 
 * A flexible layout component for item editor content areas with optional left panel and required center content.
 * This component is designed to be used WITHIN BaseItemEditor's children area.
 * 
 * ## Architecture
 * 
 * ```
 * ┌────────────────────────────────────────────────────┐
 * │  BaseItemEditor (Ribbon at top)                    │
 * │  ┌──────────────────────────────────────────────┐  │
 * │  │  BaseItemEditorView                          │  │
 * │  │  ┌────────────┬───────────────────────────┐ │  │
 * │  │  │            │                           │ │  │
 * │  │  │   Left     │      Center Content       │ │  │
 * │  │  │  (Optional)│      (Required)           │ │  │
 * │  │  │            │                           │ │  │
 * │  │  │  Navigation│   Main workspace/canvas   │ │  │
 * │  │  │  Tree View │   Editor area             │ │  │
 * │  │  │  File List │   Form/Details            │ │  │
 * │  │  │            │                           │ │  │
 * │  │  └────────────┴───────────────────────────┘ │  │
 * │  └──────────────────────────────────────────────┘  │
 * └────────────────────────────────────────────────────┘
 * ```
 * 
 * ## Design Principles
 * - **Left Panel (Optional)**: 280px default width for navigation/explorer
 * - **Center Area (Required)**: Flexible width, takes remaining space
 * - **Responsive**: Proper spacing and overflow handling
 * - **Accessible**: Semantic HTML with ARIA regions
 * - **Fabric Compliant**: Uses design tokens for spacing and colors
 * 
 * ## Usage Examples
 * 
 * ### Example 1: Center Content Only (No Left Panel)
 * ```tsx
 * import { BaseItemEditor } from "../../controls";
 * import { BaseItemEditorView } from "../../controls";
 * 
 * <BaseItemEditor ribbon={<MyRibbon />}>
 *   <BaseItemEditorView
 *     center={<MyMainContent />}
 *   />
 * </BaseItemEditor>
 * ```
 * 
 * ### Example 2: With Left Navigation Panel
 * ```tsx
 * <BaseItemEditor ribbon={<MyRibbon />}>
 *   <BaseItemEditorView
 *     left={<NavigationTree items={navItems} />}
 *     center={<DetailView selectedItem={selectedItem} />}
 *   />
 * </BaseItemEditor>
 * ```
 * 
 * ### Example 3: With Custom Left Panel Width
 * ```tsx
 * <BaseItemEditor ribbon={<MyRibbon />}>
 *   <BaseItemEditorView
 *     left={<FileExplorer files={files} />}
 *     center={<CodeEditor file={currentFile} />}
 *     leftPanelWidth={320}
 *     leftPanelMinWidth={240}
 *   />
 * </BaseItemEditor>
 * ```
 * 
 * ### Example 4: With Collapsible Left Panel
 * ```tsx
 * const [isCollapsed, setIsCollapsed] = useState(false);
 * 
 * <BaseItemEditor ribbon={<MyRibbon />}>
 *   <BaseItemEditorView
 *     left={<PropertiesPanel properties={props} />}
 *     center={<DesignCanvas elements={elements} />}
 *     isLeftPanelCollapsible={true}
 *     isLeftPanelCollapsed={isCollapsed}
 *     onLeftPanelCollapseChange={setIsCollapsed}
 *   />
 * </BaseItemEditor>
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
export function BaseItemEditorView({
  left,
  center,
  className = "",
  leftPanelWidth = 280,
  leftPanelMinWidth = 200,
  isLeftPanelCollapsible = false,
  isLeftPanelCollapsed = false,
  onLeftPanelCollapseChange
}: BaseItemEditorViewProps) {

  const handleToggleCollapse = () => {
    if (isLeftPanelCollapsible && onLeftPanelCollapseChange) {
      onLeftPanelCollapseChange(!isLeftPanelCollapsed);
    }
  };

  return (
    <div 
      className={`item-editor-view ${className}`.trim()}
      data-testid="item-editor-view"
    >
      {/* Left Panel (Optional) */}
      {left && !isLeftPanelCollapsed && (
        <aside 
          className="item-editor-view__left"
          style={{ 
            width: `${leftPanelWidth}px`,
            minWidth: `${leftPanelMinWidth}px`
          }}
          role="complementary"
          aria-label="Navigation panel"
          data-testid="item-editor-view-left"
        >
          <div className="item-editor-view__left-content">
            {left}
          </div>
          {isLeftPanelCollapsible && (
            <button
              className="item-editor-view__left-toggle"
              onClick={handleToggleCollapse}
              aria-label="Collapse panel"
              title="Collapse panel"
            >
              ◀
            </button>
          )}
        </aside>
      )}

      {/* Collapsed State Toggle Button */}
      {left && isLeftPanelCollapsed && isLeftPanelCollapsible && (
        <button
          className="item-editor-view__left-toggle-collapsed"
          onClick={handleToggleCollapse}
          aria-label="Expand panel"
          title="Expand panel"
        >
          ▶
        </button>
      )}

      {/* Center Content Area (Required) */}
      <main 
        className="item-editor-view__center"
        role="main"
        aria-label="Main content"
        data-testid="item-editor-view-center"
      >
        {center}
      </main>
    </div>
  );
}

export default BaseItemEditorView;
