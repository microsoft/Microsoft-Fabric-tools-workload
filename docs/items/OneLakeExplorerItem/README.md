# OneLake Explorer Item

The OneLake Explorer Item provides a comprehensive interface for browsing, viewing, and editing OneLake data and files within Microsoft Fabric. It combines file management capabilities with table structure visualization for Delta Lake tables.

## Overview

The OneLake Explorer Item enables users to:

- **Browse OneLake items** with an integrated tree view
- **Edit files** using Monaco editor with syntax highlighting
- **View Delta Lake tables** with detailed file structure information
- **Manage files** with create, upload, and open operations
- **Switch contexts** dynamically between file and table views

For technical architecture details, see [Architecture.md](./Architecture.md).

## Key Features

### File Management

- **Monaco Editor Integration**: Full-featured code editing with syntax highlighting
- **Multiple File Support**: Tabbed interface for editing multiple files simultaneously
- **File Operations**: Create new files, upload existing files, and open items
- **Format Support**: JSON, Python, SQL, and other common file formats

### Table Visualization

- **Delta Lake Support**: Specialized view for Delta Lake table structures
- **File Categorization**: Organized display of parquet files, JSON logs, and checkpoints
- **Metadata Display**: File sizes, modification dates, and storage information
- **Pagination**: Efficient handling of large file lists
- **Filtering**: File type filters for focused browsing

### Navigation Integration

- **OneLake View Component**: Integrated tree view for item selection
- **Dynamic View Switching**: Seamless switching between file and table contexts
- **Persistent State**: View mode and selections persist across sessions
- **Workspace Integration**: Full workspace and capacity management support

## Architecture

### Component Structure

```text
OneLakeExplorerItem/
├── OneLakeExplorerItemDefaultView.tsx    # Main orchestrator component
├── FileEditorView.tsx                    # File editing interface
├── TableEditorView.tsx                   # Table structure visualization
├── OneLakeExplorerItemModel.ts           # Data models and interfaces
├── OneLakeExplorerItemEditor.tsx         # Item editor wrapper
├── OneLakeExplorerItemEmptyView.tsx      # Empty state component
├── OneLakeExplorerItemRibbon.tsx         # Fabric ribbon integration
└── OneLakeExplorerItem.scss              # Centralized styling
```

### View Mode System

The application operates in two primary modes:

**File Mode (`'file'`)**
- Activated when users select files in the OneLake tree
- Displays the Monaco editor with file content
- Supports multiple open files with tabbed interface
- Provides file creation and upload functionality

**Table Mode (`'table'`)**
- Activated when users select Delta Lake tables
- Shows table structure with detailed file listings
- Displays metadata including file sizes and modification dates
- Provides filtering and pagination for large datasets

### Data Flow

```text
User Selection → OneLakeView → Mode Detection → View Component
     ↓
File Selection → FileEditorView → Monaco Editor → File Operations
     ↓
Table Selection → TableEditorView → Delta Files → Metadata Display
```

## Component Details

### OneLakeExplorerItemDefaultView

The main orchestrator component that:
- Manages view mode switching logic
- Coordinates between file and table views
- Integrates with the OneLakeView tree component
- Handles item state persistence

```tsx
<OneLakeExplorerItemDefaultView
  item={item}
  workloadClient={workloadClient}
  explorerInitialItem={explorerConfig}
  onFileExplorerSelection={handleFileSelection}
  onTableExplorerSelection={handleTableSelection}
  // ... other props
/>
```

### FileEditorView

Handles file editing functionality with:
- **Monaco Editor**: Full-featured code editor with language support
- **File Tabs**: Multiple file management with tab interface
- **File Operations**: Create, upload, and open file actions
- **Empty State**: Guidance when no files are open
- **Auto-save**: Automatic saving of file changes

### TableEditorView

Provides Delta Lake table visualization with:
- **File Categorization**: Parquet files, JSON logs, and checkpoints
- **Metadata Display**: File sizes, modification dates, and paths
- **Filtering**: File type filters for focused viewing
- **Pagination**: Efficient display of large file lists
- **Storage Info**: OneLake storage metadata and statistics

## Data Models

### OneLakeExplorerItemDefinition

```typescript
interface OneLakeExplorerItemDefinition {
  selectedTable?: {
    tableName: string;
    oneLakeLink: string;
  };
  viewMode?: 'file' | 'table';
  openFiles?: OneLakeFileReference[];
  // ... other properties
}
```

### OneLakeFileReference

```typescript
interface OneLakeFileReference {
  name: string;
  oneLakeLink: string;
  content?: string;
  isDirty?: boolean;
  language?: string;
}
```

## Styling Architecture

All component styles are centralized in `OneLakeExplorerItem.scss` with:

### Design System Integration
- **Fabric Tokens**: Uses Microsoft Fabric design tokens
- **Theme Support**: Automatic dark/light theme adaptation
- **Responsive Design**: Mobile and desktop optimized layouts
- **Accessibility**: Screen reader friendly with proper ARIA labels

### Key Style Classes

```scss
.table-editor-view          // Main table editor container
.file-editor-view           // Main file editor container  
.storage-info               // Storage metadata display
.file-type-filters          // File type filter buttons
.delta-files-section        // Delta files listing area
.file-tabs-section          // File tabs container
.monaco-editor-container    // Monaco editor wrapper
.file-operations            // File action buttons
```

### Visual Features
- **File Type Icons**: Color-coded icons for different file formats
- **Status Indicators**: Visual feedback for loading, dirty state, etc.
- **Professional Layout**: Clean, organized interface design
- **Hover States**: Interactive feedback for all actionable elements

## Usage Examples

### Basic File Editing

```typescript
// File selection triggers automatic mode switching
const handleFileSelection = async (fileName: string, oneLakeLink: string) => {
  // Switch to file mode and load content
  setViewMode('file');
  await loadFileContent(oneLakeLink);
};
```

### Table Exploration

```typescript
// Table selection shows Delta Lake structure
const handleTableSelection = async (tableName: string, oneLakeLink: string) => {
  // Switch to table mode and load metadata
  setViewMode('table');
  await loadTableMetadata(oneLakeLink);
};
```

### Custom Integration

For developers wanting to integrate OneLake Explorer functionality into custom items, see the [PackageInstallerItem Integration Guide](../PackageInstallerItem/DeveloperIntegration.md) for patterns and best practices.

## Error Handling

The component includes comprehensive error handling for:

- **Network Issues**: Graceful handling of OneLake connectivity problems
- **Permission Errors**: Clear messaging for access denied scenarios  
- **File Format Issues**: Appropriate fallbacks for unsupported file types
- **Loading States**: Progress indicators during data fetching operations

## Performance Considerations

### Optimization Strategies
- **Lazy Loading**: Components and data loaded on-demand
- **Virtual Scrolling**: Efficient rendering of large file lists
- **Debounced Updates**: Optimized editor change handling
- **Memory Management**: Proper cleanup of editor instances and file content

### Caching
- **Metadata Caching**: Table and file metadata cached locally
- **Content Caching**: Recently accessed files cached for quick access
- **Tree State**: OneLake tree expansion state preserved

## Integration Points

### Fabric Platform
- **Authentication**: Integrated with Fabric authentication system
- **Permissions**: Respects workspace and item-level permissions
- **Navigation**: Deep linking support for direct file/table access

### OneLake Storage
- **Direct Access**: Native OneLake API integration
- **File Operations**: Create, read, update, delete operations
- **Metadata**: Rich metadata support for files and tables

## Future Enhancements

- **Collaborative Editing**: Real-time collaborative file editing
- **Advanced Search**: Full-text search across files and metadata
- **Version History**: File versioning and change tracking
- **Custom Viewers**: Pluggable viewers for specialized file formats
- **Bulk Operations**: Multi-file operations and batch processing