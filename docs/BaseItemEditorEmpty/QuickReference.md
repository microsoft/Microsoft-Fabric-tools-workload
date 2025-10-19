# BaseItemEditorEmpty - Quick Reference

## 🚀 Quick Start

```tsx
import { BaseItemEditorEmpty, EmptyStateTask } from "../../controls";

const tasks: EmptyStateTask[] = [
  {
    id: 'start',
    label: 'Get Started',
    onClick: () => navigate('start'),
    appearance: 'primary'
  }
];

<BaseItemEditorEmpty
  title="Welcome!"
  description="Start your journey here"
  imageSrc="/assets/items/MyItem/empty.svg"
  tasks={tasks}
/>
```

## 📋 Common Patterns

### Single Primary Action

```tsx
const tasks = [{
  id: 'action',
  label: 'Getting Started',
  onClick: handleStart,
  appearance: 'primary'
}];
```

### Multiple Actions with Descriptions

```tsx
const tasks = [
  {
    id: 'quick',
    label: 'Quick Start',
    description: '5 minute setup',
    onClick: handleQuick,
    appearance: 'primary'
  },
  {
    id: 'detailed',
    label: 'Detailed Guide',
    description: 'Step-by-step tutorial',
    onClick: handleDetailed,
    appearance: 'secondary'
  }
];
```

### With Icons

```tsx
import { DocumentRegular } from "@fluentui/react-icons";

const tasks = [{
  id: 'docs',
  label: 'View Docs',
  icon: <DocumentRegular />,
  onClick: openDocs,
  appearance: 'primary'
}];
```

### Custom Content

```tsx
<BaseItemEditorEmpty
  title="Welcome"
  description="Get started below"
  customContent={
    <YourCustomComponent />
  }
/>
```

## 🎨 Props Cheat Sheet

| Prop | Type | Required | Example |
|------|------|----------|---------|
| `title` | string | ✅ | `"Welcome!"` |
| `description` | string | ✅ | `"Get started here"` |
| `imageSrc` | string | ❌ | `"/assets/empty.svg"` |
| `tasks` | EmptyStateTask[] | ❌ | `[{id, label, onClick}]` |
| `customContent` | ReactNode | ❌ | `<MyComponent />` |
| `className` | string | ❌ | `"custom-style"` |
| `maxWidth` | number | ❌ | `700` |

## 🔧 Task Object

```tsx
{
  id: string;              // Required: unique ID
  label: string;           // Required: button text
  description?: string;    // Optional: helper text
  onClick: () => void;     // Required: click handler
  appearance?: string;     // Optional: button style
  icon?: ReactNode;        // Optional: Fluent icon
}
```

## 🎯 Button Appearances

- `primary` - Most important action (blue)
- `secondary` - Secondary actions (white with border)
- `outline` - Outlined style
- `subtle` - Minimal style
- `transparent` - No background

## ♿ Accessibility Checklist

- ✅ Use descriptive `imageAlt` text
- ✅ Keep button labels clear and actionable
- ✅ Test keyboard navigation (Tab, Enter)
- ✅ Verify screen reader announcements
- ✅ Ensure 32px minimum touch targets

## 📐 Design Tokens Used

```scss
// Spacing
--spacingVerticalXL: 24px      // Container gap
--spacingVerticalS: 8px        // Header gap
--spacingVerticalM: 12px       // Task gap

// Typography
--fontSizeBase500: 20px        // Title
--fontSizeBase300: 14px        // Description
--fontWeightSemibold: 600      // Title weight

// Colors
--colorNeutralForeground1      // Title color
--colorNeutralForeground2      // Description color
--colorNeutralForeground3      // Task description color
```

## 🐛 Common Issues

### Issue: Image not showing
**Fix**: Check file path and ensure image exists
```bash
ls Workload/app/assets/items/[ItemName]/empty.svg
```

### Issue: Tasks not clickable
**Fix**: Verify onClick is defined
```tsx
// ❌ Wrong
onClick: undefined

// ✅ Right
onClick: () => handleClick()
```

### Issue: Styling not applying
**Fix**: Import styles and use className
```tsx
import "./MyItem.scss";
<BaseItemEditorEmpty className="my-empty" {...props} />
```

## 📚 Related Components

- `BaseItemEditor` - Parent container
- `BaseRibbon` - Ribbon control
- `BaseRibbonToolbar` - Toolbar actions

## 💡 Best Practices

✅ **Do**: Keep titles under 8 words  
✅ **Do**: Limit tasks to 3-5 actions  
✅ **Do**: Use illustrations when possible  
✅ **Do**: Test on mobile devices  

❌ **Don't**: Use technical jargon  
❌ **Don't**: Overcrowd with content  
❌ **Don't**: Make all buttons primary  
❌ **Don't**: Forget accessibility  

## 📖 Full Documentation

See [`docs/BaseItemEditorEmpty/README.md`](./README.md) for complete documentation.

---

**Quick Links**:  
[Component Code](../../controls/BaseItemEditorEmpty.tsx) | 
[Example Usage](../../items/HelloWorldItem/HelloWorldItemEditorEmpty.tsx) | 
[Fluent UI Docs](https://react.fluentui.dev/)
