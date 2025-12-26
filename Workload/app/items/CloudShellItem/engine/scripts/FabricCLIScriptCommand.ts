import { Script, ScriptParameterType } from "../../CloudShellItemModel";
import { ScriptCommandContext } from "./IScriptCommand";
import { BaseScriptCommand } from "./BaseScriptCommand";
import { SCOPES } from "../../../../clients/FabricPlatformScopes";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { getParameterValue, parameterValueToItemReference } from "./ScriptParameters";
import { FabricPlatformAPIClient } from "../../../../clients/FabricPlatformAPIClient";

/**
 * Command for executing Fabric CLI scripts as Spark batch jobs.
 * 
 * Wraps Fabric CLI commands with FabCliScriptWrapper.py which:
 * - Sets up authentication (OBO tokens or service principal)
 * - Executes fab commands via subprocess
 * - Captures and prints output
 * 
 * Script content format:
 * - One fab command per line
 * - Comments (#) ignored
 * - Variable substitution: $paramName or %paramName% replaced with parameter values
 * 
 * Authentication:
 * - OBO Token: Acquired from current user session (useFrontendToken=true)
 * - Service Principal: Client credentials from fabCLIAuthInfo
 * 
 * Parameters:
 * - Injected via Spark configuration
 * - Variable substitution in commands before execution
 * 
 * Example script content:
 * ```
 * ls -l $workspaceName.Workspace
 * item get --workspace-id $workspaceId --item-id $itemId
 * ```
 */
export class FabricCLIScriptCommand extends BaseScriptCommand {
    private static pythonWrapperContent: string | null = null;

    /**
     * Loads FabCliScriptWrapper.py from assets (cached).
     * 
     * The wrapper handles:
     * - Authentication setup (tokens or service principal login)
     * - Command execution via subprocess.run()
     * - Output capture and error handling
     * 
     * Static caching prevents repeated fetches.
     * 
     * @param script Fabric CLI script (content not used, wrapper is returned)
     * @param context Execution context (unused)
     * @returns Promise resolving to FabCliScriptWrapper.py content
     */
    protected async getPythonWrapperContent(script: Script, context: ScriptCommandContext): Promise<string> {
        // Load the PythonFabWrapper.py asset from the deployed assets folder (cached)
        if (!FabricCLIScriptCommand.pythonWrapperContent) {
            const response = await fetch('/assets/items/CloudShellItem/FabCliScriptWrapper.py');
            if (!response.ok) {
                throw new Error(`Failed to load PythonFabWrapper.py: ${response.statusText}`);
            }
            FabricCLIScriptCommand.pythonWrapperContent = await response.text();
        }
        return FabricCLIScriptCommand.pythonWrapperContent;
    }

    /**
     * Build Spark configuration for Fabric CLI execution.
     * 
     * Injects:
     * 1. Authentication info (OBO tokens or service principal credentials)
     * 2. Commands array (with variable substitution applied)
     * 
     * Variable Substitution:
     * - $paramName or %paramName% in commands replaced with parameter values
     * - Uses word boundary matching for $ format to avoid partial replacements
     * - Uses exact % delimiters for % format
     * 
     * Authentication Priority:
     * - If useFrontendToken=true: Acquire DEFAULT and ONELAKE tokens
     * - Otherwise: Use service principal credentials from fabCLIAuthInfo
     * 
     * @param script Fabric CLI script with commands and parameters
     * @param context Execution context with authentication info
     * @returns Promise resolving to Spark configuration object
     */
    protected async getAdditionalConf(script: Script, context: ScriptCommandContext): Promise<{ [key: string]: string; }> {
        const retVal: { [key: string]: string; } = {};
        
        // Configure authentication based on fabCLIAuthInfo
        if (context.fabCLIAuthInfo) {
            const authInfo: {
                clientId?: string;
                clientSecret?: string;
                tentantId?: string;
                oboToken?: string;
                oboTokenOnelake?: string;
            } = {
                ...context.fabCLIAuthInfo,
                oboToken: undefined,
                oboTokenOnelake: undefined,
            };
            if(context.fabCLIAuthInfo.useFrontendToken) {
                authInfo.oboToken = await this.getTokenForScopes(context.workloadClient, SCOPES.DEFAULT);
                authInfo.oboTokenOnelake = await this.getTokenForScopes(context.workloadClient, SCOPES.ONELAKE);
            }
            retVal[this.getParameterConfName("fabCLIAuthInfo")] = JSON.stringify(authInfo);
        }

        // Process script content to extract commands
        let commands = script.content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        
        if (commands.length === 0) {
            throw new Error('No executable commands found in Fabric CLI script');
        }

        // Replace variables $variableName or %variableName% with the actual value from script parameters
        if (script.parameters && script.parameters.length > 0) {
            // Parallelize parameter value resolution and conversion for better performance
            const parameterValues = await Promise.all(
                script.parameters.map(async param => {
                    return await getParameterValue(
                        param, 
                        context.item, 
                        context.workloadClient, 
                        FabricCLIScriptCommand.convertParameterValueForCLI
                    );
                })
            );
            
            commands = commands.map(cmd => {
                let processedCmd = cmd;
                script.parameters?.forEach((param, index) => {
                    const value = parameterValues[index];
                    
                    // Support both $paramName and %paramName% formats
                    // Pattern aligned with MonacoFabricCLILanguage: /[%$][a-zA-Z_][a-zA-Z0-9_]*%?/
                    // $paramName must be followed by non-alphanumeric/underscore character or end of string
                    // %paramName% must have both % delimiters
                    const variablePattern = new RegExp(`(\\$${ param.name}(?=[^a-zA-Z0-9_]|$)|%${ param.name}%)`, 'g');
                    processedCmd = processedCmd.replace(variablePattern, value);
                });
                return processedCmd;
            });
        }
        
        retVal[this.getParameterConfName("commands")] = JSON.stringify(commands);

        return retVal;
    }

    /**
     * Acquire access token for specified scopes using current user session.
     * 
     * Used for OBO (On-Behalf-Of) authentication in Fabric CLI scripts.
     * 
     * @param workloadClient Workload client for token acquisition
     * @param scopes Space-separated scopes string (e.g., SCOPES.DEFAULT)
     * @returns Promise resolving to access token
     */
    private async getTokenForScopes(workloadClient: WorkloadClientAPI, scopes: string | undefined): Promise<string> {
        const result = await workloadClient.auth.acquireFrontendAccessToken({ 
            scopes: scopes?.length ? scopes.split(' ') : [] 
        });
        return result.token;
    }

    /**
     * Convert parameter value to Fabric CLI format.
     * 
     * - WORKSPACE_REFERENCE (GUID) → [WorkspaceName].Workspace
     * - ITEM_REFERENCE (workspaceId/ItemId) → [ItemWorkspaceName].Workspace/[ItemName].[ItemType]
     * - Other types: Returns value as-is
     * 
     * @param paramType Type of parameter (WORKSPACE_REFERENCE, ITEM_REFERENCE, etc.)
     * @param value Current parameter value to convert
     * @param workloadClient Workload client for API calls
     * @returns Converted parameter value
     */
    private static async convertParameterValueForCLI(
        paramType: ScriptParameterType,
        value: string,
        workloadClient: WorkloadClientAPI
    ): Promise<string> {
        const fabricAPI = new FabricPlatformAPIClient(workloadClient);

        try {
            switch (paramType) {
                case ScriptParameterType.WORKSPACE_REFERENCE: {
                    // Convert GUID to [WorkspaceName].Workspace
                    if (!value) return '';
                    
                    const workspace = await fabricAPI.workspaces.getWorkspace(value);
                    return `${workspace.displayName}.Workspace`;
                }

                case ScriptParameterType.ITEM_REFERENCE: {
                    // Convert workspaceId/itemId to [ItemWorkspaceName].Workspace/[ItemName].[ItemType]
                    const itemReference = parameterValueToItemReference(value);
                    
                    // Fetch workspace and item details
                    const [workspace, item] = await Promise.all([
                        fabricAPI.workspaces.getWorkspace(itemReference.workspaceId),
                        fabricAPI.items.getItem(itemReference.workspaceId, itemReference.id)
                    ]);

                    return `${workspace.displayName}.Workspace/${item.displayName}.${item.type}`;
                }

                default:
                    return value;
            }
        } catch (error) {
            console.error(`Failed to convert parameter value:`, error);
            return value; // Fallback to original value on error
        }
    }


}