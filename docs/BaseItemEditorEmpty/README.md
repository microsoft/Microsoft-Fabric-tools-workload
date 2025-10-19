# BaseItemEditorEmpty Component

## Overview

`BaseItemEditorEmpty` is a reusable empty state component that provides a consistent onboarding experience for item editors in the Microsoft Fabric Extensibility Toolkit. It follows Fabric UX System guidelines and allows developers to define custom tasks/actions for users.

## Features

✅ **Fabric UX Compliant** - Uses design tokens, proper spacing, and accessibility features  
✅ **Customizable Tasks** - Define onboarding steps with descriptions and actions  
✅ **Optional Illustration** - Support for custom images/SVGs  
✅ **Flexible Layout** - Supports custom content or task-based onboarding  
✅ **Responsive Design** - Works across different screen sizes  
✅ **Accessibility First** - Proper ARIA labels, semantic HTML, keyboard navigation  
✅ **TypeScript Support** - Full type definitions and IntelliSense  

## Usage

### Basic Example

```tsx
import { BaseItemEditorEmpty, EmptyStateTask } from "../../controls";

const tasks: EmptyStateTask[] = [
  {
    id: 'start',
    label: 'Get Started',
    description: 'Learn the basics',
    onClick: () => navigate('getting-started'),
    appearance: 'primary'
  }
];

<BaseItemEditorEmpty
  title="Welcome to MyItem!"
  description="Get started by completing the tasks below"
  imageSrc="/assets/items/MyItem/empty.svg"
  imageAlt="Empty state"
  tasks={tasks}
/>
```

### Multiple Tasks Example

```tsx
import { BaseItemEditorEmpty, EmptyStateTask } from "../../controls";
import { DocumentRegular, BookRegular, VideoRegular } from "@fluentui/react-icons";

const tasks: EmptyStateTask[] = [
  {
    id: 'quick-start',
    label: 'Quick Start Guide',
    description: 'Get up and running in 5 minutes',
    onClick: () => navigate('quick-start'),
    appearance: 'primary',
    icon: <DocumentRegular />
  },
  {
    id: 'documentation',
    label: 'View Documentation',
    description: 'Explore detailed guides and API references',
    onClick: () => openDocs(),
    appearance: 'secondary',
    icon: <BookRegular />
  },
  {
    id: 'video-tutorial',
    label: 'Watch Tutorial',
    description: 'Learn through video walkthroughs',
    onClick: () => openVideo(),
    appearance: 'outline',
    icon: <VideoRegular />
  }
];

<BaseItemEditorEmpty
  title="Welcome to Advanced Analytics!"
  description="Choose how you'd like to get started with your analytics workspace"
  imageSrc="/assets/items/AnalyticsItem/welcome.svg"
  imageAlt="Analytics workspace illustration"
  tasks={tasks}
  maxWidth={700}
/>
```

### Custom Content Example

```tsx
import { BaseItemEditorEmpty } from "../../controls";
import { Card, CardHeader } from "@fluentui/react-components";

<BaseItemEditorEmpty
  title="No Data Yet"
  description="Import data to get started"
  imageSrc="/assets/items/DataItem/no-data.svg"
  customContent={
    <Card>
      <CardHeader header="Import Options" />
      {/* Your custom import UI */}
    </Card>
  }
/>
```

### With Internationalization

```tsx
import { useTranslation } from "react-i18next";
import { BaseItemEditorEmpty, EmptyStateTask } from "../../controls";

export function MyItemEditorEmpty({ onNavigate }) {
  const { t } = useTranslation();

  const tasks: EmptyStateTask[] = [
    {
      id: 'start',
      label: t('Empty_StartButton', 'Get Started'),
      description: t('Empty_StartDesc', 'Begin your journey'),
      onClick: () => onNavigate('start'),
      appearance: 'primary'
    }
  ];

  return (
    <BaseItemEditorEmpty
      title={t('Empty_Title', 'Welcome!')}
      description={t('Empty_Description', 'Start by completing the tasks below')}
      imageSrc="/assets/items/MyItem/empty.svg"
      tasks={tasks}
    />
  );
}
```

## API Reference

### BaseItemEditorEmptyProps

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `title` | `string` | ✅ Yes | - | Main heading displayed in the empty state |
| `description` | `string` | ✅ Yes | - | Descriptive text below the title |
| `imageSrc` | `string` | No | - | Path to illustration/image |
| `imageAlt` | `string` | No | `"Empty state illustration"` | Alt text for the image (accessibility) |
| `tasks` | `EmptyStateTask[]` | No | `[]` | Array of onboarding tasks/actions |
| `customContent` | `ReactNode` | No | - | Custom content instead of tasks |
| `className` | `string` | No | `""` | Additional CSS class for styling |
| `maxWidth` | `number` | No | `600` | Maximum width in pixels for content |

### EmptyStateTask

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `id` | `string` | ✅ Yes | - | Unique identifier for the task |
| `label` | `string` | ✅ Yes | - | Button text/label |
| `description` | `string` | No | - | Optional description below button |
| `onClick` | `() => void` | ✅ Yes | - | Click handler function |
| `appearance` | `"primary"` \| `"secondary"` \| `"outline"` \| `"subtle"` \| `"transparent"` | No | First task: `"primary"`, others: `"secondary"` | Button style variant |
| `icon` | `ReactNode` | No | - | Optional icon (Fluent UI icon component) |

## Design Guidelines

### Visual Hierarchy

1. **Illustration** (optional) - Visual anchor point
2. **Title** - Clear, concise heading (h2)
3. **Description** - Supporting text explaining next steps
4. **Tasks/Actions** - Primary action first, secondary actions below

### Spacing

The component uses Fabric design tokens for spacing:
- Container gap: 24px (`--spacingVerticalXL`)
- Header gap: 8px (`--spacingVerticalS`)
- Task gap: 12px (`--spacingVerticalM`)

### Typography

- **Title**: 20px, Semibold (600), using `--fontSizeBase500`
- **Description**: 14px, Regular (400), using `--fontSizeBase300`
- **Task descriptions**: 12px, Regular (400), secondary color

### Colors

- **Title**: `--colorNeutralForeground1` (#242424)
- **Description**: `--colorNeutralForeground2` (#424242)
- **Task descriptions**: `--colorNeutralForeground3` (#616161)

### Accessibility

✅ Proper semantic HTML (`<h2>`, `<img>`, `<button>`)  
✅ ARIA labels for screen readers  
✅ Minimum 32px touch targets for buttons  
✅ Keyboard navigation support  
✅ Color contrast meets WCAG 2.1 AA standards  
✅ Alt text for images  

## Integration with BaseItemEditor

```tsx
import { BaseItemEditor } from "../../controls";
import { MyItemRibbon } from "./MyItemRibbon";
import { MyItemEditorEmpty } from "./MyItemEditorEmpty";
import { MyItemEditorDefault } from "./MyItemEditorDefault";

export function MyItemEditor(props: PageProps) {
  const [currentView, setCurrentView] = useState<'empty' | 'default'>('empty');

  return (
    <BaseItemEditor
      ribbon={
        <MyItemRibbon
          {...props}
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      }
    >
      {currentView === 'empty' ? (
        <MyItemEditorEmpty
          {...props}
          onNavigateToDefault={() => setCurrentView('default')}
        />
      ) : (
        <MyItemEditorDefault {...props} />
      )}
    </BaseItemEditor>
  );
}
```

## Styling

The component uses the following CSS classes from `styles.scss`:

```scss
.empty-state-container        // Main container
.empty-state-content          // Content wrapper
.empty-state-image            // Illustration/image
.empty-state-text-container   // Text content wrapper
.empty-state-header           // Header section
.empty-state-description      // Description text
```

### Custom Styling

You can add custom styles using the `className` prop:

```tsx
<BaseItemEditorEmpty
  className="my-custom-empty-state"
  title="Custom Styled Empty State"
  description="With additional styling"
  tasks={tasks}
/>
```

```scss
// In your component's SCSS file
.my-custom-empty-state {
  .empty-state-image {
    width: 300px;
    height: 300px;
  }
  
  .empty-state-header h2 {
    color: var(--colorBrandForeground1);
  }
}
```

## Best Practices

### ✅ Do's

- **Keep titles short and welcoming** - "Welcome to [Item Name]!"
- **Provide clear next steps** - Tell users exactly what to do
- **Use illustrations** - Visual elements reduce cognitive load
- **Limit tasks to 3-5** - Too many choices cause decision paralysis
- **Put primary action first** - Most important task should be prominent
- **Use descriptive labels** - "Import Data" not just "Import"
- **Test with screen readers** - Ensure accessibility

### ❌ Don'ts

- **Don't use jargon** - Keep language simple and clear
- **Don't overcrowd** - White space is your friend
- **Don't hide critical info** - Empty state is prime real estate
- **Don't use decorative images without alt text** - Accessibility matters
- **Don't make everything primary** - Only one primary action
- **Don't forget mobile** - Test responsive behavior

## Examples from Codebase

### HelloWorldItemEditorEmpty

```tsx
const tasks: EmptyStateTask[] = [
  {
    id: 'getting-started',
    label: t('HelloWorldItemEditorEmpty_StartButton', 'Getting Started'),
    description: t('HelloWorldItemEditorEmpty_StartDescription', 'Learn how to use this item'),
    onClick: onNavigateToGettingStarted,
    appearance: 'primary'
  }
];

return (
  <BaseItemEditorEmpty
    title={t('HelloWorldItemEditorEmpty_Title', 'Welcome to HelloWorld!')}
    description={t('HelloWorldItemEditorEmpty_Description', 'This is the first screen people will see after an item is created.')}
    imageSrc="/assets/items/HelloWorldItem/EditorEmpty.svg"
    imageAlt="Empty state illustration"
    tasks={tasks}
  />
);
```

## Troubleshooting

### Image Not Displaying

**Problem**: Image doesn't show up  
**Solution**: Ensure image path is correct and file exists in `Workload/app/assets/items/[ItemName]/`

```bash
# Check if image exists
ls Workload/app/assets/items/HelloWorldItem/EditorEmpty.svg
```

### Tasks Not Clickable

**Problem**: Buttons don't respond to clicks  
**Solution**: Verify `onClick` handler is defined and not returning undefined

```tsx
// ❌ Wrong
const tasks = [{
  id: 'test',
  label: 'Test',
  onClick: undefined // Problem!
}];

// ✅ Correct
const tasks = [{
  id: 'test',
  label: 'Test',
  onClick: () => console.log('Clicked!')
}];
```

### Styling Issues

**Problem**: Custom styles not applying  
**Solution**: Ensure SCSS file is imported and classes are specific enough

```tsx
// Import styles
import "./MyItemEditor.scss";

// Use className prop
<BaseItemEditorEmpty className="my-item-empty" {...props} />
```

## Related Components

- [`BaseItemEditor`](./BaseItemEditor.md) - Parent container for item editors
- [`BaseRibbon`](./Ribbon/BaseRibbon.md) - Ribbon control for item editors
- [`ItemEditorLoadingProgressBar`](./ItemEditorLoadingProgressBar.md) - Loading state

## References

- [Fluent UI v9 Documentation](https://react.fluentui.dev/)
- [Fabric Design Tokens](https://aka.ms/fabric-tokens)
- [Empty State Patterns](https://aka.ms/fabric-empty-states)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Component Location**: `Workload/app/controls/BaseItemEditorEmpty.tsx`  
**Created**: October 19, 2025  
**Status**: ✅ Production Ready
