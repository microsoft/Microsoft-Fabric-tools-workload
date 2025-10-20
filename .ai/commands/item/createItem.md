---
applyTo: "/Workload/app/items/[ItemName]Item/"
---

# Create New Workload Item

## 🏗️ Architecture Overview

**CRITICAL**: All item editors MUST use the standardized architecture patterns:

### Required Base Components

1. **BaseItemEditor** (`Workload/app/controls/BaseItemEditor.tsx`)
   - 🚨 **MANDATORY**: ALL item editors must use BaseItemEditor as the container
   - Provides consistent layout: Fixed ribbon + scrollable content
   - Handles full-height iframe rendering
   - Ensures proper scroll behavior (ribbon stays fixed, content scrolls)
   - **DO NOT create custom layout patterns** - use BaseItemEditor

2. **Ribbon Components** (`Workload/app/controls/Ribbon/`)
   - 🚨 **MANDATORY**: Use the standardized Ribbon pattern
   - **BaseRibbon**: Standard ribbon structure with tabs
   - **BaseRibbonToolbar**: Renders action buttons with proper spacing
   - **Standard Action Factories**: `createSaveAction`, `createSettingsAction`, `createAboutAction`
   - **Tooltip + ToolbarButton**: ALWAYS wrap ToolbarButton in Tooltip for accessibility

### Standard Architecture Pattern

```typescript
// CORRECT Pattern - Use BaseItemEditor + Standard Ribbon
export function [ItemName]ItemEditor(props: PageProps) {
  // ... state and logic ...
  
  return (
    <BaseItemEditor
      ribbon={
        <[ItemName]ItemRibbon
          saveItemCallback={handleSave}
          openSettingsCallback={handleSettings}
          isSaveButtonEnabled={hasChanges}
        />
      }
    >
      {currentView === VIEW_TYPES.EMPTY ? (
        <[ItemName]ItemEditorEmpty {...emptyProps} />
      ) : (
        <[ItemName]ItemEditorDefault {...defaultProps} />
      )}
    </BaseItemEditor>
  );
}
```

### ❌ INCORRECT Patterns - DO NOT USE

```typescript
// ❌ WRONG: Custom Stack layout without BaseItemEditor
<Stack className="editor">
  <MyCustomRibbon />
  <Stack className="main">
    {content}
  </Stack>
</Stack>

// ❌ WRONG: Not using standard ribbon components
<div className="custom-toolbar">
  <button onClick={save}>Save</button>  // No Tooltip wrapper
</div>

// ❌ WRONG: Custom scroll handling
<div style={{height: '100vh', overflow: 'scroll'}}>
  {/* BaseItemEditor handles this */}
</div>
```

### Key Benefits of Standard Architecture

✅ **Consistent UX**: All items look and behave the same way  
✅ **Accessibility**: Built-in ARIA labels, keyboard navigation, screen reader support  
✅ **Maintenance**: Centralized updates benefit all items  
✅ **Scroll Behavior**: Proper fixed ribbon + scrollable content  
✅ **Responsive**: Mobile-friendly layouts and touch targets  
✅ **Testing**: Standard patterns = standard test coverage  

### 🚨 CRITICAL: Styling Requirements

**MANDATORY**: All styling MUST follow the standardized patterns and will be verified by the verification team:

1. **Base Styles** (DO NOT MODIFY):
   - `Workload/app/styles.scss` contains global styles for all items
   - `.item-editor-container` - Base editor layout (used by BaseItemEditor)
   - `.ribbon` - Base ribbon styling (used by BaseRibbon)
   - `.item-settings-panel-container` - Generic settings panel styles
   - **DO NOT add item-specific styles to styles.scss**

2. **Item-Specific Styles** (REQUIRED):
   - Create `[ItemName]Item.scss` in your item folder
   - Import both global and item styles: `import "../../styles.scss"; import "./[ItemName]Item.scss";`
   - Override ONLY item-specific branding (colors, fonts, item-specific classes)
   - Use CSS cascading: Apply generic class + item-specific class

3. **Styling Pattern** (HelloWorld Example):
   ```scss
   // [ItemName]Item.scss - Override ONLY what's different
   .hello-world-settings-panel-container {
     background-color: var(--colorBrandBackground2);  // Item brand color
     color: var(--colorBrandForeground2);
     
     .item-settings-section-header {
       color: var(--colorBrandForeground1);  // Override header color
     }
   }
   ```

4. **Component Usage**:
   ```tsx
   // Apply both generic + item-specific classes
   <div className="item-settings-panel-container hello-world-settings-panel-container">
     {/* Content uses generic classes from styles.scss */}
   </div>
   ```

5. **Verification Checklist** (Will be checked):
   - ✅ BaseItemEditor used (no custom editor layout)
   - ✅ BaseRibbon + BaseRibbonToolbar used (no custom ribbon layout)
   - ✅ Styles in separate `[ItemName]Item.scss` file
   - ✅ No modifications to `styles.scss` for item-specific needs
   - ✅ CSS cascading pattern used (generic class + item class)
   - ✅ Only brand colors overridden, not layout/structure

**❌ STYLE VIOLATIONS** (Will fail verification):
```scss
// ❌ WRONG: Adding item-specific styles to styles.scss
// styles.scss
.my-custom-item-editor {
  background: blue;  // Don't add item-specific styles here
}

// ❌ WRONG: Not using separate SCSS file
// Inline styles in JSX
<div style={{background: 'blue'}}>  // Use SCSS file instead

// ❌ WRONG: Duplicating entire generic style
// [ItemName]Item.scss
.my-item-settings-panel {
  display: flex;           // ❌ Don't duplicate layout
  flex-direction: column;  // ❌ Already in generic
  background: blue;        // ✅ Only override this
}
```

---

## Process

This guide provides step-by-step instructions for AI tools to create a new item in the Microsoft Fabric Extensibility Toolkit. Creating a new item requires implementation files, manifest configuration, routing setup, and environment variable updates.

**🚨 REMEMBER**: Always use BaseItemEditor and standard Ribbon components!

### Step 1: Create Item Implementation Structure

1. **Create item directory**:
   ```
   Workload/app/items/[ItemName]Item/
   ```

2. **Create the four required implementation files**:
   - `[ItemName]ItemModel.ts` - Data model and interface definitions
   - `[ItemName]ItemEditor.tsx` - Main editor component
   - `[ItemName]ItemEditorEmpty.tsx` - Empty state component (shown when item is first created)
   - `[ItemName]ItemEditorRibbon.tsx` - Ribbon/toolbar component

### Step 2: Implement the Model (`[ItemName]ItemModel.ts`)

The model defines the data structure that will be stored in Fabric. **Use the HelloWorld pattern**:

```typescript
// Based on HelloWorldItemModel.ts
export interface [ItemName]ItemDefinition {
  // Add your item-specific properties here
  // Example: Follow HelloWorld pattern with a simple property
  message?: string;
  // Add more properties as needed:
  // title?: string;
  // description?: string;
  // configuration?: any;
}
```

**Key Points**:
- Define the interface that represents your item's state
- This data will be persisted in Fabric's storage
- Keep it serializable (JSON-compatible types only)
- Follow the HelloWorld pattern for consistency

### Step 3: Implement the Editor (`[ItemName]ItemEditor.tsx`)

The main editor component handles the item's primary interface. **🚨 CRITICAL: MUST use BaseItemEditor component!**

```typescript
// Based on HelloWorldItemEditor.tsx - Complete functional implementation with BaseItemEditor
import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import { Warning20Filled } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, callGetItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { BaseItemEditor, ItemEditorLoadingProgressBar } from "../../controls";
import { [ItemName]ItemDefinition, VIEW_TYPES, CurrentView } from "./[ItemName]ItemModel";
import { [ItemName]ItemEditorEmpty } from "./[ItemName]ItemEditorEmpty";
import { [ItemName]ItemEditorDefault } from "./[ItemName]ItemEditorDefault";
import { [ItemName]ItemRibbon } from "./[ItemName]ItemRibbon";
import "../../styles.scss";


export function [ItemName]ItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<[ItemName]ItemDefinition>>();
  const [currentView, setCurrentView] = useState<CurrentView>(VIEW_TYPES.EMPTY);
  const [hasBeenSaved, setHasBeenSaved] = useState<boolean>(false);

  const { pathname } = useLocation();

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    var LoadedItem: ItemWithDefinition<[ItemName]ItemDefinition> = undefined;
    if (pageContext.itemObjectId) {
      try {
        LoadedItem = await getWorkloadItem<[ItemName]ItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        // Ensure item definition is properly initialized without mutation
        if (!LoadedItem.definition) {
          LoadedItem = {
            ...LoadedItem,
            definition: {
              state: undefined,
            }
          };
        }

        setItem(LoadedItem);
        setCurrentView(!LoadedItem?.definition?.state ? VIEW_TYPES.EMPTY : VIEW_TYPES.GETTING_STARTED);

      } catch (error) {
        setItem(undefined);
      }
    } else {
      console.log(`non-editor context. Current Path: ${pathname}`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    setHasBeenSaved(false);
  }, [currentView, item?.id]);

  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  const navigateToDefaultView = () => {
    setCurrentView(VIEW_TYPES.GETTING_STARTED);
  };

  const handleOpenSettings = async () => {
    if (item) {
      try {
        const item_res = await callGetItem(workloadClient, item.id);
        await callOpenSettings(workloadClient, item_res.item, 'About');
      } catch (error) {
        console.error('Failed to open settings:', error);
      }
    }
  };

  async function SaveItem() {
    var successResult = await saveItemDefinition<[ItemName]ItemDefinition>(
      workloadClient,
      item.id,
      {
        state: VIEW_TYPES.GETTING_STARTED
      });
    const wasSaved = Boolean(successResult);
    setHasBeenSaved(wasSaved);
    callNotificationOpen(
      props.workloadClient,
      t("ItemEditor_Saved_Notification_Title"),
      t("ItemEditor_Saved_Notification_Text", { itemName: item.displayName }),
      undefined,
      undefined
    );
  }

  const isSaveEnabled = () => {
    if (currentView === VIEW_TYPES.EMPTY) {
      return false;
    }

    if (currentView === VIEW_TYPES.GETTING_STARTED) {
      if (hasBeenSaved) {
        return false;
      }

      if (!item?.definition?.state) {
        return true;
      }

      return false;
    }

    return false;
  };

  // 🚨 CRITICAL: Show loading state BEFORE BaseItemEditor
  if (isLoading) {
    return (
      <ItemEditorLoadingProgressBar
        message={t("[ItemName]ItemEditor_Loading", "Loading item...")}
      />
    );
  }

  // 🚨 CRITICAL: Use BaseItemEditor as the container
  return (
    <BaseItemEditor
      ribbon={
        <[ItemName]ItemRibbon
          {...props}
          isSaveButtonEnabled={isSaveEnabled()}
          currentView={currentView}
          saveItemCallback={SaveItem}
          openSettingsCallback={handleOpenSettings}
          navigateToDefaultViewCallback={navigateToDefaultView}
        />
      }
      notification={
        currentView === VIEW_TYPES.GETTING_STARTED ? (
          <MessageBar intent="warning" icon={<Warning20Filled />}>
            <MessageBarBody>
              {t('[ItemName]_Warning', 'Optional notification message for this view.')}
            </MessageBarBody>
          </MessageBar>
        ) : undefined
      }
    >
      {currentView === VIEW_TYPES.EMPTY ? (
        <[ItemName]ItemEditorEmpty
          workloadClient={workloadClient}
          item={item}
          onNavigateToDefaultView={navigateToDefaultView}
        />
      ) : (
        <[ItemName]ItemEditorDefault
          workloadClient={workloadClient}
          item={item}
        />
      )}
    </BaseItemEditor>
  );
}
```

**🚨 CRITICAL Architecture Requirements**:

1. **BaseItemEditor Container**:
   - MUST use `<BaseItemEditor>` as the root container
   - Provides fixed ribbon + scrollable content layout
   - Handles proper scroll behavior automatically
   - DO NOT create custom layout patterns

2. **Ribbon Prop**:
   - Pass ribbon component via `ribbon={<[ItemName]ItemRibbon />}` prop
   - Ribbon will be fixed at the top (doesn't scroll)
   - Use standard Ribbon components (see Step 5)

3. **Notification Prop** (Optional):
   - Pass notification via `notification={<MessageBar />}` prop
   - Appears between ribbon and content
   - Fixed position (doesn't scroll)

4. **Children Content**:
   - Content inside `<BaseItemEditor>` children will scroll
   - Switch between Empty and Default views based on state
   - Content fills remaining space automatically

5. **Loading State**:
   - MUST return `<ItemEditorLoadingProgressBar />` before BaseItemEditor
   - DO NOT render BaseItemEditor while loading

**Key Features**:

- **Complete State Management**: Loading, saving, and updating item definitions
- **View Switching**: Automatic transitions between empty and loaded states
- **BaseItemEditor Integration**: Proper use of the standard layout component
- **Error Handling**: Proper try/catch for async operations
- **Immutable Updates**: Safe state updates using functional patterns
- **Notifications**: User feedback on save operations
- **Settings Integration**: Opens item settings when needed
- **Loading States**: Progress indicators during data operations

### Step 4: Implement the Empty State (`[ItemName]ItemEditorEmpty.tsx`)

The empty state is shown when users first create the item. **Use the HelloWorld pattern as template**:

```typescript
// Based on HelloWorldItemEditorEmpty.tsx - Complete functional implementation
import React, { useState } from "react";
import { Stack } from "@fluentui/react";
import { Text, Button, Input } from "@fluentui/react-components";
import "../../styles.scss";
import { useTranslation } from "react-i18next";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { [ItemName]ItemDefinition } from "./[ItemName]ItemModel";

interface [ItemName]ItemEmptyStateProps {
  workloadClient: WorkloadClientAPI,
  item: ItemWithDefinition<[ItemName]ItemDefinition>;
  itemDefinition: [ItemName]ItemDefinition,
  onFinishEmpty: (message: string) => void;
}

export const [ItemName]ItemEmpty: React.FC<[ItemName]ItemEmptyStateProps> = ({
  workloadClient,
  item,
  itemDefinition: definition,
  onFinishEmpty: onFinishEmpty
}) => {
  const [message, setMessage] = useState<string>(`Hello ${item.displayName}!`);
  const { t } = useTranslation();
  
  const saveItem = () => {
    onFinishEmpty(message);
  };
  
  return (
    <Stack className="empty-item-container" horizontalAlign="center" tokens={{ childrenGap: 16 }}>
      <Stack.Item>
        <img
          src="/assets/items/[ItemName]/EditorEmpty.svg"
          alt="Empty item illustration"
          className="empty-item-image"
        />
      </Stack.Item>
      <Stack.Item>
        <Text as="h2" size={800} weight="semibold">
          Your [ItemName] item has been created!
        </Text>
      </Stack.Item>
      <Stack.Item style={{ marginTop: '16px', marginBottom: '24px' }}>
        <Text>
          {t('[ItemName]ItemEditorEmpty_Message', {itemName: item.displayName})}
        </Text>
      </Stack.Item>
      <Stack.Item style={{ width: '300px', marginTop: '16px' }}>
        <Input
          placeholder="Enter your [ItemName] message"
          value={message}
          onChange={(e, data) => setMessage(data.value)}
        />
      </Stack.Item>
      <Stack.Item style={{ marginTop: '16px' }}>
        <Button appearance="primary" onClick={saveItem}>
          {t('[ItemName]ItemEditorEmpty_Button')}
        </Button>
      </Stack.Item>
    </Stack>
  );
};
```

**Key Features**:

- **Default Value**: Initializes with a friendly message using the item's display name
- **User Input**: Allows users to customize their initial message
- **Callback Integration**: Calls `onFinishEmpty` to transition to the main editor
- **Localization Support**: Uses translation keys for all user-facing text
- **Fluent UI Components**: Follows Microsoft design system patterns

### Step 5: Implement the Ribbon (`[ItemName]ItemRibbon.tsx`)

The ribbon provides toolbar actions and navigation tabs. **🚨 CRITICAL: Use standard Ribbon components!**

```typescript
// Based on HelloWorldItemRibbon.tsx - Demonstrates RECOMMENDED ribbon pattern
import React from "react";
import { PageProps } from '../../App';
import { CurrentView, VIEW_TYPES } from "./[ItemName]ItemModel";
import { useTranslation } from "react-i18next";
import { 
  BaseRibbon, 
  BaseRibbonToolbar, 
  RibbonAction,
  createSaveAction,
  createSettingsAction,
  createRibbonTabs
} from '../../controls/Ribbon';
import { Rocket24Regular } from '@fluentui/react-icons';
import '../../styles.scss';

/**
 * Props interface for the [ItemName] Ribbon component
 */
export interface [ItemName]ItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  currentView: CurrentView;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  navigateToDefaultViewCallback: () => void;
}

/**
 * [ItemName]ItemRibbon - Implements the standard ribbon pattern
 * 
 * This demonstrates the MANDATORY pattern for creating consistent ribbons
 * across all item editors in the Fabric Extensibility Toolkit.
 * 
 * 🚨 REQUIRED COMPONENTS:
 * - BaseRibbon: Provides consistent ribbon structure and layout
 * - BaseRibbonToolbar: Renders actions with automatic Tooltip + ToolbarButton pattern
 * - createRibbonTabs: Ensures Home tab is always present
 * - Standard action factories: createSaveAction, createSettingsAction
 * 
 * Key Features:
 * - Automatic accessibility (Tooltip + ToolbarButton pattern)
 * - Consistent styling across all item editors
 * - Follows Fabric design guidelines
 * - Support for custom actions when needed
 */
export function [ItemName]ItemRibbon(props: [ItemName]ItemRibbonProps) {
  const { t } = useTranslation();
  
  // 🚨 REQUIRED: Define ribbon tabs using createRibbonTabs
  // Home tab is mandatory, additional tabs can be added as second parameter
  const tabs = createRibbonTabs(
    t("ItemEditor_Ribbon_Home_Label")
    // Additional tabs can be added here:
    // [
    //   createDataTab(t("Data")),
    //   createFormatTab(t("Format"))
    // ]
  );
  
  // Define ribbon actions - mix of standard and custom actions
  const actions: RibbonAction[] = [
    // 🚨 STANDARD ACTION: Save button
    // Use createSaveAction factory for consistent behavior
    createSaveAction(
      props.saveItemCallback,
      !props.isSaveButtonEnabled,  // disabled when save not needed
      t("ItemEditor_Ribbon_Save_Label")
    ),
    
    // 🚨 STANDARD ACTION: Settings button
    // Use createSettingsAction factory for consistent behavior
    createSettingsAction(
      props.openSettingsCallback,
      t("ItemEditor_Ribbon_Settings_Label")
    ),
    
    // ✅ CUSTOM ACTION EXAMPLE: View navigation
    // Define custom actions inline for item-specific functionality
    {
      key: 'navigate-default',
      icon: Rocket24Regular,
      label: t("ItemEditor_Ribbon_Navigate_Label", "Navigate to Default"),
      onClick: props.navigateToDefaultViewCallback,
      testId: 'ribbon-navigate-default-btn',
      hidden: props.currentView !== VIEW_TYPES.EMPTY  // Only show in EMPTY view
    }
  ];
  
  // 🚨 REQUIRED: Use BaseRibbon + BaseRibbonToolbar pattern
  return (
    <BaseRibbon tabs={tabs}>
      <BaseRibbonToolbar actions={actions} />
    </BaseRibbon>
  );
}
```

**🚨 CRITICAL Architecture Requirements**:

1. **BaseRibbon Component** (MANDATORY):
   - Use `<BaseRibbon tabs={tabs}>` as the container
   - Provides consistent structure and styling
   - DO NOT create custom ribbon layouts with `<div className="ribbon">`

2. **BaseRibbonToolbar Component** (MANDATORY):
   - Use `<BaseRibbonToolbar actions={actions} />` for action rendering
   - Automatically applies Tooltip + ToolbarButton pattern
   - Handles accessibility and styling automatically
   - DO NOT create custom `<Toolbar>` components

3. **createRibbonTabs Helper** (MANDATORY):
   - Use `createRibbonTabs()` to define tabs
   - Ensures Home tab is always present
   - Accepts Home tab label and optional additional tabs array

4. **Standard Action Factories** (REQUIRED for common actions):
   - `createSaveAction()`: Save button with standard behavior
   - `createSettingsAction()`: Settings button with standard behavior
   - Import from `'../../controls/Ribbon'`

5. **Custom Actions** (when needed):
   - Define inline as `RibbonAction` objects
   - Include: key, icon, label, onClick, testId
   - Optional: disabled, hidden (for conditional visibility)

**❌ INCORRECT Patterns - DO NOT USE**:

```typescript
// ❌ WRONG: Custom ribbon layout
return (
  <div className="ribbon">
    <TabList><Tab>Home</Tab></TabList>
    <Toolbar>
      <Tooltip><ToolbarButton /></Tooltip>
    </Toolbar>
  </div>
);

// ❌ WRONG: Manual Tooltip + ToolbarButton pattern
<Toolbar>
  <Tooltip content="Save" relationship="label">
    <ToolbarButton icon={<Save24Regular />} onClick={onSave} />
  </Tooltip>
</Toolbar>

// ❌ WRONG: Creating custom action factories
export function createCustomSaveAction() { ... }  // Use standard factories instead
```

**✅ CORRECT Pattern**:

```typescript
// ✅ CORRECT: Use standard components and factories
const tabs = createRibbonTabs(t("Home"));
const actions = [
  createSaveAction(onSave, disabled, label),
  createSettingsAction(onSettings, label),
  { key: 'custom', icon: Icon, label, onClick, testId }  // Custom actions inline
];

return (
  <BaseRibbon tabs={tabs}>
    <BaseRibbonToolbar actions={actions} />
  </BaseRibbon>
);
```

**Key Benefits**:

- ✅ **Consistency**: Same ribbon pattern across all item editors
- ✅ **Accessibility**: Automatic Tooltip + ToolbarButton implementation
- ✅ **Maintainability**: Changes to ribbon behavior centralized
- ✅ **Type Safety**: TypeScript interfaces ensure correct usage
- ✅ **Less Code**: Factory functions reduce boilerplate
- ✅ **Best Practices**: Follows Fabric design guidelines automatically

### Step 5.1: Create Item-Specific Styles (`[ItemName]Item.scss`)

**🚨 MANDATORY**: Create a separate SCSS file for item-specific styling. This will be verified by the verification team.

**File Location**: `Workload/app/items/[ItemName]Item/[ItemName]Item.scss`

```scss
// [ItemName]Item.scss - Item-specific style overrides
// Based on HelloWorldItem.scss pattern

// 🚨 IMPORTANT: Only override item-specific branding, NOT layout/structure
// Layout and structure are defined in ../../styles.scss

// Example: Settings panel with item branding
.item-name-settings-panel-container {
  background-color: var(--colorBrandBackground2);  // Your brand color
  color: var(--colorBrandForeground2);
  
  .item-settings-section-header {
    color: var(--colorBrandForeground1);  // Brand header color
  }
}

// Example: Item-specific editor elements
.item-name-hero-section {
  background: linear-gradient(135deg, var(--colorBrandBackground), var(--colorBrandBackground2));
  padding: var(--spacingVerticalXXL) var(--spacingHorizontalXL);
  border-radius: var(--borderRadiusLarge);
}

// Add other item-specific styles here
```

**Import Pattern in Components**:

```tsx
// In [ItemName]ItemEditor.tsx, [ItemName]ItemEditorEmpty.tsx, etc.
import "../../styles.scss";           // Generic styles (REQUIRED)
import "./[ItemName]Item.scss";       // Item-specific styles (REQUIRED)
```

**Usage Pattern**:

```tsx
// Apply both generic + item-specific classes (CSS cascading)
<div className="item-settings-panel-container item-name-settings-panel-container">
  {/* Generic structure with item-specific branding */}
</div>
```

**✅ DO** (Will pass verification):
- Create separate `[ItemName]Item.scss` file
- Override only colors, fonts, and item-specific elements
- Use design tokens (`var(--color*, --spacing*, --fontSize*)`)
- Follow BEM naming: `.item-name-element-modifier`
- Import both `styles.scss` and `[ItemName]Item.scss` in components

**❌ DON'T** (Will fail verification):
- Modify `Workload/app/styles.scss` for item-specific needs
- Duplicate layout/structure styles from generic patterns
- Use inline styles instead of SCSS file
- Create custom ribbon or editor container styles
- Override BaseItemEditor or BaseRibbon structural styles

### Step 6: Create Manifest Configuration

#### 6.1: Create XML Manifest Template (`Workload/Manifest/items/[ItemName]/[ItemName]Item.xml`)

**Use the HelloWorld pattern exactly**:

```xml
<?xml version='1.0' encoding='utf-8'?>
<ItemManifestConfiguration SchemaVersion="2.0.0">
  <Item TypeName="{{WORKLOAD_NAME}}.[ItemName]" Category="Data">
    <Workload WorkloadName="{{WORKLOAD_NAME}}" />
  </Item>
</ItemManifestConfiguration>
```

**Key Elements**:

- **Location**: Place in `Workload/Manifest/items/[ItemName]/[ItemName]Item.xml`
- **Template Processing**: Use `{{WORKLOAD_NAME}}` placeholder for environment-specific generation
- **Naming Convention**: Follow `[ItemName]Item.xml` pattern
- **Category**: Fabric category (Data, Analytics, etc.)
- **Environment Generation**: Manifest generation will replace placeholders with values from .env files

#### 6.2: Create JSON Manifest (`Workload/Manifest/items/[ItemName]/[ItemName]Item.json`)

**Use the HelloWorld pattern as template**:

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
  "contextMenuItems": [],
  "quickActionItems": [],
  "supportedInMonitoringHub": true,
  "supportedInDatahubL1": true,
  "itemJobActionConfig": {},
  "itemSettings": {
    "getItemSettings": {
      "action": "getItemSettings"
    }
  },
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

#### 8.2: Create Editor Empty State Asset

Create an empty state illustration: `Workload/app/assets/items/[ItemName]Item/EditorEmpty.svg`

**Folder Structure**:
```
Workload/app/assets/items/
└── [ItemName]Item/
    └── EditorEmpty.svg
```

**Requirements**:
- **Format**: SVG (vector format for scalability)
- **Size**: Optimized for display in empty state components
- **Style**: Follow Fabric design system guidelines
- **Content**: Visual representation that communicates the item's purpose when empty

**Usage**: This asset is referenced in the `[ItemName]ItemEditorEmpty.tsx` component to provide visual guidance when the item has no content yet.

#### 8.3: Add Localization Strings

Update `Workload/Manifest/assets/locales/en-US/translations.json` **following the HelloWorld pattern**:

```json
{
  // Add these entries to the existing translations (follow HelloWorld pattern)
  "[ItemName]Item_DisplayName": "Your Item Display Name",
  "[ItemName]Item_DisplayName_Plural": "Your Item Display Names",
  "[ItemName]Item_Description": "Description of what this item does",
  "[ItemName]ItemEditor_Title": "Your [ItemName] Editor",
  "[ItemName]ItemEditor_Definition_Message_Label": "Message",
  "[ItemName]ItemEditor_LoadingProgressBar_Text": "Loading your [ItemName] item...",
  "[ItemName]ItemEditorEmpty_Message": "Welcome to your new {itemName}! Enter a message to get started.",
  "[ItemName]ItemEditorEmpty_Button": "Get Started"
}
```

**Required Translation Keys**:

- `[ItemName]Item_DisplayName`: Display name in Fabric UI
- `[ItemName]Item_DisplayName_Plural`: Plural form for lists
- `[ItemName]Item_Description`: Item description
- `[ItemName]ItemEditor_Title`: Main editor title
- `[ItemName]ItemEditor_Definition_Message_Label`: Field label in editor
- `[ItemName]ItemEditor_LoadingProgressBar_Text`: Loading message
- `[ItemName]ItemEditorEmpty_Message`: Empty state message
- `[ItemName]ItemEditorEmpty_Button`: Empty state button text

**For Additional Locales**:

- Add corresponding entries in other locale files (e.g., `es/translations.json`)
- Maintain the same keys with translated values

#### 8.4: 🚨 CRITICAL - Update Product.json Configuration

**MANDATORY STEP - DO NOT SKIP**: Update `Workload/Manifest/Product.json` to register your new item in Fabric's create experience. **This step is REQUIRED for your item to appear in create dialogs.**

**Step 8.4.1 - Add to createExperience.cards array**:

The `createExperience.cards` array controls what items appear in Fabric's "Create new item" dialogs. You MUST add your item here.

```json
{
  "createExperience": {
    "description": "Workload_Description",
    "cards": [
      {
        "title": "HelloWorldItem_DisplayName",
        "description": "HelloWorldItem_Description", 
        "itemType": "HelloWorld"
        // ... existing HelloWorld configuration
      },
      {
        "title": "[ItemName]Item_DisplayName",           // ← ADD THIS BLOCK
        "description": "[ItemName]Item_Description",     // ← Use localization key
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
        "itemType": "[ItemName]",                        // ← CRITICAL: Must match JSON manifest "name" field
        "createItemDialogConfig": {
          "onCreationFailure": { "action": "item.onCreationFailure" },
          "onCreationSuccess": { "action": "item.onCreationSuccess" }
        }
      }
    ]
  }
}
```

**Step 8.4.2 - Add to recommendedItemTypes array**:

The `recommendedItemTypes` array controls which items appear on the workload home page as featured/recommended items.

```json
{
  "homePage": {
    "recommendedItemTypes": [
      "HelloWorld",        // ← Existing item
      "[ItemName]"         // ← ADD THIS - Must match itemType in createExperience
    ]
  }
}
```

**⚠️ CRITICAL Requirements**:

- **itemType Consistency**: The `itemType` field in `createExperience.cards` MUST exactly match:
  - The `name` field in your `[ItemName]Item.json` manifest
  - The entry in `recommendedItemTypes` array
- **Localization Keys**: Use translation keys (e.g., `[ItemName]Item_DisplayName`) not hardcoded strings
- **Icon Files**: Ensure icon files exist in `assets/images/` directory
- **Both Arrays Required**: Items need to be in BOTH `createExperience.cards` AND `recommendedItemTypes`

**❌ Common Mistakes - DO NOT DO THIS**:
```json
// WRONG: Missing createExperience.cards entry
{
  "homePage": {
    "recommendedItemTypes": ["HelloWorld", "MyItem"]  // ← Only this, item won't appear in create dialogs
  }
}

// WRONG: Hardcoded strings instead of localization keys  
{
  "title": "My Custom Item",              // ← Should be "[ItemName]Item_DisplayName"
  "description": "Does custom things"     // ← Should be "[ItemName]Item_Description"
}

// WRONG: itemType mismatch
{
  "createExperience": {
    "cards": [{ "itemType": "MyCustomItem" }]     // ← Different from manifest "name"
  },
  "homePage": {
    "recommendedItemTypes": ["MyItem"]            // ← Different from createExperience
  }
}
```

**✅ Correct Pattern - ALWAYS DO THIS**:
```json
{
  "createExperience": {
    "cards": [
      {
        "title": "[ItemName]Item_DisplayName",      // ← Localization key
        "description": "[ItemName]Item_Description", // ← Localization key
        "itemType": "[ItemName]",                   // ← Matches manifest "name"
        // ... complete card configuration
      }
    ]
  },
  "homePage": {
    "recommendedItemTypes": ["[ItemName]"]         // ← Matches itemType above
  }
}
```

**Validation Checklist**:
- [ ] Item added to `createExperience.cards` array
- [ ] Item added to `recommendedItemTypes` array  
- [ ] `itemType` matches JSON manifest `name` field exactly
- [ ] All text uses localization keys (no hardcoded strings)
- [ ] Icon files exist in assets directory
- [ ] `availableIn` array includes appropriate Fabric UI locations

### Step 9: 🚨 CRITICAL - Update Environment Variables

**IMPORTANT**: After creating a new item, you MUST update the `ITEM_NAMES` variable in ALL environment files, or your item will not be included in the build:

1. **Update Workload/.env.dev**:
   ```bash
   # Before
   ITEM_NAMES=HelloWorld
   
   # After - add your new item
   ITEM_NAMES=HelloWorld,[ItemName]
   ```

2. **Update Workload/.env.test**:
   ```bash
   ITEM_NAMES=HelloWorld,[ItemName]
   ```

3. **Update Workload/.env.prod**:
   ```bash
   ITEM_NAMES=HelloWorld,[ItemName]
   ```

**Why This Matters**:
- The ITEM_NAMES variable controls which items are included when building the manifest package
- Missing items from this list will NOT appear in the workload
- Each environment can have different sets of items enabled
- This is required for the BuildManifestPackage.ps1 script to include your item

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

### Step 11: Build and Deploy

1. **Build manifest package**:
   ```powershell
   .\scripts\Build\BuildManifestPackage.ps1
   ```

2. **Build release**:
   ```powershell
   .\scripts\Build\BuildRelease.ps1
   ```

## Quick Start: Use HelloWorld as Template

**For AI Tools**: Instead of creating empty files, copy and modify the existing HelloWorld item:

### 1. Copy HelloWorld Item Structure
```bash
# Copy the entire HelloWorld item implementation
cp -r Workload/app/items/HelloWorldItem Workload/app/items/[ItemName]Item

# Copy the manifest files
cp -r Workload/Manifest/items/HelloWorld Workload/Manifest/items/[ItemName]
```

### 2. Find and Replace Pattern
```bash
# Replace all instances in the copied files:
HelloWorld → [ItemName]
HelloWorldItem → [ItemName]Item
HelloWorldItemDefinition → [ItemName]ItemDefinition
HelloWorldItemEditor → [ItemName]ItemEditor
HelloWorldItemEmpty → [ItemName]ItemEmpty
HelloWorldItemEditorRibbon → [ItemName]ItemEditorRibbon
```

### 3. Update File Names
```bash
# Rename all files to match the new item name
mv [ItemName]Item/HelloWorldItemModel.ts [ItemName]Item/[ItemName]ItemModel.ts
mv [ItemName]Item/HelloWorldItemEditor.tsx [ItemName]Item/[ItemName]ItemEditor.tsx
mv [ItemName]Item/HelloWorldItemEditorEmpty.tsx [ItemName]Item/[ItemName]ItemEditorEmpty.tsx
mv [ItemName]Item/HelloWorldItemEditorRibbon.tsx [ItemName]Item/[ItemName]ItemEditorRibbon.tsx
# Continue for all files...
```

This approach ensures you get a **complete, functional item** rather than empty file structures.

---

## Usage

### Quick Checklist for AI Tools

When creating a new item, ensure all these components are created:

**Implementation Files** (in `Workload/app/items/[ItemName]Item/`):
- [ ] `[ItemName]ItemModel.ts` - Data model interface
- [ ] `[ItemName]ItemEditor.tsx` - Main editor component  
- [ ] `[ItemName]ItemEditorEmpty.tsx` - Empty state component
- [ ] `[ItemName]ItemEditorRibbon.tsx` - Ribbon/toolbar component

**Manifest Files** (in `Workload/Manifest/items/[ItemName]/`):
- [ ] `[ItemName]Item.xml` - XML manifest template with placeholders like `{{WORKLOAD_NAME}}`
- [ ] `[ItemName]Item.json` - JSON manifest with editor path and metadata

**product Configuration File** (in `Workload/Manifest/Product.json`):
- [ ] 🚨 **CRITICAL**: Add item to `createExperience.cards` array (item won't appear in create dialogs without this)
- [ ] 🚨 **CRITICAL**: Add item to `recommendedItemTypes` array (item won't appear on home page without this)  
- [ ] Verify `itemType` field matches JSON manifest `name` field exactly
- [ ] Use localization keys for title/description, not hardcoded strings

**Asset Files**:
- [ ] `Workload/Manifest/assets/images/[ItemName]Item-icon.png` - Item icon
- [ ] `Workload/app/assets/items/[ItemName]Item/EditorEmpty.svg` - Empty state illustration
- [ ] Localization entries in `Workload/Manifest/assets/locales/*/translations.json`

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
- **🚨 MOST COMMON**: Item doesn't appear in create dialogs → Check `createExperience.cards` in Product.json
- **Item not on home page**: Missing from `recommendedItemTypes` array in Product.json
- **Route not found**: Ensure route path matches manifest `editor.path`
- **Icon not loading**: Verify icon file exists in assets/images/
- **Localization missing**: Check translation keys in all locale files
- **Save not working**: Verify model interface is properly defined
- **Empty state not showing**: Check onFinishEmpty callback implementation
- **Build errors**: Check `ITEM_NAMES` environment variable includes your item
