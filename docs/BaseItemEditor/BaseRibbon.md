# BaseRibbon Component

## 📋 Overview

The `BaseRibbon` component provides a consistent ribbon interface for Microsoft Fabric item editors with a clean, streamlined API. It automatically integrates with the ViewContext system and provides a mandatory Home tab with optional additional tabs.

## ✨ Features

✅ **Clean API** - Simple `homeActions` + optional `additionalTabs` pattern  
✅ **Mandatory Home Tab** - Ensures consistent navigation across all items  
✅ **Standard Action Factories** - Built-in `createSaveAction()`, `createSettingsAction()` helpers  
✅ **ViewContext Integration** - Automatic back button handling for detail views  
✅ **Fabric Design System** - Uses official tokens and styling  
✅ **Accessibility Compliant** - ARIA labels, keyboard navigation, screen reader support  
✅ **TypeScript Support** - Full type definitions and IntelliSense  

## 🚀 Quick Start

### Simple Pattern (Recommended)

```tsx
import { BaseRibbon, createSaveAction, createSettingsAction } from "../../controls/ItemEditor";
import { ViewContext } from "../../controls/ItemEditor";

export function MyItemRibbon({ viewContext, saveItemCallback, openSettingsCallback, isSaveButtonEnabled }) {
  const { t } = useTranslation();
  
  // Define mandatory Home tab actions
  const homeActions: RibbonAction[] = [
    createSaveAction(
      saveItemCallback,
      !isSaveButtonEnabled,
      t("Save")
    ),
    createSettingsAction(
      openSettingsCallback,
      t("Settings")
    )
  ];

  return (
    <BaseRibbon 
      homeActions={homeActions}
      viewContext={viewContext} 
    />
  );
}
```

### Complex Pattern with Additional Tabs

```tsx
export function ComplexItemRibbon({ viewContext, ...callbacks }) {
  const { t } = useTranslation();
  
  // Mandatory Home tab actions
  const homeActions: RibbonAction[] = [
    createSaveAction(callbacks.save, !props.canSave, t("Save")),
    createSettingsAction(callbacks.settings, t("Settings"))
  ];
  
  // Optional additional tabs for complex functionality
  const additionalTabs = [
    {
      key: 'data',
      label: t('Data'),
      actions: [
        {
          key: 'import',
          icon: CloudArrowDown24Regular,
          label: t('Import'),
          onClick: callbacks.import
        }
      ]
    }
  ];

  return (
    <BaseRibbon 
      homeActions={homeActions}
      additionalTabs={additionalTabs}
      viewContext={viewContext} 
    />
  );
}
```

## 📖 Props API

### BaseRibbonProps

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `homeActions` | `RibbonAction[]` | ✅ | Actions for the mandatory Home tab |
| `additionalTabs` | `RibbonTabToolbar[]` | ❌ | Optional additional tabs for complex items |
| `viewContext` | `ViewContext` | ✅ | ViewContext for navigation and back button |

### RibbonAction Interface

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | `string` | ✅ | Unique identifier for the action |
| `icon` | `FluentIconComponent` | ✅ | Fluent UI icon component |
| `label` | `string` | ✅ | Action label and tooltip text |
| `onClick` | `() => void \| Promise<void>` | ✅ | Click handler |
| `disabled` | `boolean` | ❌ | Whether action is disabled |
| `testId` | `string` | ❌ | Test identifier |

### RibbonTabToolbar Interface

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | `string` | ✅ | Unique identifier for the tab |
| `label` | `string` | ✅ | Tab display label |
| `actions` | `RibbonAction[]` | ✅ | Actions for this tab |

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

### Pattern 1: Simple Ribbon (Recommended)

Most items only need the Home tab with Save and Settings actions:

```tsx
export function SimpleRibbon({ viewContext, saveCallback, settingsCallback, canSave }) {
  const { t } = useTranslation();
  
  const homeActions = [
    createSaveAction(saveCallback, !canSave, t("Save")),
    createSettingsAction(settingsCallback, t("Settings"))
  ];

  return (
    <BaseRibbon 
      homeActions={homeActions}
      viewContext={viewContext} 
    />
  );
}
```

### Pattern 2: Complex Ribbon with Additional Tabs

For items with complex functionality that need multiple tabs:

```tsx
export function ComplexRibbon({ viewContext, ...callbacks }) {
  const { t } = useTranslation();
  
  const homeActions = [
    createSaveAction(callbacks.save, !callbacks.canSave, t("Save")),
    createSettingsAction(callbacks.settings, t("Settings"))
  ];
  
  const additionalTabs = [
    {
      key: 'data',
      label: t('Data'),
      actions: [
        {
          key: 'import',
          icon: CloudArrowDown24Regular,
          label: t('Import Data'),
          onClick: callbacks.import
        },
        {
          key: 'export',
          icon: Share24Regular,
          label: t('Export Data'),
          onClick: callbacks.export
        }
      ]
    },
    {
      key: 'view',
      label: t('View'),
      actions: [
        {
          key: 'grid',
          icon: Grid24Regular,
          label: t('Grid View'),
          onClick: callbacks.toggleGrid
        }
      ]
    }
  ];

  return (
    <BaseRibbon 
      homeActions={homeActions}
      additionalTabs={additionalTabs}
      viewContext={viewContext} 
    />
  );
}
```

### Pattern 3: Custom Actions in Home Tab

Adding custom actions to the Home tab alongside standard ones:

```tsx
export function CustomActionsRibbon({ viewContext, ...callbacks }) {
  const { t } = useTranslation();
  
  const homeActions = [
    // Standard actions first
    createSaveAction(callbacks.save, !callbacks.canSave, t("Save")),
    createSettingsAction(callbacks.settings, t("Settings")),
    
    // Custom actions
    {
      key: 'refresh',
      icon: ArrowClockwise24Regular,
      label: t('Refresh'),
      onClick: callbacks.refresh
    },
    {
      key: 'help',
      icon: QuestionCircle24Regular,
      label: t('Help'),
      onClick: callbacks.showHelp
    }
  ];

  return (
    <BaseRibbon 
      homeActions={homeActions}
      viewContext={viewContext} 
    />
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

✅ **Always define homeActions** - Every ribbon needs a mandatory Home tab  
✅ **Use standard action factories** - `createSaveAction()`, `createSettingsAction()` for consistency  
✅ **Start with simple pattern** - Only add `additionalTabs` when truly needed  
✅ **Import proper Fluent icons** - Use `import { Icon24Regular } from '@fluentui/react-icons'`  
✅ **Test keyboard navigation** for all interactive elements  
✅ **Use descriptive action keys** - Unique identifiers help with testing and debugging  

### ❌ Don'ts

❌ **Don't skip homeActions** - This parameter is mandatory and ensures consistent UX  
❌ **Don't create unnecessary tabs** - Keep ribbons simple unless complexity is justified  
❌ **Don't manage back button manually** - ViewContext handles it automatically  
❌ **Don't use old BaseRibbonToolbar** - The new API eliminates the need for child components  
❌ **Don't ignore accessibility** - Always include proper labels and test with screen readers  

## 🔀 Migration from Old API

### Before (Complex)
```tsx
// Old complex pattern - DON'T USE
const tabs = createRibbonTabs(/* complex config */);
return (
  <BaseRibbon tabs={tabs} viewContext={viewContext}>
    <BaseRibbonToolbar actions={actions} />
  </BaseRibbon>
);
```

### After (Clean)
```tsx
// New clean pattern - RECOMMENDED
const homeActions = [
  createSaveAction(save, !canSave, "Save"),
  createSettingsAction(settings, "Settings")
];

return (
  <BaseRibbon 
    homeActions={homeActions}
    viewContext={viewContext} 
  />
);
```  

## 🔗 Related Components

- **[BaseItemEditor](./README.md)** - Main container with view registration
- **[BaseRibbonToolbar](./BaseRibbonToolbar.md)** - Standardized toolbar actions
- **[BaseItemEditorView](./BaseItemEditorView.md)** - Default view layout
- **[BaseItemEditorDetailView](./BaseItemEditorDetailView.md)** - Detail view layout

## 📝 Examples

For complete examples, see:
- [Sample Ribbon Implementation](../../Workload/app/items/HelloWorldItem/HelloWorldItemRibbon.tsx) - HelloWorld reference
- [BaseItemEditor README](./README.md) - Integration patterns