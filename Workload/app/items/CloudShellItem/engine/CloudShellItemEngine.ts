import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { BatchResponse } from "../../../clients/FabricPlatformTypes";
import { Script, Command, ScriptType } from "../CloudShellItemModel";
import { FABRIC_BASE_SCOPES, SCOPES } from "../../../clients/FabricPlatformScopes";
import { SparkLivyCloudShellClient } from "./SparkLivyCloudShellClient";
import { IScriptCommand, ScriptCommandContext } from "./scripts/IScriptCommand";
import { PythonScriptCommand } from "./scripts/PythonScriptCommand";
import { FabricCLIScriptCommand } from "./scripts/FabricCLIScriptCommand";
import { 
    IConsoleCommand,
    ConsoleCommandContext,
    HelpCommand,
    ClearCommand,
    RunScriptCommand,
    ExecuteCommand
} from "./index";

/**
 * Engine for executing CloudShell commands and scripts.
 * 
 * Uses the Command pattern to delegate execution to type-specific handlers:
 * 
 * **Script Commands** (Batch Jobs):
 * - PythonScriptCommand: Direct Python execution in Spark
 * - FabricCLIScriptCommand: Fabric CLI via wrapper
 * - ShellScriptCommand: Shell commands via subprocess
 * 
 * **Console Commands** (Local Execution):
 * - HelpCommand: Display usage information
 * - ClearCommand: Clear terminal
 * - RunScriptCommand: Execute saved script as batch job
 * - ExecuteCommand: Execute statements in Spark session
 * 
 * Responsibilities:
 * - Command routing to appropriate handlers
 * - Context assembly for command execution
 * - Access to shared clients (Spark Livy, Workload)
 */
export class CloudShellItemEngine {
    private readonly workloadClient: WorkloadClientAPI;
    private readonly cloudShellClient: SparkLivyCloudShellClient;
    private readonly scriptCommands: Map<ScriptType, IScriptCommand>;
    private readonly consoleCommands: Map<string, () => IConsoleCommand>;

    constructor(workloadClient: WorkloadClientAPI) {
        this.workloadClient = workloadClient;
        this.cloudShellClient = new SparkLivyCloudShellClient(workloadClient);
        // Register script command handlers
        this.scriptCommands = new Map<ScriptType, IScriptCommand>([
            [ScriptType.PYTHON, new PythonScriptCommand()],
            //[ScriptType.SHELL, new ShellScriptCommand()],
            [ScriptType.FAB_CLI, new FabricCLIScriptCommand()]
        ]);
        // Register console command handlers (factories for stateful commands)
        this.consoleCommands = new Map<string, () => IConsoleCommand>([
            ['help', () => new HelpCommand()],
            ['clear', () => new ClearCommand()],
            ['cls', () => new ClearCommand()],
            ['run', () => new RunScriptCommand()]
        ]);    
    }


    /**
     * Execute a script as a batch job
     * @param script The script to execute
     * @param context The script execution context
     * @param parameters Optional runtime parameter values (key-value pairs) that override script's default parameters
     * @returns Promise resolving to the batch response
     */
    async executeScript(
        script: Script,
        context: ScriptCommandContext,
        parameters?: Record<string, string>
    ): Promise<BatchResponse> {
        const scriptType = script.type ?? ScriptType.FAB_CLI;
        const command = this.scriptCommands.get(scriptType);
        if (!command) {
            throw new Error(`Unsupported script type: ${scriptType}`);
        }

        return await command.execute(script, context, parameters);
    }

    /**
     * Execute a console command (help, clear, run, etc.)
     * Returns the command output message (if any)
     */
    async executeConsoleCommand(
        command: Command,
        context: ConsoleCommandContext
    ): Promise<string | null> {
        const trimmedCommand = command.text.trim().toLowerCase().split(' ')[0];
        
        // Check each registered console command
        for (const [commandPrefix, commandFactory] of this.consoleCommands.entries()) {
            if (trimmedCommand === commandPrefix) {
                // Exact match, no arguments
                const consoleCommand = commandFactory();
                const commandObj: Command = {
                    text: command.text.substring(trimmedCommand.length).trim(),
                    timestamp: command.timestamp,
                    type: command.type
                };
                return await consoleCommand.execute(commandObj, context);
            }
        }
        const executionCommand = new ExecuteCommand(command.type);
        return await executionCommand.execute(command, context);
    }

    /**
     * Get the CloudShell client instance
     * @returns The SparkLivyCloudShellClient
     */
    getCloudShellClient(): SparkLivyCloudShellClient {
        return this.cloudShellClient;
    }

    /**
     * Get the Workload client instance
     * @returns The WorkloadClientAPI
     */
    getWorkloadClient(): WorkloadClientAPI {
        return this.workloadClient;
    }

    /**
     * Acquire all required authentication tokens for Fabric CLI
     * @param workloadClient Workload client for token acquisition
     * @returns Promise resolving to object with fab, onelake, and azure tokens
     */
    static async getAuthTokens(workloadClient: WorkloadClientAPI): Promise<{ fab: string; onelake: string; azure: string }> {
        const [fabToken, onelakeToken] = await Promise.all([
            CloudShellItemEngine.getTokenForScopes(workloadClient, SCOPES.DEFAULT),
            CloudShellItemEngine.getTokenForScopes(workloadClient, FABRIC_BASE_SCOPES.ONELAKE_STORAGE)
        ]);
        
        return {
            fab: fabToken,
            onelake: onelakeToken,
            azure: '' // Azure token not required for current Fabric CLI operations
        };
    }

    /**
     * Acquire authentication token for specified scopes
     * @param workloadClient Workload client for token acquisition
     * @param scopes Token scope string (space-separated if multiple)
     * @returns Promise resolving to OBO token string
     */
    private static async getTokenForScopes(workloadClient: WorkloadClientAPI, scopes: string | undefined): Promise<string> {
        // Split scopes and replace api.fabric.microsoft.com audience with analysis.windows.net/powerbi/api
        // fabric cli does not work with api.fabric.microsoft.com audience
        const scopeArray = scopes?.length ? scopes.split(' ') : [];
        const adjustedScopes = scopeArray.map(scope => 
            scope.replace('https://api.fabric.microsoft.com/', 'https://analysis.windows.net/powerbi/api/')
        );
        
        const result = await workloadClient.auth.acquireFrontendAccessToken({ 
            scopes: adjustedScopes
        });
        return result.token;
    }

}
