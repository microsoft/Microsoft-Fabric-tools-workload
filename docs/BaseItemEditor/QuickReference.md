# BaseItemEditor Quick Reference

Quick reference guide for using the `BaseItemEditor` control in Microsoft Fabric workload item editors.

## 🚀 Quick Start

### Basic Pattern

```tsx
import { BaseItemEditor } from "../../controls";

export function MyItemEditor(props: PageProps) {
  return (
    <BaseItemEditor
      ribbon={<MyItemRibbon {...props} />}
    >
      <MyContent />
    </BaseItemEditor>
  );
}
```

## 📦 Import Statement

```tsx
import { BaseItemEditor } from "../../controls";
// or
import { BaseItemEditor, BaseItemEditorProps } from "../../controls";
```

## 🎯 Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `ribbon` | `ReactNode` | ✅ | Ribbon component (fixed at top) |
| `children` | `ReactNode` | ✅ | Content (scrollable) |
| `className` | `string` | ❌ | Additional CSS class for container |
| `contentClassName` | `string` | ❌ | Additional CSS class for content area |

## 📐 Layout Structure

```
┌─────────────────────────┐
│  Ribbon (Fixed)         │  ← Always visible
├─────────────────────────┤
│                         │
│  Content (Scrolls)      │  ← Scrollable area
│                         │
└─────────────────────────┘
```

## 💡 Common Patterns

### Pattern 1: With View Switching

```tsx
<BaseItemEditor
  ribbon={<MyRibbon currentView={currentView} />}
>
  {currentView === 'empty' ? (
    <MyEmptyView onStart={handleStart} />
  ) : (
    <MyDefaultView item={item} />
  )}
</BaseItemEditor>
```

### Pattern 2: With Loading State

```tsx
if (isLoading) {
  return <ItemEditorLoadingProgressBar message="Loading..." />;
}

return (
  <BaseItemEditor ribbon={<MyRibbon />}>
    <MyContent />
  </BaseItemEditor>
);
```

### Pattern 3: With Custom Classes

```tsx
<BaseItemEditor
  ribbon={<MyRibbon />}
  className="custom-editor"
  contentClassName="custom-content"
>
  <MyContent />
</BaseItemEditor>
```

### Pattern 4: With Detail Pages

```tsx
<BaseItemEditor
  ribbon={
    <MyRibbon
      showBack={page === 'detail'}
      onBack={() => setPage('main')}
    />
  }
>
  {page === 'main' ? (
    <MyMainView onViewDetail={(id) => {
      setDetailId(id);
      setPage('detail');
    }} />
  ) : (
    <MyDetailView
      detailId={detailId}
      onBack={() => setPage('main')}
    />
  )}
</BaseItemEditor>
```

## 🎨 View Types

### Empty View

```tsx
<BaseItemEditor ribbon={<MyRibbon />}>
  <div className="empty-state-container">
    <h2>Welcome!</h2>
    <Button onClick={onStart}>Get Started</Button>
  </div>
</BaseItemEditor>
```

**Key Classes**: `empty-state-container`  
**Min Height**: 500px for proper centering

### Default View

```tsx
<BaseItemEditor ribbon={<MyRibbon />}>
  <div className="editor-default-view">
    <div className="main">
      <h2>My Content</h2>
      {/* Forms, cards, etc. */}
    </div>
  </div>
</BaseItemEditor>
```

**Key Classes**: `editor-default-view`, `main`

### Detail Page

```tsx
<BaseItemEditor ribbon={<MyRibbon />}>
  <div className="editor-detail-page">
    <div className="detail-content">
      <h2>Detail View</h2>
      {/* Detail content */}
    </div>
  </div>
</BaseItemEditor>
```

**Key Classes**: `editor-detail-page`, `detail-content`

## 📝 Complete Example

```tsx
import React, { useState, useEffect } from "react";
import { BaseItemEditor, ItemEditorLoadingProgressBar } from "../../controls";
import { MyItemRibbon } from "./MyItemRibbon";
import { MyItemEmpty } from "./MyItemEmpty";
import { MyItemDefault } from "./MyItemDefault";

export function MyItemEditor(props: PageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState();
  const [currentView, setCurrentView] = useState('empty');

  useEffect(() => {
    // Load item
    loadItem().then(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <ItemEditorLoadingProgressBar message="Loading..." />;
  }

  return (
    <BaseItemEditor
      ribbon={
        <MyItemRibbon
          {...props}
          currentView={currentView}
          isSaveEnabled={item?.definition?.state}
          onSave={handleSave}
        />
      }
    >
      {currentView === 'empty' ? (
        <MyItemEmpty
          onStart={() => setCurrentView('default')}
        />
      ) : (
        <MyItemDefault
          item={item}
          onUpdate={handleUpdate}
        />
      )}
    </BaseItemEditor>
  );
}
```

## ✅ Best Practices

### Do's
- ✅ Always use `BaseItemEditor` for item editors
- ✅ Keep ribbon content minimal
- ✅ Handle loading states before rendering
- ✅ Use proper view classes
- ✅ Test scrolling with long content
- ✅ Implement keyboard navigation

### Don'ts
- ❌ Don't add scroll to outer container
- ❌ Don't use fixed heights on content
- ❌ Don't put multiple ribbons
- ❌ Don't override flex properties
- ❌ Don't forget loading states

## 🎯 CSS Classes

### Applied by BaseItemEditor

```scss
.base-item-editor              // Main container
.base-item-editor__ribbon      // Ribbon area (fixed)
.base-item-editor__content     // Content area (scrollable)
```

### For Your Views

```scss
.empty-state-container    // Empty view
.editor-default-view      // Default view
.editor-detail-page       // Detail page
.main                     // Content card
.detail-content           // Detail card
```

## 🔧 Styling Tips

### Override Container

```scss
.my-custom-editor {
  background: custom-color;
}
```

### Override Content

```scss
.my-custom-content {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}
```

### Custom Scrollbar

```scss
.base-item-editor__content {
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--colorNeutralStroke1);
  }
}
```

## 🧪 Testing

### Test Data Attributes

```tsx
data-testid="base-item-editor"         // Main container
data-testid="base-item-editor-ribbon"  // Ribbon area
data-testid="base-item-editor-content" // Content area
```

### Example Test

```tsx
const editor = screen.getByTestId('base-item-editor');
const ribbon = screen.getByTestId('base-item-editor-ribbon');
const content = screen.getByTestId('base-item-editor-content');

expect(editor).toBeInTheDocument();
expect(ribbon).toBeVisible();
expect(content).toBeVisible();
```

## 📚 Related Documentation

- **[Full BaseItemEditor Documentation](./README.md)**
- **[Ribbon Controls](../RibbonControls/README.md)**
- **[HelloWorld Reference](../../Workload/app/items/HelloWorldItem/)**

## 🆘 Common Issues

### Issue: Content Not Scrolling
**Solution**: Remove any `overflow: hidden` from parent elements

### Issue: Ribbon Not Fixed
**Solution**: Ensure no `position` CSS overrides on ribbon container

### Issue: Content Behind Ribbon
**Solution**: Don't use `position: absolute` on content

### Issue: Height Not Filling
**Solution**: Ensure parent containers have proper height (`100%` or `100vh`)

---

**Quick Tip**: Check `HelloWorldItemEditor.tsx` for a complete reference implementation!
