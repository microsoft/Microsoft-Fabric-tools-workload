import { ItemReference } from "../../controller/ItemCRUDController";

/**
 * Execution mode for Cloud Shell commands in the terminal interface.
 * 
 * - **FAB_CLI**: Default mode. Executes Fabric CLI commands with automatic 'fab' prefix via subprocess.
 *   Example: User types "ls -l MyWorkspace.Workspace" → executed as "fab ls -l MyWorkspace.Workspace"
 * 
 * - **PYTHON**: Executes native Python code directly in the Spark session without wrapping.
 *   Example: User types "print('Hello')" → executed as-is in Spark session
 * 
 * - **SHELL**: Executes shell commands via Python subprocess wrapper with JSON result handling.
 *   Example: User types "echo Hello" → wrapped in subprocess.run() with output capture
 */
export enum CommandType {
  /** Execute native Python code directly in Spark session without any wrapper */
  PYTHON = 'python',
  /** Execute shell commands via Python subprocess with JSON output */
  SHELL = 'shell',
  /** Execute Fabric CLI commands with automatic 'fab' prefix (DEFAULT) */
  FAB_CLI = 'fabcli'
}

/**
 * Parameter types for script execution.
 * 
 * Types determine how values are converted during script execution:
 * - STRING: Text values, no conversion
 * - INT: Integer numbers
 * - FLOAT: Decimal numbers
 * - BOOL: Boolean true/false
 * - DATE: ISO date strings
 * - ITEM_REFERENCE: Reference to a Fabric item (stored as item ID)
 */
export enum ScriptParameterType {
  /** Text string parameter */
  STRING = 'string',
  /** Integer number parameter */
  INT = 'int',
  /** Floating point number parameter */
  FLOAT = 'float',
  /** Boolean parameter */
  BOOL = 'bool',
  /** Date parameter (ISO string format) */
  DATE = 'date',
  /** GUID parameter (UUID format) */
  GUID = 'guid',
  /** Item reference parameter (Fabric item ID) */
  ITEM_REFERENCE = 'itemReference',
  /** Workspace reference parameter (Fabric workspace ID) */
  WORKSPACE_REFERENCE = 'workspaceReference'
}

/**
 * Parameter definition for a script (Python, Shell, or Fabric CLI).
 * 
 * Parameters are injected into batch job execution via Spark configuration:
 * - spark.script.param.<name> = value
 * - spark.script.param.<name>.type = type
 * 
 * Scripts can access parameters using helper functions that handle type conversion.
 * 
 * @example
 * // In Python script:
 * def get_parameter(param_name, param_type="string", default_value=None):
 *     value = spark.conf.get(f"spark.script.param.{param_name}", default_value)
 *     if param_type == "int": return int(value)
 *     # ... type conversion logic
 */
export interface ScriptParameter {
  /** Parameter name (used as key in Spark configuration) */
  name: string;
  /** Parameter type for type-safe conversion in scripts */
  type: ScriptParameterType;
  /** Default parameter value (stored as string, converted by type during script execution) */
  defaultValue?: string;
  /** Optional description of the parameter's purpose */
  description?: string;
  /** If true, parameter is a system parameter that cannot be deleted or renamed */
  isSystemParameter?: boolean;
}

/**
 * Supported script types for batch job execution.
 * 
 * Scripts are stored in OneLake at: {workspaceId}/{itemId}/Scripts/{scriptName}
 * Each type uses a specific wrapper for execution:
 * 
 * - **PYTHON**: Direct Python execution in Spark
 * - **FABCLI**: Fabric CLI commands wrapped with FabCliScriptWrapper.py
 * 
 * Note: SHELL type is currently commented out (not implemented)
 */
export enum ScriptType {
  /** Python script executed directly in Spark session */
  PYTHON = 'python',
  /** Shell script (not currently supported) */
  //SHELL = 'shell',
  /** Fabric CLI script executed via FabCliScriptWrapper.py with authentication */
  FABCLI = 'fabcli'
}

/**
 * Metadata for a script stored in the item definition.
 * 
 * **Name-Based Identification**: The name serves as the unique identifier (no separate ID needed).
 * File extensions determine storage path:
 * - .py → Python script
 * - .fab → Fabric CLI script
 * - .sh → Shell script (not currently supported)
 * 
 * **Storage Pattern**:
 * - Metadata: Stored in main item definition (cloudShellDefinition.scripts[])
 * - Content: Stored as separate OneLake file at Scripts/{name}
 * 
 * Type defaults to 'python' if not specified for backward compatibility.
 */
export interface ScriptMetadata {
  /** Unique script name with extension (.py, .fab, .sh) - used as identifier */
  name: string;
  /** Script type determining execution wrapper (defaults to PYTHON) */
  type?: ScriptType;
  /** Parameters for parameterized execution with type-safe injection */
  parameters?: ScriptParameter[];
  /** ISO timestamp of script creation */
  createdAt?: string;
  /** ISO timestamp of last modification */
  modifiedAt?: string;
}

/**
 * Full script object combining metadata and content.
 * 
 * Used in runtime for script editing and execution.
 * Content is loaded from OneLake on demand and not stored in the main definition.
 * 
 * Storage separation:
 * - ScriptMetadata: In cloudShellDefinition.scripts[]
 * - content: In OneLake at Scripts/{name} as DefinitionPart
 */
export interface Script extends ScriptMetadata {
  /** Script source code loaded from OneLake */
  content: string;
}

/**
 * Command executed in the Cloud Shell terminal interface.
 * 
 * Commands can be:
 * - Console commands: help, clear, run {scriptName}
 * - Fabric CLI commands: executed with 'fab' prefix in FAB_CLI mode
 * - Python code: executed directly in Spark session in PYTHON mode  
 * - Shell commands: executed via subprocess in SHELL mode
 * 
 * Not persisted - exists only in runtime state for terminal display.
 */
export interface Command {
  /** Command text as entered by user */
  text: string;
  /** When the command was executed */
  timestamp: Date;
  /** Execution mode (CommandType) used for this command */
  type: CommandType;
  /** Optional command result (populated after execution) */
  result?: CommandResult;
}

/**
 * Result of executing a command
 */
export interface CommandResult {
  /** Whether execution was successful */
  success: boolean;
  /** Output or error message */
  output: string;
  /** When the result was received */
  timestamp: Date;
}

/**
 * Data model for CloudShellItem persisted in Fabric storage.
 * 
 * **Persistence Strategy**:
 * - Main definition: Configuration and script metadata (JSON)
 * - Definition parts: Script content files in Scripts/ folder
 * 
 * **Session Management**:
 * - lastSparkSessionId enables automatic session reuse on reload
 * - Sessions are validated before reuse (schedulerState='Scheduled', livyState='idle')
 * - Session ID cleared when lakehouse changes or session stops
 * 
 * **Script Storage**:
 * - scripts[]: Array of ScriptMetadata (names, parameters, timestamps)
 * - Actual script content: OneLake files at Scripts/{scriptName}
 */
export interface CloudShellItemDefinition {
  /** Selected lakehouse providing execution context and data access */
  selectedLakehouse?: ItemReference;
  /** Last Spark session ID for automatic session reuse across item reloads */
  lastSparkSessionId?: string;
  /** Selected Spark environment (determines Python packages and Spark configuration) */
  selectedSparkEnvironment?: ItemReference;
  /** Script metadata array (content stored separately in OneLake at Scripts/{name}) */
  scripts?: ScriptMetadata[];
}