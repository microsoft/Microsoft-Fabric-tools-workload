# Fabric CLI Item Architecture

This document describes the architecture and design patterns of the Fabric CLI Item.

## Overview

The Fabric CLI Item provides an interactive terminal interface for executing commands through Spark Livy sessions. It supports multiple execution modes with automatic session management and command history.

## Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Fabric CLI Item                             │
├─────────────────────────────────────────────────────────────────┤
│                        UI Layer                                │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ DefaultView     │ EmptyView       │ Ribbon Controls            │
│ - Terminal UI   │ - Getting       │ - Session Control          │
│ - Command Input │   Started       │ - Mode Selection           │
│ - History       │ - Instructions  │ - Config Dropdowns         │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                   Business Logic Layer                         │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Editor          │ SparkLivy       │ State Management           │
│ Orchestrator    │ Client          │ - Session State            │
│ - Config Mgmt   │ - Session Mgmt  │ - Command History          │
│ - Event Coord   │ - Command Exec  │ - Terminal Entries         │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                     Data Layer                                 │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Spark Livy APIs │ Item Definition │ Session Storage            │
│ - Session CRUD  │ - Lakehouse     │ - Session ID               │
│ - Statement Exec│ - Environment   │ - Validation               │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Core Components

### FabricCLIItemDefaultView
- Terminal interface with command input/output
- Command history with arrow key navigation
- Multi-line output formatting
- Integration with SparkLivyFabricCLIClient

### FabricCLIItemEditor
- Main orchestrator for item lifecycle
- Session state and configuration management
- Lakehouse and environment selection
- View coordination

### FabricCLIItemRibbon
- Session controls (Start/Stop)
- Lakehouse and environment selection
- Execution mode dropdown
- Terminal actions

### SparkLivyFabricCLIClient
- Spark Livy session management
- Command execution with mode-specific wrapping
- Session validation and reuse
- Result parsing

## Design Patterns

### Execution Mode Pattern

Three distinct execution modes:

```typescript
enum ExecutionMode {
  NATIVE = 'NATIVE',          // Direct Python code
  SUBPROCESS = 'SUBPROCESS',  // Shell commands via subprocess
  FAB_CLI = 'FAB_CLI'        // Fabric CLI with "fab" prefix
}
```

**Mode-Specific Wrapping**:
- **NATIVE**: Execute Python code directly in Spark session
- **SUBPROCESS/FAB_CLI**: Wrap in `subprocess.run(command, shell=True, ...)` with JSON output

### Session Reuse Pattern

Automatically validates and reuses existing sessions:

```typescript
async reuseOrCreateSession(config, existingSessionId, onProgress) {
  if (existingSessionId && await validateSession(...)) {
    return existingSession; // Reuse
  }
  return await initializeSession(config, onProgress); // Create new
}
```

**Validation Criteria**: `schedulerState === 'Scheduled'` AND `livyState === 'idle'`

### State Management

```typescript
interface FabricCLIItemDefinition {
  selectedLakehouse?: ItemReference;      // Persisted
  lastSparkSessionId?: string;            // Persisted for reuse
  selectedSparkEnvironment?: ItemReference; // Persisted
}
```

Runtime state (execution mode, history, entries) stored in component state only.

## Data Flow

### Session Initialization

```text
User Clicks Start → Validate Existing Session → Reuse OR Create New
     ↓
Poll Session State → Wait for 'Scheduled' + 'idle' → Session Ready
```

### Command Execution

```text
User Enters Command → Add to History → Mode-Specific Wrapper
     ↓
Execute via Livy Statement API → Parse Result → Display in Terminal
```

### Session Clearing

Session ID automatically cleared when:
- User changes lakehouse
- User stops session
- Session validation fails

## Integration Points

### Spark Livy

- **Session API**: Create, list, and cancel Spark sessions
- **Statement API**: Execute commands and retrieve results
- **Configuration**: Lakehouse and environment binding

### Fabric Platform

- **Authentication**: Service Principal (required)
- **Item Management**: Auto-save configuration changes
- **Resource Discovery**: Lakehouse and environment listing

### OneLake

- Commands execute in lakehouse context
- Full access to lakehouse files and tables through Spark

## Error Handling

- **Session Errors**: Clear messaging with retry options
- **Command Errors**: Display in terminal with full error output
- **Validation Errors**: Auto-recovery with session recreation
- **CLI Availability**: Setup instructions if CLI not found

## Performance Considerations

### Optimization Strategies
- Session reuse to avoid creation overhead
- 2-second polling intervals with 5-minute timeout
- In-memory command history with efficient navigation
- Debounced input and batched state updates

### Memory Management
- Terminal entry limits for large outputs
- Proper session cleanup on component unmount
- Efficient result parsing

## Security

- **Service Principal Only**: User authentication not yet supported
- **Subprocess Isolation**: Commands execute in Spark context
- **OneLake Permissions**: Enforced at platform level
- **Input Sanitization**: Command escaping for shell execution
