# OneLake Explorer Components

This folder contains the components for the OneLake Explorer item that allows users to browse and interact with OneLake data and files.

## Components

### FileEditorView
- **Previously**: `OneLakeExplorerItemFileEditorComponent`
- **Purpose**: Handles file editing functionality with Monaco editor
- **Features**:
  - File tabs for multiple open files
  - Code editing with syntax highlighting
  - File operations (create, upload, open)
  - Empty state when no files are open
- **Styling**: Uses CSS classes from `OneLakeExplorerItem.scss`

### TableEditorView
- **Purpose**: Handles Delta Lake table structure visualization and file management
- **Features**:
  - Delta files listing (parquet, JSON logs, checkpoints)
  - File type filtering and categorization  
  - File size and modification date information
  - Pagination for large file lists
  - OneLake storage metadata
  - Loading states and error handling
  - Empty state when no table is selected
- **Styling**: Uses CSS classes from `OneLakeExplorerItem.scss`

### OneLakeExplorerItemDefaultView
- **Purpose**: Main layout component that orchestrates the file and table views
- **Features**:
  - Conditional rendering based on view mode ('file' | 'table')
  - Integrates with OneLakeView for navigation
  - Switches views based on user selection (file vs table)

## View Mode Switching

The component automatically switches between file and table views based on user interaction:

1. **File Selection**: When a user selects a file in the OneLake explorer, the view switches to `'file'` mode and displays the `FileEditorView`
2. **Table Selection**: When a user selects a table in the OneLake explorer, the view switches to `'table'` mode and displays the `TableEditorView`

## Data Model Updates

The `OneLakeExplorerItemDefinition` interface has been extended with:
- `selectedTable?: { tableName: string; oneLakeLink: string }` - Stores the currently selected table information
- `viewMode?: 'file' | 'table'` - Controls which view is currently active

## Usage

```tsx
// The main editor automatically handles view switching
<OneLakeExplorerItemDefaultView
  // ... other props
  onFileExplorerSelection={handleFileSelection} // Switches to file view
  onTableExplorerSelection={handleTableSelection} // Switches to table view
/>
```

The view mode is stored in the item definition and persists across sessions.

## Styling

All component styles are centralized in `OneLakeExplorerItem.scss` to maintain consistency and make styling easier to manage. Key style features include:

- **Theme Support**: Styles adapt to dark and light themes
- **Responsive Design**: Components work well at different sizes
- **File Type Icons**: Color-coded icons for different file types (parquet, JSON, logs, checkpoints)
- **Professional Layout**: Clean, organized layouts for both file and table views
- **CSS Classes**: All components use semantic CSS classes instead of inline styles

### Style Classes:
- `.table-editor-view` - Main table editor container
- `.file-editor-view` - Main file editor container
- `.storage-info` - Storage metadata display
- `.file-type-filters` - File type filter buttons
- `.delta-files-section` - Delta files listing area
- `.file-tabs-section` - File tabs container