import { ConsoleCommandContext } from "./IConsoleCommand";
import { CommandType } from "../../CloudShellItemModel";
import { SCOPES } from "../../../../clients/FabricPlatformScopes";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ExecuteCommand } from "./ExecuteCommand";

/**
 * FabCLI Login command - acquires OBO tokens and executes Fabric CLI authentication test
 * 
 * This command extends ExecuteCommand to:
 * 1. Acquire OBO tokens (DEFAULT and ONELAKE scopes) when useFrontendToken is enabled
 * 2. Set FAB_TOKEN and FAB_TOKEN_ONELAKE environment variables using shell export
 * 3. Execute a Fabric CLI command to test authentication
 * 
 * The command overrides getCommandText to inject authentication tokens using shell syntax
 * (export commands chained with &&) before the fab command.
 */
export class FabCLILoginCommand extends ExecuteCommand {
    
    constructor() {
        super(CommandType.FAB_CLI);
    }
    
    /**
     * Acquire authentication token for specified scopes
     * @param workloadClient Workload client for token acquisition
     * @param scopes Token scope string (space-separated if multiple)
     * @returns Promise resolving to OBO token string
     */
    private async getTokenForScopes(workloadClient: WorkloadClientAPI, scopes: string | undefined): Promise<string> {
        const result = await workloadClient.auth.acquireFrontendAccessToken({ 
            scopes: scopes?.length ? scopes.split(' ') : [] 
        });
        return result.token;
    }

    /**
     * Override getCommandText to inject authentication tokens using shell syntax
     * Returns a shell command that sets environment variables and runs fab command
     */
    protected async getCommandText(command: string, context: ConsoleCommandContext): Promise<string> {
        // Only perform login if useFrontendToken is enabled
        if (!context.fabCLIAuthInfo?.useFrontendToken) {
            throw new Error('Frontend token authentication is not enabled. Please configure fabCLIAuthInfo.useFrontendToken in your item settings.');
        }

        // Get workload client from engine
        const workloadClient = context.engine.getWorkloadClient();
        
        // Acquire OBO tokens (same as FabricCLIScriptCommand)
        const defaultToken = await this.getTokenForScopes(workloadClient, SCOPES.DEFAULT);
        const onelakeToken = await this.getTokenForScopes(workloadClient, SCOPES.ONELAKE);
        
        // Escape tokens for shell usage (escape backslashes and double quotes)
        const escapedDefaultToken = defaultToken.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const escapedOnelakeToken = onelakeToken.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        
        // Use the command provided, or default to "auth status"
        const fabCommand = command.trim() || "auth status";
        
        // Build shell command that exports tokens and runs fab command
        // Using && to chain commands ensures each step succeeds before continuing
        const fullCommand = `export FAB_TOKEN="${escapedDefaultToken}" && export FAB_TOKEN_ONELAKE="${escapedOnelakeToken}" && fab ${fabCommand}`;
        
        return fullCommand;
    }
}
