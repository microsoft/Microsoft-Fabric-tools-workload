# Cloud Shell Item Architecture

This document describes the architecture and design patterns of the Cloud Shell Item.

## Overview

The Cloud Shell Item provides an interactive terminal interface for executing commands through Spark Livy sessions, along with Python script management and parameterized batch execution. It supports multiple execution modes with automatic session management, command history, and reusable scripts.

## Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Cloud Shell Item                             │
├─────────────────────────────────────────────────────────────────┤
│                        UI Layer                                │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ DefaultView     │ ScriptViews     │ Ribbon Controls            │
│ - Terminal UI   │ - ScriptsList   │ - Session Control          │
│ - Command Input │ - DetailView    │ - Script Actions           │
│ - History       │ - Parameters    │ - Config Dropdowns         │
│ - Scripts Panel │ - Monaco Editor │ - Mode Selection           │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                   Business Logic Layer                         │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Editor          │ SparkLivy       │ State Management           │
│ Orchestrator    │ Client          │ - Session State            │
│ - Config Mgmt   │ - Session Mgmt  │ - Command History          │
│ - Script Mgmt   │ - Command Exec  │ - Terminal Entries         │
│ - Event Coord   │ - Batch Jobs    │ - Script Content Map       │
│                 │ - OneLake Upload│ - Script Parameters        │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                     Data Layer                                 │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Spark Livy APIs │ Item Definition │ OneLake Storage            │
│ - Session CRUD  │ - Lakehouse     │ - Script Files             │
│ - Statement Exec│ - Environment   │ - Session ID               │
│ - Batch Jobs    │ - Scripts       │ - Validation               │
│ - Batch Logs    │ - Parameters    │                            │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Core Components

### CloudShellItemDefaultView

- Terminal interface with command input/output
- Scripts panel with list and management
- Command history with arrow key navigation
- Multi-line output formatting
- Real-time session status indicators
- Integration with SparkLivycloudShellClient

### ScriptsList

- List of Python scripts with metadata
- Create/delete operations
- Script selection for detail view
- Persistent storage in item definition

### ScriptDetailView

- Monaco editor for Python script editing
- Collapsible parameter panel (left)
- Parameter configuration (name, type, value)
- Save and Run Script actions
- Type-safe parameter validation

### CloudShellItemEditor

- Main orchestrator for item lifecycle
- Script CRUD operations with scriptsMap state
- Session state and configuration management
- Lakehouse and environment selection
- Item save with definition parts for scripts
- View coordination

### CloudShellItemRibbon

- Session controls (Start/Stop)
- Create Script action
- Lakehouse and environment selection
- Execution mode dropdown
- Settings and quick access actions
- Terminal actions

### SparkLivycloudShellClient

- Spark Livy session management
- Command execution with mode-specific wrapping
- Batch job creation and polling
- OneLake script upload for batch execution
- Parameter injection via Spark configuration
- Session validation and reuse
- Result parsing

## Script Management Architecture

### Name-Based Identifiers

Scripts use their name as the unique identifier, eliminating the need for separate IDs:

- **Script Path Pattern**: `{workspaceId}/{itemId}/Scripts/{scriptName}.py`
- **No ID Management**: Names serve as both display and storage keys
- **Validation**: Duplicate names prevented at creation time
- **Refactoring Safety**: Renaming requires deletion and recreation

### scriptsMap State Pattern

The editor maintains a `Map<string, string>` for script content:

```typescript
const [scriptsMap, setScriptsMap] = useState<Map<string, string>>(new Map());

// Loading from definition
const loadScripts = async () => {
  const map = new Map<string, string>();
  for (const script of metadata.scripts) {
    const content = await oneLakeClient.downloadFile(scriptPath);
    map.set(script.name, content);
  }
  setScriptsMap(map);
};

// Saving with override
const saveItemInternal = async (
  showNotification: boolean,
  scriptsMapOverride?: Map<string, string>
) => {
  const scriptsToSave = scriptsMapOverride ?? scriptsMap;
  // Build definition parts...
};
```

**Key Benefits**:

- **Immediate Access**: scriptsMapOverride allows saving during async state updates
- **Efficient Lookups**: O(1) access by script name
- **Clear Ownership**: Editor owns script content lifecycle

### Script Persistence

Scripts are stored as OneLake files with metadata:

```typescript
interface PythonScriptMetadata {
  name: string;
  parameters: ScriptParameter[];
}

interface ScriptParameter {
  name: string;
  type: 'string' | 'int' | 'float' | 'bool' | 'date';
  value: string;
}
```

**Storage Strategy**:

- **Metadata**: Stored in item definition as JSON (`cloudShellDefinition.scripts`)
- **Content**: Stored in OneLake at `{workspaceId}/{itemId}/Scripts/{name}.py`
- **Parameters**: Stored with metadata, injected at batch execution

### Parameter System Design

Parameters follow a type-safe pattern:

1. **Definition**: User defines parameters in script metadata with type
2. **Storage**: Parameters persist with script metadata
3. **Injection**: At batch execution, converted to Spark configuration:
   - `spark.script.param.<name>` = value
   - `spark.script.param.<name>.type` = type
4. **Access**: Scripts use `get_parameter` helper to retrieve typed values

**Type Conversion**:

```python
def get_parameter(name: str, default=None):
    param_key = f"spark.script.param.{name}"
    type_key = f"{param_key}.type"
    
    value = spark.conf.get(param_key, None)
    param_type = spark.conf.get(type_key, "string")
    
    if param_type == "int":
        return int(value)
    elif param_type == "float":
        return float(value)
    elif param_type == "bool":
        return value.lower() == "true"
    # ...
```

## Batch Execution Flow

### Execution Flow

Batch execution runs scripts as one-off Spark jobs with parameters:

```text
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Script + Params│ → │ OneLake Upload│ → │ Spark Config │
└──────────────┘    └──────────────┘    └──────────────┘
                                               ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Poll Creation│ ← │  Create Batch │ ← │ Build Request│
└──────────────┘    └──────────────┘    └──────────────┘
```

### Implementation

```typescript
async runScriptAsBatch(
  script: PythonScriptMetadata,
  parameters?: ScriptParameter[]
): Promise<BatchResponse> {
  // 1. Upload script to OneLake (unchanged)
  const scriptPath = `${workspaceId}/${itemId}/Scripts/${script.name}.py`;
  await oneLakeClient.uploadFile(scriptPath, scriptContent);

  // 2. Build Spark configuration with parameters
  const parameterConf: { [key: string]: string } = {};
  parameters?.forEach(p => {
    parameterConf[`spark.script.param.${p.name}`] = p.value;
    parameterConf[`spark.script.param.${p.name}.type`] = p.type;
  });

  // 3. Create batch job
  const batchRequest = {
    name: `${script.name}-${Date.now()}`,
    file: oneLakePath,
    conf: {
      "spark.fabric.lakehouse.id": lakehouseId,
      ...parameterConf
    }
  };
  const response = await createBatch(batchRequest);

  // 4. Poll for creation completion
  const batchId = await pollBatchCreation(response.id);
  
  return getBatch(batchId);
}
```

### Polling Strategy

Similar to session creation, batch creation uses polling:

- **Interval**: 2 seconds
- **Max Attempts**: 30 (60 seconds total)
- **Success Criteria**: Batch appears in `listBatches` response
- **Failure**: Timeout or error state

## Design Patterns

### Execution Mode Pattern

Three distinct execution modes:

```typescript
enum ExecutionMode {
  NATIVE = 'NATIVE',          // Direct Python code
  SUBPROCESS = 'SUBPROCESS',  // Shell commands via subprocess
  FAB_CLI = 'FAB_CLI'        // Cloud Shell with "fab" prefix
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
interface CloudShellItemDefinition {
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
- **Batch API**: Create one-off batch jobs with OneLake scripts
- **Configuration**: Lakehouse and environment binding

### Fabric Platform

- **Authentication**: Service Principal (required)
- **Item Management**: Auto-save configuration changes with script persistence
- **Resource Discovery**: Lakehouse and environment listing

### OneLake

- Commands execute in lakehouse context
- Full access to lakehouse files and tables through Spark
- Script storage for batch execution
- Parameter configuration storage

## Error Handling

- **Session Errors**: Clear messaging with retry options
- **Command Errors**: Display in terminal with full error output
- **Validation Errors**: Auto-recovery with session recreation
- **CLI Availability**: Setup instructions if CLI not found
- **Script Errors**: Validation at creation and execution time
- **Batch Job Failures**: Polling timeout handling and error states

## Performance Considerations

### Optimization Strategies

- Session reuse to avoid creation overhead
- 2-second polling intervals with 5-minute timeout for sessions
- 2-second polling intervals with 60-second timeout for batch creation
- In-memory command history with efficient navigation
- Debounced input and batched state updates
- scriptsMap for O(1) script content access

### Memory Management

- Terminal entry limits for large outputs
- Proper session cleanup on component unmount
- Efficient result parsing
- scriptsMap state management for large script sets

## Security

- **Service Principal Only**: User authentication not yet supported
- **Subprocess Isolation**: Commands execute in Spark context
- **OneLake Permissions**: Enforced at platform level
- **Input Sanitization**: Command escaping for shell execution
