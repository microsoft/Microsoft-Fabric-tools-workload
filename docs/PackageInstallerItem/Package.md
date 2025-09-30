# Package Creation Strategy

This document provides technical details about the BasePackageStrategy class and the automated package creation process. For general information about the PackageInstallerItem, see the [main README](../README.md).

## Technical Overview

The `BasePackageStrategy` class handles the creation of package JSON files from selected Fabric items. It downloads all definition parts (except default/empty ones) and stores them in a structured folder hierarchy in OneLake.

## Supported Item Types

The PackageInstallerItem supports all standard Fabric platform items. See the [full list of Fabric platform items supported and definition parts](https://learn.microsoft.com/en-us/rest/api/fabric/core/items/create-item?tabs=HTTP).

**Important Note**: 3rd party items are also supported but require enablement in the tenant or workspace where the items are created.

Common Fabric item types you can include:
- `notebook`: Jupyter notebooks  
- `report`: Power BI reports
- `semanticmodel`: Semantic models/datasets
- `lakehouse`: Lakehouse items
- `warehouse`: Data warehouse items
- `kqldatabase`: KQL databases
- `datapipeline`: Data pipelines
- `dataflow`: Dataflow Gen2
- `mlmodel`: Machine learning models
- `environment`: Spark environments

## Package Structure

When a package is created, the following folder structure is generated in OneLake. The package folder should have a folder for every item with definition files in the root folder of the item and the data has a subfolder:

```text
Assets/
└── packages/
    └── {packageId}/
        ├── package.json                 # Main package configuration
        ├── package-icon.png             # Optional package icon
        └── {item-name}/                 # Folder per item
            ├── definition-part-0.json   # Definition parts in root of item folder
            ├── content.ipynb
            ├── ...other-definition-files
            └── data/                    # OneLake data files subfolder
                ├── sample-data.csv
                ├── lookup-tables/
                └── ...other-data-files
```

## Package JSON Structure

The generated package.json follows this structure and is validated against the [JSON Schema](./package.schema.json):

```json
{
  "id": "custom-package-2025-07-31T10-30-00",
  "displayName": "Custom Package 7/31/2025",
  "description": "Package created from 3 selected items",
  "items": [
    {
      "type": "Notebook",
      "displayName": "My Notebook",
      "description": "Packaged Notebook",
      "definition": {
        "format": "ipynb",
        "parts": [
          {
            "payloadType": "AssetLink",
            "payload": "onelake://path/to/content.ipynb",
            "path": "/notebook/"
          }
        ],
        "creationMode": "WithDefinition"
      }
    }
  ],
  "deploymentConfig": {
    "suffixItemNames": true
  }
}
```

### JSON Schema Validation

The package.json files can be validated against the comprehensive [JSON Schema](./package.schema.json) which defines:

- **Required and optional properties** for all package components
- **Data types and constraints** for each field
- **Enumerated values** for deployment types, payload types, and other options
- **Nested object structures** for complex configurations
- **Pattern validation** for IDs and other formatted fields

#### Using the Schema

You can use the schema for:
- **IDE Integration**: Many editors support JSON Schema for auto-completion and validation
- **Build-time Validation**: Integrate schema validation into your build process
- **Documentation**: The schema serves as authoritative documentation for package structure

#### Schema Reference

To reference the schema in your package.json files, add:
```json
{
  "$schema": "./package.schema.json",
  "id": "your-package-id",
  ...
}
```

## Features

### 1. Automatic Item Processing
- Downloads all definition parts from Fabric items
- Excludes default/empty parts automatically
- Handles different payload types (Base64, JSON)

### 2. File Organization
- Creates sanitized folder names for each item
- Generates meaningful filenames for definition parts
- Maintains original path references for deployment

### 3. Package Management
- Generates unique package IDs with timestamps
- Adds packages to the PackageRegistry automatically
- Updates the PackageInstaller item definition

### 4. Validation
- Validates selected items before processing
- Checks for duplicate item names
- Provides detailed error messages

## Usage

```typescript
// Create a package strategy
const packageStrategy = PackageStrategyFactory.createStrategy(
  PackageStrategyType.Standard,
  context,
  editorItem
);

// Validate and create package
await packageStrategy.validateItemsForPackaging(selectedItems);
const packageJsonPath = await packageStrategy.createPackageFromItems(
  selectedItems,
  packageId,
  packageDisplayName,
  packageDescription
);
```

## File Naming Conventions

### Package ID
- Format: `custom-package-{timestamp}`
- Example: `custom-package-2025-07-31T10-30-00-123Z`

### Item Folders
- Sanitized item display names
- Invalid characters replaced with underscores
- Converted to lowercase

### Definition Files
- Extracted from original paths when possible
- Type-specific defaults (notebook-content.ipynb, dataset-definition.json)
- Fallback to indexed names (definition-part-0.json)

## Default Part Exclusion

The strategy automatically excludes:
- Empty payloads
- Parts with only whitespace
- Empty JSON objects (`{}`)
- Other default structures (expandable)

## Future Enhancements

The factory pattern allows for additional strategy types:
- **MinimalPackageStrategy**: Include only essential parts
- **AdvancedPackageStrategy**: Additional processing and optimization
- **TypeSpecificStrategy**: Specialized handling per item type

## Error Handling

The strategy provides comprehensive error handling:
- Item processing failures don't stop the entire operation
- Detailed error messages for debugging
- Graceful handling of API failures
- Rollback capabilities for partial failures
