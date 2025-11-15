import React, { ReactNode } from "react";
import { ItemEditorLoadingView } from "./ItemEditorLoadingView";
import { RibbonAction } from './RibbonToolbar';
import "../../styles.scss";

/**
 * Context for detail views to register their actions
 */
export const DetailViewActionsContext = React.createContext<{
  setDetailViewActions: (actions: RibbonAction[]) => void;
} | null>(null);

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
  /** Actions from current detail view (empty array if not detail view) */
  detailViewActions: RibbonAction[];
  /** Function to set detail view actions (called by ItemEditorDetailView) */
  setDetailViewActions: (actions: RibbonAction[]) => void;
}

/**
 * ItemEditor Props Interface
 * 
 * ItemEditor manages the view state internally. Components register views and can switch between them using setCurrentView.
 * 
 * ## Detail View Support (Automatic Back Navigation)
 * When a view is marked as `isDetailView: true`, ItemEditor AUTOMATICALLY:
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
export interface ItemEditorPropsWithViews {
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
  /** Whether to show loading indicator instead of content */
  isLoading?: boolean;
  /** Loading message to display */
  loadingMessage?: string;
}

/**
 * ItemEditor Props Interface
 */
export type ItemEditorProps = ItemEditorPropsWithViews;

/**
 * ItemEditor Component
 * 
 * A foundational editor control that provides a consistent layout for item editors:
 * - Fixed ribbon at the top (always visible)
 * - Scrollable content area that fills the remaining space
 * - Proper height management to fill the iframe
 * - Support for different view types (empty, default, detail pages)
 * 
 * ## View Registration Mode
 * 
 * ItemEditor manages view state internally. Components register views and can switch between them using setCurrentView.
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
 * import { ItemEditor, RegisteredView, ViewContext } from "../../controls/ItemEditor";
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
 * <ItemEditor 
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
 * **What ItemEditor Does AUTOMATICALLY:**
 * - ✅ Tracks complete view history
 * - ✅ Provides `context.goBack()` function (no manual implementation)
 * - ✅ Navigates to previous view when goBack() is called
 * - ✅ Maintains navigation stack across multiple detail levels
 * 
 * ```tsx
 * {
 *   name: 'detail-record-123',
 *   component: (
 *     <ItemEditorDetailView
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
 *     onBack={context.goBack}  // ⭐ No manual logic - ItemEditor handles everything
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
 * 
 * @component
 */
export function ItemEditor(props: ItemEditorProps) {
  const { className = "", contentClassName = "", isLoading = false, loadingMessage } = props;

  // Internal state for view management - Initialize with the initial view directly
  const [currentView, setCurrentViewInternal] = React.useState<string>(props.initialView || '');
  // View history for back navigation in detail views - Initialize with initial view
  const [viewHistory, setViewHistory] = React.useState<string[]>(() => 
    props.initialView ? [props.initialView] : []
  );
  // Detail view actions from current view
  const [detailViewActions, setDetailViewActions] = React.useState<RibbonAction[]>([]);

  // Update view when initialView prop changes (but avoid setState during render)
  React.useEffect(() => {
    if (props.initialView && props.initialView !== currentView) {
      setCurrentViewInternal(props.initialView);
      setViewHistory([props.initialView]);
    }
  }, [props.initialView]); // Only depend on initialView, not currentView to avoid loops

  // Wrapped setCurrentView that manages history and calls the optional callback
  const setCurrentView = React.useCallback((view: string) => {
    setViewHistory(prev => [...prev, view]);
    setCurrentViewInternal(view);
    // Clear detail view actions when changing views
    setDetailViewActions([]);
    props.onViewChange?.(view);
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
      // Clear detail view actions when going back
      setDetailViewActions([]);
      
      props.onViewChange?.(previousView);
    }
  }, [viewHistory, props]);

  // Callback for detail views to set their actions
  const handleSetDetailViewActions = React.useCallback((actions: RibbonAction[]) => {
    setDetailViewActions(actions);
  }, []);

  // Resolve views (either array or factory function)
  const resolvedViews = React.useMemo((): RegisteredView[] => {
    const views = props.views;
    if (typeof views === 'function') {
      return views(setCurrentView);
    }
    return views;
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
    viewHistory,
    detailViewActions,
    setDetailViewActions: handleSetDetailViewActions
  }), [currentView, setCurrentView, isDetailView, goBack, viewHistory, detailViewActions, handleSetDetailViewActions]);

  // Resolve ribbon (either ReactNode or render function with ViewContext)
  const ribbonContent = React.useMemo(() => {
    const ribbon = props.ribbon;
    if (typeof ribbon === 'function') {
      return ribbon(viewContext);
    }
    return ribbon;
  }, [props, viewContext]);

  // Resolve notification (either ReactNode or render function)
  const notificationContent = React.useMemo(() => {
    const notification = props.notification;
    if (typeof notification === 'function') {
      return notification(currentView);
    }
    return notification;
  }, [props, currentView]);

  // Determine content from view registration
  const content = React.useMemo(() => {
    // Show loading indicator if isLoading is true
    if (isLoading) {
      return <ItemEditorLoadingView message={loadingMessage || "Loading..."} />;
    }
    
    // View Registration Mode
    const activeView = resolvedViews.find((v: RegisteredView) => v.name === currentView);
    return activeView?.component || null;
  }, [resolvedViews, currentView, isLoading, loadingMessage]);

  return (
    <div className={`item-editor-container ${className}`.trim()} data-testid="item-editor">
      {/* Fixed ribbon at the top */}
      <div className="item-editor-container__ribbon" data-testid="item-editor-ribbon">
        {ribbonContent}
      </div>
      
      {/* Optional notification area (fixed, not scrolled) */}
      {notificationContent && (
        <div className="item-editor-container__notification" data-testid="item-editor-notification">
          {notificationContent}
        </div>
      )}
      
      {/* Scrollable content area */}
      <div className={`item-editor-container__content ${contentClassName}`.trim()} data-testid="item-editor-content">
        <DetailViewActionsContext.Provider value={{ setDetailViewActions: handleSetDetailViewActions }}>
          {content}
        </DetailViewActionsContext.Provider>
      </div>
    </div>
  );
}