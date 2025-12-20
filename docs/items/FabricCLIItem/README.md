# Fabric CLI Item

The Fabric CLI Item provides an interactive terminal interface for executing Fabric CLI commands, native Python code, and shell commands through Spark Livy sessions within Microsoft Fabric. It enables developers and data engineers to interact with Fabric resources directly from the browser with full command history and flexible execution modes.

## Overview

The Fabric CLI Item enables users to:

- **Execute Fabric CLI commands** through an integrated terminal interface
- **Run native Python code** directly in Spark sessions
- **Execute shell commands** with subprocess support
- **Manage Spark sessions** with automatic reuse and validation
- **Select lakehouse and environment** for command execution context
- **Track command history** with arrow key navigation
- **Switch execution modes** dynamically between Native Python, Subprocess, and Fabric CLI

For technical architecture details, see [Architecture.md](./Architecture.md).

## Key Features

### Multiple Execution Modes

The Fabric CLI Item supports three distinct execution modes:

**Native Python (`NATIVE`)**
- Execute Python code directly in the Spark session
- Best for: Data processing, Spark operations, Python scripts
- Example: `df = spark.read.parquet("Files/data.parquet")`

**Subprocess (`SUBPROCESS`)**
- Execute shell commands via Python subprocess
- Supports pipes (`|`), redirections (`>`, `>>`), and complex shell operations
- Best for: File operations, system commands, shell scripts
- Example: `echo "Hello World" > myfile.txt`

**Fabric CLI (`FAB_CLI`)**
- Execute Fabric CLI commands with automatic `fab` prefix
- Integrated access to Fabric platform capabilities
- Best for: Fabric resource management, platform operations
- Example: `workspace list` (executed as `fab workspace list`)

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
- **Execution Mode Toggle**: Switch between execution modes via ribbon
- **Session Control**: Start/stop sessions from the ribbon

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
User Command → Execution Mode Selection → Command Wrapper → Spark Session
     ↓
NATIVE Mode → Direct Python Code → Spark Execution
     ↓
SUBPROCESS/FAB_CLI → subprocess.run(shell=True) → JSON Response
     ↓
Result Processing → Terminal Display → Command History
```

### Data Flow

```text
Session Creation → Environment + Lakehouse Selection → Session Validation
     ↓
Command Input → Mode-specific Wrapper → executeCommand()
     ↓
Spark Livy API → Statement Execution → Result Parsing
     ↓
Terminal Entry → Display with Formatting → History Storage
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
- **Execution Mode Dropdown**: Switch between Native, Subprocess, and Fabric CLI modes
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
  NATIVE = 'NATIVE',          // Native Python execution
  SUBPROCESS = 'SUBPROCESS',  // Shell commands via subprocess
  FAB_CLI = 'FAB_CLI'        // Fabric CLI with fab prefix
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

### Native Mode (NATIVE)

Direct Python code execution in Spark session:

```python
# User input
df = spark.read.parquet("Files/data.parquet")
df.show()

# Executed as-is in Spark session
```

### Subprocess Mode (SUBPROCESS)

Shell commands via Python subprocess:

```python
# User input
ls -la | grep txt

# Wrapped as
import subprocess
result = subprocess.run("ls -la | grep txt", shell=True, capture_output=True, text=True)
print(json.dumps({"stdout": result.stdout, "stderr": result.stderr, "returncode": result.returncode}))
```

### Fabric CLI Mode (FAB_CLI)

Fabric CLI commands with automatic prefix:

```python
# User input
workspace list

# Wrapped as
import subprocess
result = subprocess.run("fab workspace list", shell=True, capture_output=True, text=True)
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
- **Command History**: In-memory storage with efficient navigation
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

### Spark Livy
- **Session API**: Session creation, listing, and cancellation
- **Statement API**: Command execution and result retrieval
- **Batch Processing**: Support for long-running operations

### OneLake
- **Lakehouse Context**: Commands execute against selected lakehouse
- **File Operations**: Full access to lakehouse files and tables
- **Data Access**: Read/write operations through Spark

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

**Session Creation Fails**
- Verify Service Principal credentials are configured
- Check workspace permissions for Service Principal
- Ensure Spark environment is available
- Validate lakehouse access permissions

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

**Performance Issues**
- Clear terminal history with `clear` command
- Stop and restart session
- Check Spark environment capacity
- Review command complexity

## Future Enhancements

- **User Authentication**: Support for user-based authentication
- **Interactive Login**: Browser-based authentication flow
- **Multi-session Support**: Manage multiple concurrent sessions
- **Command Autocomplete**: IntelliSense for Fabric CLI commands
- **Output Export**: Save command results to files
- **Script Execution**: Run multi-line scripts from files
- **Session Templates**: Pre-configured session profiles
- **Advanced History**: Searchable command history with filters

## Related Resources

- [Fabric CLI Documentation](https://learn.microsoft.com/en-us/fabric/cicd/fabric-cli)
- [Spark Livy REST API](https://learn.microsoft.com/en-us/azure/synapse-analytics/spark/apache-spark-livy-rest-interface)
- [Service Principal Setup](../../../scripts/Setup/CreateFabricCLIServicePrincipal.ps1)
- [Architecture Documentation](./Architecture.md)
