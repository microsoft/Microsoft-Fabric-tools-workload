---
applyTo: "/Workload/app/items/[ItemName]Item/"
---

# GitHub Copilot Instructions: Create New Workload Item

## 🔗 Base Instructions

**REQUIRED**: First read the complete generic instructions at `.ai/commands/item/createItem.md` before proceeding.

This file provides GitHub Copilot-specific enhancements for item creation beyond the base generic process.

## 🤖 GitHub Copilot Enhanced Features

### 🚨 CRITICAL: Mandatory Architecture Patterns

**BEFORE GENERATING ANY ITEM CODE**: All item editors MUST use these standardized components:

1. **BaseItemEditor Component** (MANDATORY):
   - Container for ALL item editors
   - Import: `import { BaseItemEditor } from "../../controls";`
   - Provides fixed ribbon + scrollable content layout
   - DO NOT create custom layouts with Stack or div

2. **Standard Ribbon Components** (MANDATORY):
   - `BaseRibbon`: Ribbon container
   - `BaseRibbonToolbar`: Action toolbar
   - `createRibbonTabs`: Tab creation helper
   - `createSaveAction`: Standard Save button
   - `createSettingsAction`: Standard Settings button
   - Import: `import { BaseRibbon, BaseRibbonToolbar, createRibbonTabs, createSaveAction, createSettingsAction, RibbonAction } from '../../controls/Ribbon';`

3. **Item-Specific SCSS File** (MANDATORY - VERIFIED):
   - Create `[ItemName]Item.scss` in item folder
   - Override ONLY item-specific branding (colors, fonts)
   - DO NOT duplicate layout/structure styles
   - Import both: `import "../../styles.scss"; import "./[ItemName]Item.scss";`
   - **Verification team will check this pattern**

### 🚨 CRITICAL: Styling Rules (VERIFIED BY TEAM)

GitHub Copilot MUST follow these styling rules. **Violations will fail verification**:

**✅ REQUIRED**:
1. Create separate `[ItemName]Item.scss` file in item folder
2. Import generic styles: `import "../../styles.scss";`
3. Import item styles: `import "./[ItemName]Item.scss";`
4. Use CSS cascading: `className="generic-class item-specific-class"`
5. Override only colors/fonts, not layout/structure
6. Use design tokens: `var(--colorBrand*, --spacing*, --fontSize*)`

**❌ PROHIBITED** (Will fail verification):
1. Modifying `Workload/app/styles.scss` for item-specific needs
2. Using inline styles instead of SCSS file
3. Duplicating layout styles from generic patterns
4. Creating custom ribbon/editor container styles
5. Overriding BaseItemEditor/BaseRibbon structural styles
6. Not creating separate `[ItemName]Item.scss` file

**Example - Correct Pattern**:
```scss
// [ItemName]Item.scss - ONLY item-specific overrides
.item-name-settings-panel-container {
  background-color: var(--colorBrandBackground2);  // ✅ Override color
  // ❌ DON'T duplicate: display: flex, padding, etc.
}
```

```tsx
// [ItemName]ItemEditor.tsx - Import both
import "../../styles.scss";        // ✅ Generic styles
import "./[ItemName]Item.scss";    // ✅ Item overrides

// Use cascading
<div className="item-settings-panel-container item-name-settings-panel-container">
```

### Smart Code Generation
When creating a new item, GitHub Copilot provides:

#### Auto-Complete Item Structure with BaseItemEditor
Type `fabric item create [ItemName]` to trigger:
- Automatic 4-file structure generation in `Workload/app/items/[ItemName]Item/`
- **Editor with BaseItemEditor container** (MANDATORY)
- **Ribbon with standard components** (BaseRibbon + BaseRibbonToolbar)
- Intelligent TypeScript interface suggestions
- Pre-configured Fluent UI component templates
- Smart import resolution for Fabric APIs
- Manifest template generation with placeholder support

#### Pattern Recognition with Architecture Compliance
GitHub Copilot learns from existing items and suggests:
- **BaseItemEditor wrapper pattern** (from HelloWorldItemEditor.tsx)
- **Standard Ribbon pattern** (from HelloWorldItemRibbon.tsx)
- Consistent naming conventions ([ItemName]Item pattern)
- Similar state management patterns
- Matching component structures
- Proper TypeScript type definitions

### Real-time Validation
- **Manifest Sync Detection**: Warns when implementation doesn't match manifest templates
- **Route Validation**: Suggests route additions when creating new items
- **Import Optimization**: Auto-suggests required imports for Fabric integration
- **Type Safety**: Provides immediate feedback on TypeScript errors
- **Template Processing**: Validates placeholder usage in XML templates

### Context-Aware Suggestions

#### Model Creation (`[ItemName]ItemModel.ts`)
```typescript
// Copilot suggests based on existing patterns:
export interface CustomItemDefinition {
  // Learns from other item models in the workspace
  title?: string;          // Common pattern detected
  configuration?: any;     // Fabric standard
  metadata?: ItemMetadata; // Auto-suggested import
}
```

#### Component Templates
GitHub Copilot auto-generates components with:
- Pre-configured Fluent UI components
- Proper error handling patterns
- Integrated authentication flows
- Fabric-specific hooks and utilities

### Intelligent File Relationships
GitHub Copilot understands:
- When to update `App.tsx` routing
- Which manifest files need corresponding updates
- Asset management for icons and translations
- Build script implications

## 🚀 Copilot Quick Actions

### One-Line Item Creation
```typescript
// Type this comment to trigger full item generation:
// fabric create MyCustomItem with fluent ui table editor
```

### Smart Completions with Standard Architecture
- `fabric.editor` → Expands to BaseItemEditor with ribbon and children pattern
- `fabric.ribbon` → Expands to BaseRibbon + BaseRibbonToolbar with standard actions
- `fabric.save` → Expands to complete saveItemDefinition pattern
- `fabric.load` → Expands to complete getWorkloadItem pattern  
- `fabric.notify` → Expands to callNotificationOpen with proper typing
- `fabric.action` → Creates custom RibbonAction object

### Editor Template Expansion (MANDATORY PATTERN - View Registration)
When typing `fabric.editor`, GitHub Copilot expands to the NEW view registration pattern:

```typescript
// 🚨 CORRECT: BaseItemEditor with view registration system
return (
  <BaseItemEditor
    ribbon={(currentView, setCurrentView) => (
      <[ItemName]ItemRibbon
        {...props}
        isSaveButtonEnabled={isSaveEnabled(currentView)}
        currentView={currentView}
        saveItemCallback={SaveItem}
        openSettingsCallback={handleOpenSettings}
        onViewChange={setCurrentView}
      />
    )}
    notification={(currentView) => 
      currentView === VIEW_TYPES.MAIN ? (
        <MessageBar intent="warning" icon={<Warning20Filled />}>
          <MessageBarBody>{t('[ItemName]_Warning')}</MessageBarBody>
        </MessageBar>
      ) : undefined
    }
    views={(setCurrentView) => [
      {
        name: VIEW_TYPES.EMPTY,
        component: (
          <[ItemName]ItemEditorEmpty
            workloadClient={workloadClient}
            item={item}
            onStart={() => setCurrentView(VIEW_TYPES.MAIN)}
          />
        )
      },
      {
        name: VIEW_TYPES.MAIN,
        component: (
          <[ItemName]ItemEditorMain
            workloadClient={workloadClient}
            item={item}
            onShowDetail={(id) => setCurrentView(`detail-${id}`)}
          />
        )
      }
      // Add detail views here using BaseItemEditorDetailView
    ]}
    initialView={!item?.definition?.state ? VIEW_TYPES.EMPTY : VIEW_TYPES.MAIN}
  />
);
```

**Key Concepts**:
1. **BaseItemEditor manages view state internally** - no need for parent useState
2. **Ribbon receives** `(currentView, setCurrentView)` - can switch views and show view-specific actions
3. **Notification receives** `(currentView)` - can show view-specific notifications
4. **Views receives** `(setCurrentView)` - views can navigate (e.g., empty → main, main → detail)
5. **initialView** - simple expression determining starting view based on data

**❌ NEVER generate these OLD patterns**:
```typescript
// ❌ WRONG 1: Custom layout without BaseItemEditor
return (
  <Stack className="editor">
    <[ItemName]ItemRibbon {...props} />
    <Stack className="main">{content}</Stack>
  </Stack>
);

// ❌ WRONG 2: Manual view switching with if/else
const [currentView, setCurrentView] = useState('empty');
return (
  <BaseItemEditor ribbon={<Ribbon />}>
    {currentView === 'empty' ? <Empty /> : <Main />}
  </BaseItemEditor>
);

// ❌ WRONG 3: Static views array without setCurrentView access
const views = [
  { name: 'empty', component: <Empty /> },  // ❌ Can't navigate
  { name: 'main', component: <Main /> }
];
```

### Ribbon Template Expansion (MANDATORY PATTERN)
When typing `fabric.ribbon`, GitHub Copilot expands to:
```typescript
// 🚨 CORRECT: BaseRibbon with standard components
const tabs = createRibbonTabs(t("ItemEditor_Ribbon_Home_Label"));
const actions: RibbonAction[] = [
  createSaveAction(onSave, !isSaveEnabled, t("Save")),
  createSettingsAction(onSettings, t("Settings")),
  { key: 'custom', icon: Icon, label: t("Custom"), onClick: onCustom, testId: 'custom-btn' }
];

return (
  <BaseRibbon tabs={tabs}>
    <BaseRibbonToolbar actions={actions} />
  </BaseRibbon>
);
```

**❌ NEVER generate this OLD pattern**:
```typescript
// ❌ WRONG: Manual Toolbar with Tooltip wrapping
return (
  <div className="ribbon">
    <TabList><Tab>Home</Tab></TabList>
    <Toolbar>
      <Tooltip content="Save" relationship="label">
        <ToolbarButton icon={<Save24Regular />} onClick={onSave} />
      </Tooltip>
    </Toolbar>
  </div>
);
```

### SCSS File Generation (MANDATORY - VERIFIED)
When creating a new item, GitHub Copilot MUST generate `[ItemName]Item.scss`:

```scss
// 🚨 CORRECT: Item-specific overrides only
// [ItemName]Item.scss

// Settings panel with item branding
.item-name-settings-panel-container {
  background-color: var(--colorBrandBackground2);
  color: var(--colorBrandForeground2);
  
  .item-settings-section-header {
    color: var(--colorBrandForeground1);
  }
}

// Hero section with item branding
.item-name-hero-section {
  background: linear-gradient(135deg, var(--colorBrandBackground), var(--colorBrandBackground2));
}
```

**❌ NEVER generate**:
```scss
// ❌ WRONG: Duplicating layout from generic styles
.item-name-settings-panel-container {
  display: flex;              // ❌ Already in styles.scss
  flex-direction: column;     // ❌ Already in styles.scss
  padding: 24px;              // ❌ Already in styles.scss
  background-color: blue;     // ✅ Only this should be here
}
```

**Import Pattern in Every Component**:
```typescript
// ✅ ALWAYS include both imports
import "../../styles.scss";        // Generic styles
import "./[ItemName]Item.scss";    // Item-specific overrides
```

### Auto-Import Intelligence
GitHub Copilot automatically suggests and adds:
```typescript
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { Stack, TextField, PrimaryButton } from "@fluentui/react";
import { getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
```

### Template Expansion with Standard Architecture
When creating components, GitHub Copilot expands to MANDATORY patterns:
- **Editor components**: BaseItemEditor container with ribbon and children
- **Ribbon components**: BaseRibbon + BaseRibbonToolbar with standard actions
- **Empty state components**: Proper onboarding flow with navigation callback
- **Model interfaces**: Fabric-compatible types with VIEW_TYPES enum
- **SCSS files**: Separate `[ItemName]Item.scss` with item-specific overrides only

## ✅ Pre-Generation Verification Checklist

Before generating any item code, GitHub Copilot should verify:

**Architecture Compliance** (MANDATORY):
- [ ] Editor uses `<BaseItemEditor>` container with view registration
- [ ] View registration pattern: `views={(setCurrentView) => [...]}`
- [ ] Ribbon render prop: `ribbon={(currentView, setCurrentView) => ...}`
- [ ] Notification render prop: `notification={(currentView) => ...}`
- [ ] Initial view expression: `initialView={!item?.definition?.state ? VIEW_TYPES.EMPTY : VIEW_TYPES.MAIN}`
- [ ] Detail views use `<BaseItemEditorDetailView>` component
- [ ] Detail views define `DetailViewAction[]` for ribbon
- [ ] Back navigation provided in detail views
- [ ] Ribbon uses `<BaseRibbon>` + `<BaseRibbonToolbar>`
- [ ] Standard action factories used (`createSaveAction`, `createSettingsAction`)
- [ ] No custom Stack/div layouts for editor container
- [ ] No manual Tooltip + ToolbarButton wrapping
- [ ] No manual view state management (useState for currentView) in parent

**Styling Compliance** (VERIFIED BY TEAM):
- [ ] `[ItemName]Item.scss` file created in item folder
- [ ] Both style imports present: `../../styles.scss` and `./[ItemName]Item.scss`
- [ ] Only colors/fonts overridden, not layout/structure
- [ ] CSS cascading used: `generic-class item-specific-class`
- [ ] Design tokens used: `var(--color*, --spacing*, --fontSize*)`
- [ ] No modifications to `Workload/app/styles.scss`

**File Structure** (REQUIRED):
- [ ] `[ItemName]ItemModel.ts` - Data model with VIEW_TYPES enum
- [ ] `[ItemName]ItemEditor.tsx` - Main editor with BaseItemEditor + view registration
- [ ] `[ItemName]ItemEditorEmpty.tsx` - Empty state component (onboarding)
- [ ] `[ItemName]ItemEditorMain.tsx` - Main/default view component
- [ ] `[ItemName]ItemEditorDetail.tsx` - Detail view(s) using BaseItemEditorDetailView (if needed)
- [ ] `[ItemName]ItemRibbon.tsx` - Ribbon with standard components
- [ ] `[ItemName]Item.scss` - Item-specific style overrides

**Import Verification**:
- [ ] `import { BaseItemEditor, ItemEditorLoadingProgressBar } from "../../controls";`
- [ ] `import { BaseItemEditorDetailView, DetailViewAction } from "../../controls";` (for detail views)
- [ ] `import { BaseRibbon, BaseRibbonToolbar, createSaveAction, createSettingsAction } from '../../controls/Ribbon';`
- [ ] `import "../../styles.scss";`
- [ ] `import "./[ItemName]Item.scss";`
- [ ] No import of `RegisteredView` type (not needed, inline definition sufficient)

## 🎯 Workspace Intelligence

### Context Detection
GitHub Copilot detects:
- **BaseItemEditor usage** in HelloWorldItemEditor.tsx as reference
- **Standard Ribbon pattern** in HelloWorldItemRibbon.tsx as reference
- Existing item patterns to maintain consistency
- Available Fabric API clients in the workspace
- Component libraries already in use
- Authentication patterns from other items

### Architecture Validation
- **Verifies BaseItemEditor usage**: Warns if custom layouts are detected
- **Checks Ribbon components**: Ensures BaseRibbon + BaseRibbonToolbar pattern
- **Validates action factories**: Confirms use of createSaveAction, createSettingsAction
- **Suggests manifest updates** when items are created
- **Validates TypeScript compilation** in real-time
- **Checks for missing dependencies**
- **Ensures proper export statements**

### Error Prevention with Architecture Compliance
- **Warns about missing BaseItemEditor**: Prevents custom layout implementations
- **Warns about manual Tooltip + ToolbarButton**: Suggests BaseRibbonToolbar instead
- **Warns about custom ribbon layouts**: Requires BaseRibbon component
- Warns about common Fabric integration mistakes
- Suggests proper error handling for async operations
- Validates component prop interfaces
- Checks for proper cleanup in useEffect hooks

---

**Reference**: For complete step-by-step instructions, always consult `.ai/commands/item/createItem.md` first, then apply these Copilot-specific enhancements.

## 🚨 MANDATORY: Step 3 Editor Implementation Pattern (View Registration System)

**Purpose**:
- Create main editor component with BaseItemEditor
- MUST use view registration system (NOT manual if/else switching)
- BaseItemEditor manages view state internally
- Views, ribbon, and notifications can access and change current view

**🚨 CRITICAL**: GitHub Copilot MUST generate the NEW pattern with view registration:

```typescript
// 🚨 CORRECT: BaseItemEditor with view registration
import { BaseItemEditor, ItemEditorLoadingProgressBar } from "../../controls";
import { HelloWorldItemDefinition, VIEW_TYPES, CurrentView } from "./[ItemName]ItemModel";

export function [ItemName]ItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<[ItemName]ItemDefinition>>();
  const [hasBeenSaved, setHasBeenSaved] = useState(false);
  
  // Load item data
  useEffect(() => {
    async function loadItem() {
      const loadedItem = await getWorkloadItem<[ItemName]ItemDefinition>(
        workloadClient, 
        itemObjectId
      );
      setItem(loadedItem);
      setIsLoading(false);
    }
    loadItem();
  }, [itemObjectId]);
  
  // Handlers
  const handleSave = async () => {
    await saveItemDefinition(workloadClient, item.id, { state: 'saved' });
    setHasBeenSaved(true);
  };
  
  const isSaveEnabled = (currentView: string) => {
    return currentView !== VIEW_TYPES.EMPTY && !hasBeenSaved;
  };
  
  if (isLoading) {
    return <ItemEditorLoadingProgressBar message={t("Loading...")} />;
  }
  
  // BaseItemEditor with view registration
  return (
    <BaseItemEditor
      // Ribbon receives currentView and setCurrentView
      ribbon={(currentView, setCurrentView) => (
        <[ItemName]ItemRibbon
          {...props}
          isSaveButtonEnabled={isSaveEnabled(currentView)}
          currentView={currentView}
          saveItemCallback={handleSave}
          onViewChange={setCurrentView}  // Pass setCurrentView down
        />
      )}
      
      // Notification receives currentView
      notification={(currentView) => 
        currentView === VIEW_TYPES.MAIN ? (
          <MessageBar intent="warning" icon={<Warning20Filled />}>
            <MessageBarBody>{t('[ItemName]_Warning')}</MessageBarBody>
          </MessageBar>
        ) : undefined
      }
      
      // Views receives setCurrentView - allows navigation
      views={(setCurrentView) => [
        {
          name: VIEW_TYPES.EMPTY,
          component: (
            <[ItemName]ItemEditorEmpty
              workloadClient={workloadClient}
              item={item}
              onStart={() => setCurrentView(VIEW_TYPES.MAIN)}
            />
          )
        },
        {
          name: VIEW_TYPES.MAIN,
          component: (
            <[ItemName]ItemEditorMain
              workloadClient={workloadClient}
              item={item}
            />
          )
        }
      ]}
      
      // Initial view determined from item data
      initialView={!item?.definition?.state ? VIEW_TYPES.EMPTY : VIEW_TYPES.MAIN}
    />
  );
}
```

**❌ NEVER generate these OLD patterns**:
```typescript
// ❌ WRONG 1: Custom layout
return (
  <Stack className="editor">
    <[ItemName]ItemRibbon />
    <Stack className="main">{content}</Stack>
  </Stack>
);

// ❌ WRONG 2: Manual view state in parent
const [currentView, setCurrentView] = useState('empty');
return (
  <BaseItemEditor ribbon={<Ribbon currentView={currentView} />}>
    {currentView === 'empty' ? <Empty /> : <Main />}
  </BaseItemEditor>
);

// ❌ WRONG 3: Static views without navigation
const views = [
  { name: 'empty', component: <Empty onStart={...} /> }  // ❌ onStart can't navigate
];
```

**Key Architecture Points**:
1. **No view state in parent** - BaseItemEditor manages it
2. **Render prop pattern** - `ribbon`, `notification`, `views` receive functions
3. **Navigation from anywhere** - Views, ribbon, notifications can call `setCurrentView`
4. **Simple initial view** - Just an expression, not state

---

## 🚨 MANDATORY: Step 3.5 Detail Views (L2/Level 2 Pages) Pattern

**Purpose**:
- Create detail/drill-down pages for specific records or sub-sections
- MUST use BaseItemEditorDetailView as foundation
- Detail views have their own ribbon actions (context-specific)
- Back button navigation built-in

**When to Use Detail Views**:
- Viewing/editing individual records from a list
- Drill-down into specific configurations
- Multi-step workflows requiring focused views
- Any "Level 2" (L2) page accessed from main view

**🚨 CRITICAL**: Detail views MUST be based on BaseItemEditorDetailView:

```typescript
// 🚨 CORRECT: Detail view using BaseItemEditorDetailView
import { BaseItemEditorDetailView, DetailViewAction } from "../../controls";

interface [ItemName]ItemDetailViewProps {
  workloadClient: WorkloadClientAPI;
  item: ItemWithDefinition<[ItemName]ItemDefinition>;
  recordId: string;
  onBack: () => void;  // Navigation back to main view
}

export function [ItemName]ItemDetailView({
  workloadClient,
  item,
  recordId,
  onBack
}: [ItemName]ItemDetailViewProps) {
  const { t } = useTranslation();
  const [record, setRecord] = useState<RecordType>();
  const [actions, setActions] = useState<DetailViewAction[]>([]);
  
  // Load record data
  useEffect(() => {
    async function loadRecord() {
      const data = await fetchRecord(recordId);
      setRecord(data);
    }
    loadRecord();
  }, [recordId]);
  
  // Define detail view specific actions
  useEffect(() => {
    const detailActions: DetailViewAction[] = [
      {
        id: 'back',
        label: t('Back'),
        icon: <ArrowLeft24Regular />,
        onClick: onBack,
        appearance: 'subtle',
        testId: 'back-btn'
      },
      {
        id: 'save-detail',
        label: t('Save'),
        icon: <Save24Regular />,
        onClick: handleSaveDetail,
        appearance: 'primary',
        testId: 'save-detail-btn'
      },
      {
        id: 'delete',
        label: t('Delete'),
        icon: <Delete24Regular />,
        onClick: handleDelete,
        appearance: 'subtle',
        testId: 'delete-btn'
      }
    ];
    setActions(detailActions);
  }, [record, onBack]);
  
  // Detail view content
  const detailContent = (
    <Stack tokens={{ childrenGap: 16 }} style={{ padding: '24px' }}>
      <Text size={500} weight="semibold">{record?.name}</Text>
      <TextField label={t('Name')} value={record?.name} onChange={...} />
      <TextField label={t('Description')} value={record?.description} onChange={...} />
      {/* More detail fields */}
    </Stack>
  );
  
  return (
    <BaseItemEditorDetailView
      center={detailContent}
      actions={actions}
      onActionsChange={setActions}  // Propagates to ribbon
    />
  );
}
```

**Integrating Detail Views with View Registration**:

```typescript
// In [ItemName]ItemEditor.tsx
views={(setCurrentView) => [
  {
    name: VIEW_TYPES.EMPTY,
    component: <[ItemName]ItemEditorEmpty onStart={() => setCurrentView(VIEW_TYPES.MAIN)} />
  },
  {
    name: VIEW_TYPES.MAIN,
    component: (
      <[ItemName]ItemEditorMain
        workloadClient={workloadClient}
        item={item}
        // Navigate to detail view
        onShowDetail={(recordId) => setCurrentView(`detail-${recordId}`)}
      />
    )
  },
  // Dynamic detail views
  ...(selectedRecordId ? [{
    name: `detail-${selectedRecordId}`,
    component: (
      <[ItemName]ItemDetailView
        workloadClient={workloadClient}
        item={item}
        recordId={selectedRecordId}
        // Navigate back to main
        onBack={() => setCurrentView(VIEW_TYPES.MAIN)}
      />
    )
  }] : [])
]}
```

**Detail View Ribbon Actions**:

```typescript
// Ribbon automatically receives actions from BaseItemEditorDetailView
ribbon={(currentView, setCurrentView) => {
  // Detail views expose their actions via DetailViewAction[]
  const isDetailView = currentView.startsWith('detail-');
  
  return (
    <[ItemName]ItemRibbon
      currentView={currentView}
      onViewChange={setCurrentView}
      // Ribbon shows different actions based on view
      showDetailActions={isDetailView}
    />
  );
}}
```

**Key Detail View Concepts**:
1. **BaseItemEditorDetailView** - Foundation for all detail pages
2. **DetailViewAction** - Context-specific actions (save, delete, back)
3. **onActionsChange** - Propagates actions to ribbon automatically
4. **Back navigation** - Always provide way back to parent view
5. **Dynamic views** - Generate detail views based on selected record

**❌ NEVER create detail views without BaseItemEditorDetailView**:
```typescript
// ❌ WRONG: Custom detail view without standard foundation
export function DetailView() {
  return (
    <Stack>
      <div className="custom-header">
        <Button onClick={onBack}>Back</Button>
      </div>
      <div className="custom-content">{content}</div>
    </Stack>
  );
}
```

---

## 🚨 MANDATORY: Step 5 Ribbon Implementation Pattern

## 🚨 MANDATORY: Step 5 Ribbon Implementation Pattern

**Purpose**:
- Create ribbon with standard components
- MUST use BaseRibbon as container
- MUST use BaseRibbonToolbar for actions
- MUST use standard action factories

**🚨 CRITICAL**: GitHub Copilot MUST generate this pattern:

```typescript
// 🚨 CORRECT: BaseRibbon with standard components
import { 
  BaseRibbon, 
  BaseRibbonToolbar, 
  RibbonAction,
  createSaveAction,
  createSettingsAction,
  createRibbonTabs
} from '../../controls/Ribbon';

export function [ItemName]ItemRibbon(props: [ItemName]ItemRibbonProps) {
  const { t } = useTranslation();
  
  const tabs = createRibbonTabs(t("ItemEditor_Ribbon_Home_Label"));
  
  const actions: RibbonAction[] = [
    createSaveAction(props.saveItemCallback, !props.isSaveButtonEnabled, t("Save")),
    createSettingsAction(props.openSettingsCallback, t("Settings")),
    // Custom actions inline:
    { 
      key: 'custom', 
      icon: CustomIcon24Regular, 
      label: t("Custom"), 
      onClick: props.customCallback,
      testId: 'custom-btn'
    }
  ];
  
  return (
    <BaseRibbon tabs={tabs}>
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
}
```

**❌ NEVER generate**:
```typescript
// ❌ WRONG: Manual Toolbar with Tooltip wrapping
return (
  <div className="ribbon">
    <TabList><Tab>Home</Tab></TabList>
    <Toolbar>
      <Tooltip content="Save" relationship="label">
        <ToolbarButton icon={<Save24Regular />} onClick={onSave} />
      </Tooltip>
    </Toolbar>
  </div>
);
```

**Key Requirements**:
- Import from `'../../controls/Ribbon'`
- Use `createRibbonTabs()` for tabs
- Use `createSaveAction()` and `createSettingsAction()` for standard actions
- Define custom actions inline as `RibbonAction` objects
- Return `<BaseRibbon><BaseRibbonToolbar /></BaseRibbon>` structure

---

## 📋 DEPRECATED Patterns (DO NOT USE)

The following section shows the OLD pattern that GitHub Copilot should NOT generate:

### ❌ DEPRECATED: Old Ribbon Implementation Pattern

The following shows the OLD pattern with manual Toolbar and Tooltip wrapping. **This pattern is DEPRECATED and should NOT be generated by GitHub Copilot.**

**⚠️ WARNING**: This code example is kept for reference only. DO NOT generate code following this pattern.

```typescript
// ❌❌❌ DEPRECATED PATTERN - DO NOT USE ❌❌❌
// This example shows what NOT to do
import React from "react";
import { Tab, TabList } from '@fluentui/react-tabs';
import { Toolbar } from '@fluentui/react-toolbar';
import {
  ToolbarButton, Tooltip
} from '@fluentui/react-components';
import {
  Save24Regular,
  Settings24Regular,
} from "@fluentui/react-icons";
import { PageProps } from '../../App';
import '../../styles.scss';
import { t } from "i18next";

const [ItemName]ItemEditorRibbonHomeTabToolbar = (props: [ItemName]ItemEditorRibbonProps) => {
  
  async function onSaveClicked() {
    await props.saveItemCallback();
    return;
  }

  async function onCustomActionClicked() {
    // Add your custom action logic here
    return;
  }

  return (
    <Toolbar>
      <Tooltip
        content={t("[ItemName]Item_Ribbon_Save_Label")}
        relationship="label">
        <ToolbarButton
          disabled={!props.isSaveButtonEnabled}
          aria-label={t("[ItemName]Item_Ribbon_Save_Label")}
          data-testid="[ItemName]-item-editor-save-btn"
          icon={<Save24Regular />}
          onClick={onSaveClicked} />
      </Tooltip>
      <Tooltip
        content={t("[ItemName]Item_Ribbon_Settings_Label")}
        relationship="label">
        <ToolbarButton
          aria-label={t("[ItemName]Item_Ribbon_Settings_Label")}
          data-testid="[ItemName]-item-editor-settings-btn"
          icon={<Settings24Regular />}
          onClick={onCustomActionClicked} />
      </Tooltip>
    </Toolbar>
  );
};

export interface [ItemName]ItemEditorRibbonProps extends PageProps {
  isRibbonDisabled?: boolean;
  isSaveButtonEnabled?: boolean;
  saveItemCallback: () => Promise<void>;
  onTabChange?: (tabValue: string) => void;
  selectedTab?: string;
}

export function [ItemName]ItemEditorRibbon(props: [ItemName]ItemEditorRibbonProps) {
  const { isRibbonDisabled } = props;
  
  return (
    <div className="ribbon">
      <TabList disabled={isRibbonDisabled}>
        <Tab value="home" data-testid="home-tab-btn">
          {t("[ItemName]Item_Ribbon_Home_Label")}
        </Tab>
      </TabList>
      <div className="toolbarContainer">
        <[ItemName]ItemEditorRibbonHomeTabToolbar {...props} />
      </div>
    </div>
  );
}
// ❌❌❌ END DEPRECATED PATTERN ❌❌❌
```

**Why This Pattern is DEPRECATED**:
- ❌ Manual Tooltip wrapping - repetitive and error-prone
- ❌ Custom ribbon div - not using BaseRibbon component
- ❌ No standardization - each ribbon implements differently
- ❌ Accessibility issues - inconsistent implementation
- ❌ Hard to maintain - changes require updates in all ribbons
- ❌ More code - ~80 lines vs ~30 lines with BaseRibbon pattern

**✅ USE THIS INSTEAD**: See "MANDATORY: Step 5 Ribbon Implementation Pattern" above for the correct BaseRibbon + BaseRibbonToolbar pattern with action factories.

---

## 📋 Manifest Configuration (Step 6)

### Step 6: Create Manifest Configuration

#### 6.1: Create XML Manifest Template (`Workload/Manifest/items/[ItemName]/[ItemName]Item.xml`)

```xml
<?xml version='1.0' encoding='utf-8'?>
<ItemManifestConfiguration SchemaVersion="2.0.0">
  <Item TypeName="{{WORKLOAD_NAME}}.[ItemName]" Category="Data">
    <Workload WorkloadName="{{WORKLOAD_NAME}}" />
  </Item>
</ItemManifestConfiguration>
```

**GitHub Copilot Enhancement**: 
- Auto-suggests placeholder patterns like `{{WORKLOAD_NAME}}` for environment-specific generation
- Validates XML structure against Fabric schemas
- Recognizes template processing patterns

#### 6.2: Create JSON Manifest (`Workload/Manifest/items/[ItemName]/[ItemName]Item.json`)

```json
{
  "name": "[ItemName]",
  "version": "1.100",
  "displayName": "[ItemName]Item_DisplayName",
  "displayNamePlural": "[ItemName]Item_DisplayName_Plural",
  "editor": {
    "path": "/[ItemName]Item-editor"
  },
  "icon": {
    "name": "assets/images/[ItemName]Item-icon.png"
  },
  "activeIcon": {
    "name": "assets/images/[ItemName]Item-icon.png"
  },
  "supportedInMonitoringHub": true,
  "supportedInDatahubL1": true,
  "editorTab": {
    "onDeactivate": "item.tab.onDeactivate",
    "canDeactivate": "item.tab.canDeactivate",
    "canDestroy": "item.tab.canDestroy",
    "onDestroy": "item.tab.onDestroy",
    "onDelete": "item.tab.onDelete"
  },
  "createItemDialogConfig": {
    "onCreationFailure": { "action": "item.onCreationFailure" },
    "onCreationSuccess": { "action": "item.onCreationSuccess" }
  }
}
```

**Key Properties**:
- `name`: Internal item name
- `displayName`/`displayNamePlural`: Localization keys
- `editor.path`: Route path for the editor
- `icon`: Path to item icon in assets
- Hub support flags for where item appears in Fabric UI

### Step 7: Add Routing Configuration

Update `Workload/app/App.tsx` to add the route for your new item:

```typescript
// Add import for your editor
import { [ItemName]ItemEditor } from "./items/[ItemName]Item/[ItemName]ItemEditor";

// Add route in the Switch statement
<Route path="/[ItemName]Item-editor/:itemObjectId">
  <[ItemName]ItemEditor {...pageProps} />
</Route>
```

**Route Pattern**:
- Path must match the `editor.path` in the JSON manifest
- Include `:itemObjectId` parameter for item identification
- Route name should follow the pattern: `/[ItemName]Item-editor`

### Step 8: Create Asset Files

#### 8.1: Add Item Icon

Create an icon file: `Workload/Manifest/assets/images/[ItemName]Item-icon.png`
- **Size**: 24x24 pixels recommended
- **Format**: PNG with transparency
- **Style**: Follow Fabric design guidelines

#### 8.2: Add Localization Strings

**🚨 CRITICAL: Two Different Translation Locations**

**For Manifest Files (Product.json, [ItemName]Item.json)**:
Update `Workload/Manifest/assets/locales/en-US/translations.json`:

```json
{
  // Add these entries to the existing translations
  "[ItemName]Item_DisplayName": "Your Item Display Name",
  "[ItemName]Item_DisplayName_Plural": "Your Item Display Names",
  "[ItemName]Item_Description": "Description of what this item does"
}
```

**For React Components (App code)**:
Update `Workload/app/assets/locales/en-US/translation.json`:

```json
{
  // Add entries for UI components, buttons, messages, etc.
  "[ItemName]Item_Loading": "Loading [Item Name]...",
  "[ItemName]Item_SaveSuccess": "[Item Name] saved successfully",
  "[ItemName]Item_Ribbon_Save_Label": "Save",
  "[ItemName]Item_Ribbon_Settings_Label": "Settings"
}
```

**Key Differences**:
- **Manifest translations** (`Workload/Manifest/assets/locales/`) - Used by Product.json, ItemName.json
- **App translations** (`Workload/app/assets/locales/`) - Used by React components with `useTranslation()`

**For Additional Locales**:
- Add corresponding entries in other locale files (e.g., `es/translations.json`)
- Maintain the same keys with translated values
- Update BOTH manifest and app translation files

#### 8.3: 🚨 CRITICAL: Update Product.json Configuration

**MANDATORY STEP - DO NOT SKIP**: Update `Workload/Manifest/Product.json` to register your new item in Fabric's create experience. This step is REQUIRED for your item to appear in create dialogs.

**Step 8.3.1: Add to createExperience.cards array**:
```json
{
  "createExperience": {
    "cards": [
      {
        "title": "HelloWorldItem_DisplayName", // ← Existing item
        "itemType": "HelloWorld"
      },
      {
        "title": "[ItemName]Item_DisplayName",           // ← ADD THIS
        "description": "[ItemName]Item_Description",     // ← ADD THIS  
        "icon": {
          "name": "assets/images/[ItemName]Item-icon.png"
        },
        "icon_small": {
          "name": "assets/images/[ItemName]Item-icon.png"
        },
        "availableIn": [
          "home",
          "create-hub", 
          "workspace-plus-new",
          "workspace-plus-new-teams"
        ],
        "itemType": "[ItemName]",                        // ← CRITICAL: Must match JSON manifest name
        "createItemDialogConfig": {
          "onCreationFailure": { "action": "item.onCreationFailure" },
          "onCreationSuccess": { "action": "item.onCreationSuccess" }
        }
      }
    ]
  }
}
```

**Step 8.3.2: Add to recommendedItemTypes array**:
```json
{
  "homePage": {
    "recommendedItemTypes": [
      "HelloWorld",        // ← Existing item
      "[ItemName]"         // ← ADD THIS - Must match itemType above
    ]
  }
}
```

**⚠️ CRITICAL NOTES**:
- **createExperience.cards**: Controls what appears in "Create new item" dialogs
- **recommendedItemTypes**: Controls what's featured on the workload home page  
- **itemType field**: Must EXACTLY match the "name" field in your JSON manifest
- **Localization**: Use translation keys (e.g., `[ItemName]Item_DisplayName`) not hardcoded text
- **availableIn**: Controls where the create button appears in Fabric UI

**❌ WRONG - Missing createExperience**:
```json
// DON'T DO THIS - Item won't appear in create dialogs
{
  "homePage": {
    "recommendedItemTypes": ["HelloWorld", "MyItem"]  // ← Only this, missing createExperience
  }
}
```

**✅ CORRECT - Complete configuration**:
```json
// DO THIS - Item will appear everywhere it should
{
  "createExperience": {
    "cards": [/* ... include your item card ... */]     // ← REQUIRED
  },
  "homePage": {
    "recommendedItemTypes": ["HelloWorld", "MyItem"]    // ← ALSO REQUIRED
  }
}
```

**GitHub Copilot Enhancement**: 
- Auto-detects when Product.json updates are missing
- Suggests complete createExperience configuration patterns
- Validates itemType consistency across manifest files

### Step 9: 🚨 CRITICAL: Update Environment Variables

**IMPORTANT**: After creating a new item, you MUST update the `ITEM_NAMES` variable in ALL environment files, or your item will not be included in the build:

1. **Update `Workload/.env.dev`**:
   ```bash
   # Current repository has HelloWorld item
   ITEM_NAMES=HelloWorld
   
   # After adding your new item
   ITEM_NAMES=HelloWorld,[ItemName]
   ```

2. **Update `Workload/.env.test`**:
   ```bash
   ITEM_NAMES=HelloWorld,[ItemName]
   ```

3. **Update `Workload/.env.prod`**:
   ```bash
   ITEM_NAMES=HelloWorld,[ItemName]
   ```

**Why This Matters**: The `ITEM_NAMES` variable controls which items are included when building the manifest package. If you forget this step, your new item won't appear in the workload.

### Step 10: Testing and Validation

1. **Build the project**:
   ```powershell
   cd Workload
   npm run build:test
   ```

2. **Start development server**:
   ```powershell
   npm run start
   ```

3. **Test item creation**:
   - Navigate to Fabric workspace
   - Create new item of your type
   - Verify editor loads correctly
   - Test save/load functionality

## Step 11: Update Product.json Configuration

**🚨 CRITICAL: Product.json Must Be Updated for Item Visibility**

The `Workload/Manifest/Product.json` file controls which items appear in Fabric's create experience and home page. **Without updating this file, your new item will not be discoverable by users.**

### 11.1: Add to createExperience.cards

Add your item to the cards array for the create hub:

```json
{
  "createExperience": {
    "cards": [
      // ... existing cards ...
      {
        "title": "[ItemName]Item_DisplayName",           // ← ADD THIS
        "description": "[ItemName]Item_Description",     // ← ADD THIS  
        "icon": {
          "name": "assets/images/[ItemName]Item-icon.png"
        },
        "icon_small": {
          "name": "assets/images/[ItemName]Item-icon.png"
        },
        "availableIn": [
          "home",
          "create-hub", 
          "workspace-plus-new",
          "workspace-plus-new-teams"
        ],
        "itemType": "[ItemName]",                        // ← CRITICAL: Must match JSON manifest name
        "createItemDialogConfig": {
          "onCreationFailure": { "action": "item.onCreationFailure" },
          "onCreationSuccess": { "action": "item.onCreationSuccess" }
        }
      }
    ]
  }
}
```

### 11.2: Add to recommendedItemTypes

Add your item to the recommended types for the home page:

```json
{
  "homePage": {
    "newSection": {
      "recommendedItemTypes": [
        "HelloWorld", // ... existing items ...
        "[ItemName]Item"  // Add your item here
      ]
    }
  }
}
```

### 11.3: Verification

After updating Product.json:
1. The item should appear in the "Create" hub in Fabric
2. The item should be recommended on the home page
3. Use translation keys defined in `Workload/Manifest/assets/locales/en-US/translations.json`

**Example Complete Entry**:
```json
{
  "createExperience": {
    "cards": [
       {
          "title": "SampleItem_DisplayName",
          "description": "SampleItem_Description",
          "icon": {
            "name": "assets/images/SampleItem-icon.png"
          },
          "icon_small": {
            "name": "assets/images/SampleItem-icon.png"
          },
          "availableIn": [
            "home",
            "create-hub",
            "workspace-plus-new",
            "workspace-plus-new-teams"
          ],
          "itemType": "SampleItem",
          "createItemDialogConfig": {
            "onCreationFailure": { "action": "item.onCreationFailure" },
            "onCreationSuccess": { "action": "item.onCreationSuccess" }
          }
        }
    ]
  },
  "homePage": {
    "newSection": {
      "recommendedItemTypes": [
        "HelloWorld",
        "SampleItem"  
      ]
    }
  }
}
```

### Step 12: Build and Deploy

1. **Build manifest package**:
   ```powershell
   .\scripts\Build\BuildManifestPackage.ps1
   ```

2. **Build release**:
   ```powershell
   .\scripts\Build\BuildRelease.ps1
   ```

## Current Repository Structure

The repository currently contains one fully implemented item:

**Implemented Items**:
- `HelloWorldItem` - A sample item to demonstrate the workload development pattern

**Repository Items Folder Structure**:
```
Workload/app/items/
└── HelloWorldItem/
    ├── HelloWorldItemModel.ts
    ├── HelloWorldItemEditor.tsx
    ├── HelloWorldItemEditorEmpty.tsx
    ├── HelloWorldItemEditorRibbon.tsx
    ├── HelloWorldItemEditorAboutPage.tsx
    └── HelloWorldItemEditorSettingsPage.tsx
```

**Manifest Structure**:
```
Workload/Manifest/items/
└── HelloWorld/
    ├── HelloWorldItem.json
    ├── HelloWorldItem.xml
    └── ItemDefinition/
```

## Usage

### Quick Checklist for AI Tools

When creating a new item, ensure all these components are created:

**Implementation Files** (in `Workload/app/items/[ItemName]Item/`):
- [ ] `[ItemName]ItemModel.ts` - Data model interface
- [ ] `[ItemName]ItemEditor.tsx` - Main editor component  
- [ ] `[ItemName]ItemEditorEmpty.tsx` - Empty state component
- [ ] `[ItemName]ItemEditorRibbon.tsx` - Ribbon/toolbar component

**Manifest Files** (in `Workload/Manifest/`):
- [ ] `[ItemName]Item.xml` - XML manifest configuration
- [ ] `[ItemName]Item.json` - JSON manifest with editor path and metadata
- [ ] Update `Product.json` - Add createExperience.cards and recommendedItemTypes entries

**Configuration Updates**:
- [ ] Update `Workload/app/App.tsx` routing for new item
- [ ] Add route mapping in routing configuration

**Asset Files**:
- [ ] `Workload/Manifest/assets/images/[ItemName]Item-icon.png` - Item icon
- [ ] Manifest localization in `Workload/Manifest/assets/locales/*/translations.json`
- [ ] App localization in `Workload/app/assets/locales/*/translation.json`

**Code Integration**:
- [ ] Route added to `Workload/app/App.tsx`
- [ ] Import statement for editor component
- [ ] Route path matches manifest `editor.path`

### Common Patterns

1. **Item Naming**: Use PascalCase for ItemName (e.g., `MyCustomItem`)
2. **File Naming**: Follow pattern `[ItemName]Item[Component].tsx`
3. **Route Naming**: Use kebab-case `/[item-name]-editor/:itemObjectId`
4. **TypeName**: Use dot notation `Org.WorkloadName.ItemName`
5. **Localization Keys**: Use underscore notation `[ItemName]Item_DisplayName`

### Troubleshooting

**Common Issues**:
- **Route not found**: Ensure route path matches manifest `editor.path`
- **Icon not loading**: Verify icon file exists in assets/images/
- **Localization missing**: Check translation keys in all locale files
- **Save not working**: Verify model interface is properly defined
- **Empty state not showing**: Check onFinishEmpty callback implementation