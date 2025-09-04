import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { PackageRegistry } from "./PackageRegistry";
import { Package } from "../PackageInstallerItemModel";
import { FabricPlatformAPIClient } from "../../../clients/FabricPlatformAPIClient";
import { InterceptorFactory } from "./InterceptorFactory";
import { OneLakeStorageClientItemWrapper } from "../../../clients/OneLakeStorageClientItemWrapper";
import { ItemReference } from "../../../controller/ItemCRUDController";


export class PackageInstallerContext {
    workloadClientAPI: WorkloadClientAPI;
    packageRegistry: PackageRegistry;
    fabricPlatformAPIClient: FabricPlatformAPIClient;
    interceptorFactory: InterceptorFactory;

    constructor(workloadClientAPI: WorkloadClientAPI) {
        this.workloadClientAPI = workloadClientAPI;
        this.packageRegistry = new PackageRegistry();
        this.fabricPlatformAPIClient = new FabricPlatformAPIClient(workloadClientAPI);
    }

    getPackage(typeId: string): Package | undefined {
        return this.packageRegistry.getPackage(typeId);
    }

    getOneLakeClientItemWrapper(item: ItemReference): OneLakeStorageClientItemWrapper {
        return this.fabricPlatformAPIClient.oneLakeStorage.createItemWrapper(item)
    }

}
