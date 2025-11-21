# Controls Documentation

This directory contains documentation for all reusable controls in the Microsoft Fabric Extensibility Toolkit. These controls are designed to accelerate workload development while maintaining consistency with Fabric Design System guidelines.

## 🏗️ Control Architecture

Controls are organized in a layered architecture:

- **Foundation**: ItemEditor provides the base structure for all item editors
- **Specialized**: Purpose-built controls for specific workflows (OneLakeView, Wizard)
- **Extensible**: All controls can be customized while maintaining UX compliance

## 📋 Available Controls

### Core Controls (Required)

#### [ItemEditor Control](./ItemEditor.md)
**Purpose**: Foundational control system for building item editors  
**Status**: **MANDATORY** for all item editors  
**Features**: View registration, ribbon integration, consistent layouts (multi-panel, empty state, detail views)  
**Documentation**: [ItemEditor/](./ItemEditor/) - Comprehensive documentation with examples and implementation guides

### Workflow Controls (Optional)

#### [Wizard Control](./Wizard.md)
**Purpose**: Step-by-step guided workflow control  
**Use Cases**: Complex multi-step processes, setup wizards, configuration workflows  
**Features**: Automatic navigation, validation, context sharing between steps

### Data Controls (Optional)

#### [OneLakeView Control](./OneLakeView.md)
**Purpose**: OneLake item browsing and selection  
**Use Cases**: File/folder exploration, data source selection, OneLake integration  
**Features**: Tree navigation, file/table selection, item management

## 🎯 Control Selection Guide

### For Item Editors
- **Always use**: [ItemEditor](./ItemEditor.md) as the foundation
- **Add as needed**: Other controls based on functionality requirements

### For Complex Workflows
- **Multi-step processes**: [Wizard](./Wizard.md) for guided experiences
- **OneLake integration**: [OneLakeView](./OneLakeView.md) for data exploration

### For Custom Requirements
- **Build on foundation**: Extend ItemEditor for custom layouts
- **Follow patterns**: Reference existing control implementations
- **Maintain compliance**: Use Fabric Design System guidelines

## 🚀 Quick Start

### Basic Item Editor
```typescript
import { ItemEditor } from '../../controls/ItemEditor';

// Minimal setup - see ItemEditor docs for full examples
```

### Adding OneLake Integration
```typescript
import { OneLakeView } from '../../controls/OneLakeView';

// OneLake browsing - see OneLakeView docs for configuration
```

### Multi-Step Workflows
```typescript
import { WizardControl } from '../../controls/Wizard';

// Step-by-step processes - see Wizard docs for step configuration
```

## 📚 Documentation Structure

- **[ItemEditor/](./ItemEditor/)** - Complete documentation for the core control system
- **[OneLakeView.md](./OneLakeView.md)** - OneLake integration patterns
- **[Wizard.md](./Wizard.md)** - Workflow and wizard patterns

## 🔧 Implementation Guidelines

### Code Location
- **Import from**: `Workload/app/controls/[ControlName]`
- **Documentation**: `docs/controls/[ControlName].md` or `docs/controls/[ControlName]/`

### Best Practices
- **Use controls, don't copy**: Import from controls directory, never copy sample code
- **Follow patterns**: Reference documentation examples for proper usage
- **Maintain consistency**: Use provided controls for standard functionality
- **Extend thoughtfully**: Build custom controls following established patterns

## 🎨 Design Compliance

All controls follow Microsoft Fabric Design System guidelines:
- **Consistent theming** with Fabric design tokens
- **Accessible** with proper ARIA labels and keyboard navigation
- **Responsive** design for various screen sizes
- **High contrast** support for accessibility

---

For detailed implementation guides and examples, see the individual control documentation linked above.