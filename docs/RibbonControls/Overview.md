# Ribbon Controls - Usage Guide

## Overview

The Ribbon Controls provide a standardized, reusable set of components for creating consistent ribbons across all Microsoft Fabric workload item editors. These components enforce Fabric design guidelines and accessibility best practices.

## Key Components

### 1. BaseRibbon
Main container component that provides the ribbon structure with tabs.
- **Default Selected Tab**: Always defaults to `"home"`
- No need to specify `defaultSelectedTab="home"` explicitly

### 2. BaseRibbonToolbar
Renders a toolbar with a collection of actions, handling spacing, dividers, and visibility.

### 3. RibbonButton
Individual button component that enforces the Tooltip + ToolbarButton pattern for accessibility.

### 4. StandardRibbonActions
Factory functions that create pre-configured action objects for common scenarios.

### 5. StandardRibbonTabs
Factory functions that create tab configurations with mandatory Home tab.
- **`createRibbonTabs()`**: Ensures Home tab is always first
- Provides helpers for common tab types (Insert, Format, Data, View)

## Design Principles

### ✅ Consistency
- All ribbons look and behave the same across different item editors
- Standard actions use consistent icons, labels, and positioning
- Predictable user experience

### ♿ Accessibility
- Mandatory Tooltip wrapper for all buttons (screen reader support)
- Proper aria-labels and test IDs
- Keyboard navigation support

### 🎨 Fabric Guidelines
- Uses Fluent UI v9 components (`@fluentui/react-components`)
- 24px Regular icons from `@fluentui/react-icons`
- Consistent spacing and visual hierarchy
- Proper shadow and border styling

### 🔧 Extensibility
- Easy to add custom actions alongside standard ones
- Support for action groups with dividers
- Conditional action visibility
- Flexible tab configuration

## Quick Start

### Basic Example

```tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { 
  BaseRibbon, 
  BaseRibbonToolbar, 
  createSaveAction,
  createSettingsAction
} from '../../controls/Ribbon';

export function MyItemRibbon(props) {
  const { t } = useTranslation();
  
  const actions = [
    createSaveAction(handleSave, !hasChanges, t('Save')),
    createSettingsAction(handleSettings, t('Settings'))
  ];
  
  return (
    <BaseRibbon tabs={[{ value: 'home', label: t('Home') }]}>
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
}
```

### Advanced Example with Custom Actions

```tsx
import React from "react";
import { 
  BaseRibbon, 
  BaseRibbonToolbar, 
  RibbonAction,
  createSaveAction,
  createSettingsAction
} from '../../controls/Ribbon';
import { Sparkle24Regular } from '@fluentui/react-icons';

export function AdvancedItemRibbon(props) {
  const { t } = useTranslation();
  
  // Mix standard and custom actions
  const actions: RibbonAction[] = [
    // Standard actions
    createSaveAction(handleSave, !hasChanges, t('Save')),
    
    // Custom action
    {
      key: 'ai-enhance',
      icon: Sparkle24Regular,
      label: t('AI Enhance'),
      onClick: handleAIEnhance,
      testId: 'ai-enhance-btn',
      showDividerAfter: true
    },
    
    // More standard actions
    createSettingsAction(handleSettings, t('Settings'))
  ];
  
  return (
    <BaseRibbon
      tabs={[
        { value: 'home', label: t('Home') },
        { value: 'design', label: t('Design') }
      ]}
    >
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
}
```

## Available Standard Actions

These are the core actions available from StandardRibbonActions:

| Factory Function | Icon | Default Label | Primary Use |
|-----------------|------|---------------|-------------|
| `createSaveAction` | Save | "Save" | Save item changes |
| `createSettingsAction` | Settings | "Settings" | Open settings panel |
| `createAboutAction` | Info | "About" | Show about/help info |

**Note:** Other common actions (Undo, Redo, Delete, Share, Print, Download, Upload, Add, Edit, Close) should be implemented as **custom actions** specific to your item editor's needs. See the "Creating Custom Actions" section below for examples.

## Creating Custom Actions

### Custom Action Interface

```tsx
interface RibbonAction {
  key: string;                      // Unique identifier
  icon: FluentIconComponent;        // 24px Regular icon component
  label: string;                    // Tooltip and aria-label text
  onClick: () => void | Promise<void>;  // Click handler
  disabled?: boolean;               // Disabled state
  testId?: string;                  // Test automation ID
  appearance?: 'primary' | 'subtle' | 'transparent';  // Button style
  ariaLabel?: string;               // Custom aria-label
  showDividerAfter?: boolean;       // Show divider after this action
  hidden?: boolean;                 // Hide this action
}
```

### Custom Action Example

```tsx
import { DocumentAdd24Regular } from '@fluentui/react-icons';

const customAction: RibbonAction = {
  key: 'create-document',
  icon: DocumentAdd24Regular,
  label: 'Create Document',
  onClick: async () => {
    await createNewDocument();
  },
  testId: 'create-doc-btn',
  appearance: 'primary',
  showDividerAfter: true
};
```

## Tab Configuration

### ⚠️ Important: Home Tab is Mandatory

All ribbons **MUST** include a Home tab as the first tab. Use the `createRibbonTabs()` helper function to ensure this requirement is met automatically.

### Recommended: Using Standard Tab Helpers

```tsx
import { createRibbonTabs } from '../../controls/Ribbon';

// Home tab only (simplest case)
const tabs = createRibbonTabs(t('Home'));

// Home tab + additional tabs
const tabs = createRibbonTabs(
  t('Home'),
  [
    createInsertTab(t('Insert')),
    createFormatTab(t('Format'))
  ]
);

<BaseRibbon tabs={tabs}>
  {/* toolbar content */}
</BaseRibbon>
```

### Available Tab Helpers

```tsx
import { 
  createHomeTab,      // Mandatory Home tab
  createInsertTab,    // Insert tab
  createFormatTab,    // Format tab
  createDataTab,      // Data tab
  createViewTab,      // View tab
  createCustomTab     // Custom tab with any value
} from '../../controls/Ribbon';

// Custom tab example
const tabs = createRibbonTabs(
  t('Home'),
  [
    createDataTab(t('Data')),
    createCustomTab('analytics', t('Analytics'))
  ]
);
```

### Manual Tab Configuration (Not Recommended)

If you need manual control, ensure Home tab is always first:

```tsx
import { RibbonTab } from '../../controls/Ribbon';

const tabs: RibbonTab[] = [
  { value: 'home', label: 'Home', testId: 'home-tab-btn' }, // MUST be first
  { value: 'insert', label: 'Insert', testId: 'insert-tab-btn' },
  { value: 'format', label: 'Format', testId: 'format-tab-btn' }
];
```

### Conditional Tabs

```tsx
// Home tab is always present, additional tabs are conditional
const additionalTabs = currentView === VIEW_TYPES.EDITING 
  ? [createDataTab(t('Data')), createFormatTab(t('Format'))]
  : undefined;

const tabs = createRibbonTabs(t('Home'), additionalTabs);
```

### No Tabs (Special Cases Only)

```tsx
// Only use this for special cases where tabs are truly not needed
<BaseRibbon showTabs={false}>
  <BaseRibbonToolbar actions={actions} />
</BaseRibbon>
```

## Action Groups with Dividers

Use `showDividerAfter: true` to create visual groups:

```tsx
const actions: RibbonAction[] = [
  // Edit group
  createUndoAction(handleUndo, !canUndo, t('Undo')),
  createRedoAction(handleRedo, !canRedo, t('Redo')),
  
  // Save group (divider after last action)
  {
    ...createSaveAction(handleSave, !hasChanges, t('Save')),
    showDividerAfter: true
  },
  
  // Settings group
  createSettingsAction(handleSettings, t('Settings'))
];
```

## Conditional Actions

### Hide Actions Based on State

```tsx
import { Rocket24Regular } from '@fluentui/react-icons';

const actions: RibbonAction[] = [
  createSaveAction(handleSave, !hasChanges, t('Save')),
  // Custom Getting Started action (not a standard action)
  {
    key: 'getting-started',
    icon: Rocket24Regular,
    label: t('Getting Started'),
    onClick: handleStart,
    testId: 'item-editor-getting-started-btn',
    hidden: currentView !== VIEW_TYPES.EMPTY  // hidden when not in EMPTY view
  }
];
```

### Disable Actions Based on Permissions

```tsx
const actions: RibbonAction[] = [
  createSaveAction(
    handleSave,
    !hasChanges || !hasWritePermission,  // disabled condition
    t('Save')
  ),
  createDeleteAction(
    handleDelete,
    t('Delete')
  )
];

// Or manually add disabled state to custom actions
actions[1].disabled = !hasDeletePermission;
```

## Internationalization (i18n)

Always use translation keys for labels:

```tsx
import { useTranslation } from "react-i18next";

export function MyRibbon(props) {
  const { t } = useTranslation();
  
  const actions = [
    createSaveAction(handleSave, !hasChanges, t("ItemEditor_Ribbon_Save_Label")),
    createSettingsAction(handleSettings, t("ItemEditor_Ribbon_Settings_Label"))
  ];
  
  // For custom actions
  const customAction: RibbonAction = {
    key: 'export',
    icon: ArrowDownload24Regular,
    label: t("ItemEditor_Ribbon_Export_Label", "Export"),  // With fallback
    onClick: handleExport
  };
}
```

## Testing

All ribbon buttons include test IDs for automated testing:

```tsx
// Standard actions have pre-defined test IDs
createSaveAction(...)      // testId: 'item-editor-save-btn'
createSettingsAction(...)  // testId: 'item-editor-settings-btn'

// Custom actions should include test IDs
{
  key: 'custom',
  icon: MyIcon,
  label: 'Custom',
  onClick: handleCustom,
  testId: 'item-editor-custom-btn'  // Recommended pattern
}
```

## Migration from Legacy Ribbons

### Before (Legacy Pattern)

```tsx
export function LegacyRibbon(props) {
  return (
    <div className="ribbon">
      <TabList defaultSelectedValue="home">
        <Tab value="home">Home</Tab>
      </TabList>
      <div className="toolbarContainer">
        <Toolbar>
          <Tooltip content="Save" relationship="label">
            <ToolbarButton
              icon={<Save24Regular />}
              onClick={handleSave}
              disabled={!hasChanges}
            />
          </Tooltip>
          <Tooltip content="Settings" relationship="label">
            <ToolbarButton
              icon={<Settings24Regular />}
              onClick={handleSettings}
            />
          </Tooltip>
        </Toolbar>
      </div>
    </div>
  );
}
```

### After (Using Base Components)

```tsx
import { 
  BaseRibbon, 
  BaseRibbonToolbar, 
  createSaveAction,
  createSettingsAction
} from '../../controls/Ribbon';

export function ModernRibbon(props) {
  const { t } = useTranslation();
  
  const actions = [
    createSaveAction(handleSave, !hasChanges, t('Save')),
    createSettingsAction(handleSettings, t('Settings'))
  ];
  
  return (
    <BaseRibbon tabs={[{ value: 'home', label: t('Home') }]}>
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
}
```

## Best Practices

### ✅ DO

- Use standard action factories when possible
- Always provide i18n translations for labels
- Include test IDs for all actions
- Use 24px Regular icons from @fluentui/react-icons
- Group related actions with dividers
- Disable actions when they're not applicable
- Hide actions that don't make sense in current context

### ❌ DON'T

- Mix different icon sizes (always use 24px Regular)
- Forget Tooltip wrappers (handled by RibbonButton)
- Hardcode labels (use i18n)
- Omit test IDs
- Create custom button components (use RibbonButton)
- Ignore accessibility attributes

## Troubleshooting

### Icons Not Showing
```tsx
// ❌ Wrong - importing from wrong package
import { Save } from '@fluentui/react';

// ✅ Correct - import 24px Regular icons
import { Save24Regular } from '@fluentui/react-icons';
```

### TypeScript Errors
```tsx
// ❌ Wrong - passing icon instance
icon: <Save24Regular />

// ✅ Correct - passing icon component
icon: Save24Regular
```

### Actions Not Visible
```tsx
// Check hidden property
const action = createSaveAction(handleSave, false, 'Save');
action.hidden = isEmptyView;  // Make sure this logic is correct
```

## Examples in the Codebase

See these examples for reference:
- `HelloWorldItemRibbon.tsx` - Basic usage with standard and custom actions
- `BaseRibbonToolbar.tsx` - Component implementation
- `StandardRibbonActions.tsx` - Action factory patterns

## Support

For questions or issues with ribbon controls, refer to:
- `.ai/context/fabric-workload.md` - Project structure
- Fluent UI documentation: https://react.fluentui.dev/
- Microsoft Fabric documentation
