# ItemEditor Control - Detailed Documentation

The `ItemEditor` is a foundational control for building item editors in the Microsoft Fabric Extensibility Toolkit. It provides a view registration system with automatic navigation, fixed ribbon layout, and consistent UX patterns.

## 📚 Documentation Index

### Core Components

- **[ItemEditor](./README.md)** (this file) - Main container with view registration system  
- **[Ribbon](./Ribbon.md)** - Ribbon container with automatic back navigation
- **[RibbonToolbar](./RibbonToolbar.md)** - Standardized toolbar actions

### View Components

- **[ItemEditorDefaultView](./ItemEditorDefaultView.md)** - Multi-panel layout with resizable splitters (left + center)
- **[ItemEditorView](./ItemEditorView.md)** - Simple single-panel layout
- **[ItemEditorEmptyView](./ItemEditorEmptyView.md)** - Empty state onboarding
- **[ItemEditorDetailView](./ItemEditorDetailView.md)** - Detail/drill-down views

### Architecture & Implementation

- **[Architecture](./Architecture.md)** - System design and patterns
- **[Implementation](./Implementation.md)** - Implementation guidelines
- **[QuickReference](./QuickReference.md)** - Quick reference guide

## 🚀 Overview

The `ItemEditor` component provides a complete view management system with automatic navigation and consistent layout:

```
┌─────────────────────────────────────┐
│  Ribbon (ViewContext-aware)         │
│  ├─ Back Button (detail views)      │
│  └─ Tabs + Actions (normal views)   │
├─────────────────────────────────────┤
│  Optional Notification Area         │
├─────────────────────────────────────┤
│                                     │
│  Dynamic View Content               │
│  ├─ Empty View                      │
│  ├─ Getting Started View            │
│  ├─ Detail Views (L2)               │
│  └─ Custom Views                    │
│                                     │
│  (scrolls independently)            │
│                                     │
└─────────────────────────────────────┘
```

### Key Benefits

✅ **View Registration** - Centralized view management with automatic switching  
✅ **ViewContext** - Automatic navigation context for ribbons  
✅ **Detail View Support** - Automatic back navigation for L2 pages  
✅ **Fixed Navigation** - Ribbon stays visible during scroll  
✅ **Full Height** - Properly fills the iframe container  
✅ **Independent Scrolling** - Content scrolls without affecting ribbon  
✅ **Fabric Compliant** - Follows Microsoft Fabric design guidelines  

For complete documentation and examples, see the individual component files listed above.