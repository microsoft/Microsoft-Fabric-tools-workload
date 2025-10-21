import React, { ReactNode } from "react";
import "../styles.scss";

/**
 * Registered view definition
 */
export interface RegisteredView {
  /** Unique name/key for the view */
  name: string;
  /** The view component to render */
  component: ReactNode;
}

/**
 * BaseItemEditor Props Interface (Legacy Mode)
 * 
 * @property {ReactNode} ribbon - The ribbon component to display at the top (required)
 * @property {ReactNode} notification - Optional notification/message bar between ribbon and content (fixed, not scrolled)
 * @property {ReactNode} children - The content to display in the scrollable area
 * @property {string} className - Optional additional CSS class for the editor container
 * @property {string} contentClassName - Optional additional CSS class for the scrollable content area
 */
export interface BaseItemEditorPropsLegacy {
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
 * BaseItemEditor Props Interface (View Registration Mode)
 * 
 * BaseItemEditor manages the view state internally. Children can change views using setCurrentView.
 * 
 * @property {ReactNode | Function} ribbon - The ribbon component (can access currentView and setCurrentView)
 * @property {ReactNode | Function} notification - Optional notification (can access currentView)
 * @property {RegisteredView[] | Function} views - Array of registered views or factory function
 * @property {string} initialView - Name of the initial view to show
 * @property {(view: string) => void} onViewChange - Optional callback when view changes
 * @property {string} className - Optional additional CSS class for the editor container
 * @property {string} contentClassName - Optional additional CSS class for the scrollable content area
 */
export interface BaseItemEditorPropsWithViews {
  /** The ribbon component - can be ReactNode or function receiving (currentView, setCurrentView) */
  ribbon: ReactNode | ((currentView: string, setCurrentView: (view: string) => void) => ReactNode);
  /** Optional notification area - can be ReactNode or function receiving (currentView) */
  notification?: ReactNode | ((currentView: string) => ReactNode);
  /** Array of registered views or factory function that receives setCurrentView */
  views: RegisteredView[] | ((setCurrentView: (view: string) => void) => RegisteredView[]);
  /** Name of the initial view to show */
  initialView: string;
  /** Optional callback when view changes */
  onViewChange?: (view: string) => void;
  /** Optional CSS class for the editor container */
  className?: string;
  /** Optional CSS class for the scrollable content area */
  contentClassName?: string;
}

/**
 * Union type for backward compatibility
 */
export type BaseItemEditorProps = BaseItemEditorPropsLegacy | BaseItemEditorPropsWithViews;

/**
 * BaseItemEditor Component
 * 
 * A foundational editor control that provides a consistent layout for item editors:
 * - Fixed ribbon at the top (always visible)
 * - Scrollable content area that fills the remaining space
 * - Proper height management to fill the iframe
 * - Support for different view types (empty, default, detail pages)
 * 
 * ## Two Usage Modes
 * 
 * ### 1. Legacy Mode (Direct Children)
 * Pass content directly as children - simple but requires manual view switching
 * 
 * ### 2. View Registration Mode (Recommended)
 * BaseItemEditor manages view state internally. Children can switch views using setCurrentView.
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
 * ## Usage Examples
 * 
 * ### Legacy Mode (Backward Compatible)
 * ```tsx
 * import { BaseItemEditor } from "../../controls";
 * 
 * <BaseItemEditor ribbon={<MyRibbon />}>
 *   {currentView === 'empty' ? (
 *     <EmptyView />
 *   ) : (
 *     <DefaultView />
 *   )}
 * </BaseItemEditor>
 * ```
 * 
 * ### View Registration Mode (Recommended)
 * ```tsx
 * import { BaseItemEditor, RegisteredView } from "../../controls";
 * 
 * // Option 1: Static views array
 * const views: RegisteredView[] = [
 *   { name: 'empty', component: <EmptyView /> },
 *   { name: 'default', component: <DefaultView /> }
 * ];
 * 
 * // Option 2: Factory function (when views need setCurrentView)
 * const createViews = (setCurrentView: (view: string) => void) => [
 *   { 
 *     name: 'empty', 
 *     component: <EmptyView onStart={() => setCurrentView('default')} /> 
 *   },
 *   { name: 'default', component: <DefaultView /> }
 * ];
 * 
 * <BaseItemEditor 
 *   // Ribbon receives currentView and setCurrentView
 *   ribbon={(currentView, setCurrentView) => (
 *     <MyRibbon 
 *       currentView={currentView}
 *       onViewChange={setCurrentView} 
 *     />
 *   )}
 *   // Notification receives currentView
 *   notification={(currentView) => 
 *     currentView === 'default' ? <MessageBar>Info</MessageBar> : undefined
 *   }
 *   views={createViews}  // or static views array
 *   initialView="empty"
 *   onViewChange={(view) => console.log('View changed:', view)}
 * />
 * ```
 * 
 * ## Features
 * 
 * - **Fixed Ribbon**: Ribbon stays at the top during scrolling
 * - **Full Height**: Editor fills 100% of the iframe
 * - **Independent Scrolling**: Content scrolls while ribbon remains visible
 * - **View Management**: Centralized view registration and switching
 * - **Consistent Layout**: Enforces Fabric design guidelines
 * - **Backward Compatible**: Supports both legacy and new patterns
 * 
 * @component
 */
export function BaseItemEditor(props: BaseItemEditorProps) {
  const { className = "", contentClassName = "" } = props;

  // Internal state for view management
  const [currentView, setCurrentViewInternal] = React.useState<string>('');

  // Initialize view state from initialView prop
  React.useEffect(() => {
    if ('views' in props && 'initialView' in props && !currentView) {
      setCurrentViewInternal(props.initialView);
    }
  }, [props, currentView]);

  // Wrapped setCurrentView that calls the optional callback
  const setCurrentView = React.useCallback((view: string) => {
    setCurrentViewInternal(view);
    if ('views' in props && 'onViewChange' in props) {
      props.onViewChange?.(view);
    }
  }, [props]);

  // Resolve ribbon (either ReactNode or render function)
  const ribbonContent = React.useMemo(() => {
    const ribbon = 'ribbon' in props ? props.ribbon : null;
    if (typeof ribbon === 'function') {
      return ribbon(currentView, setCurrentView);
    }
    return ribbon;
  }, [props, currentView, setCurrentView]);

  // Resolve notification (either ReactNode or render function)
  const notificationContent = React.useMemo(() => {
    const notification = 'notification' in props ? props.notification : undefined;
    if (typeof notification === 'function') {
      return notification(currentView);
    }
    return notification;
  }, [props, currentView]);

  // Resolve views (either array or factory function)
  const resolvedViews = React.useMemo((): RegisteredView[] => {
    if ('views' in props) {
      const views = props.views;
      if (typeof views === 'function') {
        return views(setCurrentView);
      }
      return views;
    }
    return [];
  }, [props, setCurrentView]);

  // Determine which mode we're in and get the content
  const content = React.useMemo(() => {
    // View Registration Mode (both controlled and uncontrolled)
    if ('views' in props) {
      const activeView = resolvedViews.find((v: RegisteredView) => v.name === currentView);
      return activeView?.component || null;
    }
    
    // Legacy Mode
    if ('children' in props) {
      return props.children;
    }
    
    return null;
  }, [props, resolvedViews, currentView]);

  return (
    <div className={`item-editor-container ${className}`.trim()} data-testid="item-editor">
      {/* Fixed ribbon at the top */}
      <div className="item-editor-container__ribbon" data-testid="item-editor-ribbon">
        {ribbonContent}
      </div>
      
      {/* Optional notification area (fixed, not scrolled) */}
      {notificationContent && (
        <div className="item-editor-container__notification" data-testid="base-item-editor-notification">
          {notificationContent}
        </div>
      )}
      
      {/* Scrollable content area */}
      <div className={`item-editor-container__content ${contentClassName}`.trim()} data-testid="base-item-editor-content">
        {content}
      </div>
    </div>
  );
}
