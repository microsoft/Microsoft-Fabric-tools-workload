# Cloud Shell Item Architecture

This document describes the architecture and design patterns of the Cloud Shell Item.

## Overview

The Cloud Shell Item provides an interactive terminal for executing Fabric CLI commands, Python code, and shell commands through Spark Livy sessions. It includes script management with parameterized batch execution, automatic session reuse, and command history.

## Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Cloud Shell Item                             │
├─────────────────────────────────────────────────────────────────┤
│                        UI Layer                                │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ DefaultView     │ ScriptViews     │ Ribbon Controls            │
│ - Terminal UI   │ - ScriptsList   │ - Session Start/Stop       │
│ - Command Input │ - DetailView    │ - Script Create            │
│ - History       │ - Parameters    │ - Mode Selection           │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                   Engine Layer                               │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ CloudShellEngine│ SparkLivyClient │ Command Pattern            │
│ - Command Router│ - Session Mgmt  │ - Script Commands (Batch)  │
│ - Context Build │ - Statement Exec│   · BaseScriptCommand     │
│                 │ - Batch Jobs    │   · PythonScriptCommand  │
│                 │ - OneLake Upload│   · FabricCLIScriptCmd   │
│                 │                 │ - Console Commands (Local) │
│                 │                 │   · HelpCommand          │
│                 │                 │   · ClearCommand         │
│                 │                 │   · RunScriptCommand     │
│                 │                 │   · ExecuteCommand       │
├─────────────────┴─────────────────┴─────────────────────────────┤
│                     Data Layer                                 │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Spark Livy APIs │ Item Definition │ OneLake Storage            │
│ - Session CRUD  │ - Lakehouse Ref │ - Script Files             │
│ - Statement Exec│ - Environment   │ - Batch Uploads            │
│ - Batch Jobs    │ - Scripts []    │                            │
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

Scripts use their name as the unique identifier:

- **Path Pattern**: `{workspaceId}/{itemId}/Scripts/{scriptName}`
- **Extensions**: .py (Python), .fab (Fabric CLI)
- **No Separate IDs**: Name serves as both identifier and display
- **Validation**: Duplicate names prevented at creation

### scriptsMap State

Editor maintains `Map<string, string>` for script content:

```typescript
const [scriptsMap, setScriptsMap] = useState<Map<string, string>>(new Map());

// Loading
for (const script of metadata.scripts) {
  const content = await oneLakeClient.downloadFile(path);
  map.set(script.name, content);
}

// Saving with override for async state
await saveItemInternal(showNotification, scriptsMapOverride);
```

**Benefits**: O(1) access, immediate state override, clear ownership

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

### Parameter System

Parameters follow type-safe injection pattern:

1. **Definition**: User defines parameters with type in script metadata
2. **Storage**: Parameters persist in CloudShellItemDefinition.scripts[]
3. **Injection**: At batch execution, converted to Spark config:
   - `spark.script.param.{name}` = value
4. **Variable Substitution**: 
   - **Fabric CLI scripts**: Support both `$paramName` and `%paramName%` notation
   - **Python scripts**: Use `get_parameter()` helper function for type-safe retrieval
5. **Access**: Scripts use notation or helper functions based on script type

**Parameter Naming Rules**:
- Only alphanumeric characters and underscores allowed
- No spaces, dots, or special characters
- Validated in UI during parameter creation

**System Parameters** (Read-only, auto-populated):

System parameters are automatically configured based on script type to match the language's idiomatic usage patterns:

**Fabric CLI Scripts** (.fab):
- `WORKSPACE` - Workspace name in Fabric CLI format (e.g., "MyWorkspace.Workspace")
- `ITEM` - Item name in Fabric CLI format (e.g., "MyItem.CloudShellItem")

**Python Scripts** (.py):
- `WORKSPACE_NAME` - Plain workspace display name (e.g., "MyWorkspace")
- `WORKSPACE_ID` - Workspace GUID
- `ITEM_NAME` - Plain item display name (e.g., "MyItem")
- `ITEM_ID` - Item GUID

**Common Properties**:
- Cannot be deleted or renamed by users
- Values automatically populated from item context at runtime
- Not saved in item definition (values are ephemeral)
- Fetched dynamically for each script execution

**Parameter Fields**:
- `name` - Parameter identifier
- `type` - Data type (string, int, float, bool, date)
- `value` - Current value (empty string for system parameters)
- `description` - Optional documentation
- `isSystemParameter` - Marks read-only system parameters

**Python Script Parameter Access**:
```python
# In Python script - use get_parameter() helper
def get_parameter(param_name, param_type="string", default_value=None):
    value = spark.conf.get(f"spark.script.param.{param_name}", default_value)
    # Type conversion logic...
    return value

# System parameters for Python scripts
workspace_name = get_parameter("WORKSPACE_NAME", "string")  # "MyWorkspace"
workspace_id = get_parameter("WORKSPACE_ID", "string")      # "abc123-..."
item_name = get_parameter("ITEM_NAME", "string")            # "MyItem"
item_id = get_parameter("ITEM_ID", "string")                # "def456-..."

# User-defined parameters
value = get_parameter("myParam", "string")
```

**Fabric CLI Script Parameter Access**:
```bash
# In Fabric CLI script - use $param or %param% notation

# System parameters for Fabric CLI scripts
ls -l $WORKSPACE              # Lists items in "MyWorkspace.Workspace"
ls -l %WORKSPACE%             # Alternative notation

item get --item $ITEM         # References "MyItem.CloudShellItem"
item get --item %ITEM%        # Alternative notation

# User-defined parameters
fab item get --workspace-id $workspaceId

# Both formats supported:
# $paramName - Unix/Linux style
# %paramName% - Windows batch style
```

## Batch Execution Flow

```text
Script + Params → BaseScriptCommand → Generate Wrapper Content
       ↓
   Upload to OneLake (timestamp_{name}.py)
       ↓
   Build Batch Request (lakehouse, environment, params)
       ↓
   Submit Batch → Poll Creation (20s timeout) → Return Batch ID
```

### Implementation

```typescript
// BaseScriptCommand.execute()
1. content = await getPythonWrapperContent(script, context);
2. await oneLakeClient.writeFileAsText(path, content);
3. batchRequest = { file: abfssPath, conf: {...params} };
4. return await submitBatchJob(batchRequest);

// Subclass wrappers:
// - PythonScriptCommand: Returns script.content
// - FabricCLIScriptCommand: Returns FabCliScriptWrapper.py (cached)
```

**Polling**: 10 attempts × 2s = 20s timeout

## Design Patterns

### Command Pattern

Two command hierarchies:

**Script Commands** (Batch Jobs):
```typescript
BaseScriptCommand (abstract)
  ├─ PythonScriptCommand
  └─ FabricCLIScriptCommand
```

**Console Commands** (Local):
```typescript
IConsoleCommand (interface)
  ├─ HelpCommand
  ├─ ClearCommand
  ├─ RunScriptCommand
  └─ ExecuteCommand
```

### Execution Mode Pattern

```typescript
enum CommandType {
  FAB_CLI = 'fabcli',   // Fabric CLI with 'fab' prefix (default)
  PYTHON = 'python',    // Direct Python in Spark
  SHELL = 'shell',      // Shell via subprocess
}
```

**Mode-Specific Wrapping**:
- FAB_CLI/SHELL: Wrapped with subprocess.run() returning JSON
- PYTHON: Executed directly in Spark session

### Session Reuse Pattern

```typescript
async reuseOrCreateSession(config, existingSessionId, onProgress) {
  if (existingSessionId && await validateSession(...)) {
    await verifyFabricCLI(...);
    return existingSession;
  }
  return await initializeSession(config, onProgress);
}
```

**Validation**: schedulerState='Scheduled' AND livyState='idle' AND CLI verified

## Data Flow

### Session Initialization

```text
User Clicks Start → Check lastSparkSessionId → Validate OR Create
     ↓
Poll Session (2s intervals, 5min timeout) → Scheduled + idle
     ↓
Verify Fabric CLI (fab --version) → Session Ready
```

### Command Execution

```text
User Input → CloudShellItemEngine Router
     ↓
Console Command → Local Handler → Display
     OR
FAB_CLI/PYTHON/SHELL → ExecuteCommand → Livy Statement API → Display
```

### Script Batch Execution

```text
Run Script → BaseScriptCommand.execute()
     ↓
Generate Wrapper → Upload OneLake → Submit Batch
     ↓
Poll Creation (2s, 20s timeout) → Return Batch ID
```

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

### Optimizations

- **Session Reuse**: Avoids 5+ minute session startup
- **Static Caching**: Wrapper files (FabCliCheckWrapper.py, FabCliScriptWrapper.py) cached
- **Polling Intervals**: 2s for sessions/batches, 1s for statements
- **scriptsMap**: O(1) content lookups by name
- **Debounced Input**: Efficient terminal entry handling

### Timeouts

- Session Creation: 5 minutes (150 attempts × 2s)
- Batch Creation: 20 seconds (10 attempts × 2s)
- Statement Execution: 60 seconds (60 attempts × 1s)

## Security

- **Authentication**: Service Principal or OBO token (frontend user session)
- **Subprocess Execution**: Commands run in isolated Spark containers
- **OneLake Permissions**: Enforced at platform level
- **Input Handling**: Commands executed via Spark Livy (no direct shell access)
