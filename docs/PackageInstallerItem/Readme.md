# Package Installer Item

A comprehensive solution for deploying and managing packages of Fabric items across workspaces.

![Package Installer Item Demo](./media/PackageInstallerItem.gif)

## Purpose

The Package Installer Item enables organizations to package, distribute, and deploy collections of Microsoft Fabric items (notebooks, reports, datasets, etc.) across different workspaces and environments. It streamlines the deployment process by providing automated package creation, flexible deployment strategies, and comprehensive monitoring capabilities.

**Primary Use Cases:**
- **Environment Promotion**: Deploy solutions from development to testing to production
- **Solution Distribution**: Share complete analytics solutions across teams and organizations  
- **Bulk Deployment**: Install multiple related items simultaneously with dependencies
- **Template Distribution**: Deploy reusable templates and starter kits

## Overview

The Package Installer Item provides a unified interface for package selection, deployment configuration, and deployment monitoring. It supports multiple deployment strategies and flexible content handling for both text and binary files.

## 📚 Documentation

- **[Architecture Overview](./Architecture.md)** - Complete system architecture and component breakdown
- **[Package Creation Flow](./Package-creation-flow.md)** - Detailed package creation process and implementation
- **[Deployment Flow](./Deployment-flow.md)** - Deployment strategies and execution flows
- **[Package Strategy Documentation](./Package.md)** - Technical details on package creation

## 🔌 Fabric APIs & Permissions

### Required Fabric API Scopes
- **`https://api.fabric.microsoft.com/Item.ReadWrite.All`** - Create, read, update, and delete Fabric items
- **`https://api.fabric.microsoft.com/Workspace.ReadWrite.All`** - Create and manage workspaces and folders
- **`https://api.fabric.microsoft.com/Capacity.Read.All`** - Read capacity information for workspace assignment
- **`https://api.onelake.dfs.fabric.microsoft.com/.default`** - OneLake storage operations for package assets

### Fabric Platform APIs Used
- **Items API** (`/v1/workspaces/{workspaceId}/items`)
  - Create items with specific types (notebooks, reports, datasets, etc.)
  - Update item definitions and content
  - Retrieve item metadata and definition parts
- **Workspaces API** (`/v1/workspaces`)
  - Create new workspaces with capacity assignment
  - List and filter workspaces (F-SKU compatible)
  - Manage workspace folders and organization
- **OneLake Storage API** (`/v1/workspaces/{workspaceId}/items/{itemId}/`)
  - Upload package assets and data files
  - Download item definition parts and content
  - Manage file hierarchies and folder structures
- **Spark Livy API** (`/v1/workspaces/{workspaceId}/spark/batches`)
  - Submit deployment jobs for large package installations
  - Monitor job status and retrieve execution logs
  - Handle batch processing for scalable deployments

### Authentication Requirements
- **Azure AD Application Registration** with delegated permissions
- **Fabric Admin Consent** for workspace creation capabilities
- **User Authentication** via Microsoft Authentication Library (MSAL)
- **Tenant Configuration** for 3rd party item type support (if applicable)

## Quick Start

For technical details on package creation and structure, see the [Package Creation Strategy Documentation](./Package.md).

## Supported Item Types

The PackageInstallerItem supports all standard Fabric platform items. See the [full list of Fabric platform items supported and definition parts](https://learn.microsoft.com/rest/api/fabric/core/items/create-item?tabs=HTTP).

**Important Note**: 3rd party items are also supported but require enablement in the tenant or workspace where the items are created.

## Key Features

- **Multi-Strategy Deployment**: UX, Spark Livy, and Spark Notebook deployment options
- **Flexible Package Definition**: Support for Asset, Link, and Inline Base64 payload types
- **Workspace Management**: Create new workspaces or deploy to existing ones
- **Real-time Monitoring**: Track deployment progress and status
- **Item Availability Checking**: Validate items before deployment
- **Binary File Support**: Automatic handling of text and binary content
- **Package Creation**: Automated package creation from selected Fabric items (see [Package Creation Strategy](./package/README.md))

## Architecture

```text
PackageInstallerItem/
├── components/          # UI Components and Helpers
├── deployment/          # Deployment Strategies and Models  
├── package/            # Package Management and Registry
├── PackageInstallerItemEditor.tsx        # Main Editor UI
├── PackageInstallerItemModel.ts          # Type Definitions
├── DeploymentDetailView.tsx              # Deployment Details UI
└── PackageSelectionView.tsx              # Package Selection UI
```

## Deployment Strategies

### UX Deployment Strategy
Direct deployment using Fabric Platform APIs for immediate item creation.

- Real-time workspace and folder creation
- Direct item creation and definition updates
- Item availability validation
- Best for: Interactive deployments, small to medium packages

### Spark Livy Deployment Strategy
Background deployment using Spark batch jobs for scalable processing.

- Asynchronous processing
- Large package support
- Job status monitoring
- Best for: Large packages, automated pipelines

### Spark Notebook Deployment Strategy
Deployment through Spark notebook execution with custom logic.

- Custom deployment scripts
- Advanced deployment logic
- Integration with Spark ecosystem
- Best for: Complex scenarios, custom processing

## Package Creation

For detailed information about creating packages, including JSON structure, supported item types, and asset organization, see the [Package Creation Strategy Documentation](./Package.md).

Quick overview:

- **Packages** are defined in JSON format with metadata and deployment configuration
- **Items** include notebooks, reports, datasets, and more Fabric platform items
- **Assets** are organized in structured folders with definition files and data subfolders
- **Registration** is managed through the PackageRegistry system

## Payload Types

### Asset Payload

Local files from the workload assets:

```typescript
{
  payloadType: "Asset",
  payload: "/assets/notebooks/sample.ipynb",
  path: "notebook-content.json"
}
```

### Link Payload

External URLs with CORS handling:

```typescript
{
  payloadType: "Link", 
  payload: "https://example.com/file.json",
  path: "configuration.json"
}
```

### Inline Base64 Payload

Direct embedded content:

```typescript
{
  payloadType: "InlineBase64",
  payload: "ewogICJjZWxscyI6IFtdCn0=",
  path: "notebook-content.json"
}
```

## UI Components

### Main Editor

- Package selection and configuration
- Deployment history management
- Real-time monitoring

### Component Library

- `WorkspaceDropdown`: Workspace selection with F-SKU filtering
- `CapacityDropdown`: Capacity selection for Fabric
- `DeploymentDialog`: Deployment configuration interface
- `DeploymentDetailView`: Detailed deployment status
- `UIHelper`: Icon mapping and navigation utilities

## Content Handling

The system automatically handles both text and binary files using a unified approach:

```typescript
protected async getAssetContentAsBase64(path: string): Promise<string> {
  const response = await fetch(path);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binaryString);
}
```

**Supported File Types**: JSON, notebooks, images, PDFs, Excel files, and more.

## Deployment Workflow

1. **Package Selection**: Choose from available packages
2. **Configuration**: Set workspace, folder, and deployment options
3. **Validation**: Check item compatibility and workspace access
4. **Execution**: Deploy using selected strategy
5. **Monitoring**: Track progress and view results

## Error Handling

- Automatic binary/text file detection
- CORS error handling for external links
- Graceful fallbacks for network issues
- Detailed error logging and user feedback

## Integration

### Fabric Platform APIs

- Workspace and folder management
- Item creation and updates
- Capacity assignment

### Spark Integration

- Livy sessions for interactive processing
- Batch jobs for background deployment
- Notebook execution for custom logic

## Troubleshooting

### Common Issues

**CORS Errors**: Use asset files instead of external links when possible

**Binary File Errors**: The system automatically handles binary content encoding

**Permission Issues**: Verify user permissions and capacity assignments

**Format Errors**: Validate JSON structure and required fields

## Extension Points

### Custom Deployment Strategies

Implement the `DeploymentStrategy` abstract class for custom deployment logic.

### Custom UI Components

Extend the component library for specialized use cases.

### Package Sources

Extend `PackageRegistry` to support external repositories and version management.

## Recent Improvements

### Documentation Updates ✅

- Comprehensive documentation added for all deployment strategies
- Added detailed class and method documentation
- Fixed documentation typos and inconsistencies
- Updated API documentation with usage examples

### Code Quality Fixes ✅

- Fixed typo in `DeployedItem.itemDefinitionName` interface property
- Improved error handling in deployment strategies
- Enhanced type safety across deployment components
- Updated method signatures for better clarity

### OneLake Storage Client Fixes ✅

- Fixed `readFileAsBase64` method to properly handle binary content
- Corrected URL formatting for OneLake DFS API calls
- Improved binary data encoding and decoding processes
- Enhanced error handling for OneLake operations
