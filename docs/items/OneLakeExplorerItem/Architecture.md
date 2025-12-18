# OneLake Explorer Item Architecture

This document describes the architecture and design patterns of the OneLake Explorer Item.

## Overview

The OneLake Explorer Item provides a dual-mode interface for exploring OneLake data, with specialized views for file editing and Delta Lake table visualization.

## Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    OneLake Explorer Item                       │
├─────────────────────────────────────────────────────────────────┤
│                        UI Layer                                │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ DefaultView     │ FileEditorView  │ TableEditorView            │
│ - Mode Control  │ - Monaco Editor │ - Delta File Lists         │
│ - Tree Explorer │ - File Tabs     │ - Metadata Display         │
│ - Orchestration │ - File Ops      │ - Filtering                │
├─────────────────┼─────────────────┼─────────────────────────────┤
│                 │   Shared UI Components                       │
│                 │   - OneLakeView Tree                         │
│                 │   - Loading States                           │
│                 │   - Error Handling                           │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                   Business Logic Layer                         │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ File Management │ Table Analysis  │ State Management           │
│ - Content Load  │ - Delta Parsing │ - View Mode Control        │
│ - File CRUD     │ - Metadata Ext  │ - Session Persistence      │
│ - Editor State  │ - File Listing  │ - Selection Tracking       │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                     Data Layer                                 │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ OneLake APIs    │ File System     │ Item Definition            │
│ - File Access   │ - Path Mgmt     │ - Mode State               │
│ - Metadata      │ - Content Types │ - File References          │
│ - Storage Info  │ - Encoding      │ - Table Selection          │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Core Components

### View Orchestration

**OneLakeExplorerItemDefaultView**
- Main orchestrator for the entire item interface
- Manages view mode switching between file and table modes
- Coordinates communication between OneLakeView tree and content views
- Handles item state persistence and session management

### Content Views

**FileEditorView**
- Monaco editor integration for code editing
- Multi-file tab management
- File operations (create, upload, open)
- Language detection and syntax highlighting

**TableEditorView**
- Delta Lake table structure visualization
- File categorization (parquet, logs, checkpoints)
- Metadata display and pagination
- File type filtering

### Navigation Component

**OneLakeView Integration**
- Tree-based item and file browsing
- Selection callbacks for mode switching
- Workspace and item context management
- Real-time data updates

## Design Patterns

### Mode-Based State Management

```typescript
interface OneLakeExplorerItemDefinition {
  viewMode?: 'file' | 'table';
  selectedTable?: TableSelection;
  openFiles?: FileReference[];
}
```

The item uses a mode-based pattern where:
- User selections automatically determine the appropriate view mode
- State persists across sessions for continuity
- Each mode has specialized UI and data handling

### Component Communication

```text
OneLakeView Selection → Mode Detection → View Component Update
     ↓
State Persistence → Item Definition Update → Session Storage
```

### Error Boundaries

Each major component implements error boundaries for:
- Network connectivity issues
- Permission and authentication errors
- File format and parsing errors
- OneLake service availability

## Data Flow

### File Selection Flow

```text
User Clicks File → OneLakeView Callback → FileEditorView Activation
     ↓
File Content Load → Monaco Editor Population → Edit State Tracking
```

### Table Selection Flow

```text
User Clicks Table → OneLakeView Callback → TableEditorView Activation
     ↓
Delta Metadata Load → File List Population → Filtering Interface
```

### Persistence Flow

```text
View State Change → Definition Update → Item Save → Session Persistence
```

## Performance Considerations

### Optimization Strategies

- **Lazy Component Loading**: Views loaded only when needed
- **Content Virtualization**: Large file lists use virtual scrolling
- **Debounced Editor Updates**: File changes batched for efficiency
- **Metadata Caching**: Table and file metadata cached locally

### Memory Management

- **Editor Cleanup**: Monaco instances properly disposed
- **File Buffer Management**: Large files streamed rather than loaded entirely
- **Component Unmounting**: Proper cleanup of event listeners and subscriptions

## Integration Points

### Fabric Platform Integration

- **Authentication**: Uses Fabric authentication context
- **Navigation**: Deep linking support for direct file/table access
- **Permissions**: Respects workspace and item-level security

### OneLake Integration

- **File Operations**: Direct OneLake API integration for file CRUD
- **Metadata Access**: Rich metadata extraction from OneLake storage
- **Path Resolution**: Proper OneLake path handling and validation

## Future Architecture Considerations

### Scalability

- **Plugin Architecture**: Support for custom file viewers
- **Service Worker Integration**: Offline capability for cached content
- **Streaming Support**: Large file streaming for improved performance

### Extensibility

- **Custom Editor Extensions**: Monaco language extensions
- **Table Renderer Plugins**: Custom renderers for specialized table types
- **Integration APIs**: External tool integration capabilities