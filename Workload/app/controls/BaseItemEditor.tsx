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
  /** Whether this is a detail view (L2 page) - affects ribbon behavior */
  isDetailView?: boolean;
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
 * View context information passed to ribbon
 */
export interface ViewContext {
  /** Current active view name */
  currentView: string;
  /** Function to navigate to a different view */
  setCurrentView: (view: string) => void;
  /** Whether the current view is a detail view */
  isDetailView: boolean;
  /** Function to navigate back to previous view (only available in detail views) */
  goBack: () => void;
  /** History of visited views */
  viewHistory: string[];
}

/**
 * BaseItemEditor Props Interface (View Registration Mode)
 * 
 * BaseItemEditor manages the view state internally. Children can change views using setCurrentView.
 * 
 * ## Detail View Support (Automatic Back Navigation)
 * When a view is marked as `isDetailView: true`, BaseItemEditor AUTOMATICALLY:
 * - Tracks view history for back navigation (no manual implementation needed)
 * - Provides `context.goBack()` function to ribbon (navigates to previous view)
 * - Signals ribbon with `context.isDetailView` flag (show back button instead of tabs)
 * - Maintains complete navigation history in `context.viewHistory`
 * 
 * **NO MANUAL IMPLEMENTATION REQUIRED** - Just mark views as detail views and use `context.goBack()`
 * 
 * @property {ReactNode | Function} ribbon - The ribbon component (receives ViewContext)
 * @property {ReactNode | Function} notification - Optional notification (can access currentView)
 * @property {RegisteredView[] | Function} views - Array of registered views or factory function
 * @property {string} initialView - Name of the initial view to show
 * @property {(view: string) => void} onViewChange - Optional callback when view changes
 * @property {string} className - Optional additional CSS class for the editor container
 * @property {string} contentClassName - Optional additional CSS class for the scrollable content area
 */
export interface BaseItemEditorPropsWithViews {
  /** The ribbon component - can be ReactNode or function receiving (ViewContext) */
  ribbon: ReactNode | ((context: ViewContext) => ReactNode);
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
 * import { BaseItemEditor, RegisteredView, ViewContext } from "../../controls";
 * 
 * // Define views with detail view flag
 * const views = (setCurrentView: (view: string) => void): RegisteredView[] => [
 *   { 
 *     name: 'empty', 
 *     component: <EmptyView onStart={() => setCurrentView('main')} />
 *   },
 *   { 
 *     name: 'main', 
 *     component: <MainView onShowDetail={(id) => setCurrentView(`detail-${id}`)} />
 *   },
 *   { 
 *     name: 'detail-123', 
 *     component: <DetailView recordId="123" />,
 *     isDetailView: true  // ⭐ Marks as detail view - enables automatic back navigation
 *   }
 * ];
 * 
 * <BaseItemEditor 
 *   // Ribbon receives ViewContext with AUTOMATIC back navigation support
 *   ribbon={(context: ViewContext) => (
 *     <MyRibbon 
 *       currentView={context.currentView}
 *       isDetailView={context.isDetailView}  // True when on detail view
 *       onViewChange={context.setCurrentView}
 *       onBack={context.goBack}  // ⭐ Automatically navigates to previous view - NO MANUAL LOGIC NEEDED
 *     />
 *   )}
 *   notification={(currentView) => 
 *     currentView === 'main' ? <MessageBar>Info</MessageBar> : undefined
 *   }
 *   views={views}
 *   initialView="empty"
 * />
 * ```
 * 
 * ### Detail Views (L2 Pages) - Automatic Back Navigation
 * Detail views are special drill-down pages with AUTOMATIC back navigation:
 * 
 * **What You Do:**
 * 1. Set `isDetailView: true` in RegisteredView
 * 2. Pass `context.goBack` to ribbon back button
 * 3. Ribbon shows back button when `context.isDetailView === true`
 * 
 * **What BaseItemEditor Does AUTOMATICALLY:**
 * - ✅ Tracks complete view history
 * - ✅ Provides `context.goBack()` function (no manual implementation)
 * - ✅ Navigates to previous view when goBack() is called
 * - ✅ Maintains navigation stack across multiple detail levels
 * 
 * ```tsx
 * {
 *   name: 'detail-record-123',
 *   component: (
 *     <BaseItemEditorDetailView
 *       center={<RecordDetails recordId="123" />}
 *       actions={[  // These actions appear in ribbon when view is active
 *         { id: 'save', label: 'Save', icon: <Save24Regular />, onClick: handleSave },
 *         { id: 'delete', label: 'Delete', icon: <Delete24Regular />, onClick: handleDelete }
 *       ]}
 *     />
 *   ),
 *   isDetailView: true  // ⭐ This is ALL you need - back navigation is automatic!
 * }
 * 
 * // In your ribbon - just wire up the back button:
 * ribbon={(context) => (
 *   <Ribbon
 *     showBackButton={context.isDetailView}
 *     onBack={context.goBack}  // ⭐ No manual logic - BaseItemEditor handles everything
 *   />
 * )}
 * ```
 * 
 * ## Features
 * 
 * - **Fixed Ribbon**: Ribbon stays at the top during scrolling
 * - **Full Height**: Editor fills 100% of the iframe
 * - **Independent Scrolling**: Content scrolls while ribbon remains visible
 * - **View Management**: Centralized view registration and switching
 * - **Detail View Support**: Automatic history tracking and back navigation
 * - **View Context**: Ribbon receives full context including isDetailView flag
 * - **Consistent Layout**: Enforces Fabric design guidelines
 * - **Backward Compatible**: Supports both legacy and new patterns
 * 
 * @component
 */
export function BaseItemEditor(props: BaseItemEditorProps) {
  const { className = "", contentClassName = "" } = props;

  // Internal state for view management
  const [currentView, setCurrentViewInternal] = React.useState<string>('');
  // View history for back navigation in detail views
  const [viewHistory, setViewHistory] = React.useState<string[]>([]);

  // Initialize view state from initialView prop
  React.useEffect(() => {
    if ('views' in props && 'initialView' in props && !currentView) {
      setCurrentViewInternal(props.initialView);
      setViewHistory([props.initialView]);
    }
  }, [props, currentView]);

  // Wrapped setCurrentView that manages history and calls the optional callback
  const setCurrentView = React.useCallback((view: string) => {
    setViewHistory(prev => [...prev, view]);
    setCurrentViewInternal(view);
    if ('views' in props && 'onViewChange' in props) {
      props.onViewChange?.(view);
    }
  }, [props]);

  // Go back to previous view (for detail views)
  const goBack = React.useCallback(() => {
    if (viewHistory.length > 1) {
      // Remove current view from history
      const newHistory = [...viewHistory];
      newHistory.pop();
      const previousView = newHistory[newHistory.length - 1];
      
      setViewHistory(newHistory);
      setCurrentViewInternal(previousView);
      
      if ('views' in props && 'onViewChange' in props) {
        props.onViewChange?.(previousView);
      }
    }
  }, [viewHistory, props]);

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

  // Check if current view is a detail view
  const isDetailView = React.useMemo(() => {
    const view = resolvedViews.find((v: RegisteredView) => v.name === currentView);
    return view?.isDetailView === true;
  }, [resolvedViews, currentView]);

  // Build view context for ribbon
  const viewContext: ViewContext = React.useMemo(() => ({
    currentView,
    setCurrentView,
    isDetailView,
    goBack,
    viewHistory
  }), [currentView, setCurrentView, isDetailView, goBack, viewHistory]);

  // Resolve ribbon (either ReactNode or render function with ViewContext)
  const ribbonContent = React.useMemo(() => {
    const ribbon = 'ribbon' in props ? props.ribbon : null;
    if (typeof ribbon === 'function') {
      return ribbon(viewContext);
    }
    return ribbon;
  }, [props, viewContext]);

  // Resolve notification (either ReactNode or render function)
  const notificationContent = React.useMemo(() => {
    const notification = 'notification' in props ? props.notification : undefined;
    if (typeof notification === 'function') {
      return notification(currentView);
    }
    return notification;
  }, [props, currentView]);

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
