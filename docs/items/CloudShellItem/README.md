# Cloud Shell Item

The Cloud Shell Item provides an interactive terminal interface for executing Cloud Shell commands and Python scripts through Spark Livy sessions within Microsoft Fabric. It enables developers and data engineers to interact with Fabric resources directly from the browser with full command history and script management capabilities.

**Key Features**:

- **Interactive Terminal** for Cloud Shell commands
- **Python Script Management** with parameterized execution
- **Batch Job Execution** for scripts with monitoring
- **Session Management** with automatic reuse

## Overview

The Cloud Shell Item enables users to:

- **Execute Cloud Shell commands** through an integrated terminal interface
- **Create and manage Python scripts** with parameter support
- **Run scripts as batch jobs** with Spark configuration
- **Manage Spark sessions** with automatic reuse and validation
- **Select lakehouse and environment** for command execution context
- **Track command history** with arrow key navigation

**Advanced Features** (optional):

- **Switch execution modes** to run Python code or Bash commands
- **Execute Python directly** in Spark sessions for data processing
- **Run shell commands** with subprocess support
- **Parameterized scripts** with type-safe parameter injection

For technical architecture details, see [Architecture.md](./Architecture.md).

## Key Features

### Script Management

Create, edit, and manage Python scripts with full parameter support:

**Script Creation & Editing**

- **Create Scripts**: Add new Python scripts with automatic `.py` extension
- **Monaco Editor**: Full-featured code editor with syntax highlighting
- **Script Parameters**: Define typed parameters (string, int, float, bool, date)
- **Parameter Panel**: Collapsible left panel for parameter configuration
- **Auto-save**: Changes are automatically saved with notifications
- **Delete Protection**: Confirmation dialog prevents accidental deletions

**Script Parameters**

Scripts support parameterized execution with type-safe configuration:

- **Parameter Types**: string, int, float, bool, date
- **Spark Configuration**: Parameters passed as `spark.script.param.<name>`
- **Type Information**: Parameter types available as `spark.script.param.<name>.type`
- **Reusable Scripts**: Same script file with different parameter values

**Example Parameter Access**:

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

# Access parameters
batch_size = get_parameter("batch_size", "int", "100")
input_path = get_parameter("input_path", "string", "Files/data")
enable_logging = get_parameter("enable_logging", "bool", "true")
```

**Batch Execution**

- **Run as Batch Job**: Execute scripts as Spark batch jobs
- **Job Monitoring**: Track batch job creation and state
- **Parameter Injection**: Parameters automatically configured in Spark conf
- **Progress Notifications**: Real-time feedback during job submission
- **Job ID Tracking**: Batch job ID returned for monitoring

### Cloud Shell Execution (Default)

**Cloud Shell (`FAB_CLI`)** - Default Mode

- Execute Cloud Shell commands with automatic `fab` prefix
- Integrated access to Fabric platform capabilities
- Best for: Fabric resource management, platform operations
- Example: `workspace list` (executed as `fab workspace list`)

### Execution Modes

To use Python or shell commands, select a different execution mode from the ribbon dropdown:

**Python (`PYTHON`)**

- Execute Python code directly in the Spark session
- Activate via ribbon execution mode dropdown
- Best for: Data processing, Spark operations, Python scripts
- Example: `df = spark.read.parquet("Files/data.parquet")`

**Bash (`BASH`)**

- Execute shell commands via Python subprocess
- Activate via ribbon execution mode dropdown
- Supports pipes (`|`), redirections (`>`, `>>`), and complex shell operations
- Best for: File operations, system commands, shell scripts
- Example: `echo "Hello World" > myfile.txt`

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

### Special Commands

The terminal supports special built-in commands that are processed locally without sending to the Spark session:

- **`clear`**: Clears all terminal entries and resets the terminal view
- **`run {scriptName}`**: Executes a saved Python script as a Spark batch job with configured parameters
  - Example: `run MyAnalysis` executes the script named "MyAnalysis"
  - Scripts must be created and saved in the Scripts panel first
  - Parameters are automatically injected from the script configuration
- **`help`**: Displays a list of available special commands

These commands are case-insensitive and take precedence over Cloud Shell commands.

### Workspace Integration

- **Lakehouse Selection**: Change target lakehouse dynamically
- **Environment Selection**: Choose from available Spark environments
- **Session Control**: Start/stop sessions from the ribbon
- **Execution Mode Toggle**: Switch between Cloud Shell, Python, and shell modes via ribbon dropdown

## Architecture

### Component Structure

```text
CloudShellItem/
├── CloudShellItemDefaultView.tsx          # Terminal UI and command execution
├── CloudShellItemEditor.tsx               # Main editor orchestrator with script management
├── CloudShellItemEmptyView.tsx            # Empty state component
├── CloudShellItemRibbon.tsx               # Ribbon actions and controls
├── CloudShellItemModel.ts                 # Data models and interfaces
├── ScriptDetailView.tsx                  # Script editor with parameter panel
├── ScriptsList.tsx                       # Script list component
├── CreateScriptDialog.tsx                # Script creation dialog
├── SparkLivycloudShellClient.ts           # Spark Livy session and batch management
└── CloudShellItem.scss                    # Centralized styling
```

### Execution Flow

```text
User Command → Cloud Shell Wrapper (default) → Spark Session
     ↓
FAB_CLI Mode (default) → subprocess.run("fab command", shell=True) → JSON Response
     ↓
Result Processing → Terminal Display → Command History

Advanced Modes (when activated):
NATIVE Mode → Direct Python Code → Spark Execution
SUBPROCESS Mode → subprocess.run(shell=True) → JSON Response
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

- Manages item loading and saving
- Coordinates session state and configuration
- Handles lakehouse and environment selection
- Provides ribbon integration
- Controls execution mode switching

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

### SparkLivycloudShellClient

Session and batch management client that:

- Creates and validates Spark Livy sessions
- Executes commands with mode-specific wrapping
- Handles session reuse logic
- Manages statement lifecycle
- **Runs scripts as batch jobs** with parameter configuration
- **Polls for batch creation** and state updates
- **Uploads scripts to OneLake** for batch execution
- Parses results based on execution mode

## Data Models

### CloudShellItemDefinition

```typescript
interface CloudShellItemDefinition {
  selectedLakehouse?: ItemReference;          // Selected lakehouse context
  lastSparkSessionId?: string;                 // Last used session ID for reuse
  selectedSparkEnvironment?: ItemReference;    // Selected Spark environment
  scripts?: PythonScriptMetadata[];            // Python script metadata
}
```

### PythonScriptMetadata

```typescript
interface PythonScriptMetadata {
  name: string;                    // Script name (includes .py extension, used as identifier)
  parameters?: ScriptParameter[];  // Script parameters
  createdAt?: string;              // Creation timestamp
  modifiedAt?: string;             // Last modification timestamp
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

### ExecutionMode Enum

```typescript
enum ExecutionMode {
  FAB_CLI = 'FAB_CLI',        // Cloud Shell with fab prefix (DEFAULT)
  NATIVE = 'NATIVE',          // Native Python execution (Advanced)
  SUBPROCESS = 'SUBPROCESS',  // Shell commands via subprocess (Advanced)
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

The client automatically attempts to reuse existing sessions:

```typescript
async reuseOrCreateSession(config, existingSessionId, onProgress) {
  if (existingSessionId) {
    const isValid = await validateSession(workspaceId, lakehouseId, existingSessionId);
    if (isValid) {
      return existingSession; // Reuse
    }
  }
  return await initializeSession(config, onProgress); // Create new
}
```

**Validation Criteria**:

- `schedulerState === 'Scheduled'`
- `livyState === 'idle'`

### Session Clearing

Session IDs are automatically cleared when:

- User changes the selected lakehouse
- User stops the session manually
- Session validation fails

## Command Execution

### Cloud Shell Mode (FAB_CLI) - Default

Cloud Shell commands with automatic `fab` prefix:

```python
# User input
auth status

# List all workspaces
ls -l

# List the content in a MyWorkspace
ls MyWorkspace.Workspace -l

```

**Example Commands**:

- `workspace list` - List all workspaces
- `item list --workspace-id <id>` - List items in a workspace
- `lakehouse get --workspace-id <id> --item-id <id>` - Get lakehouse details

For more examples, see the [Cloud Shell Examples Documentation](https://microsoft.github.io/fabric-cli/examples/item_examples/).

### Alternative Execution Modes

These modes can be activated via the ribbon execution mode dropdown.

#### Python Mode (PYTHON)

Direct Python code execution in Spark session:

```python
# User input
df = spark.read.parquet("Files/data.parquet")
df.show()

# Executed as-is in Spark session
```

#### Bash Mode (BASH)

Shell commands via Python subprocess:

```python
# User input
ls -la | grep txt

# Wrapped as
import subprocess
result = subprocess.run("ls -la | grep txt", shell=True, capture_output=True, text=True)
print(json.dumps({"stdout": result.stdout, "stderr": result.stderr, "returncode": result.returncode}))
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
