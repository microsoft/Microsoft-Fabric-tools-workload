# BaseItemEditor Control

The `BaseItemEditor` is a foundational control for building item editors in the Microsoft Fabric Extensibility Toolkit. It provides a view registration system with automatic navigation, fixed ribbon layout, and consistent UX patterns.

## � Component Documentation

This folder contains comprehensive documentation for the BaseItemEditor system and all related components:

### Core Components

- **[BaseItemEditor](./README.md)** (this file) - Main container with view registration system
- **[BaseRibbon](./BaseRibbon.md)** - Ribbon container with automatic back navigation
- **[BaseRibbonToolbar](./BaseRibbonToolbar.md)** - Standardized toolbar actions

### View Components

- **[BaseItemEditorView](./BaseItemEditorView.md)** - Default/main view layout
- **[BaseItemEditorEmptyView](./BaseItemEditorEmptyView.md)** - Empty state onboarding
- **[BaseItemEditorDetailView](./BaseItemEditorDetailView.md)** - Detail/drill-down views

### Reference Documentation

- **[Architecture](./Architecture.md)** - Technical architecture and design patterns
- **[QuickReference](./QuickReference.md)** - Fast lookup guide for common tasks
- **[Implementation](./Implementation.md)** - Implementation summary and migration guide

## 🚀 Quick Start

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [View Registration System](#view-registration-system)
- [ViewContext](#viewcontext)
- [Detail View Support](#detail-view-support)
- [Usage](#usage)
- [Props API](#props-api)
- [Layout Guidelines](#layout-guidelines)
- [View Types](#view-types)
- [Styling](#styling)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Accessibility](#accessibility)

## Overview

The `BaseItemEditor` component provides a complete view management system with automatic navigation and consistent layout:

```
┌─────────────────────────────────────┐
│  Ribbon (ViewContext-aware)         │
│  ├─ Back Button (detail views)      │
│  └─ Tabs + Actions (normal views)   │
├─────────────────────────────────────┤
│  Optional Notification Area         │
├─────────────────────────────────────┤
│                                     │
│  Dynamic View Content               │
│  ├─ Empty View                      │
│  ├─ Getting Started View            │
│  ├─ Detail Views (L2)               │
│  └─ Custom Views                    │
│                                     │
│  (scrolls independently)            │
│                                     │
└─────────────────────────────────────┘
```

### Key Benefits

✅ **View Registration** - Centralized view management with automatic switching  
✅ **ViewContext** - Automatic navigation context for ribbons  
✅ **Detail View Support** - Automatic back navigation for L2 pages  
✅ **Fixed Navigation** - Ribbon stays visible during scroll  
✅ **Full Height** - Properly fills the iframe container  
✅ **Independent Scrolling** - Content scrolls without affecting ribbon  
✅ **Fabric Compliant** - Follows Microsoft Fabric design guidelines  

## Architecture

### View Registration Mode (Recommended)

The modern approach using view registration eliminates manual state management:

```
BaseItemEditor (manages state internally)
├── ViewContext (automatic)
│   ├── currentView: string
│   ├── setCurrentView: (view: string) => void
│   ├── isDetailView: boolean
│   ├── goBack: () => void
│   └── viewHistory: string[]
│
├── Registered Views
│   ├── { name: "empty", component: <EmptyView /> }
│   ├── { name: "default", component: <DefaultView /> }
│   └── { name: "detail", component: <DetailView />, isDetailView: true }
│
└── Layout Strategy
    ├── ribbon receives ViewContext
    ├── notification receives currentView
    └── content renders active view
```

## Features

### Automatic View Management
BaseItemEditor manages view state internally - no need for manual useState in parent components.

### ViewContext Integration
Ribbons automatically receive navigation context with current view, navigation functions, and detail view flags.

### Detail View Support
Views marked with `isDetailView: true` automatically:
- Show back button instead of tabs in ribbon
- Track navigation history
- Provide goBack() function

### Fixed Ribbon
The ribbon remains visible at the top of the editor regardless of scroll position, ensuring users always have access to primary actions.

### Full-Height Layout
The editor automatically fills 100% of the iframe height, providing a native app-like experience within Fabric.

### Independent Scrolling
Content area scrolls independently while the ribbon stays fixed, preventing "double scrolling" issues.

### Flexible Content
Supports any React component as content through view registration.

## View Registration System

### Basic View Registration

```typescript
const EDITOR_VIEW_TYPES = {
  EMPTY: 'empty',
  DEFAULT: 'default',
  DETAILS: 'details'
} as const;

// Register views with BaseItemEditor
<BaseItemEditor
  views={[
    {
      name: EDITOR_VIEW_TYPES.EMPTY,
      component: <EmptyView onStart={() => setCurrentView(EDITOR_VIEW_TYPES.DEFAULT)} />
    },
    {
      name: EDITOR_VIEW_TYPES.DEFAULT,
      component: <DefaultView item={item} />
    },
    {
      name: EDITOR_VIEW_TYPES.DETAILS,
      component: <DetailView item={item} />,
      isDetailView: true  // ⭐ Enables automatic back navigation
    }
  ]}
  initialView={EDITOR_VIEW_TYPES.EMPTY}
  ribbon={(context) => <MyRibbon {...props} viewContext={context} />}
/>
```

### Dynamic View Registration

```typescript
// Views can be generated dynamically based on conditions
<BaseItemEditor
  views={(setCurrentView) => [
    {
      name: EDITOR_VIEW_TYPES.EMPTY,
      component: <EmptyView onNavigateToDefault={() => setCurrentView(EDITOR_VIEW_TYPES.DEFAULT)} />
    },
    {
      name: EDITOR_VIEW_TYPES.DEFAULT,
      component: <DefaultView item={item} />
    }
  ]}
  initialView={!item?.definition?.state ? EDITOR_VIEW_TYPES.EMPTY : EDITOR_VIEW_TYPES.DEFAULT}
  ribbon={(context) => <MyRibbon viewContext={context} />}
/>
```

## ViewContext

The ViewContext provides complete navigation control to ribbon components:

```typescript
interface ViewContext {
  currentView: string;           // "empty", "default", "details"
  setCurrentView: (view) => void; // Navigate to any view
  isDetailView: boolean;         // true if current view is detail view
  goBack: () => void;            // Navigate to previous view (detail views)
  viewHistory: string[];         // Complete navigation history
}
```

### Ribbon Integration

```typescript
// Ribbon receives ViewContext automatically
export function MyRibbon({ viewContext }: { viewContext: ViewContext }) {
  return (
    <BaseRibbon viewContext={viewContext}>
      <BaseRibbonToolbar actions={[
        {
          key: 'details',
          label: 'View Details',
          onClick: () => viewContext.setCurrentView('details'),
          hidden: viewContext.currentView === 'details'
        }
      ]} />
    </BaseRibbon>
  );
}
```

## Detail View Support

Detail views (L2 pages) receive automatic back navigation:

```typescript
// Mark view as detail view
{
  name: 'item-details',
  component: <ItemDetailsView item={item} />,
  isDetailView: true  // ⭐ This enables automatic features
}

// BaseItemEditor automatically:
// ✅ Tracks navigation history
// ✅ Shows back button in ribbon instead of tabs
// ✅ Provides goBack() function
// ✅ Sets isDetailView flag in ViewContext
```

### BaseRibbon Integration

BaseRibbon automatically handles detail view navigation:

```typescript
// BaseRibbon receives ViewContext and automatically:
// - Shows back button when viewContext.isDetailView is true
// - Shows tabs when viewContext.isDetailView is false
// - Wires back button to viewContext.goBack()

<BaseRibbon viewContext={viewContext}>
  <BaseRibbonToolbar actions={actions} />
</BaseRibbon>
```

## Usage

### Complete Example with View Registration

```tsx
import React from "react";
import { BaseItemEditor } from "../../controls";
import { MyItemRibbon } from "./MyItemRibbon";
import { MyItemEmpty } from "./MyItemEmpty";
import { MyItemDefaultView } from "./MyItemDefaultView";
import { MyItemDetailsView } from "./MyItemDetailsView";

const EDITOR_VIEW_TYPES = {
  EMPTY: 'empty',
  DEFAULT: 'default',
  DETAILS: 'details'
} as const;

export function MyItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const [item, setItem] = useState<ItemWithDefinition<MyItemDefinition>>();

  return (
    <BaseItemEditor
      ribbon={(context) => (
        <MyItemRibbon
          {...props}
          viewContext={context}
          onSave={handleSave}
        />
      )}
      notification={(currentView) => 
        currentView === EDITOR_VIEW_TYPES.DEFAULT ? (
          <MessageBar intent="info">
            Welcome to your new item!
          </MessageBar>
        ) : undefined
      }
      views={(setCurrentView) => [
        {
          name: EDITOR_VIEW_TYPES.EMPTY,
          component: (
            <MyItemEmptyView
              workloadClient={workloadClient}
              onNavigateToDefault={() => setCurrentView(EDITOR_VIEW_TYPES.DEFAULT)}
            />
          )
        },
        {
          name: EDITOR_VIEW_TYPES.DEFAULT,
          component: (
            <MyItemDefaultView
              workloadClient={workloadClient}
              item={item}
              onViewDetails={() => setCurrentView(EDITOR_VIEW_TYPES.DETAILS)}
            />
          )
        },
        {
          name: EDITOR_VIEW_TYPES.DETAILS,
          component: (
            <MyItemDetailsView
              workloadClient={workloadClient}
              item={item}
            />
          ),
          isDetailView: true  // ⭐ Enables automatic back navigation
        }
      ]}
      initialView={!item?.definition?.state ? EDITOR_VIEW_TYPES.EMPTY : EDITOR_VIEW_TYPES.DEFAULT}
      onViewChange={(view) => console.log('Navigated to:', view)}
    />
  );
}
```

## Props API

### BaseItemEditorPropsWithViews (Recommended)

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `ribbon` | `(context: ViewContext) => ReactNode` | ✅ Yes | - | Ribbon component factory that receives ViewContext |
| `views` | `RegisteredView[]` or `Function` | ✅ Yes | - | Array of registered views or factory function |
| `initialView` | `string` | ✅ Yes | - | Name of the initial view to show |
| `notification` | `(currentView: string) => ReactNode` | ❌ No | - | Optional notification component factory |
| `onViewChange` | `(view: string) => void` | ❌ No | - | Callback when view changes |
| `className` | `string` | ❌ No | `""` | Additional CSS class for the editor container |
| `contentClassName` | `string` | ❌ No | `""` | Additional CSS class for the scrollable content area |

### BaseItemEditorPropsLegacy (Legacy Mode)

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `ribbon` | `ReactNode` | ✅ Yes | - | The ribbon component to display at the top |
| `children` | `ReactNode` | ✅ Yes | - | The content to display in the scrollable area |
| `className` | `string` | ❌ No | `""` | Additional CSS class for the editor container |
| `contentClassName` | `string` | ❌ No | `""` | Additional CSS class for the scrollable content area |

### Type Definitions

```typescript
// View Registration Mode (Recommended)
export interface BaseItemEditorPropsWithViews {
  /** The ribbon component - receives ViewContext automatically */
  ribbon: (context: ViewContext) => ReactNode;
  /** Optional notification area - receives currentView */
  notification?: (currentView: string) => ReactNode;
  /** Array of registered views or factory function */
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

// Registered View Interface
export interface RegisteredView {
  /** Unique name/key for the view */
  name: string;
  /** The view component to render */
  component: ReactNode;
  /** Whether this is a detail view (L2 page) - affects ribbon behavior */
  isDetailView?: boolean;
}

// ViewContext passed to ribbon
export interface ViewContext {
  /** Current active view name */
  currentView: string;
  /** Function to navigate to a different view */
  setCurrentView: (view: string) => void;
  /** Whether the current view is a detail view */
  isDetailView: boolean;
  /** Function to navigate back to previous view */
  goBack: () => void;
  /** History of visited views */
  viewHistory: string[];
}

// Legacy Mode
export interface BaseItemEditorPropsLegacy {
  /** The ribbon component that will be fixed at the top */
  ribbon: ReactNode;
  /** The content that will scroll below the ribbon */
  children: ReactNode;
  /** Optional CSS class for the editor container */
  className?: string;
  /** Optional CSS class for the scrollable content area */
  contentClassName?: string;
}
```

## Layout Guidelines

### Container Structure

```scss
.base-item-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background: var(--colorNeutralBackground2);
  overflow: hidden; // Critical: prevents outer scroll
}
```

### Ribbon Area

```scss
.base-item-editor__ribbon {
  flex-shrink: 0; // Critical: prevents ribbon from collapsing
  padding: 8px 8px 0 8px;
  z-index: 1; // Keeps ribbon above content
}
```

### Content Area

```scss
.base-item-editor__content {
  flex: 1; // Critical: fills remaining space
  overflow-y: auto; // Enables independent scrolling
  overflow-x: hidden; // Prevents horizontal scroll
  padding: 8px;
}
```

## View Types

The `BaseItemEditor` supports different view types through the view registration system:

### Empty View
First screen users see when creating a new item. Registered as a view with navigation to getting started.

```tsx
// Registered as a view
{
  name: EDITOR_VIEW_TYPES.EMPTY,
  component: (
    <MyItemEmptyView 
      onStart={() => setCurrentView(EDITOR_VIEW_TYPES.DEFAULT)} 
    />
  )
}
```

**Characteristics:**
- Centered content with call-to-action
- Illustration or icon
- Navigation to main view
- Minimal height: 500px for proper centering

### Default/Getting Started View
Main editing interface or onboarding flow.

```tsx
// Registered as a view
{
  name: VIEW_TYPES.DEFAULT,
  component: (
    <MyItemEditorDefault 
      item={item}
      onViewDetails={() => setCurrentView(VIEW_TYPES.DETAILS)}
    />
  )
}
```

**Characteristics:**
- Full-featured forms or onboarding content
- Multiple sections/cards
- Scrolls when content overflows
- White background cards with shadows
- Navigation to detail views

### Detail Views (Level 2)
Deep-dive pages accessed from the main view with automatic back navigation.

```tsx
// Registered as detail view
{
  name: VIEW_TYPES.DETAILS,
  component: <MyItemDetailView item={item} />,
  isDetailView: true  // ⭐ Enables automatic back navigation
}
```

**Characteristics:**
- **Automatic back button** in ribbon (replaces tabs)
- **Automatic navigation history** tracking
- **goBack() function** provided automatically
- Focused on single entity or task
- Follows same styling patterns

### Custom Views
Any custom content specific to your item type.

```tsx
// Registered as custom view
{
  name: VIEW_TYPES.CUSTOM,
  component: <MyCustomView {...customProps} />
}
```

### View Navigation Patterns

```tsx
// From ribbon actions
const actions: RibbonAction[] = [
  {
    key: 'details',
    label: 'View Details',
    onClick: () => viewContext.setCurrentView(EDITOR_VIEW_TYPES.DETAILS),
    hidden: viewContext.currentView === EDITOR_VIEW_TYPES.DETAILS
  }
];

// From view components
<Button onClick={() => setCurrentView(EDITOR_VIEW_TYPES.DETAILS)}>
  View Details
</Button>

// Automatic back navigation (detail views only)
// Back button appears automatically - no manual implementation needed
```

## Styling

### CSS Architecture

The BaseItemEditor uses BEM (Block Element Modifier) naming:

```
.base-item-editor              ← Block
  .base-item-editor__ribbon    ← Element
  .base-item-editor__content   ← Element
```

### Design Tokens

Uses Fabric design tokens for consistency:

```scss
// Backgrounds
var(--colorNeutralBackground1)  // White cards
var(--colorNeutralBackground2)  // Light gray container

// Borders and shadows
box-shadow: 0 0 2px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.14);

// Scrollbar
var(--colorNeutralStroke1)      // Track
var(--colorNeutralStroke1Hover) // Thumb hover
```

### Custom Scrollbar

```scss
&::-webkit-scrollbar {
  width: 8px;
}

&::-webkit-scrollbar-thumb {
  background: var(--colorNeutralStroke1);
  border-radius: 4px;
}
```

### Responsive Behavior

```scss
@media (max-width: 768px) {
  .base-item-editor__ribbon,
  .base-item-editor__content {
    padding: 4px; // Reduced padding on mobile
  }
}
```

## Examples

### Complete Item Editor Pattern

```tsx
import React, { useEffect, useState } from "react";
import { BaseItemEditor, ItemEditorLoadingProgressBar } from "../../controls";
import { MyItemRibbon } from "./MyItemRibbon";
import { MyItemEmptyView } from "./MyItemEmptyView";
import { MyItemDefaultView } from "./MyItemDefaultView";

export function MyItemEditor(props: PageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<MyItemDefinition>>();

  // Loading state
  if (isLoading) {
    return <ItemEditorLoadingProgressBar message="Loading item..." />;
  }

  // View registration system
  const views: RegisteredView[] = [
    {
      name: VIEW_TYPES.EMPTY,
      component: (
        <MyItemEmptyView
          workloadClient={workloadClient}
          item={item}
          onNavigateToDefault={() => setCurrentView(VIEW_TYPES.DEFAULT)}
        />
      )
    },
    {
      name: VIEW_TYPES.DEFAULT,
      component: (
        <MyItemDefaultView
          workloadClient={workloadClient}
          item={item}
        />
      )
    }
  ];

  return (
    <BaseItemEditor
      views={views}
      defaultView={item?.definition?.data ? VIEW_TYPES.DEFAULT : VIEW_TYPES.EMPTY}
      ribbon={(viewContext) => (
        <MyItemRibbon
          {...props}
          viewContext={viewContext}
          isSaveButtonEnabled={isSaveEnabled()}
          saveItemCallback={handleSave}
          openSettingsCallback={handleOpenSettings}
        />
      )}
    />
  );
}
```

### With Multiple Detail Views

```tsx
export function MyItemEditor(props: PageProps) {
  const [selectedDetailId, setSelectedDetailId] = useState<string>();

  const views: RegisteredView[] = [
    {
      name: VIEW_TYPES.MAIN,
      component: (
        <MyItemMain 
          onViewDetail={(id) => {
            setSelectedDetailId(id);
            setCurrentView(VIEW_TYPES.DETAIL);
          }}
        />
      )
    },
    {
      name: VIEW_TYPES.DETAIL,
      component: (
        <MyItemDetail detailId={selectedDetailId} />
      ),
      isDetailView: true  // ⭐ Enables automatic back navigation
    }
  ];

  return (
    <BaseItemEditor
      views={views}
      defaultView={VIEW_TYPES.MAIN}
      ribbon={(viewContext) => (
        <MyItemRibbon 
          {...props}
          viewContext={viewContext}
        />
      )}
    />
  );
}
```

## Best Practices

### ✅ Do's

✅ **Always use BaseItemEditor** for item editors to ensure consistency  
✅ **Keep ribbon content minimal** - only essential actions  
✅ **Use proper view classes** - `editor-default-view`, `empty-state-container`  
✅ **Handle loading states** before rendering BaseItemEditor  
✅ **Provide proper min-height** for empty states (500px minimum)  
✅ **Use Fabric design tokens** for colors and spacing  
✅ **Test scrolling behavior** with long content  
✅ **Implement keyboard navigation** for accessibility  

### ❌ Don'ts

❌ **Don't add scroll to outer container** - BaseItemEditor handles scrolling  
❌ **Don't use fixed heights** on content - let it flow naturally  
❌ **Don't put multiple ribbons** - one ribbon per editor  
❌ **Don't override critical CSS** like flex properties  
❌ **Don't use absolute positioning** for main content  
❌ **Don't forget loading states** - always show progress  
❌ **Don't mix old Stack patterns** with BaseItemEditor  

### Common Patterns

#### Pattern 1: View Registration System
```tsx
const views: RegisteredView[] = [
  { name: VIEW_TYPES.EMPTY, component: <EmptyView /> },
  { name: VIEW_TYPES.DEFAULT, component: <DefaultView /> }
];
```

#### Pattern 2: Loading Guard
```tsx
if (isLoading) return <LoadingProgressBar />;
return <BaseItemEditor views={views} ribbon={(context) => ...} />;
```

#### Pattern 3: Automatic Detail Navigation
```tsx
{
  name: VIEW_TYPES.DETAIL,
  component: <DetailView />,
  isDetailView: true  // Auto back button + navigation history
}
```

#### Pattern 4: ViewContext Integration
```tsx
ribbon={(viewContext) => (
  <MyRibbon 
    viewContext={viewContext}
    onAction={() => viewContext.setCurrentView(VIEW_TYPES.OTHER)}
  />
)}
```

## Accessibility

### Keyboard Navigation

- **Tab**: Navigate through ribbon actions
- **Arrow Keys**: Navigate within ribbon tabs
- **Enter/Space**: Activate buttons
- **Escape**: Close dialogs or return to previous view

### Screen Reader Support

```tsx
<div className="base-item-editor" data-testid="base-item-editor">
  <div className="base-item-editor__ribbon" data-testid="base-item-editor-ribbon">
    {ribbon}
  </div>
  <div className="base-item-editor__content" data-testid="base-item-editor-content">
    {children}
  </div>
</div>
```

### Focus Management

```scss
.base-item-editor__content:focus {
  outline: 2px solid var(--colorBrandStroke1);
  outline-offset: -2px;
}
```

### ARIA Attributes

Add appropriate ARIA attributes to your content:

```tsx
<div role="main" aria-label="Item editor content">
  {children}
</div>
```

## 🔗 Related Documentation

- **[Sample Implementation](../HelloWorldItem/README.md)** - HelloWorld sample item for guidance  
- **[Project Structure](../Project_Structure.md)** - Overall toolkit organization  
- **[Fabric Design Guidelines](https://learn.microsoft.com/en-us/fabric/)** - Official Fabric design system

## 💬 Support

For questions or issues related to BaseItemEditor:
1. Review the component documentation in this folder
2. Check the [HelloWorld sample implementation](../../Workload/app/items/HelloWorldItem/HelloWorldItemEditor.tsx) for examples
3. Consult the Fabric Extensibility team

---

**Last Updated**: 2025-10-21  
**Version**: 2.0.0 - View Registration System
