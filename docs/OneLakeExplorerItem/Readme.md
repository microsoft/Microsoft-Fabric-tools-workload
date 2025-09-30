# OneLake Explorer Item

A powerful file editor and explorer for Microsoft Fabric OneLake storage, providing seamless integration with Excel tables and comprehensive file management capabilities.

![OneLake Explorer Item Demo](./docs/media/OneLakeExplorerItem.gif)

## Purpose

The OneLake Explorer Item serves as a comprehensive file management and editing solution within Microsoft Fabric, enabling users to work directly with files stored in OneLake without leaving the Fabric environment. It bridges the gap between data storage and development workflows by providing a familiar VS Code-like editing experience.

**Primary Use Cases:**
- **Code Development**: Edit notebooks, scripts, and configuration files directly in OneLake
- **Data Exploration**: Browse and analyze Excel tables and CSV files with built-in viewers
- **File Management**: Upload, download, and organize files within the Fabric ecosystem
- **Collaborative Editing**: Multi-user file editing with auto-save and version management

## Overview

The OneLake Explorer Item enables users to browse, edit, and manage files stored in Microsoft Fabric OneLake directly within the Fabric workspace. It provides a Monaco-based code editor with syntax highlighting, multi-file tabs, and deep integration with Excel table data.

## 📚 Documentation

- **[Architecture Overview](./docs/architecture.md)** - System architecture and component structure
- **[Excel Integration Guide](./docs/excel-integration.md)** - Working with Excel tables and OneLake data
- **[OneLake APIs](./docs/onelake-apis.md)** - OneLake storage integration and file operations
- **[User Guide](./docs/user-guide.md)** - Complete user documentation and workflows

## 🔌 Fabric APIs & Permissions

### Required Fabric API Scopes
- **`https://api.onelake.dfs.fabric.microsoft.com/.default`** - Primary scope for OneLake file operations
- **`https://api.fabric.microsoft.com/Item.Read.All`** - Read access to Fabric items (Lakehouses, etc.)
- **`https://api.fabric.microsoft.com/Workspace.Read.All`** - Browse workspaces and navigate item hierarchy

### Fabric Platform APIs Used
- **OneLake Data API** (`https://{tenant}.dfs.fabric.microsoft.com/`)
  - Read and write files in OneLake storage
  - Create, update, and delete file content
  - Navigate folder structures and file hierarchies
- **Items API** (`/v1/workspaces/{workspaceId}/items`)
  - Browse Lakehouse and workspace items
  - Access item metadata and properties
  - Navigate item relationships and dependencies
- **Excel Services API** (via OneLake)
  - Parse Excel file metadata and table schemas
  - Extract table data and column definitions
  - Handle Excel-specific file operations

### File Access Permissions
- **OneLake Read Access** - View and download files from storage
- **OneLake Write Access** - Create, modify, and save file changes
- **Item Browse Permission** - Navigate workspace item hierarchy
- **File System Access** - Local file upload/download operations (browser-based)

### Authentication Requirements
- **Azure AD Authentication** via Microsoft Authentication Library (MSAL)
- **Delegated Permissions** for user-context file access
- **Cross-Origin Resource Sharing (CORS)** configuration for web-based file operations
- **OneLake Storage Account Access** through Fabric workspace permissions

## Key Features

### File Management
- **Multi-file Editor**: Tabbed interface for editing multiple files simultaneously
- **OneLake Integration**: Direct access to files stored in Microsoft Fabric OneLake
- **File Upload/Download**: Seamless file transfer between local system and OneLake
- **Auto-save Functionality**: Automatic saving of changes with dirty state tracking

### Code Editor
- **Monaco Editor**: Full-featured VS Code editor experience
- **Syntax Highlighting**: Support for multiple programming languages and file types
- **Theme Support**: Light, dark, and high contrast themes
- **Customizable Settings**: Font size, word wrap, minimap, line numbers

### Excel Table Integration
- **Table Discovery**: Browse and explore Excel tables within OneLake items
- **Data Visualization**: Preview table data with formatting and structure
- **Schema Analysis**: Automatic detection of column types and relationships
- **Export Capabilities**: Convert table data to various formats

### Supported File Types

```typescript
const SUPPORTED_FILETYPES = [
  ".txt", ".js", ".ts", ".html", ".css", ".json", ".md", 
  ".py", ".cs", ".java", ".cpp", ".c", ".php", ".rb", 
  ".go", ".rs", ".xml", ".yml", ".yaml", ".sql", 
  ".csv", ".ipynb"
];
```

## Architecture

```text
OneLakeExplorerItem/
├── OneLakeExplorerItemEditor.tsx        # Main editor interface
├── OneLakeExplorerItemEditorRibbon.tsx  # Toolbar and actions
├── OneLakeExplorerItemEditorEmpty.tsx   # Empty state interface
├── OneLakeExplorerItemModel.ts          # Data models and interfaces
└── docs/                                # Documentation
    ├── architecture.md                  # System architecture
    ├── excel-integration.md             # Excel table integration
    ├── onelake-apis.md                  # OneLake API integration
    └── user-guide.md                    # User documentation
```

## Quick Start

### Opening Files
1. Navigate to an OneLake item (Lakehouse, etc.)
2. Browse the file explorer to locate your file
3. Click on a file to open it in the editor
4. Multiple files can be opened in separate tabs

### Editing Files
1. Files are automatically loaded with appropriate syntax highlighting
2. Make changes using the Monaco editor
3. Files are auto-saved with visual dirty state indicators
4. Use Ctrl+S to manually save changes

### Working with Excel Tables
1. Browse to a lakehouse or workspace containing Excel files
2. Navigate through the table explorer
3. Select tables to view schema and data preview
4. Export or analyze table data as needed

## Integration Points

### Fabric Platform
- **OneLake Storage**: Direct integration with Fabric data lake
- **Item Browser**: Seamless navigation through Fabric items
- **Workspace Context**: Full workspace integration and permissions

### External Components
- **Monaco Editor**: VS Code editor component for file editing
- **Fluent UI**: Microsoft design system for consistent UX
- **File System APIs**: Browser-based file operations

## Development

### Data Models

#### OneLakeExplorerItemDefinition
- File content and metadata management
- Editor settings and preferences
- Multi-file tab state
- Theme and UI customization

#### OneLakeFileReference
- OneLake path and file references
- Content caching and dirty state tracking
- Language detection and syntax highlighting
- File metadata and permissions

### Component Architecture
- **Editor**: Main editing interface with Monaco integration
- **Ribbon**: Toolbar with file operations and settings
- **Empty State**: Onboarding and file creation interface
- **File Explorer**: OneLake item and file browser

## Configuration

### Editor Settings
```typescript
interface EditorSettings {
  fontSize: number;        // Font size (12-24px)
  wordWrap: boolean;       // Enable word wrapping
  minimap: boolean;        // Show minimap sidebar
  lineNumbers: boolean;    // Display line numbers
}
```

### Theme Options
- **vs**: Light theme (default)
- **vs-dark**: Dark theme
- **hc-black**: High contrast theme

## Permissions and Security

### Required Permissions
- **OneLake Read**: Access to read files from OneLake storage
- **OneLake Write**: Permission to save changes to files
- **Item Access**: Read access to parent Fabric items (Lakehouses, etc.)

### Security Considerations
- All file operations respect Fabric workspace permissions
- Content is validated before saving to OneLake
- File type restrictions prevent execution of unsafe content
- Automatic sanitization of file paths and names