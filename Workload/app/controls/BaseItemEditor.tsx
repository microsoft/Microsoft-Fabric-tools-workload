import React, { ReactNode } from "react";
import "../styles.scss";

/**
 * BaseItemEditor Props Interface
 * 
 * @property {ReactNode} ribbon - The ribbon component to display at the top (required)
 * @property {ReactNode} notification - Optional notification/message bar between ribbon and content (fixed, not scrolled)
 * @property {ReactNode} children - The content to display in the scrollable area
 * @property {string} className - Optional additional CSS class for the editor container
 * @property {string} contentClassName - Optional additional CSS class for the scrollable content area
 */
export interface BaseItemEditorProps {
  /** The ribbon component that will be fixed at the top */
  ribbon: ReactNode;
  /** Optional notification area between ribbon and content (e.g., MessageBar for warnings) */
  notification?: ReactNode;
  /** The content that will scroll below the ribbon */
  children: ReactNode;
  /** Optional CSS class for the editor container */
  className?: string;
  /** Optional CSS class for the scrollable content area */
  contentClassName?: string;
}

/**
 * BaseItemEditor Component
 * 
 * A foundational editor control that provides a consistent layout for item editors:
 * - Fixed ribbon at the top (always visible)
 * - Scrollable content area that fills the remaining space
 * - Proper height management to fill the iframe
 * - Support for different view types (empty, default, detail pages)
 * 
 * ## Architecture
 * 
 * ```
 * ┌─────────────────────────────────────┐
 * │  Ribbon (Fixed at top)              │
 * ├─────────────────────────────────────┤
 * │  Notification (Optional, Fixed)     │
 * ├─────────────────────────────────────┤
 * │                                     │
 * │  Scrollable Content Area            │
 * │  - Empty View                       │
 * │  - Default View                     │
 * │  - Detail Pages                     │
 * │  - Custom Views                     │
 * │                                     │
 * │  (scrolls independently)            │
 * │                                     │
 * └─────────────────────────────────────┘
 * ```
 * 
 * ## Usage Example
 * 
 * ```tsx
 * import { BaseItemEditor } from "../../controls";
 * import { HelloWorldItemRibbon } from "./HelloWorldItemRibbon";
 * 
 * export function HelloWorldItemEditor(props: PageProps) {
 *   return (
 *     <BaseItemEditor
 *       ribbon={
 *         <HelloWorldItemRibbon
 *           {...props}
 *           isSaveButtonEnabled={isSaveEnabled()}
 *           currentView={currentView}
 *           saveItemCallback={SaveItem}
 *           openSettingsCallback={handleOpenSettings}
 *         />
 *       }
 *     >
 *       {currentView === VIEW_TYPES.EMPTY ? (
 *         <HelloWorldItemEditorEmpty {...emptyProps} />
 *       ) : (
 *         <HelloWorldItemEditorDefault {...defaultProps} />
 *       )}
 *     </BaseItemEditor>
 *   );
 * }
 * ```
 * 
 * ## Features
 * 
 * - **Fixed Ribbon**: Ribbon stays at the top during scrolling
 * - **Full Height**: Editor fills 100% of the iframe
 * - **Independent Scrolling**: Content scrolls while ribbon remains visible
 * - **Flexible Content**: Supports any view type or custom content
 * - **Consistent Layout**: Enforces Fabric design guidelines
 * - **Customizable**: Additional classes can be applied via props
 * 
 * ## Layout Guidelines
 * 
 * - The ribbon is always required (mandatory prop)
 * - Content area automatically gets scrolling when it overflows
 * - Background colors follow Fabric neutral background patterns
 * - Padding and spacing follow Fabric design tokens
 * 
 * @component
 * @example
 * // Basic usage
 * <BaseItemEditor ribbon={<MyRibbon />}>
 *   <MyContent />
 * </BaseItemEditor>
 * 
 * @example
 * // With custom classes
 * <BaseItemEditor 
 *   ribbon={<MyRibbon />}
 *   className="my-editor"
 *   contentClassName="my-content"
 * >
 *   <MyContent />
 * </BaseItemEditor>
 */
export function BaseItemEditor({
  ribbon,
  notification,
  children,
  className = "",
  contentClassName = ""
}: BaseItemEditorProps) {
  return (
    <div className={`item-editor-container ${className}`.trim()} data-testid="item-editor">
      {/* Fixed ribbon at the top */}
      <div className="item-editor-container__ribbon" data-testid="item-editor-ribbon">
        {ribbon}
      </div>
      
      {/* Optional notification area (fixed, not scrolled) */}
      {notification && (
        <div className="item-editor-container__notification" data-testid="base-item-editor-notification">
          {notification}
        </div>
      )}
      
      {/* Scrollable content area */}
      <div className={`item-editor-container__content ${contentClassName}`.trim()} data-testid="base-item-editor-content">
        {children}
      </div>
    </div>
  );
}
