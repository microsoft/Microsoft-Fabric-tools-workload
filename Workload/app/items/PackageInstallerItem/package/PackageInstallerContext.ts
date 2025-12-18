import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { PackageRegistry } from "./PackageRegistry";
import { Package } from "../PackageInstallerItemModel";
import { FabricPlatformAPIClient } from "../../../clients/FabricPlatformAPIClient";
import { InterceptorFactory } from "./InterceptorFactory";
import { OneLakeStorageClientItemWrapper } from "../../../clients/OneLakeStorageClientItemWrapper";
import { ItemReference } from "../../../controller/ItemCRUDController";

/**
 * Context class for managing package installation and configuration.
 */
export class PackageInstallerContext {
    workloadClientAPI: WorkloadClientAPI;
    packageRegistry: PackageRegistry;
    fabricPlatformAPIClient: FabricPlatformAPIClient;
    interceptorFactory: InterceptorFactory;

    /**
     * Creates a new PackageInstallerContext.
     * @param workloadClientAPI - The WorkloadClientAPI instance to use
     */
    constructor(workloadClientAPI: WorkloadClientAPI) {
        this.workloadClientAPI = workloadClientAPI;
        this.packageRegistry = new PackageRegistry();
        this.fabricPlatformAPIClient = new FabricPlatformAPIClient(workloadClientAPI);
    }

    /**
     * Retrieves a package by its type ID.
     * @param typeId - The type ID of the package to retrieve
     * @returns The package if found, or undefined if not
     */
    getPackage(typeId: string): Package | undefined {
        return this.packageRegistry.getPackage(typeId);
    }

    /**
     * Creates a OneLakeStorageClientItemWrapper for a specific item.
     * @param item - The item to wrap
     * @returns A OneLakeStorageClientItemWrapper for the item
     */
    getOneLakeClientItemWrapper(item: ItemReference): OneLakeStorageClientItemWrapper {
        return this.fabricPlatformAPIClient.oneLakeStorage.createItemWrapper(item)
    }

}
