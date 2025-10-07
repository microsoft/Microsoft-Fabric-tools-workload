# Ribbon Controls - Quick Reference

## ⚠️ Important: Mandatory Home Tab

**All ribbons MUST include a Home tab as the first tab.** Use `createRibbonTabs()` to ensure compliance.

## Import Statement

```tsx
import { 
  BaseRibbon, 
  BaseRibbonToolbar,
  createRibbonTabs,        // ⭐ REQUIRED for tabs
  createSaveAction,
  createSettingsAction
} from '../../controls/Ribbon';
```

## Basic Ribbon Pattern
```tsx
export function MyItemRibbon(props) {
  const { t } = useTranslation();
  
  // Home tab is mandatory - createRibbonTabs ensures it's always first
  const tabs = createRibbonTabs(t('Home'));
  
  const actions = [
    createSaveAction(handleSave, !hasChanges, t('Save')),
    createSettingsAction(handleSettings, t('Settings'))
  ];
  
  return (
    <BaseRibbon tabs={tabs}>  {/* defaultSelectedTab="home" is automatic */}
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
}
```

## Standard Tab Factories

| Factory | Parameters | Example |
|---------|-----------|---------|
| `createRibbonTabs` ⭐ | `(homeLabel, additionalTabs?)` | `createRibbonTabs(t('Home'))` |
| `createHomeTab` | `(label, disabled?)` | `createHomeTab(t('Home'))` |
| `createInsertTab` | `(label, disabled?)` | `createInsertTab(t('Insert'))` |
| `createFormatTab` | `(label, disabled?)` | `createFormatTab(t('Format'))` |
| `createDataTab` | `(label, disabled?)` | `createDataTab(t('Data'))` |
| `createViewTab` | `(label, disabled?)` | `createViewTab(t('View'))` |
| `createCustomTab` | `(value, label, disabled?)` | `createCustomTab('analytics', t('Analytics'))` |

**⭐ Required:** Always use `createRibbonTabs()` to ensure Home tab is first.

## Standard Action Factories

| Factory | Parameters | Example |
|---------|-----------|---------|
| `createSaveAction` | `(onClick, disabled, label)` | `createSaveAction(save, !dirty, t('Save'))` |
| `createSettingsAction` | `(onClick, label)` | `createSettingsAction(settings, t('Settings'))` |
| `createAboutAction` | `(onClick, label)` | `createAboutAction(about, t('About'))` |

**Note:** Only these three core actions are provided as standard factories. Other actions (Undo, Redo, Delete, Share, Print, etc.) should be implemented as custom actions using the template below.

## Custom Action Template
```tsx
import { CustomIcon24Regular } from '@fluentui/react-icons';

const customAction: RibbonAction = {
  key: 'unique-key',
  icon: CustomIcon24Regular,
  label: t('Action Label'),
  onClick: handleAction,
  testId: 'item-editor-action-btn',
  disabled: false,
  hidden: false,
  appearance: 'subtle',
  showDividerAfter: false
};
```

## Common Patterns

### Conditional Actions

```tsx
import { Rocket24Regular } from '@fluentui/react-icons';

const actions = [
  createSaveAction(save, !dirty, t('Save')),
  // Custom Getting Started action (not standard)
  {
    key: 'getting-started',
    icon: Rocket24Regular,
    label: t('Getting Started'),
    onClick: handleStart,
    testId: 'item-editor-getting-started-btn',
    hidden: currentView !== 'empty'  // hidden when not empty
  }
];
```

### Action Groups with Dividers
```tsx
const actions = [
  createUndoAction(undo, !canUndo, t('Undo')),
  createRedoAction(redo, !canRedo, t('Redo')),
  {
    ...createSaveAction(save, !dirty, t('Save')),
    showDividerAfter: true  // divider after save
  },
  createSettingsAction(settings, t('Settings'))
];
```

### No Tabs Ribbon
```tsx
<BaseRibbon showTabs={false}>
  <BaseRibbonToolbar actions={actions} />
</BaseRibbon>
```

### Multiple Tabs (Recommended Pattern)
```tsx
import { createRibbonTabs, createInsertTab, createFormatTab } from '../../controls/Ribbon';

// Home tab is automatically included first
const tabs = createRibbonTabs(
  t('Home'),
  [
    createInsertTab(t('Insert')),
    createFormatTab(t('Format'))
  ]
);

<BaseRibbon tabs={tabs} defaultSelectedTab="home">
  <BaseRibbonToolbar actions={actions} />
</BaseRibbon>
```

### Conditional Tabs
```tsx
const additionalTabs = isAdvancedMode 
  ? [createDataTab(t('Data')), createFormatTab(t('Format'))]
  : undefined;

const tabs = createRibbonTabs(t('Home'), additionalTabs);
```

## Icon Reference

Always use 24px Regular icons:
```tsx
import {
  Save24Regular,
  Settings24Regular,
  Rocket24Regular,
  Info24Regular,
  ArrowUndo24Regular,
  ArrowRedo24Regular,
  Delete24Regular,
  Share24Regular,
  Print24Regular,
  ArrowDownload24Regular,
  ArrowUpload24Regular,
  Add24Regular,
  Edit24Regular,
  Dismiss24Regular
} from "@fluentui/react-icons";
```

## ✅ Do's
- Use standard action factories when available
- Always provide i18n translations
- Include test IDs for all actions
- Use 24px Regular icons
- Group related actions with dividers

## ❌ Don'ts
- Don't mix icon sizes
- Don't hardcode labels
- Don't omit Tooltips (handled automatically)
- Don't create custom button components

## Full Documentation
See `Workload/app/controls/Ribbon/README.md` for complete documentation.
