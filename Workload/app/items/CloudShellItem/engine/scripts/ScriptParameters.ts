import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { FabricPlatformAPIClient } from "../../../../clients/FabricPlatformAPIClient";
import { ScriptParameter, ScriptType } from "../../CloudShellItemModel";
import { ItemWithDefinition } from "../../../../controller/ItemCRUDController";
import { CloudShellItemDefinition } from "../../CloudShellItemModel";

/**
 * System parameters configuration for Fabric CLI scripts.
 * Uses short aliases with Fabric-specific suffixes (.Workspace, .CloudShellItem).
 */
export const FABCLI_SYSTEM_PARAMETERS: ScriptParameter[] = [
    {
        name: 'WORKSPACE',
        type: 'string',
        value: '',
        description: 'Current workspace in Fabric CLI format (Name.Workspace)',
        isSystemParameter: true
    },
    {
        name: 'ITEM',
        type: 'string',
        value: '',
        description: 'Current item in Fabric CLI format (Name.ItemType)',
        isSystemParameter: true
    }
];

/**
 * System parameters configuration for Python scripts.
 * Uses explicit property names for programmatic access.
 */
export const PYTHON_SYSTEM_PARAMETERS: ScriptParameter[] = [
    {
        name: 'WORKSPACE_NAME',
        type: 'string',
        value: '',
        description: 'Name of the current workspace',
        isSystemParameter: true
    },
    {
        name: 'WORKSPACE_ID',
        type: 'string',
        value: '',
        description: 'ID of the current workspace',
        isSystemParameter: true
    },
    {
        name: 'ITEM_NAME',
        type: 'string',
        value: '',
        description: 'Name of the current Cloud Shell item',
        isSystemParameter: true
    },
    {
        name: 'ITEM_ID',
        type: 'string',
        value: '',
        description: 'ID of the current Cloud Shell item',
        isSystemParameter: true
    }
];

/**
 * Get system parameters for a specific script type.
 * 
 * @param scriptType The type of script (PYTHON, FABCLI)
 * @returns Array of system parameters for the script type
 */
export function getSystemParametersForScriptType(scriptType: ScriptType): ScriptParameter[] {
    switch (scriptType) {
        case ScriptType.FABCLI:
            return FABCLI_SYSTEM_PARAMETERS;
        case ScriptType.PYTHON:
            return PYTHON_SYSTEM_PARAMETERS;
        default:
            return PYTHON_SYSTEM_PARAMETERS; // Default to Python parameters
    }
}

/**
 * Resolves the runtime value for a script parameter.
 * 
 * System parameters (isSystemParameter=true) are populated from context at runtime.
 * Regular parameters use their saved value.
 * 
 * For WORKSPACE_NAME/WORKSPACE, fetches the workspace details using the workspace ID.
 * For ITEM/ITEM_NAME, uses the item's display name and type.
 * 
 * @param param Parameter to get value for
 * @param item Item with workspace and item information
 * @param workloadClient Workload client for API calls
 * @returns Parameter value (from context for system params, from param.value for others)
 */
export async function getParameterValue(
    param: ScriptParameter, 
    item: ItemWithDefinition<CloudShellItemDefinition> | undefined, 
    workloadClient: WorkloadClientAPI
): Promise<string> {
    if (!param.isSystemParameter) {
        return param.value;
    }
    
    // Populate system parameters from context at runtime
    switch (param.name) {
        case 'WORKSPACE':
            try {
                const fabricAPI = new FabricPlatformAPIClient(workloadClient);
                const workspace = await fabricAPI.workspaces.getWorkspace(item?.workspaceId || '');
                return workspace.displayName + ".Workspace" || '';
            } catch (error) {
                console.error('Failed to fetch workspace name:', error);
                return '';
            }
        case 'WORKSPACE_NAME':
            try {
                const fabricAPI = new FabricPlatformAPIClient(workloadClient);
                const workspace = await fabricAPI.workspaces.getWorkspace(item?.workspaceId || '');
                return workspace.displayName || '';
            } catch (error) {
                console.error('Failed to fetch workspace name:', error);
                return '';
            }
        case 'WORKSPACE_ID':
            return item?.workspaceId || '';
        case 'ITEM':
            return item?.displayName + "." + item?.type || '';
        case 'ITEM_NAME':
            return item?.displayName || '';
        case 'ITEM_ID':
            return item?.id || '';
        default:
            return param.value;
    }
}
