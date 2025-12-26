import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ScriptParameter, ScriptType, ScriptParameterType } from "../../CloudShellItemModel";
import { ItemWithDefinition, ItemReference } from "../../../../controller/ItemCRUDController";
import { CloudShellItemDefinition } from "../../CloudShellItemModel";
import { FabricPlatformAPIClient } from "../../../../clients/FabricPlatformAPIClient";

/**
 * System parameters configuration for Fabric CLI scripts.
 * Uses short aliases with Fabric-specific suffixes (.Workspace, .CloudShellItem).
 */
export const FABCLI_SYSTEM_PARAMETERS: ScriptParameter[] = [
    {
        name: 'WORKSPACE',
        type: ScriptParameterType.WORKSPACE_REFERENCE,
        value: '',
        description: 'Current workspace in Fabric CLI format (Name.Workspace)',
        isSystemParameter: true
    },
    {
        name: 'ITEM',
        type: ScriptParameterType.ITEM_REFERENCE,
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
        type: ScriptParameterType.STRING,
        value: '',
        description: 'Name of the current workspace',
        isSystemParameter: true
    },
    {
        name: 'WORKSPACE_ID',
        type: ScriptParameterType.GUID,
        value: '',
        description: 'ID of the current workspace',
        isSystemParameter: true
    },
    {
        name: 'ITEM_NAME',
        type: ScriptParameterType.STRING,
        value: '',
        description: 'Name of the current Cloud Shell item',
        isSystemParameter: true
    },
    {
        name: 'ITEM_ID',
        type: ScriptParameterType.GUID,
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
    workloadClient: WorkloadClientAPI,
    convertValue?: (paramType: ScriptParameterType, value: string, workloadClient: WorkloadClientAPI) => Promise<string>
): Promise<string> {

    let paramValue = param.value;
    // Populate system parameters from context at runtime
    switch (param.name) {
        case 'WORKSPACE':
            paramValue = item?.workspaceId || '';
            break;
        case 'WORKSPACE_NAME':
            try {
                if (!item?.workspaceId) return '';
                const fabricAPI = new FabricPlatformAPIClient(workloadClient);
                const workspace = await fabricAPI.workspaces.getWorkspace(item.workspaceId);
                paramValue = workspace.displayName;
                break;
            } catch (error) {
                console.error('Failed to fetch workspace name:', error);
                return '';
            }
        case 'WORKSPACE_ID':
            paramValue =  item?.workspaceId || '';
            break;
        case 'ITEM':
            paramValue =  itemReferenceToParameterValue(item);
            break;
        case 'ITEM_NAME':
            paramValue =  item?.displayName || '';
            break;
        case 'ITEM_ID':
            paramValue =  item?.id || '';
            break;
        default:
            paramValue = param.value;
            break
    }

    if (convertValue) {
        return await convertValue(param.type, paramValue, workloadClient);
    }
    return paramValue;
}

/**
 * Convert an ItemReference to parameter value format.
 * 
 * Format: workspaceId/itemType/itemId
 * 
 * @param itemReference The item reference to convert
 * @returns String in format "workspaceId/itemType/itemId"
 */
export function itemReferenceToParameterValue(itemReference: ItemReference): string {
    if (!itemReference.workspaceId || !itemReference.id) {
        throw new Error('Invalid ItemReference: workspaceId and id are required');
    }
    return `${itemReference.workspaceId}/${itemReference.id}`;
}

/**
 * Parse parameter value format to ItemReference object.
 * 
 * Format: workspaceId/itemType/itemId
 * 
 * @param parameterValue String in format "workspaceId/itemType/itemId"
 * @returns ItemReference object
 * @throws Error if format is invalid
 */
export function parameterValueToItemReference(parameterValue: string): ItemReference {
    const parts = parameterValue.split('/');
    if (parts.length !== 3) {
        throw new Error(`Invalid parameter value format: ${parameterValue}. Expected: workspaceId/itemId`);
    }
    
    const [workspaceId, type, id] = parts;
    
    if (!workspaceId || !type || !id) {
        throw new Error(`Invalid parameter value: all parts (workspaceId, itemId) must be non-empty`);
    }
    
    return {
        workspaceId,
        id
    };
}



