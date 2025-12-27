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
        description: 'Current workspace in Fabric CLI format (Name.Workspace)',
        isSystemParameter: true
    },
    {
        name: 'ITEM',
        type: ScriptParameterType.ITEM_REFERENCE,
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
        description: 'Name of the current workspace',
        isSystemParameter: true
    },
    {
        name: 'WORKSPACE_ID',
        type: ScriptParameterType.GUID,
        description: 'ID of the current workspace',
        isSystemParameter: true
    },
    {
        name: 'ITEM_NAME',
        type: ScriptParameterType.STRING,
        description: 'Name of the current Cloud Shell item',
        isSystemParameter: true
    },
    {
        name: 'ITEM_ID',
        type: ScriptParameterType.GUID,
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
        case ScriptType.FAB_CLI:
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
 * @param value Optional runtime value that overrides both defaultValue and system parameters
 * @param item Item with workspace and item information
 * @param workloadClient Workload client for API calls
 * @param convertValue Optional function to convert parameter value to specific format
 * @returns Parameter value (from value if provided, then context for system params, then param.defaultValue)
 * @throws {Error} When parameter value fails type validation for non-system parameters
 */
export async function getParameterValue(
    param: ScriptParameter, 
    value: string,
    item: ItemWithDefinition<CloudShellItemDefinition> | undefined, 
    workloadClient: WorkloadClientAPI,
    convertValue: (paramType: ScriptParameterType, value: string, workloadClient: WorkloadClientAPI) => Promise<string>,
): Promise<string> {


    let paramValue = param.defaultValue;
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
            } catch (error) {
                console.error('Failed to fetch workspace name:', error);
                return '';
            }
            break;
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
            // If runtime value is provided, use it with highest priority
            if (value !== undefined) {
                paramValue = value;
            } else {
                paramValue = param.defaultValue;
            }
            break;  
    }

    // Validate non system parameter values against the param.type
    // System parameters are set by the system and assumed valid
    // parameters are considered optional
    if(!param.isSystemParameter && paramValue) {
        if (!validateParameterValue(param.type, paramValue)) {
            throw new Error(`Invalid value for parameter ${param.name}: ${paramValue}`);
        }
    }

    // Only convert value if it's not empty and convertValue function is provided
    if (convertValue) {
        paramValue = await convertValue(param.type, paramValue, workloadClient);
    } else {
        console.error('No convertValue function provided, skipping conversion for parameter:', param.name);
    }
    
    return paramValue;
}


/**
 * Validate a parameter value against its type.
 * 
 * @param paramType The type of the parameter
 * @param value The value to validate
 * @returns True if the value is valid for the type, false otherwise
 */
export function validateParameterValue(
    paramType: ScriptParameterType,
    value: string)
: boolean {
    switch (paramType) {
        case ScriptParameterType.INT:
            return /^-?\d+$/.test(value);
        case ScriptParameterType.FLOAT:
            return /^-?\d+(\.\d+)?$/.test(value);
        case ScriptParameterType.BOOL:
            return /^(true|false)$/i.test(value);
        case ScriptParameterType.DATE:
            return !isNaN(Date.parse(value));
        case ScriptParameterType.GUID:
        case ScriptParameterType.WORKSPACE_REFERENCE:
            return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
        case ScriptParameterType.ITEM_REFERENCE:
            // Basic validation for item/workspace reference format (workspaceId/itemId)
            const parts = value.split('/');
            return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
        case ScriptParameterType.STRING:
            return true; // No validation needed for strings
        default:
            return false;
    }
}

/**
 * Convert an ItemReference to parameter value format.
 * 
 * Format: workspaceId/itemId
 * 
 * @param itemReference The item reference to convert
 * @returns String in format "workspaceId/itemId"
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
 * Format: workspaceId/itemId
 * 
 * @param parameterValue String in format "workspaceId/itemId"
 * @returns ItemReference object
 * @throws Error if format is invalid
 */
export function parameterValueToItemReference(parameterValue: string): ItemReference {
    const parts = parameterValue.split('/');
    if (parts.length !== 2) {
        throw new Error(`Invalid parameter value format: ${parameterValue}. Expected: workspaceId/itemId`);
    }
    
    const [workspaceId, id] = parts;
    
    if (!workspaceId || !id) {
        throw new Error(`Invalid parameter value: all parts (workspaceId, itemId) must be non-empty`);
    }
    
    return {
        workspaceId,
        id
    };
}



