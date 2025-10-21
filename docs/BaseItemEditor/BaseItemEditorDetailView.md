# BaseItemEditorDetailView Component

## 📋 Overview

The `BaseItemEditorDetailView` component provides a standardized layout for detail/drill-down views in Microsoft Fabric item editors. It offers consistent styling, proper spacing, and integrates seamlessly with the automatic back navigation system.

## ✨ Features

✅ **Automatic Back Navigation** - Works with `isDetailView: true` in view registration  
✅ **Fabric Design System** - Uses official design tokens and spacing  
✅ **Responsive Layout** - Adapts to different screen sizes  
✅ **Consistent Styling** - Standardized for detail view patterns  
✅ **Action Support** - Built-in support for detail-specific actions  
✅ **Accessibility Compliant** - Semantic HTML and ARIA support  
✅ **TypeScript Support** - Full type definitions and IntelliSense  

## 🚀 Quick Start

### Basic Usage

```tsx
import { BaseItemEditorDetailView } from "../../controls";

export function MyItemDetailView({ itemId }: { itemId: string }) {
  return (
    <BaseItemEditorDetailView
      title="Item Details"
      subtitle={`ID: ${itemId}`}
    >
      <div>
        <h3>Detailed Information</h3>
        <p>Your detailed view content goes here.</p>
      </div>
    </BaseItemEditorDetailView>
  );
}
```

### With Actions

```tsx
import { BaseItemEditorDetailView, DetailViewAction } from "../../controls";

export function MyItemDetailView({ item }: { item: MyItem }) {
  const actions: DetailViewAction[] = [
    {
      key: 'edit',
      label: 'Edit Item',
      iconName: 'Edit',
      onClick: () => editItem(item.id),
      appearance: 'primary'
    },
    {
      key: 'delete',
      label: 'Delete Item',
      iconName: 'Delete',
      onClick: () => deleteItem(item.id),
      appearance: 'subtle'
    }
  ];

  return (
    <BaseItemEditorDetailView
      title={item.name}
      subtitle={`Created: ${item.createdDate}`}
      actions={actions}
    >
      <div>
        <h4>Description</h4>
        <p>{item.description}</p>
        
        <h4>Properties</h4>
        <dl>
          <dt>Type:</dt>
          <dd>{item.type}</dd>
          <dt>Status:</dt>
          <dd>{item.status}</dd>
        </dl>
      </div>
    </BaseItemEditorDetailView>
  );
}
```

### In View Registration

```tsx
// Automatically gets back navigation with isDetailView: true
const views: RegisteredView[] = [
  {
    name: 'main',
    component: <MyMainView />
  },
  {
    name: 'item-detail',
    component: (
      <BaseItemEditorDetailView
        title="Item Details"
        actions={detailActions}
      >
        <MyDetailContent />
      </BaseItemEditorDetailView>
    ),
    isDetailView: true  // ⭐ Enables automatic back navigation
  }
];
```

## 📖 Props API

### BaseItemEditorDetailViewProps

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | `string` | ✅ | Main heading for the detail view |
| `subtitle` | `string` | ❌ | Optional subtitle/description |
| `actions` | `DetailViewAction[]` | ❌ | Array of detail-specific actions |
| `children` | `ReactNode` | ✅ | Content to display in the detail view |
| `className` | `string` | ❌ | Additional CSS classes |

### DetailViewAction Interface

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `key` | `string` | ✅ | Unique identifier for the action |
| `label` | `string` | ✅ | Button text |
| `iconName` | `string` | ❌ | Fluent UI icon name |
| `onClick` | `() => void` | ✅ | Click handler function |
| `appearance` | `'primary' \| 'secondary' \| 'subtle'` | ❌ | Button appearance |
| `disabled` | `boolean` | ❌ | Whether the action is disabled |

## 🎯 Key Features

### Automatic Back Navigation

When registered with `isDetailView: true`, the BaseRibbon automatically shows a back button:

```tsx
// View registration
{
  name: 'item-detail',
  component: <BaseItemEditorDetailView title="Details">...</BaseItemEditorDetailView>,
  isDetailView: true  // ⭐ Triggers automatic back button in ribbon
}

// No manual back button needed - handled automatically by BaseRibbon
```

### Header Layout

Consistent header with title, subtitle, and actions:

```tsx
// Header structure
<div className="detail-view-header">
  <div className="detail-view-title-section">
    <Text variant="title1">{title}</Text>
    {subtitle && <Text variant="caption1">{subtitle}</Text>}
  </div>
  {actions && (
    <div className="detail-view-actions">
      {actions.map(action => (
        <Tooltip key={action.key} content={action.label}>
          <Button {...actionProps} />
        </Tooltip>
      ))}
    </div>
  )}
</div>
```

### Responsive Design

Adapts to different screen sizes:

```scss
// Desktop: Side-by-side title and actions
.detail-view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

// Mobile: Stacked layout
@media (max-width: 768px) {
  .detail-view-header {
    flex-direction: column;
    gap: var(--spacingVerticalM);
  }
}
```

## 🏗️ Architecture

### Component Structure

```
BaseItemEditorDetailView
├── Header
│   ├── Title Section
│   │   ├── Title (Text variant="title1")
│   │   └── Subtitle (Text variant="caption1", optional)
│   └── Actions (optional)
│       └── Button + Tooltip (for each action)
├── Divider
└── Content
    └── Children (scrollable)
```

### CSS Classes

```scss
.base-item-editor-detail-view {
  // Main container
  
  &__header {
    // Header section
  }
  
  &__title-section {
    // Title and subtitle container
  }
  
  &__actions {
    // Action buttons container
  }
  
  &__content {
    // Content area (scrollable)
  }
}
```

## 💡 Usage Patterns

### Pattern 1: Simple Detail View

```tsx
export function UserDetailView({ userId }: { userId: string }) {
  const [user, setUser] = useState<User>();

  useEffect(() => {
    loadUser(userId).then(setUser);
  }, [userId]);

  if (!user) return <LoadingSpinner />;

  return (
    <BaseItemEditorDetailView
      title={user.name}
      subtitle={`ID: ${user.id} • Last login: ${user.lastLogin}`}
    >
      <div className="user-details">
        <section>
          <h4>Contact Information</h4>
          <p>Email: {user.email}</p>
          <p>Phone: {user.phone}</p>
        </section>
        
        <section>
          <h4>Permissions</h4>
          <ul>
            {user.permissions.map(p => <li key={p}>{p}</li>)}
          </ul>
        </section>
      </div>
    </BaseItemEditorDetailView>
  );
}
```

### Pattern 2: Detail with Actions

```tsx
export function ProjectDetailView({ project }: { project: Project }) {
  const actions: DetailViewAction[] = [
    {
      key: 'edit',
      label: 'Edit Project',
      iconName: 'Edit',
      onClick: () => editProject(project.id),
      appearance: 'primary'
    },
    {
      key: 'duplicate',
      label: 'Duplicate',
      iconName: 'Copy',
      onClick: () => duplicateProject(project.id)
    },
    {
      key: 'archive',
      label: 'Archive',
      iconName: 'Archive',
      onClick: () => archiveProject(project.id),
      appearance: 'subtle'
    }
  ];

  return (
    <BaseItemEditorDetailView
      title={project.name}
      subtitle={`Status: ${project.status} • Owner: ${project.owner}`}
      actions={actions}
    >
      <div className="project-details">
        <Card>
          <CardHeader>
            <Text variant="title3">Overview</Text>
          </CardHeader>
          <CardBody>
            <p>{project.description}</p>
            <div className="project-metrics">
              <div>Tasks: {project.taskCount}</div>
              <div>Progress: {project.progress}%</div>
              <div>Due Date: {project.dueDate}</div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Text variant="title3">Team Members</Text>
          </CardHeader>
          <CardBody>
            {project.members.map(member => (
              <div key={member.id} className="member-item">
                <Avatar name={member.name} />
                <div>
                  <Text weight="semibold">{member.name}</Text>
                  <Text variant="caption1">{member.role}</Text>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </BaseItemEditorDetailView>
  );
}
```

### Pattern 3: Tabbed Detail Content

```tsx
export function TabbedDetailView({ item }: { item: DetailItem }) {
  const [selectedTab, setSelectedTab] = useState('overview');

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'settings', label: 'Settings' },
    { key: 'history', label: 'History' }
  ];

  return (
    <BaseItemEditorDetailView
      title={item.name}
      subtitle={item.description}
    >
      <TabList selectedValue={selectedTab} onTabSelect={(e, data) => setSelectedTab(data.value)}>
        {tabs.map(tab => (
          <Tab key={tab.key} value={tab.key}>
            {tab.label}
          </Tab>
        ))}
      </TabList>

      <div className="tab-content">
        {selectedTab === 'overview' && <OverviewContent item={item} />}
        {selectedTab === 'settings' && <SettingsContent item={item} />}
        {selectedTab === 'history' && <HistoryContent item={item} />}
      </div>
    </BaseItemEditorDetailView>
  );
}
```

### Pattern 4: Loading and Error States

```tsx
export function DetailViewWithStates({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<Item>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    loadItem(itemId)
      .then(setItem)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading) {
    return (
      <BaseItemEditorDetailView title="Loading...">
        <LoadingSpinner />
      </BaseItemEditorDetailView>
    );
  }

  if (error) {
    return (
      <BaseItemEditorDetailView title="Error">
        <div className="error-state">
          <Text variant="body1">Failed to load item details: {error}</Text>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </BaseItemEditorDetailView>
    );
  }

  return (
    <BaseItemEditorDetailView
      title={item!.name}
      actions={getItemActions(item!)}
    >
      <ItemContent item={item!} />
    </BaseItemEditorDetailView>
  );
}
```

## ♿ Accessibility

### Semantic HTML

```tsx
// Good - uses semantic elements
<BaseItemEditorDetailView title="Project Details">
  <article>
    <section aria-labelledby="overview-heading">
      <h3 id="overview-heading">Project Overview</h3>
      {/* overview content */}
    </section>
    
    <section aria-labelledby="team-heading">
      <h3 id="team-heading">Team Members</h3>
      {/* team content */}
    </section>
  </article>
</BaseItemEditorDetailView>
```

### ARIA Support

- **Proper Headings**: Title uses h2, content should use h3+
- **Action Labels**: Action buttons have accessible names
- **Tooltips**: Provide additional context for actions
- **Landmarks**: Use section/article elements appropriately

## 🎨 Styling

### Design Tokens

```scss
// Header styling
.detail-view-header {
  padding: var(--spacingVerticalL) var(--spacingHorizontalXL);
  border-bottom: 1px solid var(--colorNeutralStroke2);
  background: var(--colorNeutralBackground1);
}

// Title styling
.detail-view-title {
  font-size: var(--fontSizeHero700);
  font-weight: var(--fontWeightSemibold);
  color: var(--colorNeutralForeground1);
}

// Content area
.detail-view-content {
  padding: var(--spacingVerticalL) var(--spacingHorizontalXL);
  overflow-y: auto;
}
```

## 🔧 Best Practices

### ✅ Do's

✅ **Use descriptive titles** - Clear identification of what's being viewed  
✅ **Provide relevant actions** - Edit, delete, duplicate, etc.  
✅ **Use proper heading hierarchy** - h2 for title, h3+ for content  
✅ **Test back navigation** - Ensure smooth navigation flow  
✅ **Include loading states** - Handle async data properly  
✅ **Use card layouts** for complex content organization  

### ❌ Don'ts

❌ **Don't manually add back buttons** - Use `isDetailView: true` instead  
❌ **Don't overcrowd actions** - Limit to 3-5 most important actions  
❌ **Don't forget loading states** - Always handle async operations  
❌ **Don't use nested scrolling** - Let BaseItemEditorDetailView handle scroll  
❌ **Don't ignore responsive design** - Test on different screen sizes  

## 🔗 Related Components

- **[BaseItemEditor](./README.md)** - Main container with view registration
- **[BaseItemEditorView](./BaseItemEditorView.md)** - Default view layout
- **[BaseItemEditorEmptyView](./BaseItemEditorEmptyView.md)** - Empty state layout
- **[BaseRibbon](./BaseRibbon.md)** - Ribbon container with automatic back navigation

## 📝 Examples

For complete examples, see:
- [BaseItemEditor README](./README.md) - Integration patterns with detail views
- View registration examples in the main documentation