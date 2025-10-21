# BaseRibbon Component

## 📋 Overview

The `BaseRibbon` component provides a consistent ribbon interface for Microsoft Fabric item editors. It automatically integrates with the ViewContext system for navigation and provides standardized styling and behavior.

## ✨ Features

✅ **ViewContext Integration** - Automatic back button handling for detail views  
✅ **Fabric Design System** - Uses official tokens and styling  
✅ **Accessibility Compliant** - ARIA labels, keyboard navigation, screen reader support  
✅ **Automatic Back Navigation** - Shows back button when `viewContext.isDetailView` is true  
✅ **Flexible Content** - Supports tabs, toolbars, and custom content  
✅ **TypeScript Support** - Full type definitions and IntelliSense  

## 🚀 Quick Start

### Basic Usage

```tsx
import { BaseRibbon } from "../../controls";
import { ViewContext } from "../../controls/BaseItemEditor";

export function MyItemRibbon({ viewContext }: { viewContext: ViewContext }) {
  return (
    <BaseRibbon viewContext={viewContext}>
      {/* Your ribbon content - tabs, toolbars, etc. */}
      <MyRibbonTabs viewContext={viewContext} />
    </BaseRibbon>
  );
}
```

### With BaseRibbonToolbar

```tsx
import { BaseRibbon, BaseRibbonToolbar } from "../../controls";

export function MyItemRibbon({ viewContext }: { viewContext: ViewContext }) {
  const actions: RibbonAction[] = [
    {
      key: 'save',
      label: 'Save',
      iconName: 'Save',
      onClick: handleSave,
      appearance: 'primary'
    }
  ];

  return (
    <BaseRibbon viewContext={viewContext}>
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
}
```

## 📖 Props API

### BaseRibbonProps

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `viewContext` | `ViewContext` | ❌ | ViewContext for automatic back navigation |
| `children` | `ReactNode` | ✅ | Ribbon content (tabs, toolbars, custom content) |
| `className` | `string` | ❌ | Additional CSS classes |

### ViewContext Interface

| Property | Type | Description |
|----------|------|-------------|
| `currentView` | `string` | Name of currently active view |
| `setCurrentView` | `(view: string) => void` | Navigate to different view |
| `isDetailView` | `boolean` | True if current view is a detail view |
| `goBack` | `() => void` | Navigate to previous view |
| `viewHistory` | `string[]` | Stack of previous views |

## 🎯 Key Features

### Automatic Back Navigation

When `viewContext.isDetailView` is true, BaseRibbon automatically shows a back button:

```tsx
// Detail view - back button appears automatically
{
  name: 'details',
  component: <ItemDetailsView />,
  isDetailView: true  // ⭐ This triggers the back button
}

// BaseRibbon automatically handles the back navigation
<BaseRibbon viewContext={viewContext}>
  <MyContent />  {/* Back button appears automatically */}
</BaseRibbon>
```

### Integration with BaseItemEditor

Perfect integration with the BaseItemEditor view registration system:

```tsx
// In your item editor
<BaseItemEditor
  views={views}
  defaultView="main"
  ribbon={(viewContext) => <MyItemRibbon viewContext={viewContext} />}
/>

// Your ribbon component
export function MyItemRibbon({ viewContext }) {
  return (
    <BaseRibbon viewContext={viewContext}>
      {/* Ribbon content */}
    </BaseRibbon>
  );
}
```

## 🏗️ Architecture

### Component Hierarchy

```
BaseRibbon
├── Back Button (conditional)
│   └── ToolbarButton with "Back" tooltip
└── Children Content
    ├── BaseRibbonToolbar (optional)
    ├── Tabs (optional)
    └── Custom Content
```

### CSS Classes

```scss
.base-ribbon {
  // Main ribbon container
  &__back-button {
    // Back button styling
  }
  &__content {
    // Content area
  }
}
```

## 💡 Usage Patterns

### Pattern 1: Simple Toolbar

```tsx
export function SimpleRibbon({ viewContext }) {
  const actions = [
    { key: 'save', label: 'Save', iconName: 'Save', onClick: handleSave }
  ];

  return (
    <BaseRibbon viewContext={viewContext}>
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
}
```

### Pattern 2: Custom Content

```tsx
export function CustomRibbon({ viewContext }) {
  return (
    <BaseRibbon viewContext={viewContext}>
      <div style={{ padding: '8px 16px' }}>
        <Text variant="large">Custom Ribbon Content</Text>
        <Button onClick={handleAction}>Custom Action</Button>
      </div>
    </BaseRibbon>
  );
}
```

### Pattern 3: Conditional Actions

```tsx
export function ConditionalRibbon({ viewContext, canSave }) {
  const actions = [
    {
      key: 'save',
      label: 'Save',
      iconName: 'Save',
      onClick: handleSave,
      disabled: !canSave
    }
  ];

  return (
    <BaseRibbon viewContext={viewContext}>
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
}
```

## ♿ Accessibility

- **ARIA Labels**: Back button has proper aria-label
- **Keyboard Navigation**: Full keyboard support with Tab/Enter/Space
- **Screen Reader**: Announces navigation changes
- **Focus Management**: Proper focus handling for back button

## 🎨 Styling

### Design Tokens

Uses Fabric design tokens for consistency:

```scss
// Background
background: var(--colorNeutralBackground1);

// Border
border-bottom: 1px solid var(--colorNeutralStroke2);

// Padding
padding: var(--spacingHorizontalM) var(--spacingHorizontalL);
```

### Custom Styling

```tsx
<BaseRibbon 
  viewContext={viewContext}
  className="my-custom-ribbon"
>
  <MyContent />
</BaseRibbon>
```

## 🔧 Best Practices

### ✅ Do's

✅ **Always pass ViewContext** when using with BaseItemEditor  
✅ **Use BaseRibbonToolbar** for standard action patterns  
✅ **Keep content minimal** - ribbons should be concise  
✅ **Test keyboard navigation** for all interactive elements  
✅ **Use consistent iconography** from Fluent UI icons  

### ❌ Don'ts

❌ **Don't manage back button manually** - ViewContext handles it automatically  
❌ **Don't override critical CSS** that affects layout  
❌ **Don't put scrollable content** in ribbons  
❌ **Don't use without accessibility** testing  

## 🔗 Related Components

- **[BaseItemEditor](./README.md)** - Main container with view registration
- **[BaseRibbonToolbar](./BaseRibbonToolbar.md)** - Standardized toolbar actions
- **[BaseItemEditorView](./BaseItemEditorView.md)** - Default view layout
- **[BaseItemEditorDetailView](./BaseItemEditorDetailView.md)** - Detail view layout

## 📝 Examples

For complete examples, see:
- [Sample Ribbon Implementation](../../Workload/app/items/HelloWorldItem/HelloWorldItemRibbon.tsx) - HelloWorld reference
- [BaseItemEditor README](./README.md) - Integration patterns