import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { SparkLivyCloudShellClient, SessionKind } from "../../CloudShellItem/engine/SparkLivyCloudShellClient";
import { CopilotClient, CopilotResponse, FabricAction, CopilotClientConfig } from "./CopilotClient";
import { CopilotModelId } from "../GithubCopilotCLIItemModel";
import { CloudShellItemEngine } from "../../CloudShellItem/engine/CloudShellItemEngine";
import { StatementRequest } from "../../../clients/FabricPlatformTypes";

/**
 * Result of executing a Copilot action
 */
export interface ActionExecutionResult {
    success: boolean;
    output: string;
    isError: boolean;
}

/**
 * Context for executing Fabric actions
 */
export interface FabricActionContext {
    workspaceId: string;
    lakehouseId: string;
    sessionId: string;
}

/**
 * Engine for GitHub Copilot CLI integration with Fabric
 * 
 * This engine combines:
 * - GitHub Copilot for AI-assisted chat and code generation
 * - Fabric CLI execution via Spark Livy sessions
 * - Python code execution in Spark
 * 
 * The engine allows users to:
 * 1. Chat with Copilot about Fabric operations
 * 2. Get AI-generated Fabric CLI commands
 * 3. Execute those commands directly in a Spark session
 */
export class GithubCopilotCLIEngine {
    private workloadClient: WorkloadClientAPI;
    private copilotClient: CopilotClient;
    private cloudShellClient: SparkLivyCloudShellClient;
    private static pythonWrapperContent: string | null = null;

    constructor(workloadClient: WorkloadClientAPI, model: CopilotModelId) {
        this.workloadClient = workloadClient;
        this.cloudShellClient = new SparkLivyCloudShellClient(workloadClient);
        
        // Initialize Copilot client with the selected model
        const config: CopilotClientConfig = {
            model: model
        };
        this.copilotClient = new CopilotClient(workloadClient, config);
    }

    /**
     * Send a chat message to Copilot
     */
    async chat(message: string): Promise<CopilotResponse> {
        return await this.copilotClient.chat(message);
    }

    /**
     * Execute a Fabric action in a Spark session
     * 
     * @param action The action to execute
     * @param context Execution context with session info
     */
    async executeAction(
        action: FabricAction,
        context: FabricActionContext
    ): Promise<ActionExecutionResult> {
        if (!context.sessionId) {
            return {
                success: false,
                output: 'No active session. Please start a session first using CloudShell.',
                isError: true
            };
        }

        try {
            let statementRequest: StatementRequest;

            if (action.type === 'fab_cli' && action.command) {
                // Wrap Fabric CLI command in Python subprocess
                statementRequest = await this.buildFabCLIRequest(action.command);
            } else if (action.type === 'python' && action.command) {
                // Execute Python directly
                statementRequest = {
                    code: action.command,
                    kind: SessionKind.PYTHON
                };
            } else {
                return {
                    success: false,
                    output: 'No executable command in action',
                    isError: true
                };
            }

            // Execute via Cloud Shell client
            const result = await this.cloudShellClient.executeStatement(
                context.workspaceId,
                context.lakehouseId,
                context.sessionId,
                statementRequest
            );

            return {
                success: !result.isError,
                output: result.output,
                isError: result.isError
            };
        } catch (error: any) {
            return {
                success: false,
                output: `Execution error: ${error.message}`,
                isError: true
            };
        }
    }

    /**
     * Build a Fabric CLI request wrapped in Python
     */
    private async buildFabCLIRequest(command: string): Promise<StatementRequest> {
        const wrapperCode = await this.getPythonWrapperContent();
        
        // Get auth tokens for Fabric CLI
        const fabTokens = await CloudShellItemEngine.getAuthTokens(this.workloadClient);
        
        // Replace placeholders in wrapper
        let code = wrapperCode
            .replace('REPLACE_WITH_FAB_TOKEN', fabTokens.fab || '')
            .replace('REPLACE_WITH_FAB_TOKEN_ONELAKE', fabTokens.onelake || '')
            .replace('FAB_TOKEN_AZURE', fabTokens.azure || '');

        // Build the full command
        const fullCommand = command.startsWith('fab ') ? command : `fab ${command}`;
        const escapedCommand = fullCommand.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        code = code.replace('REPLACE_WITH_COMMAND', escapedCommand);

        return { code, kind: SessionKind.PYTHON };
    }

    /**
     * Load the Python command wrapper
     */
    private async getPythonWrapperContent(): Promise<string> {
        if (!GithubCopilotCLIEngine.pythonWrapperContent) {
            const response = await fetch('/assets/items/CloudShellItem/CommandWrapper.py');
            if (!response.ok) {
                throw new Error(`Failed to load CommandWrapper.py: ${response.statusText}`);
            }
            GithubCopilotCLIEngine.pythonWrapperContent = await response.text();
        }
        return GithubCopilotCLIEngine.pythonWrapperContent;
    }

    /**
     * Update the model used by Copilot
     */
    setModel(model: CopilotModelId): void {
        this.copilotClient.setModel(model);
    }

    /**
     * Clear conversation history
     */
    clearHistory(): void {
        this.copilotClient.clearHistory();
    }

    /**
     * Get the underlying Cloud Shell client for session management
     */
    getCloudShellClient(): SparkLivyCloudShellClient {
        return this.cloudShellClient;
    }
}
