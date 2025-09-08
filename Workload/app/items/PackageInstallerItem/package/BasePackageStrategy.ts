import { PackageInstallerContext } from "./PackageInstallerContext";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { PackageInstallerItemDefinition, DeploymentLocation, DeploymentType, Package, PackageItem, PackageItemPayloadType, PackageItemPart, ReferenceInterceptorDefinitionConfig, StringReplacementInterceptorDefinitionConfig, ItemPartInterceptorDefinition, ItemPartInterceptorType } from "../PackageInstallerItemModel";
import { Item, ItemDefinitionPart } from "../../../clients/FabricPlatformTypes";
import { PackageContext } from "./PackageContext";
import { OneLakeStorageClient } from "../../../clients/OneLakeStorageClient";

export interface PackageCreationResult {
    package: Package
    oneLakeLocation: string
}

export interface CreatePackageConfig {
    displayName: string, 
    description: string, 
    deploymentLocation: DeploymentLocation
    updateItemReferences?: boolean;
}

/**
 * Base strategy for creating packages from Fabric items.
 * This class handles the core logic for packaging items including
 * downloading definitions, creating Package.json, and storing in OneLake.
 */
export class BasePackageStrategy {
    private context: PackageInstallerContext;
    private item: ItemWithDefinition<PackageInstallerItemDefinition>;

    constructor(
        context: PackageInstallerContext,
        item: ItemWithDefinition<PackageInstallerItemDefinition>
    ) {
        this.context = context;
        this.item = item;
    }


    /**
     * Uses the content as the Package Json converts it an checks the correctness.
     * After that stores it in the onelake item folder
     * @param config 
     * @param content 
     * @returns 
     */
    async createPackageFromJson(
        config: CreatePackageConfig,
        content: string): Promise<PackageCreationResult> {
        
        //load  Package form Json content string
        const packageJson = JSON.parse(content) as Package;

        const packContext = new PackageContext(packageJson.displayName,
            this.context.fabricPlatformAPIClient.oneLakeStorage.createItemWrapper(this.item)
        )
        packContext.pack = packageJson;


        packContext.oneLakeClient.writeFileAsText(packContext.OneLakePackageJsonPathInItem, 
            content);

        return {
            package: packageJson,
            oneLakeLocation: packContext.OneLakePackageJsonPathInItem
        }

    }

    /**
     * Creates a package from a list of Fabric items.
     * Downloads item definitions, creates package.json, and stores everything in OneLake.
     * 
     * @param items List of Fabric items to include in the package
     * @param packageDisplayName Display name for the package
     * @param packageDescription Optional description for the package
     * @param deploymentLocation Location for deployment (Default or NewWorkspace)
     * @returns Promise that resolves to a PackageItem representing the created package
     */
    async createPackageFromItems(
        config: CreatePackageConfig,
        items: Item[]
    ): Promise<PackageCreationResult> {
        if (!config.displayName || config.displayName.trim().length === 0) {
            throw new Error("Cannot create package: Package display name is required");
        }
        const packContext = new PackageContext(config.displayName,
            this.context.fabricPlatformAPIClient.oneLakeStorage.createItemWrapper(this.item)
        );        
        try {

            if(config.updateItemReferences) {
                packContext.globalInterceptorId = "Default";
            }

            packContext.log(`Sanitized package name: ${packContext.pack.id}`);
            packContext.pack.description = config.description;
            packContext.pack.deploymentConfig = {
                type: DeploymentType.UX,
                location: config.deploymentLocation,
                globalInterceptors: {}
            }

            packContext.log(`Creating package "${config.displayName}" with ${items.length} items`);
            packContext.log('Deployment location:', packContext.OneLakePackageFolderPathInItem);
            
            // Process every item asynchronously 
            const processedItems = await Promise.all(items?.map(item => this.processItem(packContext, item)));
            packContext.pack.items = processedItems.filter(item => item !== undefined) as PackageItem[];

            await packContext.oneLakeClient.writeFileAsText(
                packContext.OneLakePackageJsonPathInItem,
                JSON.stringify(packContext.pack, null, 2)
            );

            packContext.log(`package.json saved to: ${packContext.OneLakePackageJsonPathInItem}`);
            packContext.log(`Package creation completed with ${packContext.pack.items.length} items`);

            if(config.updateItemReferences) {
                // Convert the originalItemInfo Record to string replacements for future use
                const replacements: Record<string, string> = {};
                Object.entries(packContext.originalItemInfo).forEach(([itemId, itemName]) => {
                    replacements[itemId] = `{{${itemName}}}`;
                });

                const defaultInterceptor: ItemPartInterceptorDefinition<StringReplacementInterceptorDefinitionConfig> = {
                    type: ItemPartInterceptorType.StringReplacement,
                    config: {
                        replacements: replacements
                    }
                };
                packContext.pack.deploymentConfig.globalInterceptors[packContext.globalInterceptorId] = defaultInterceptor;
            }


            return {
                package: packContext.pack,
                oneLakeLocation: packContext.OneLakePackageJsonPathInItem
            };

        } catch (error) {
            packContext.logError("Failed to create package:", error);
            throw new Error(`Package creation failed: ${error.message}`);
        } finally {
            this.writeLogsToOneLake(packContext)
        }
    }

    private async processItem(packContext: PackageContext, item: Item): Promise<PackageItem> {
        try {
            packContext.log(`Processing item: ${item.displayName} (${item.id})`);
            
            // Download the item definition
            const response = await this.context.fabricPlatformAPIClient.items.getItemDefinitionWithPolling(
                item.workspaceId,
                item.id
            );

            packContext.log(`Successfully downloaded definition for: ${item.displayName}`);
            
            var parts: PackageItemPart[] = [];
            // Store  definition parts if available
            if (response?.definition?.parts) {
                parts = await Promise.all(
                    response.definition.parts.map(part => this.storeItemDefinitionPart(packContext, item, part))
                );
            }
            const packageItem: PackageItem = {
                displayName: item.displayName,
                description: item.description,
                type: item.type,
                definition: {
                    format: response?.definition?.format,
                    parts: parts
                },
                //if context.globalInterceptorId is set then add a reference to it
                ...(packContext.globalInterceptorId ? { id: packContext.globalInterceptorId } as ReferenceInterceptorDefinitionConfig : {}),
            }
            packContext.originalItemInfo[item.id] = item.displayName;
            return packageItem;
            
        } catch (error) {
            packContext.logError(`Failed to process item ${item.displayName}:`, error);
            throw error;
        }
    }

    private async storeItemDefinitionPart(packContext: PackageContext, item: Item, part: ItemDefinitionPart): Promise<PackageItemPart> {
        const partFileName = packContext.getOneLakeDefinionPartPathInItem(item, part);
        const partPath = OneLakeStorageClient.getPath(
            this.item.workspaceId,
            this.item.id,
            partFileName
        );

        await this.context.fabricPlatformAPIClient.oneLakeStorage.writeFileAsBase64(
            partPath,
            part.payload
        );        

        packContext.log(`Saved ${part.path} for item ${item.displayName} to: ${partPath}`);
        return {
            path: part.path,
            payload: partFileName,
            payloadType: PackageItemPayloadType.OneLake
        };
    }


    private async writeLogsToOneLake(packContext: PackageContext): Promise<void> {
        const log = await packContext.getLogText();
        const oneLakeClient = this.context.getOneLakeClientItemWrapper(this.item);
        await oneLakeClient.writeFileAsText(`Files/PackagingLogs/PackagingLog_${packContext.pack.id}.txt`, log);
    }
    
}

