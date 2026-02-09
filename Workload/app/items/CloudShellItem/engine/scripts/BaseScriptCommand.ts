import { WorkloadClientAPI } from "src/clients";
import { BatchRequest, BatchResponse } from "../../../../clients/FabricPlatformTypes";
import { OneLakeStorageClient } from "../../../../clients/OneLakeStorageClient";
import { EnvironmentConstants } from "../../../../constants";
import { Script, ScriptParameterType } from "../../CloudShellItemModel";
import { IScriptCommand, ScriptCommandContext } from "./IScriptCommand";
import { getParameterValue } from "./ScriptParameters";

/**
 * Base class for script commands that upload content to OneLake and submit Spark batch jobs.
 * 
 * Provides common functionality for all script execution types:
 * - OneLake file upload with timestamp-based unique names
 * - Batch job submission with standard configuration
 * - Parameter injection via Spark configuration
 * - URL conversion for ABFSS paths
 * 
 * Subclasses implement getPythonWrapperContent() to define script-specific wrapping:
 * - PythonScriptCommand: Returns script content as-is
 * - FabricCLIScriptCommand: Wraps with FabCliScriptWrapper.py
 * - ShellScriptCommand: Wraps with shell subprocess wrapper
 * 
 * Template Method Pattern:
 * execute() defines the workflow, getPythonWrapperContent() is the hook.
 */
export abstract class BaseScriptCommand implements IScriptCommand {
    
    /**
     * Generate the Python content to be uploaded to OneLake for batch execution.
     * 
     * Subclasses implement this to provide script-specific wrapping logic.
     * The generated content must be valid Python that Spark can execute.
     * 
     * @param script Script object with content, parameters, and metadata
     * @param context Execution context with authentication and clients
     * @returns Promise resolving to Python code ready for batch execution
     */
    protected abstract getPythonWrapperContent(script: Script, context: ScriptCommandContext): Promise<string>;

    /**
     * Execute the script by uploading to OneLake and submitting a Spark batch job.
     * 
     * Workflow:
     * 1. Generate Python content via getPythonWrapperContent()
     * 2. Upload to OneLake at Scripts/{timestamp}_{scriptName}.py
     * 3. Convert OneLake path to ABFSS format for Spark
     * 4. Build batch request with lakehouse, environment, and parameters
     * 5. Submit batch job and return response with batch ID
     * 
     * @param script Script to execute with content and parameters
     * @param context Execution context with item, clients, and authentication
     * @param parameters Optional runtime parameter values (key-value pairs) that override script's default parameters
     * @returns Promise resolving to BatchResponse for monitoring
     */
    async execute(script: Script, context: ScriptCommandContext, parameters?: Record<string, string>): Promise<BatchResponse> {

        // Step 1: Generate Python content to upload
        const parameterConf = await this.getParameterConf(script, context, parameters);
        const additionalConf = await this.getAdditionalConf(script, context, parameters);

        // Step 2: Upload script content to OneLake
        const oneLakeClient = new OneLakeStorageClient(context.workloadClient);
        const timestamp = new Date().getTime();
        const sanitizedScriptName = script.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        
        // Generate the content to upload
        const content = await this.getPythonWrapperContent(script, context);
        
        const scriptPath = `Scripts/${timestamp}_${sanitizedScriptName}.py`;

        const scriptFullPath = OneLakeStorageClient.getFilePath(
            context.item.definition.selectedLakehouse.workspaceId, 
            context.item.definition.selectedLakehouse.id!, 
            scriptPath);
        
        await oneLakeClient.writeFileAsText(scriptFullPath, content);
        
        const scriptUrl = `${EnvironmentConstants.OneLakeDFSBaseUrl}/${scriptFullPath}`;
        const scriptAbfss = this.convertOneLakeLinkToABFSSLink(scriptUrl, 
            context.item.definition.selectedLakehouse.workspaceId);
        
        // Step 3: Build batch request with configuration and parameters
        const batchRequest: BatchRequest = {
            name: `CloudShell Script: ${script.name} - ${new Date().toISOString()}`,
            file: scriptAbfss,
            conf: {
                "spark.targetLakehouse": context.item.definition.selectedLakehouse.id!,
                "spark.fabric.environmentDetails": `{"id" : "${context.item.definition.selectedSparkEnvironment.id!}"}`,
                ...parameterConf,
                ...additionalConf
            },
            tags: {
                source: "Cloud Shell Item",
                scriptName: script.name,
                scriptType: script.type
            }
        };

        return await context.engine.getCloudShellClient().submitBatchJob(
            context.item.definition.selectedLakehouse.workspaceId,
            context.item.definition.selectedLakehouse.id!, 
            batchRequest);
    }


    /**
     * Build Spark configuration for script parameters.
     * 
     * Converts ScriptParameter[] to Spark conf format:
     * spark.script.param.{name} = value
     * 
     * System parameters (isSystemParameter=true) are populated from context at runtime,
     * not from the saved parameter value.
     * 
     * Runtime parameters passed to execute() override both default values and system parameters.
     * 
     * Scripts access these via spark.conf.get() with type conversion.
     * 
     * @param script Script with parameters to inject
     * @param context Execution context with item information for system parameters
     * @param parameters Optional runtime parameter values that override script's default parameters
     * @returns Record of Spark configuration keys and values
     */
    private async getParameterConf(script: Script, context: ScriptCommandContext, parameters?: Record<string, string>): Promise<Record<string, string>> {
        const parameterConf: Record<string, string> = {};
        
        if (!script.parameters || script.parameters.length === 0) {
            return parameterConf;
        }

        // Create a converter function that includes the context
        const converter = async (paramType: ScriptParameterType, value: string, workloadClient: WorkloadClientAPI) => {
            try {
                return await this.convertParameterValueForCLI(paramType, value, workloadClient, context);
            } catch (error) {
                console.error(`[BaseScriptCommand] Error converting parameter value (type: ${paramType}):`, error);
                return value; // Fallback to original value on error
            }
        };
        
        // Process parameters sequentially to avoid race conditions with Variable Library API
        for (const param of script.parameters) {
            try {
                // Pass runtime value if provided for this parameter
                const runtimeValue = parameters?.[param.name];
                const paramValue = await getParameterValue(param, 
                    runtimeValue, 
                    context.item, 
                    context.workloadClient, 
                    converter
                );
                parameterConf[this.getParameterConfName(param.name)] = paramValue;
            } catch (error) {
                console.error(`[BaseScriptCommand] Error resolving parameter ${param.name}:`, error);
                parameterConf[this.getParameterConfName(param.name)] = param.defaultValue || ''; // Fallback to default value
            }
        }
        
        return parameterConf;
    }

    /**
     * Convert parameter value to CLI-compatible format.
     * 
     * Base implementation resolves VARIABLE types and returns other values as-is.
     * Override in subclasses (e.g., FabricCLIScriptCommand) to convert special types like
     * WORKSPACE_REFERENCE or ITEM_REFERENCE to Fabric CLI format.
     * 
     * @param paramType Type of the parameter being converted
     * @param value Parameter value to convert
     * @param workloadClient Workload client for API calls if conversion requires API access
     * @param context Script execution context containing item information
     * @returns Promise resolving to converted parameter value
     */
    protected async convertParameterValueForCLI(
            paramType: ScriptParameterType,
            value: string,
            workloadClient: WorkloadClientAPI,
            context: ScriptCommandContext
        ): Promise<string> {
            // Handle VARIABLE type resolution in base class so all script types support it
            if (paramType === ScriptParameterType.VARIABLE && value) {
                return await this.handleVariableLibraryType(value, workloadClient, context);
            }
            
            return value;
        }

    /**
     * Resolve a VARIABLE type parameter by calling the Variable Library API.
     * 
     * Resolves the variable reference and recursively converts the resolved value
     * to the appropriate parameter type (Integer → INT, ItemReference → ITEM_REFERENCE, etc.)
     * 
     * @param value Variable reference identifier from Variable Library picker
     * @param workloadClient Workload client for API calls
     * @param context Script execution context containing item information
     * @returns Promise resolving to the resolved and converted variable value
     */
    private async handleVariableLibraryType(
            value: string,
            workloadClient: WorkloadClientAPI,
            context: ScriptCommandContext
        ): Promise<string> {
            try {
                // Ensure we have a valid item ID for the consuming item
                if (!context?.item?.id) {
                    throw new Error('Cannot resolve variable: context.item.id is undefined');
                }

                // Variable reference format from Variable Library picker
                // The API will resolve this to the actual value
                const response = await workloadClient.variableLibrary.resolveVariableReferences({
                    consumingItemObjectId: context.item.id,
                    variableReferences: [value]
                });

                if (response.results && response.results.length > 0) {
                    const resolved = response.results[0];
                    if (resolved.status === 'Ok') {
                        // Recursively convert resolved variables using the appropriate parameter type
                        const resolvedType = resolved.type || '';
                        const resolvedValue = resolved.value as any;
                        
                        // For ItemReference type, recursively convert to get proper formatting
                        if (resolvedType === 'ItemReference' && resolvedValue?.workspaceId && resolvedValue?.itemId) {
                            return await this.convertParameterValueForCLI(
                                ScriptParameterType.ITEM_REFERENCE,
                                `${resolvedValue.workspaceId}/${resolvedValue.itemId}`,
                                workloadClient,
                                context
                            );
                        }
                        
                        // For simple types, just return the string value directly
                        return String(resolvedValue || '');
                        
                    } else {
                        console.error(`Failed to resolve variable: ${resolved.status} - Reference: ${value}`);
                        return value; // Fallback to reference if resolution fails
                    }
                }
                
                return value;
            } catch (error) {
                console.error('[BaseScriptCommand] Failed to resolve variable reference:', error);
                return value; // Return original reference on error
            }
        }

    /**
     * Get Spark configuration key for a parameter.
     * 
     * Standard pattern: spark.script.param.{name}
     * 
     * @param paramName Parameter name
     * @returns Spark configuration key
     */
    protected getParameterConfName(paramName: string): string {
        return `spark.script.param.${paramName}`;
    }

    /**
     * Get additional script-specific Spark configuration properties.
     * 
     * Override this method to add custom configuration for specific script types.
     * Used by FabricCLIScriptCommand to inject commands and authentication.
     * 
     * @param script Script being executed
     * @param context Execution context
     * @param parameters Optional runtime parameter values that override script's default parameters
     * @returns Promise resolving to additional Spark conf properties
     */
    protected async getAdditionalConf(script: Script, context: ScriptCommandContext, parameters?: Record<string, string>): Promise<Record<string, string>> {
        return {};
    }

    /**
     * Convert OneLake URL to ABFSS format required by Spark.
     * 
     * Transformation:
     * https://{workspace}/file.py → abfss://{workspace}@onelake.dfs.fabric.microsoft.com/file.py
     * 
     * @param oneLakeLink OneLake URL from getFilePath()
     * @param workspaceId Workspace ID
     * @returns ABFSS-formatted path for Spark batch file property
     */
    protected convertOneLakeLinkToABFSSLink(oneLakeLink: string, workspaceId: string): string {
        let abfssPath = oneLakeLink.replace(`${workspaceId}/`, "");
        abfssPath = abfssPath.replace("https://", `abfss://${workspaceId}@`);
        return abfssPath;
    }
}
