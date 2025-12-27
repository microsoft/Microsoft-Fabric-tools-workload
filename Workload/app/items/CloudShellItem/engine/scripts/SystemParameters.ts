import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { FabricPlatformAPIClient } from "../../../../clients/FabricPlatformAPIClient";
import { ScriptParameter } from "../../CloudShellItemModel";
import { ItemWithDefinition } from "../../../../controller/ItemCRUDController";
import { CloudShellItemDefinition } from "../../CloudShellItemModel";

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
 * @returns Parameter value (from context for system params, from param.defaultValue for others)
 */
export async function getParameterValue(
    param: ScriptParameter, 
    item: ItemWithDefinition<CloudShellItemDefinition> | undefined, 
    workloadClient: WorkloadClientAPI
): Promise<string> {
    if (!param.isSystemParameter) {
        return param.defaultValue || '';
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
        case 'ITEM':
            return item?.displayName + "." + item?.type || '';
        default:
            return param.defaultValue || '';
    }
}

/**
 * Resolves the display value for a script parameter (synchronous version for UI).
 * 
 * System parameters show their current runtime values without saving them.
 * For WORKSPACE_NAME/WORKSPACE, shows placeholder since async fetch is needed.
 * Regular parameters show their saved value.
 * 
 * @param param Parameter to get display value for
 * @param item Item with workspace and item information
 * @returns Display value for the parameter
 */
export function getParameterDisplayValue(
    param: ScriptParameter,
    item: ItemWithDefinition<CloudShellItemDefinition> | undefined
): string {
    if (!param.isSystemParameter) {
        return param.defaultValue || '';
    }
    
    // Return current context value for system parameters (synchronous)
    switch (param.name) {
        case 'WORKSPACE_NAME':
        case 'WORKSPACE':
            // For display purposes, show placeholder (actual value fetched async during execution)
            return item?.workspaceId ? 'Loading...' : '';
        case 'WORKSPACE_ID':
            return item?.workspaceId || '';
        case 'ITEM_NAME':
        case 'ITEM':
            if(param.name === 'ITEM_NAME') {
                return item?.displayName || '';
            } else {
                return item?.displayName + "." + item?.type || '';
            }
        case 'ITEM_ID':
            return item?.id || '';
        default:
            return param.defaultValue || '';
    }
}
