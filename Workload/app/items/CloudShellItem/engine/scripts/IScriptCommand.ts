import { BatchResponse } from "../../../../clients/FabricPlatformTypes";
import { Script, CloudShellItemDefinition } from "../../CloudShellItemModel";
import { ItemWithDefinition } from "../../../../controller/ItemCRUDController";
import { CloudShellItemEngine } from "../CloudShellItemEngine";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { SparkLivyCloudShellClient } from "../SparkLivyCloudShellClient";

/**
 * Authentication information for Fabric CLI and script execution.
 * 
 * Supports multiple authentication methods:
 * - Frontend token (OBO): Uses current user's token for authentication
 * - Service Principal: Uses client credentials for automated scenarios
 * 
 * Authentication is injected into batch jobs via Spark configuration
 * and consumed by wrapper scripts (FabCliScriptWrapper.py).
 */
export interface AuthenticationInfo {
    /** Use On-Behalf-Of token from current user session for Fabric API calls */
    useFrontendToken: boolean;
    
    /** Client ID for service principal authentication (optional) */
    clientId?: string;
    
    /** Client secret for service principal authentication (optional) */
    clientSecret?: string;

    /** Tenant ID for service principal authentication (optional) */
    tentantId?: string;
}

/**
 * Base context shared by all command execution types.
 * 
 * Provides access to item metadata, configuration, and execution services.
 * Extended by ScriptCommandContext and ConsoleCommandContext for specific needs.
 */
export interface CommandContext {
    /** Item with definition containing workspace, item IDs, lakehouse, environment, and scripts */
    item: ItemWithDefinition<CloudShellItemDefinition>;

    /** CloudShell engine for coordinating script and console command execution */
    engine: CloudShellItemEngine;
    
    /** Authentication configuration for Fabric CLI commands and API access */
    fabCLIAuthInfo?: AuthenticationInfo;
}

/**
 * Context provided to script commands during batch job execution.
 * 
 * Extends CommandContext with Spark-specific clients needed for:
 * - Batch job submission and monitoring
 * - OneLake file uploads for script storage
 * - Token acquisition for authentication
 * - Spark configuration injection
 */
export interface ScriptCommandContext extends CommandContext {
    /** Workload client for authentication tokens and Fabric platform operations */
    workloadClient: WorkloadClientAPI;
    
    /** Spark Livy client for batch job submission and session management */
    cloudShellClient: SparkLivyCloudShellClient;
}

/**
 * Interface for script execution commands that run as Spark batch jobs.
 * 
 * Implementations:
 * - PythonScriptCommand: Direct Python execution in Spark
 * - FabricCLIScriptCommand: Fabric CLI commands via wrapper
 * - ShellScriptCommand: Shell commands via subprocess wrapper
 * 
 * All implementations extend BaseScriptCommand for shared logic:
 * - OneLake script upload
 * - Batch job submission
 * - Parameter injection via Spark configuration
 */
export interface IScriptCommand {
    /**
     * Execute the script as a Spark batch job.
     * 
     * Workflow:
     * 1. Generate Python wrapper with script content and parameters
     * 2. Upload to OneLake at {workspaceId}/{itemId}/Scripts/{scriptName}
     * 3. Create batch job with Spark configuration
     * 4. Poll for batch creation (returns batch ID for monitoring)
     * 
     * @param script Script object with content, parameters, and metadata
     * @param context Execution context with clients and authentication
     * @param parameters Optional runtime parameter values (key-value pairs) that override script's default parameters
     * @returns Promise resolving to BatchResponse with ID for monitoring
     */
    execute(script: Script, context: ScriptCommandContext, parameters?: Record<string, string>): Promise<BatchResponse>;
}
