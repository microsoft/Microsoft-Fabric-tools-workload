# Ribbon Controls - Architecture Diagram

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                        BaseRibbon                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Optional Tab Navigation (TabList + Tab)               │ │
│  │  • Home  • Insert  • Format                            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Toolbar Container (.toolbarContainer)     │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │           BaseRibbonToolbar                       │ │ │
│  │  │  ┌─────────────────────────────────────────────┐ │ │ │
│  │  │  │ RibbonButton (Save)                         │ │ │ │
│  │  │  │  ┌────────────────────────────────────────┐ │ │ │ │
│  │  │  │  │ Tooltip (relationship="label")         │ │ │ │ │
│  │  │  │  │  ┌──────────────────────────────────┐  │ │ │ │ │
│  │  │  │  │  │ ToolbarButton                    │  │ │ │ │ │
│  │  │  │  │  │  • icon: <Save24Regular />       │  │ │ │ │ │
│  │  │  │  │  │  • aria-label: "Save"            │  │ │ │ │ │
│  │  │  │  │  │  • onClick: handleSave           │  │ │ │ │ │
│  │  │  │  │  │  • disabled: !hasChanges         │  │ │ │ │ │
│  │  │  │  │  └──────────────────────────────────┘  │ │ │ │ │
│  │  │  │  └────────────────────────────────────────┘ │ │ │ │
│  │  │  └─────────────────────────────────────────────┘ │ │ │
│  │  │  │ ToolbarDivider (optional)                     │ │ │
│  │  │  ┌─────────────────────────────────────────────┐ │ │ │
│  │  │  │ RibbonButton (Settings)                     │ │ │ │
│  │  │  └─────────────────────────────────────────────┘ │ │ │
│  │  │  │ RibbonButton (Getting Started - conditional) │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Tab Requirements

### ⚠️ Mandatory Home Tab

**All ribbons MUST include a Home tab as the first tab.** This is a design requirement to ensure consistency across all Microsoft Fabric workload items.

Use the `StandardRibbonTabs` factory functions to ensure compliance:

```tsx
import { createRibbonTabs, createDataTab } from '../../controls/Ribbon';

// ✅ CORRECT: Home tab is mandatory and automatically included first
const tabs = createRibbonTabs(t('Home'));

// ✅ CORRECT: Home tab + additional tabs
const tabs = createRibbonTabs(
  t('Home'),
  [
    createDataTab(t('Data')),
    createFormatTab(t('Format'))
  ]
);

// ❌ INCORRECT: Manual array without Home tab
const tabs = [
  { value: 'data', label: t('Data') }
];

// ❌ INCORRECT: Home tab not first
const tabs = [
  { value: 'data', label: t('Data') },
  { value: 'home', label: t('Home') }
];
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   Item Editor Component                       │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ Defines tabs, actions and handlers
                     ▼
┌──────────────────────────────────────────────────────────────┐
│              StandardRibbonTabs (Factories)                   │
│  • createRibbonTabs(t('Home'), additionalTabs)               │
│  • createDataTab(t('Data'))                                  │
│  • createFormatTab(t('Format'))                              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ Returns RibbonTab[] with Home first
                     ▼
┌──────────────────────────────────────────────────────────────┐
│              StandardRibbonActions (Factories)                │
│  • createSaveAction(handleSave, !dirty, t('Save'))           │
│  • createSettingsAction(handleSettings, t('Settings'))       │
│  • createGettingStartedAction(handleStart, t('Start'), hide) │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ Returns RibbonAction[]
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                    BaseRibbonToolbar                          │
│  • Receives: actions[]                                        │
│  • Filters: hidden actions                                    │
│  • Maps: actions to RibbonButton components                   │
│  • Inserts: dividers where specified                          │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ Renders individual buttons
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                      RibbonButton                             │
│  • Wraps: ToolbarButton in Tooltip (accessibility)           │
│  • Renders: icon, applies aria-labels, binds onClick         │
│  • Handles: disabled state, test IDs, appearance             │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ User clicks button
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                   onClick Handler Fires                       │
│  • handleSave() → saveItemDefinition()                        │
│  • handleSettings() → callOpenSettings()                      │
│  • handleStart() → setCurrentView(VIEW_TYPES.STARTED)        │
└──────────────────────────────────────────────────────────────┘
```

## File Dependencies

```
Item Editor Component (e.g., HelloWorldItemEditor.tsx)
    │
    ├─► imports ─► HelloWorldItemRibbon.tsx
    │                   │
    │                   ├─► imports ─► controls/Ribbon/index.ts
    │                   │                   │
    │                   │                   ├─► BaseRibbon.tsx
    │                   │                   ├─► BaseRibbonToolbar.tsx
    │                   │                   ├─► RibbonButton.tsx
    │                   │                   ├─► StandardRibbonActions.tsx
    │                   │                   └─► StandardRibbonTabs.tsx (NEW)
    │                   │
    │                   └─► imports ─► @fluentui/react-components
    │                                      • Toolbar
    │                                      • ToolbarButton
    │                                      • Tooltip
    │                                      • TabList, Tab
    │
    └─► imports ─► @fluentui/react-icons
                       • Save24Regular
                       • Settings24Regular
                       • Rocket24Regular
                       • etc.
```

## Props Flow

```tsx
// 1. Item Editor defines props and handlers
const MyItemEditor = () => {
  const [hasChanges, setHasChanges] = useState(false);
  
  const handleSave = async () => {
    await saveItemDefinition(...);
  };
  
  const handleSettings = async () => {
    await callOpenSettings();
  };
  
  // 2. Passes to Ribbon component
  return (
    <>
      <MyItemRibbon
        isSaveButtonEnabled={hasChanges}
        saveItemCallback={handleSave}
        openSettingsCallback={handleSettings}
      />
      {/* ... rest of editor */}
    </>
  );
};

// 3. Ribbon uses factory functions to create actions
const MyItemRibbon = (props) => {
  const { t } = useTranslation();
  
  const actions = [
    createSaveAction(
      props.saveItemCallback,      // ← callback from parent
      !props.isSaveButtonEnabled,  // ← state from parent
      t('Save')                     // ← i18n label
    ),
    createSettingsAction(
      props.openSettingsCallback,
      t('Settings')
    )
  ];
  
  // 4. Passes actions to toolbar
  return (
    <BaseRibbon tabs={[...]}>
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
};

// 5. Toolbar renders individual buttons
// 6. User clicks → callback fires → parent state updates
```

## Styling Cascade

```
CSS Classes Applied:

.ribbon                          ← BaseRibbon wrapper
  ├─ .tablistContainer          ← (Fluent UI TabList default)
  │   └─ Tab                    ← Individual tabs
  └─ .toolbarContainer          ← Toolbar wrapper
      └─ Toolbar                ← Fluent UI Toolbar
          ├─ ToolbarButton      ← Fluent UI button (wrapped in Tooltip)
          └─ ToolbarDivider     ← Optional dividers

Defined in: Workload/app/styles.scss

.ribbon .toolbarContainer {
    height: 40px;
    border-radius: 8px;
    background: white;
    box-shadow: 0 0 2px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.14);
    margin: 5px 0;
}
```

## Type Definitions

```typescript
// RibbonTab - Tab configuration
{
  value: string,        // 'home', 'insert', etc.
  label: string,        // Display text
  testId?: string,      // 'home-tab-btn'
  disabled?: boolean    // Tab state
}

// RibbonAction - Button configuration
{
  key: string,                    // Unique ID
  icon: FluentIconComponent,      // Save24Regular
  label: string,                  // 'Save'
  onClick: () => void,            // Handler
  disabled?: boolean,             // Button state
  testId?: string,                // 'item-editor-save-btn'
  appearance?: string,            // 'primary' | 'subtle' | 'transparent'
  ariaLabel?: string,             // Override label
  showDividerAfter?: boolean,     // Add divider
  hidden?: boolean                // Conditional rendering
}

// FluentIconComponent - Icon type
React.ComponentType<React.SVGProps<SVGSVGElement>>
```

## Execution Flow (User Click → Save)

```
1. User clicks Save button
   ↓
2. ToolbarButton onClick fires
   ↓
3. RibbonButton passes to action.onClick
   ↓
4. StandardRibbonActions factory-created handler
   ↓
5. Item Editor handleSave callback
   ↓
6. ItemCRUDController.saveItemDefinition(workloadClient, item)
   ↓
7. WorkloadClient API call to Fabric platform
   ↓
8. Success → NotificationController.callNotificationOpen('Saved!')
   ↓
9. Parent state updates (setHasBeenSaved(true), setHasChanges(false))
   ↓
10. Re-render → Save button now disabled (!hasChanges)
```

## Visual States

```
┌──────────────────────────────────────────────────────┐
│ Enabled Button                                       │
│ ┌──────────┐                                         │
│ │ [💾 Save] │ ← Normal appearance, cursor: pointer   │
│ └──────────┘                                         │
│ Hover: Subtle background highlight                   │
│ Click: Executes onClick handler                      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ Disabled Button                                      │
│ ┌──────────┐                                         │
│ │ [💾 Save] │ ← Grayed out, cursor: not-allowed      │
│ └──────────┘                                         │
│ Hover: No effect                                     │
│ Click: No action                                     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ Hidden Button                                        │
│                                                      │
│ (Not rendered in DOM)                                │
│ hidden: true removes from render                     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ Primary Appearance                                   │
│ ┌──────────┐                                         │
│ │ [💾 Save] │ ← Blue background (brand color)        │
│ └──────────┘                                         │
│ Used for main action                                 │
└──────────────────────────────────────────────────────┘
```

## Accessibility Tree

```
<div role="region" aria-label="Item Editor Ribbon">
  <div role="tablist">
    <button role="tab" aria-selected="true">Home</button>
  </div>
  <div role="toolbar" aria-label="Ribbon Actions">
    <button 
      role="button" 
      aria-label="Save"
      aria-disabled="false"
      data-testid="item-editor-save-btn"
    >
      <svg aria-hidden="true">...</svg>
    </button>
    <div role="separator"></div>
    <button 
      role="button" 
      aria-label="Settings"
      data-testid="item-editor-settings-btn"
    >
      <svg aria-hidden="true">...</svg>
    </button>
  </div>
</div>
```

## Summary

The ribbon architecture provides:
- ✅ **Consistency**: Same structure across all item editors
- ♿ **Accessibility**: Proper ARIA labels and keyboard navigation
- 🎨 **Fabric Compliance**: Follows Microsoft design guidelines
- 🔧 **Extensibility**: Easy to add custom actions
- 📦 **Reusability**: Factory functions reduce code duplication
- 🧪 **Testability**: Built-in test IDs throughout
