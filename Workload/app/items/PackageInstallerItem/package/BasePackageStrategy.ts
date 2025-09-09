import { PackageInstallerContext } from "./PackageInstallerContext";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { PackageInstallerItemDefinition, DeploymentLocation, DeploymentType, Package, PackageItem, PackageItemPayloadType, PackageItemPart, ReferenceInterceptorDefinitionConfig, StringReplacementInterceptorDefinitionConfig, ItemPartInterceptorDefinition, ItemPartInterceptorType, DeploymentVariables } from "../PackageInstallerItemModel";
import { Item, ItemDefinitionPart } from "../../../clients/FabricPlatformTypes";
import { PackageContext } from "./PackageContext";
import { OneLakeStorageClient } from "../../../clients/OneLakeStorageClient";


/**
 * Result of package creation process.
 */
export interface PackageCreationResult {
    package: Package
    oneLakeLocation: string
}

/**
 * Configuration options for creating a package.
 */
export interface CreatePackageConfig {
    originalWorkspaceId?: string;
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

    /**
     * Creates a new BasePackageStrategy instance.
     * 
     * @param context - The package installer context providing access to clients and services
     * @param item - The package installer item with its definition
     */
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

            if(config.updateItemReferences) {
                // Convert the originalItemInfo Record to string replacements for future use
                const replacements: Record<string, string> = {};

                if(config.originalWorkspaceId){
                    replacements[config.originalWorkspaceId] = DeploymentVariables.WORKSPACE_ID; // Ensure original workspace ID is always replaced
                }
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

            await packContext.oneLakeClient.writeFileAsText(
                packContext.OneLakePackageJsonPathInItem,
                JSON.stringify(packContext.pack, null, 2)
            );

            packContext.log(`package.json saved to: ${packContext.OneLakePackageJsonPathInItem}`);
            packContext.log(`Package creation completed with ${packContext.pack.items.length} items`);

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

    /**
     * Processes a single item for inclusion in the package.
     * 
     * This method handles item-specific logic such as definition extraction,
     * metadata collection, and error handling.
     * 
     * @param packContext - The package context providing access to package metadata and utilities
     * @param item - The Fabric item to process
     * @returns The processed package item
     */
    private async processItem(packContext: PackageContext, item: Item): Promise<PackageItem> {
        try {
            packContext.log(`Processing item: ${item.displayName} (${item.id})`);
            
            const useDefinition = packContext.supportsDefinition(item);

            var packageItemDefinition = undefined;
            if(useDefinition) {
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
                packageItemDefinition = {
                    format: response?.definition?.format,
                    parts: parts
                };
            }
            const packageItem: PackageItem = {
                displayName: item.displayName,
                description: item.description,
                type: item.type,
                definition: packageItemDefinition,                
            }
            if(packContext.globalInterceptorId && packageItem.definition) {
                packageItem.definition.interceptor = {                    
                    type: ItemPartInterceptorType.Reference,
                    config: {
                        id: packContext.globalInterceptorId
                    }
                } as ItemPartInterceptorDefinition<ReferenceInterceptorDefinitionConfig>;
            }
            packContext.originalItemInfo[item.id] = item.displayName;
            return packageItem;
            
        } catch (error) {
            packContext.logError(`Failed to process item ${item.displayName}:`, error);
            throw error;
        }
    }

    /**
     * Stores a definition part for a Fabric item in the package context.
     * 
     * This method handles the logic for saving item definition parts to the
     * OneLake storage, including path generation and error handling.
     * 
     * @param packContext - The package context providing access to package metadata and utilities
     * @param item - The Fabric item being processed
     * @param part - The definition part to store
     * @returns The stored package item part
     */
    private async storeItemDefinitionPart(packContext: PackageContext, item: Item, part: ItemDefinitionPart): Promise<PackageItemPart> {
        const partFileName = packContext.getOneLakeDefinitionPartPathInItem(item, part);
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


    /**
     * Writes the packaging logs to OneLake storage.
     * 
     * This method retrieves the log text from the package context and saves it
     * to a designated file in OneLake storage for later review.
     * 
     * @param packContext - The package context providing access to package metadata and utilities
     */
    private async writeLogsToOneLake(packContext: PackageContext): Promise<void> {
        const log = await packContext.getLogText();
        const oneLakeClient = this.context.getOneLakeClientItemWrapper(this.item);
        await oneLakeClient.writeFileAsText(`Files/PackagingLogs/PackagingLog_${packContext.pack.id}.txt`, log);
    }
    
}

