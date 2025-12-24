# Cloud Shell Item

The Cloud Shell Item provides an interactive terminal interface for executing Cloud Shell commands and Python scripts through Spark Livy sessions within Microsoft Fabric. It enables developers and data engineers to interact with Fabric resources directly from the browser with full command history and script management capabilities.

**Key Features**:

- **Interactive Terminal** for Cloud Shell commands
- **Python Script Management** with parameterized execution
- **Batch Job Execution** for scripts with monitoring
- **Session Management** with automatic reuse

## Overview

The Cloud Shell Item enables users to:

- **Execute Fabric CLI commands** through an integrated terminal interface with automatic 'fab' prefix
- **Create and manage scripts** (Python and Fabric CLI) with parameter support
- **Run scripts as Spark batch jobs** with parameter injection
- **Manage Spark sessions** with automatic validation and reuse
- **Select lakehouse and environment** for execution context
- **Track command history** with arrow key navigation

**Execution Modes**:

- **FAB_CLI (Default)**: Fabric CLI commands with automatic 'fab' prefix
- **PYTHON**: Direct Python code execution in Spark sessions
- **SHELL**: Shell commands via subprocess wrapper

For technical architecture details, see [Architecture.md](./Architecture.md).

## Key Features

### Script Management

Create, edit, and manage Python and Fabric CLI scripts with full parameter support:

**Script Creation & Editing**

- **Create Scripts**: Add Python (`.py`) or Fabric CLI (`.fab`) scripts
- **Monaco Editor**: Full-featured code editor with syntax highlighting
- **Script Parameters**: Define typed parameters (string, int, float, bool, date)
- **Fabric CLI Scripts**: Multiple CLI commands in a single file with parameter substitution
- **Parameter Panel**: Collapsible left panel for parameter configuration
- **Auto-save**: Changes are automatically saved with notifications
- **Delete Protection**: Confirmation dialog prevents accidental deletions

**Script Parameters**

Scripts support parameterized execution with type-safe configuration:

- **Parameter Types**: string, int, float, bool, date
- **Parameter Description**: Optional description field for documentation
- **System Parameters**: Pre-configured read-only parameters available in all scripts:
  - `WORKSPACE_NAME` - Name of the current workspace
  - `WORKSPACE_ID` - ID of the current workspace
  - `ITEM_NAME` - Name of the current Cloud Shell item
  - `ITEM_ID` - ID of the current Cloud Shell item
- **Spark Configuration**: Python scripts access parameters via `spark.script.param.<name>`
- **Variable Substitution**: Fabric CLI scripts support two formats:
  - `$paramName` - Unix/Linux style (e.g., `$workspaceId`)
  - `%paramName%` - Windows batch style (e.g., `%workspaceId%`)
- **Reusable Scripts**: Same script with different parameter values per execution
- **Batch Execution**: Both Python and Fabric CLI scripts can be executed as Spark batch jobs
- **Parameter Naming**: Only alphanumeric characters and underscores allowed (no spaces, dots, or special characters)

**Example Parameter Access**:

**Python Scripts** - Use `get_parameter()` method:

```python
from pyspark.sql import SparkSession
spark = SparkSession.builder.getOrCreate()

# Read parameter with type conversion
def get_parameter(param_name, param_type="string", default_value=None):
    value = spark.conf.get(f"spark.script.param.{param_name}", default_value)
    
    if param_type == "int":
        return int(value)
    elif param_type == "float":
        return float(value)
    elif param_type == "bool":
        return value.lower() == "true"
    else:  # string or date
        return value

# Access custom parameters
batch_size = get_parameter("batch_size", "int", "100")
input_path = get_parameter("input_path", "string", "Files/data")
enable_logging = get_parameter("enable_logging", "bool", "true")

# Access system parameters (always available)
workspace_id = get_parameter("WORKSPACE_ID", "string")
item_name = get_parameter("ITEM_NAME", "string")
print(f"Running in workspace: {workspace_id}, item: {item_name}")
```

**Fabric CLI Scripts** - Use `$param` or `%param%` notation:

```bash
# Both formats are supported:
fab ls -l $workspaceName.Workspace
fab ls -l %workspaceName%.Workspace

# Example with multiple parameters:
fab item get --workspace-id $workspaceId --item-id $itemId
fab item get --workspace-id %workspaceId% --item-id %itemId%

# Use system parameters (always available):
fab ls -l $WORKSPACE_NAME.Workspace
fab item get --workspace-id $WORKSPACE_ID --item-id $ITEM_ID

# Parameters are replaced before execution
# $workspaceId → actual-workspace-guid
# %workspaceId% → actual-workspace-guid
```

**Batch Execution**

- **Run as Batch Job**: Execute scripts as Spark batch jobs
- **Job Monitoring**: Track batch job creation and state
- **Parameter Injection**: Parameters automatically configured in Spark conf
- **Progress Notifications**: Real-time feedback during job submission
- **Job ID Tracking**: Batch job ID returned for monitoring

### Execution Modes

**Fabric CLI (FAB_CLI)** - Default Mode

- Execute Fabric CLI commands with automatic `fab` prefix
- Integrated access to Fabric platform capabilities
- **Authentication**: Currently supports Service Principal (Client ID + Client Secret only)
  - OBO and certificate authentication are work in progress
- Example: `ls -l MyWorkspace.Workspace` (executed as `fab ls -l MyWorkspace.Workspace`)

**Python (PYTHON)**

- Execute Python code directly in the Spark session
- Best for: Data processing, Spark operations, PySpark scripts
- Example: `df = spark.read.parquet("Files/data.parquet")`

**Shell (SHELL)**

- Execute shell commands via Python subprocess wrapper
- Supports pipes, redirections, and standard shell operations
- Example: `echo "Hello World!"` or `fab ls -l MyWorkspace.Workspace`

### Session Management

- **Automatic Session Reuse**: Validates and reuses existing sessions when possible
- **Session Validation**: Checks scheduler state and Livy state before reuse
- **Environment Integration**: Supports Spark environment selection
- **Lakehouse Context**: Commands execute in the context of a selected lakehouse
- **Session Persistence**: Session IDs saved to item definition for continuation

### Terminal Interface

- **Command History**: Navigate through previous commands using arrow keys (Up/Down)
- **Multi-line Output**: Proper formatting for complex command results
- **System Messages**: Clear distinction between commands, results, and system notifications
- **Error Handling**: Comprehensive error display with detailed messages

### Console Commands

The terminal supports built-in commands processed locally without Spark execution:

- **`help`**: Display available commands with mode-specific examples
- **`clear`**: Clear all terminal entries
- **`run {scriptName}`**: Execute a saved script as a Spark batch job
  - Example: `run MyAnalysis.py` executes the script with configured parameters
  - Parameters automatically injected via Spark configuration
  - Batch job ID returned for monitoring

Console commands take precedence over Fabric CLI commands.

### Workspace Integration

- **Lakehouse Selection**: Change target lakehouse dynamically
- **Environment Selection**: Choose from available Spark environments
- **Session Control**: Start/stop sessions from the ribbon
- **Execution Mode Toggle**: Switch between Cloud Shell, Python, and shell modes via ribbon dropdown

## Architecture

### Component Structure

```text
CloudShellItem/
├── CloudShellItemDefaultView.tsx          # Terminal UI with command execution
├── CloudShellItemEditor.tsx               # Editor orchestrator and state management
├── CloudShellItemEmptyView.tsx            # Empty state view
├── CloudShellItemRibbon.tsx               # Ribbon controls (session, scripts, settings)
├── CloudShellItemModel.ts                 # Data models (CommandType, ScriptType, definitions)
├── ScriptDetailView.tsx                  # Script editor with parameter panel
├── ScriptsList.tsx                       # Script list display
├── CreateScriptDialog.tsx                # Script creation dialog
├── engine/
│   ├── CloudShellItemEngine.ts           # Command routing engine
│   ├── SparkLivyCloudShellClient.ts      # Session and batch job management
│   ├── scripts/
│   │   ├── BaseScriptCommand.ts          # Base class for batch execution
│   │   ├── PythonScriptCommand.ts        # Python script handler
│   │   └── FabricCLIScriptCommand.ts     # Fabric CLI script handler
│   └── shell/
│       ├── HelpCommand.ts                # Help console command
│       ├── ClearCommand.ts               # Clear console command
│       ├── RunScriptCommand.ts           # Run script console command
│       └── ExecuteCommand.ts             # Statement execution handler
└── CloudShellItem.scss                    # Styling
```

### Execution Flow

```text
User Input → CloudShellItemEngine → Command Type Router
     ↓
Console Command → Local Handler → Terminal Display
     |
FAB_CLI/SHELL/PYTHON → Spark Session → Statement Execution → Result Display
     |
Script Execution → BaseScriptCommand → OneLake Upload → Batch Job → Job ID

Command Wrapping:
FAB_CLI: subprocess.run("fab {command}") with JSON output
SHELL: subprocess.run("{command}") with JSON output  
PYTHON: Direct execution in Spark session
```

## Component Details

### CloudShellItemDefaultView

The main terminal component that:

- Renders the terminal interface with command input
- Manages command history and navigation
- Handles execution mode per command
- Displays command results with appropriate formatting
- Integrates with SparkLivycloudShellClient for execution

```tsx
<CloudShellItemDefaultView
  item={item}
  workloadClient={workloadClient}
  workspaceId={workspaceId}
  lakehouseId={lakehouseId}
  executionMode={executionMode}
  onSessionCreated={handleSessionCreated}
  onSessionStopped={handleSessionStopped}
/>
```

### CloudShellItemEditor

The main orchestrator component that:

- Manages item loading and saving with definition parts
- Coordinates session state (sessionId, isConnecting, terminalEntries)
- Maintains scriptsMap for efficient script content access
- Handles lakehouse and environment selection
- Controls execution mode switching via ribbon

### CloudShellItemRibbon

Ribbon integration providing:

- **Save**: Save script changes and item definition
- **Settings**: Open item settings panel
- **Start/Stop Session**: Session lifecycle management for terminal
- **Clear Terminal**: Clear all terminal entries
- **Lakehouse Selection**: Change target lakehouse
- **Environment Dropdown**: Select Spark environment with dynamic label
- **Execution Mode Dropdown**: Switch between Python, Bash, and Cloud Shell modes (default: Cloud Shell)
- **Create Script**: Create new Python script

### ScriptDetailView

Script editor component that:

- Provides Monaco editor for Python code editing
- Displays collapsible parameter panel on the left
- Manages script save with auto-save functionality
- Executes scripts as batch jobs with parameters
- Shows dirty indicator for unsaved changes
- Includes Save and Run toolbar actions

### ScriptsList

Script list component that:

- Displays all Python scripts in a vertical list
- Shows script selection state
- Provides delete action with confirmation dialog
- Handles empty state with create script button
- Supports script navigation

### SparkLivyCloudShellClient

Spark Livy client that:

- Creates and validates sessions with 5-minute polling timeout
- Validates existing sessions for reuse (schedulerState='Scheduled', livyState='idle')
- Verifies Fabric CLI availability on session creation
- Executes statements with 60-second timeout
- Submits batch jobs with parameter injection via Spark configuration
- Polls for batch creation with 20-second timeout
- Parses JSON-wrapped results from subprocess commands

## Data Models

### CloudShellItemDefinition

```typescript
interface CloudShellItemDefinition {
  selectedLakehouse?: ItemReference;          // Lakehouse for execution context
  lastSparkSessionId?: string;                 // Session ID for automatic reuse
  selectedSparkEnvironment?: ItemReference;    // Spark environment (packages, config)
  scripts?: ScriptMetadata[];                  // Script metadata (content in OneLake)
}
```

### ScriptMetadata

```typescript
interface ScriptMetadata {
  name: string;                    // Unique script name with extension (.py, .fab)
  type?: ScriptType;               // PYTHON or FABCLI (defaults to PYTHON)
  parameters?: ScriptParameter[];  // Parameters for execution
  createdAt?: string;              // ISO timestamp
  modifiedAt?: string;             // ISO timestamp
}
```

### ScriptParameter

```typescript
interface ScriptParameter {
  name: string;                                    // Parameter name
  type: 'string' | 'int' | 'float' | 'bool' | 'date';  // Parameter type
  value: string;                                   // Parameter value
}
```

### CommandType Enum

```typescript
enum CommandType {
  FAB_CLI = 'fabcli',   // Fabric CLI with 'fab' prefix (DEFAULT)
  PYTHON = 'python',    // Direct Python execution in Spark
  SHELL = 'shell',      // Shell commands via subprocess
}
```

### TerminalEntry

```typescript
interface TerminalEntry {
  type: 'command' | 'response' | 'error' | 'system';
  content: string;
  timestamp: Date;
  executionMode?: ExecutionMode;  // Preserves mode for each command
}
```

## Session Management

### Session Creation

1. **Environment Selection**: Choose target Spark environment
2. **Lakehouse Selection**: Select lakehouse for data context
3. **Session Request**: Create Livy session with configuration
4. **Polling**: Wait for session to reach 'Scheduled' state
5. **Validation**: Verify CLI availability with test command

### Session Reuse Logic

Automatic session validation and reuse to avoid 5+ minute startup:

```typescript
async reuseOrCreateSession(config, existingSessionId, onProgress) {
  if (existingSessionId) {
    const valid = await validateSession(...);
    if (valid) {
      await verifyFabricCLI(...); // Check CLI availability
      return existingSession;
    }
  }
  return await initializeSession(config, onProgress);
}
```

**Validation**: schedulerState='Scheduled' AND livyState='idle' AND CLI verified

### Session Clearing

Session IDs are automatically cleared when:

- User changes the selected lakehouse
- User stops the session manually
- Session validation fails

## Command Execution

### Fabric CLI Mode (FAB_CLI) - Default

Fabric CLI commands with automatic `fab` prefix:

```bash
# User input → Executed command
ls -l                        → fab ls -l
ls -l MyWorkspace.Workspace  → fab ls -l MyWorkspace.Workspace  
auth status                  → fab auth status
```

**Common Commands**:

- `ls -l` - List all workspaces
- `ls -l {workspace}.Workspace` - List items in workspace
- `item get --workspace-id {id} --item-id {id}` - Get item details

For more examples, see [Fabric CLI Documentation](https://microsoft.github.io/fabric-cli/commands/).

### Python Mode (PYTHON)

Direct Python execution in Spark session:

```python
# User input (executed as-is)
df = spark.read.parquet("Files/data.parquet")
df.show()
print("Hello World!")
```

### Shell Mode (SHELL)

Shell commands via subprocess wrapper:

```bash
# User input
echo "Hello World!"
fab ls -l MyWorkspace.Workspace

# Wrapped in Python subprocess with JSON output
# Returns: {"returncode": 0, "stdout": "...", "stderr": "..."}  
```

## Error Handling

The component includes comprehensive error handling for:

- **Session Errors**: Clear messaging for session creation/validation failures
- **Command Errors**: Detailed error output from failed commands
- **Network Issues**: Graceful handling of Spark Livy connectivity problems
- **Permission Errors**: Appropriate messaging for access denied scenarios
- **Validation Failures**: Pre-execution validation of session readiness

## Performance Considerations

### Optimization Strategies

- **Session Reuse**: Validates and reuses sessions instead of creating new ones
- **Lazy Session Creation**: Sessions created only when needed
- **Command History**: In-memory storage with efficient navigation (Up- and Down- Key)
- **Debounced Input**: Optimized command entry handling

### Resource Management

- **Session Cleanup**: Proper session lifecycle management
- **Memory Management**: Command history with reasonable limits
- **Connection Pooling**: Efficient Spark Livy client reuse

## Integration Points

### Fabric Platform

- **Authentication**: Integrated with Fabric authentication system (Service Principal required)
- **Permissions**: Respects workspace and item-level permissions
- **Spark Integration**: Native Spark Livy session management
- **Monitoring Hub**: Livy API sessions appear in the Fabric Monitoring Hub for tracking and diagnostics

### Spark Livy

- **Session API**: Session creation, listing, and cancellation
- **Statement API**: Command execution and result retrieval
- **Batch Processing**: Support for long-running operations
- **Lakehouse Context**: Commands execute against selected lakehouse

## Limitations

### Authentication Requirements

**⚠️ Service Principal Authentication Only**

The Cloud Shell Item currently **only supports Service Principal authentication**. User-based authentication is not yet supported.

**Setup Requirements**:

1. Configure Service Principal in Azure AD
2. Assign appropriate Fabric workspace permissions
3. Configure client credentials in environment variables
4. Grant necessary API permissions (Workspace.ReadWrite.All, Item.ReadWrite.All)

For detailed setup instructions, see the [CreatecloudShellServicePrincipal.ps1](../../../scripts/Setup/CreatecloudShellServicePrincipal.ps1) script.

### Known Limitations

- **User Authentication**: Not supported - Service Principal required
- **Interactive Login**: Not available - pre-configured credentials only
- **MFA/Conditional Access**: Not compatible with current authentication flow
- **Personal Workspaces**: Limited support - requires Service Principal access

## Troubleshooting

### Common Issues

**Commands Not Executing**

- Verify session is in 'Scheduled' state
- Check lakehouse selection is valid
- Ensure execution mode is appropriate for command type
- Review error messages in terminal

**Authentication Errors**

- Confirm Service Principal is properly configured
- Verify client credentials in environment variables
- Check API permissions in Azure AD
- Ensure workspace has Service Principal access

## Future Enhancements

- **User Authentication**: Support for user-based authentication
- **Command Autocomplete**: IntelliSense for Cloud Shell commands
- **Script Templates**: Pre-built templates for common data operations
- **Script Versioning**: Track script changes with version history
- **Output Export**: Save command and script results to item
- **Parameter Validation**: Client-side validation for parameter types
- **Script Dependencies**: Manage Python package requirements per script
- **Batch Job Monitoring**: Real-time log streaming for running batch jobs
- **Script Scheduling**: Schedule scripts for automated execution
- **Data Integration**: Integration to leverage data in the Cloud Shell
- **Spark Environment Setup**: Set up Spark environment and configure it correctly

## Related Resources

- [Cloud Shell Documentation](https://learn.microsoft.com/en-us/fabric/cicd/fabric-cli)
- [Cloud Shell Examples](https://microsoft.github.io/fabric-cli/examples/item_examples/)
- [Spark Livy REST API](https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-livy-rest-interface)
- [Service Principal Setup](../../../scripts/Setup/CreatecloudShellServicePrincipal.ps1)
- [Architecture Documentation](./Architecture.md)
