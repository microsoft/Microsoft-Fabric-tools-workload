import { StatementRequest } from "../../../../clients/FabricPlatformTypes";
import { IConsoleCommand, ConsoleCommandContext } from "./IConsoleCommand";
import { Command, CommandType } from "../../CloudShellItemModel";
import { SessionKind } from "../SparkLivyCloudShellClient";
import { CloudShellItemEngine } from "../CloudShellItemEngine";

/**
 * Execute command - executes Cloud Shell commands via Spark Livy session
 * This handles the actual command execution through the active session
 */
export class ExecuteCommand implements IConsoleCommand {
    private static pythonWrapperContent: string | null = null;
    private executionMode: CommandType;

    constructor(
        executionMode: CommandType
    ) {
        this.executionMode = executionMode;
    }

    async execute(command: Command, context: ConsoleCommandContext): Promise<string | null> {
        const sessionId = context.sessionInfo.id;
        const sessionState = context.sessionInfo.state;
        
        if (!sessionId) {
            return 'Session needs to be started first. Click \'Start Terminal\' in the ribbon.';
        }

        // Check if session is ready (schedulerState should be 'Scheduled')
        const isSessionReady = sessionState?.toLowerCase() === 'scheduled';
        if (!isSessionReady) {
            return `Session is not ready. Current scheduler state: ${sessionState || 'Unknown'}. Please wait...`;
        }

        const workspaceId = context.item.definition.selectedLakehouse?.workspaceId;
        const lakehouseId = context.item.definition.selectedLakehouse?.id;
        
        if (!workspaceId || !lakehouseId) {
            return 'CloudShell configuration is incomplete. Please configure workspace and lakehouse.';
        }

        // Get CloudShell client from context
        const cliClient = context.engine.getCloudShellClient();

        // Build statement request based on execution mode
        const statementRequest = await this.buildStatementRequest(command.text, context);

        // Execute statement via lightweight client proxy
        const result = await cliClient.executeStatement(
            workspaceId,
            lakehouseId,
            sessionId,
            statementRequest
        );
        
        if (result.isError) {
            throw new Error(result.output);
        } else if (result.output && result.output.trim()) {
            return result.output;
        } else {
            // No output and no error - command executed successfully
            return null;
        }
    }

    /**
     * Build statement request based on execution mode
     */
    protected async buildStatementRequest(command: string, context: ConsoleCommandContext): Promise<StatementRequest> {
        if (this.executionMode === CommandType.PYTHON) {
            // Execute native Python code directly
            return { code: command, kind: SessionKind.PYTHON };
        } else {
            // Wrap command in Python wrapper for FAB_CLI or SHELL modes
            var code = await this.getPythonWrapperContent();

            // handle token replacement
            var fabTokens;
            // Default to frontend tokens (useFrontendToken defaults to true)
            if(context.fabCLIAuthInfo?.useFrontendToken !== false){
                // Get workload client from engine
                const workloadClient = context.engine.getWorkloadClient();
                // Acquire all authentication tokens
                fabTokens = await CloudShellItemEngine.getAuthTokens(workloadClient);
            }
            code = code.replace('REPLACE_WITH_FAB_TOKEN', fabTokens?.fab || '');
            code = code.replace('REPLACE_WITH_FAB_TOKEN_ONELAKE', fabTokens?.onelake || '');
            code = code.replace('FAB_TOKEN_AZURE', fabTokens?.azure || '');
            // Insert the command text into the wrapper
            const fullCommand = await this.getCommandText(command, context);
            code = code.replace('REPLACE_WITH_COMMAND', fullCommand);
            
            return { code: code, kind: SessionKind.PYTHON };
        
        }
    }

    protected async getCommandText(command: string, context: ConsoleCommandContext): Promise<string> {
        
        // Wrap command in Python subprocess format with shell=True to support pipes, redirections, etc.
        const escapedCommand = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        
        // Build command based on execution mode
        const fullCommand = this.executionMode === CommandType.FAB_CLI 
            ? `fab ${escapedCommand}` 
            : escapedCommand;

        return fullCommand;
    }


    private async getPythonWrapperContent(): Promise<string> {
        // Load the PythonCommandWrapper.py asset from the deployed assets folder (cached)
        if (!ExecuteCommand.pythonWrapperContent) {
            const response = await fetch('/assets/items/CloudShellItem/CommandWrapper.py');
            if (!response.ok) {
                throw new Error(`Failed to load PythonCommandWrapper.py: ${response.statusText}`);
            }
            ExecuteCommand.pythonWrapperContent = await response.text();
        }
        return ExecuteCommand.pythonWrapperContent;
    }

}
