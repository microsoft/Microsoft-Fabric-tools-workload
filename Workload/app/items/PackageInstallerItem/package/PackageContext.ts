import { Item, ItemDefinitionPart } from "src/clients/FabricPlatformTypes";
import { Package } from "../PackageInstallerItemModel";
import { BaseContext } from "./BaseContext";
import { OneLakeStorageClientItemWrapper } from "../../../clients/OneLakeStorageClientItemWrapper";



export class PackageContext extends BaseContext {    

    private static readonly UNSUPPORTED_ITEM_DEFINITION_TYPES = ["Lakehouse"]
    public static readonly UNSUPPORTED_PACKAGE_ITEM_TYPES = ["SQLEndpoint"]

    pack: Package
    originalItemInfo: Record<string, string>;
    globalInterceptorId: string;
    oneLakeClient: OneLakeStorageClientItemWrapper

    constructor(displayName: string, oneLakeClient: OneLakeStorageClientItemWrapper){
        super()
        this.oneLakeClient = oneLakeClient;
        this.originalItemInfo = {};
        this.pack = {
            id: this.sanitizeString(displayName, 25),
            displayName: displayName,
            description: "",
            items: []
        }
    }

    supportsDefinition(item: Item) {
        return !PackageContext.UNSUPPORTED_ITEM_DEFINITION_TYPES.includes(item.type);
    }

    get OneLakePackageFolderPathInItem() {
        return`Files/packages/${this.pack.id}`;
    }


    get OneLakePackageJsonPathInItem() {
        return `${this.OneLakePackageFolderPathInItem}/package.json`;
    }

    getOneLakeDefinitionPathInItem(item: Item): string{
        return `${this.OneLakePackageFolderPathInItem}/${this.sanitizeString(item.displayName)}/definitions`;
    }

    getOneLakeDataPathInItem(item: Item): string{
        return `${this.OneLakePackageFolderPathInItem}/${this.sanitizeString(item.displayName)}/data`;
    }

    getOneLakeDefinionPartPathInItem(item: Item, part: ItemDefinitionPart): string {
        return `${this.getOneLakeDefinitionPathInItem(item)}/${part.path}`
    }

    /**
     * Sanitizes a display name by removing/replacing invalid characters
     */
    private sanitizeString(value: string, length?: number): string {
        return value
            .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .slice(0, length || 100); // Limit length to 100 characters
    }

}