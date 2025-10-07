# BaseItemEditor Control

The `BaseItemEditor` is a foundational control for building item editors in the Microsoft Fabric Extensibility Toolkit. It provides a consistent layout pattern with a fixed ribbon at the top and scrollable content below.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Usage](#usage)
- [Props API](#props-api)
- [Layout Guidelines](#layout-guidelines)
- [View Types](#view-types)
- [Styling](#styling)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Accessibility](#accessibility)

## Overview

The `BaseItemEditor` component enforces a standard layout pattern for all item editors:

```
┌─────────────────────────────────────┐
│  Ribbon (Fixed at top)              │
├─────────────────────────────────────┤
│                                     │
│  Scrollable Content Area            │
│  - Empty View                       │
│  - Default View                     │
│  - Detail Pages                     │
│  - Custom Views                     │
│                                     │
│  (scrolls independently)            │
│                                     │
└─────────────────────────────────────┘
```

### Key Benefits

✅ **Consistent UX** - All editors follow the same layout pattern  
✅ **Fixed Navigation** - Ribbon stays visible during scroll  
✅ **Full Height** - Properly fills the iframe container  
✅ **Independent Scrolling** - Content scrolls without affecting ribbon  
✅ **Flexible Content** - Supports any view type or custom components  
✅ **Fabric Compliant** - Follows Microsoft Fabric design guidelines  

## Architecture

### Component Hierarchy

```
BaseItemEditor
├── base-item-editor__ribbon (fixed)
│   └── [Your Ribbon Component]
└── base-item-editor__content (scrollable)
    └── [Your View Components]
        ├── Empty View
        ├── Default View
        ├── Detail Pages
        └── Custom Views
```

### Layout Strategy

- **Container**: `display: flex` with `flex-direction: column`
- **Height**: `100vh` to fill the entire iframe
- **Ribbon**: `flex-shrink: 0` to prevent collapsing
- **Content**: `flex: 1` to fill remaining space with `overflow-y: auto`

## Features

### Fixed Ribbon
The ribbon remains visible at the top of the editor regardless of scroll position, ensuring users always have access to primary actions.

### Full-Height Layout
The editor automatically fills 100% of the iframe height, providing a native app-like experience within Fabric.

### Independent Scrolling
Content area scrolls independently while the ribbon stays fixed, preventing "double scrolling" issues.

### Flexible Content
Supports any React component as content, including:
- Empty state views for new items
- Default views with forms and data
- Detail pages for Level 2 navigation
- Custom views specific to your item type

### Customizable Styling
Both the editor container and content area accept custom CSS classes for additional styling needs.

## Usage

### Basic Implementation

```tsx
import { BaseItemEditor } from "../../controls";
import { MyItemRibbon } from "./MyItemRibbon";

export function MyItemEditor(props: PageProps) {
  return (
    <BaseItemEditor
      ribbon={<MyItemRibbon {...props} />}
    >
      <div>Your content here</div>
    </BaseItemEditor>
  );
}
```

### With View Switching

```tsx
import { BaseItemEditor } from "../../controls";
import { MyItemRibbon } from "./MyItemRibbon";
import { MyItemEmpty } from "./MyItemEmpty";
import { MyItemDefault } from "./MyItemDefault";

export function MyItemEditor(props: PageProps) {
  const [currentView, setCurrentView] = useState(VIEW_TYPES.EMPTY);
  
  return (
    <BaseItemEditor
      ribbon={
        <MyItemRibbon 
          {...props}
          currentView={currentView}
        />
      }
    >
      {currentView === VIEW_TYPES.EMPTY ? (
        <MyItemEmpty onNavigateToDefault={() => setCurrentView(VIEW_TYPES.DEFAULT)} />
      ) : (
        <MyItemDefault item={item} />
      )}
    </BaseItemEditor>
  );
}
```

### With Custom Classes

```tsx
<BaseItemEditor
  ribbon={<MyItemRibbon {...props} />}
  className="my-custom-editor"
  contentClassName="my-custom-content"
>
  <MyContent />
</BaseItemEditor>
```

## Props API

### BaseItemEditorProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `ribbon` | `ReactNode` | ✅ Yes | - | The ribbon component to display at the top |
| `children` | `ReactNode` | ✅ Yes | - | The content to display in the scrollable area |
| `className` | `string` | ❌ No | `""` | Additional CSS class for the editor container |
| `contentClassName` | `string` | ❌ No | `""` | Additional CSS class for the scrollable content area |

### Type Definitions

```typescript
export interface BaseItemEditorProps {
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

The `BaseItemEditor` supports different view types that can be switched based on item state:

### Empty View
First screen users see when creating a new item.

```tsx
<BaseItemEditor ribbon={<MyRibbon />}>
  <MyItemEditorEmpty onStart={handleStart} />
</BaseItemEditor>
```

**Characteristics:**
- Centered content
- Call-to-action button
- Illustration or icon
- Minimal height: 500px for proper centering

### Default View
Main editing interface with forms, controls, and data.

```tsx
<BaseItemEditor ribbon={<MyRibbon />}>
  <MyItemEditorDefault item={item} />
</BaseItemEditor>
```

**Characteristics:**
- Full-featured forms
- Multiple sections/cards
- Scrolls when content overflows
- White background cards with shadows

### Detail Pages (Level 2)
Deep-dive pages accessed from the default view.

```tsx
<BaseItemEditor ribbon={<MyRibbon />}>
  <MyItemDetailPage 
    detailId={detailId}
    onBack={handleBack}
  />
</BaseItemEditor>
```

**Characteristics:**
- Focused on single entity
- Back navigation support
- May have sub-sections
- Follows same styling patterns

### Custom Views
Any custom content specific to your item type.

```tsx
<BaseItemEditor ribbon={<MyRibbon />}>
  <MyCustomView {...customProps} />
</BaseItemEditor>
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

### Complete HelloWorld Pattern

```tsx
import React, { useEffect, useState } from "react";
import { BaseItemEditor, ItemEditorLoadingProgressBar } from "../../controls";
import { HelloWorldItemRibbon } from "./HelloWorldItemRibbon";
import { HelloWorldItemEditorEmpty } from "./HelloWorldItemEditorEmpty";
import { HelloWorldItemEditorDefault } from "./HelloWorldItemEditorDefault";

export function HelloWorldItemEditor(props: PageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<HelloWorldItemDefinition>>();
  const [currentView, setCurrentView] = useState<CurrentView>(VIEW_TYPES.EMPTY);

  // Loading state
  if (isLoading) {
    return <ItemEditorLoadingProgressBar message="Loading item..." />;
  }

  // Main editor
  return (
    <BaseItemEditor
      ribbon={
        <HelloWorldItemRibbon
          {...props}
          isSaveButtonEnabled={isSaveEnabled()}
          currentView={currentView}
          saveItemCallback={handleSave}
          openSettingsCallback={handleOpenSettings}
          navigateToGettingStartedCallback={() => setCurrentView(VIEW_TYPES.GETTING_STARTED)}
        />
      }
    >
      {currentView === VIEW_TYPES.EMPTY ? (
        <HelloWorldItemEditorEmpty
          workloadClient={workloadClient}
          item={item}
          onNavigateToGettingStarted={() => setCurrentView(VIEW_TYPES.GETTING_STARTED)}
        />
      ) : (
        <HelloWorldItemEditorDefault
          workloadClient={workloadClient}
          item={item}
        />
      )}
    </BaseItemEditor>
  );
}
```

### With Multiple Detail Pages

```tsx
export function MyItemEditor(props: PageProps) {
  const [currentPage, setCurrentPage] = useState<'main' | 'detail'>('main');
  const [selectedDetailId, setSelectedDetailId] = useState<string>();

  return (
    <BaseItemEditor
      ribbon={
        <MyItemRibbon 
          {...props}
          showBackButton={currentPage === 'detail'}
          onBack={() => setCurrentPage('main')}
        />
      }
    >
      {currentPage === 'main' ? (
        <MyItemMain 
          onViewDetail={(id) => {
            setSelectedDetailId(id);
            setCurrentPage('detail');
          }}
        />
      ) : (
        <MyItemDetail 
          detailId={selectedDetailId}
          onBack={() => setCurrentPage('main')}
        />
      )}
    </BaseItemEditor>
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

#### Pattern 1: State-Based Views
```tsx
{currentView === VIEW_TYPES.EMPTY ? <EmptyView /> : <DefaultView />}
```

#### Pattern 2: Loading Guard
```tsx
if (isLoading) return <LoadingProgressBar />;
return <BaseItemEditor ribbon={...}>...</BaseItemEditor>;
```

#### Pattern 3: Nested Detail Pages
```tsx
{currentPage === 'main' ? <MainView /> : <DetailView />}
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

## Related Documentation

- **[Ribbon Controls](../RibbonControls/README.md)** - Documentation for ribbon components
- **[HelloWorld Item](../../items/HelloWorldItem/)** - Reference implementation
- **[Fabric Design Guidelines](https://learn.microsoft.com/en-us/fabric/)** - Official Fabric design system

## Support

For questions or issues related to BaseItemEditor:
1. Check the [HelloWorldItemEditor.tsx](../../Workload/app/items/HelloWorldItem/HelloWorldItemEditor.tsx) reference implementation
2. Review the [Ribbon Controls documentation](../RibbonControls/README.md)
3. Consult the Fabric Extensibility team

---

**Last Updated**: 2025-10-06  
**Version**: 1.0.0
