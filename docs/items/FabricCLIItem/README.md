# Fabric CLI Item

The Fabric CLI Item provides an interactive terminal interface for executing Fabric CLI commands through Spark Livy sessions within Microsoft Fabric. It enables developers and data engineers to interact with Fabric resources directly from the browser with full command history.

**Advanced Features**: Optionally supports native Python code execution and shell commands through execution mode switching.

## Overview

The Fabric CLI Item enables users to:

- **Execute Fabric CLI commands** through an integrated terminal interface
- **Manage Spark sessions** with automatic reuse and validation
- **Select lakehouse and environment** for command execution context
- **Track command history** with arrow key navigation

**Advanced Features** (optional):

- **Switch execution modes** to run native Python code or shell commands
- **Execute Python directly** in Spark sessions for data processing
- **Run shell commands** with subprocess support

For technical architecture details, see [Architecture.md](./Architecture.md).

## Key Features

### Fabric CLI Execution (Default)

**Fabric CLI (`FAB_CLI`)** - Default Mode

- Execute Fabric CLI commands with automatic `fab` prefix
- Integrated access to Fabric platform capabilities
- Best for: Fabric resource management, platform operations
- Example: `workspace list` (executed as `fab workspace list`)

### Advanced Execution Modes (Optional)

To use Python or shell commands, select a different execution mode from the ribbon dropdown:

**Native Python (`NATIVE`)**

- Execute Python code directly in the Spark session
- Must be activated via ribbon execution mode dropdown
- Best for: Data processing, Spark operations, Python scripts
- Example: `df = spark.read.parquet("Files/data.parquet")`

**Subprocess (`SUBPROCESS`)**

- Execute shell commands via Python subprocess
- Must be activated via ribbon execution mode dropdown
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
- **Clear Command**: Reset terminal view with `clear` command

### Workspace Integration

- **Lakehouse Selection**: Change target lakehouse dynamically
- **Environment Selection**: Choose from available Spark environments
- **Session Control**: Start/stop sessions from the ribbon
- **Execution Mode Toggle** (Advanced): Switch to Python or shell modes via ribbon dropdown

## Architecture

### Component Structure

```text
FabricCLIItem/
├── FabricCLIItemDefaultView.tsx          # Terminal UI and command execution
├── FabricCLIItemEditor.tsx               # Main editor orchestrator
├── FabricCLIItemEmptyView.tsx            # Empty state component
├── FabricCLIItemRibbon.tsx               # Ribbon actions and controls
├── FabricCLIItemModel.ts                 # Data models and interfaces
├── SparkLivyFabricCLIClient.ts           # Spark Livy session management
└── FabricCLIItem.scss                    # Centralized styling
```

### Execution Flow

```text
User Command → Fabric CLI Wrapper (default) → Spark Session
     ↓
FAB_CLI Mode (default) → subprocess.run("fab command", shell=True) → JSON Response
     ↓
Result Processing → Terminal Display → Command History

Advanced Modes (when activated):
NATIVE Mode → Direct Python Code → Spark Execution
SUBPROCESS Mode → subprocess.run(shell=True) → JSON Response
```

## Component Details

### FabricCLIItemDefaultView

The main terminal component that:

- Renders the terminal interface with command input
- Manages command history and navigation
- Handles execution mode per command
- Displays command results with appropriate formatting
- Integrates with SparkLivyFabricCLIClient for execution

```tsx
<FabricCLIItemDefaultView
  item={item}
  workloadClient={workloadClient}
  workspaceId={workspaceId}
  lakehouseId={lakehouseId}
  executionMode={executionMode}
  onSessionCreated={handleSessionCreated}
  onSessionStopped={handleSessionStopped}
/>
```

### FabricCLIItemEditor

The main orchestrator component that:

- Manages item loading and saving
- Coordinates session state and configuration
- Handles lakehouse and environment selection
- Provides ribbon integration
- Controls execution mode switching

### FabricCLIItemRibbon

Ribbon integration providing:

- **Start/Stop Session**: Session lifecycle management
- **Lakehouse Selection**: Change target lakehouse
- **Environment Dropdown**: Select Spark environment with dynamic label
- **Execution Mode Dropdown** (Advanced): Optionally switch to Native Python or Subprocess modes (default: Fabric CLI)
- **Clear Terminal**: Clear all terminal entries

### SparkLivyFabricCLIClient

Session management client that:

- Creates and validates Spark Livy sessions
- Executes commands with mode-specific wrapping
- Handles session reuse logic
- Manages statement lifecycle
- Parses results based on execution mode

## Data Models

### FabricCLIItemDefinition

```typescript
interface FabricCLIItemDefinition {
  selectedLakehouse?: ItemReference;      // Selected lakehouse context
  lastSparkSessionId?: string;             // Last used session ID for reuse
  selectedSparkEnvironment?: ItemReference; // Selected Spark environment
}
```

### ExecutionMode Enum

```typescript
enum ExecutionMode {
  FAB_CLI = 'FAB_CLI',        // Fabric CLI with fab prefix (DEFAULT)
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

### Fabric CLI Mode (FAB_CLI) - Default

Fabric CLI commands with automatic `fab` prefix:

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

For more examples, see the [Fabric CLI Examples Documentation](https://microsoft.github.io/fabric-cli/examples/item_examples/).

### Advanced Modes (Must be Activated in code)

These modes require manual activation via the ribbon execution mode dropdown.

#### Native Python Mode (NATIVE)

Direct Python code execution in Spark session:

```python
# User input
df = spark.read.parquet("Files/data.parquet")
df.show()

# Executed as-is in Spark session
```

#### Subprocess Mode (SUBPROCESS)

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

The Fabric CLI Item currently **only supports Service Principal authentication**. User-based authentication is not yet supported.

**Setup Requirements**:

1. Configure Service Principal in Azure AD
2. Assign appropriate Fabric workspace permissions
3. Configure client credentials in environment variables
4. Grant necessary API permissions (Workspace.ReadWrite.All, Item.ReadWrite.All)

For detailed setup instructions, see the [CreateFabricCLIServicePrincipal.ps1](../../../scripts/Setup/CreateFabricCLIServicePrincipal.ps1) script.

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
- **Command Autocomplete**: IntelliSense for Fabric CLI commands
- **Data Integration**: Integration to leverage data in the Fabric CLI
- **Output Export**: Save command results to item
- **Spark Enviroment setup**: Set up spark Enviroment and configure it correctly

## Related Resources

- [Fabric CLI Documentation](https://learn.microsoft.com/en-us/fabric/cicd/fabric-cli)
- [Fabric CLI Examples](https://microsoft.github.io/fabric-cli/examples/item_examples/)
- [Spark Livy REST API](https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-livy-rest-interface)
- [Service Principal Setup](../../../scripts/Setup/CreateFabricCLIServicePrincipal.ps1)
- [Architecture Documentation](./Architecture.md)
