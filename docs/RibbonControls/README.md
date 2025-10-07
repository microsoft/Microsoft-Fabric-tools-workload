# Ribbon Controls Documentation

Complete documentation for the Ribbon Controls system in the Microsoft Fabric Extensibility Toolkit.

## 📚 Documentation Structure

### [Overview](./Overview.md)
Complete usage guide covering all aspects of the Ribbon Controls:
- Key components (BaseRibbon, BaseRibbonToolbar, RibbonButton, StandardRibbonActions, StandardRibbonTabs)
- Design principles (Consistency, Accessibility, Fabric Guidelines, Extensibility)
- Quick start examples
- Standard actions reference
- Creating custom actions
- Tab configuration patterns
- Common patterns and troubleshooting

### [Architecture](./Architecture.md)
Technical architecture and design documentation:
- Component hierarchy and structure
- Data flow diagrams
- File dependencies
- Props flow patterns
- Styling cascade
- Type definitions
- Tab requirements (mandatory Home tab)

### [Implementation](./Implementation.md)
Step-by-step implementation guide:
- Implementation comparison (before/after)
- Benefits and metrics
- Type definitions
- Complete implementation examples
- Key features and patterns

### [Quick Reference](./QuickReference.md)
Fast lookup guide for common tasks:
- Import statements
- Basic ribbon pattern
- Standard tab factories
- Standard action factories
- Custom action template
- Common patterns (conditional actions, action groups, tabs)
- Icon reference
- Best practices (Do's and Don'ts)

## 🚀 Quick Start

For a quick start, see the **[Quick Reference](./QuickReference.md)** guide.

For complete understanding, read the **[Overview](./Overview.md)** first, then dive into specific topics as needed.

## 📋 Key Concepts

### Mandatory Home Tab
All ribbons MUST include a Home tab as the first tab. Use `createRibbonTabs()` to ensure compliance automatically.

### Standard Actions
Only three core actions are provided as standard:
- **Save** - Universal save functionality
- **Settings** - Configuration access
- **About** - Help/information

All other actions should be implemented as custom actions specific to your item editor.

### Example Implementation
See `Workload/app/items/HelloWorldItem/HelloWorldItemRibbon.tsx` for a complete reference implementation demonstrating:
- Mandatory Home tab using `createRibbonTabs()`
- Standard actions using factory functions
- Custom actions with inline definitions
- Conditional visibility patterns

## 🔗 Related Files

- **Components**: `Workload/app/controls/Ribbon/`
  - `BaseRibbon.tsx` - Main ribbon container
  - `BaseRibbonToolbar.tsx` - Toolbar component
  - `RibbonButton.tsx` - Button component
  - `StandardRibbonActions.tsx` - Action factories
  - `StandardRibbonTabs.tsx` - Tab factories
  - `index.ts` - Public exports

- **Example Implementation**: `Workload/app/items/HelloWorldItem/HelloWorldItemRibbon.tsx`

## 📞 Support

For questions or issues, refer to the main project documentation or consult the Fabric Extensibility team.
