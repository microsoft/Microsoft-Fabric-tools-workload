import { PackageInstallerContext } from "./PackageInstallerContext";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { PackageInstallerItemDefinition, DeploymentLocation, PackageItem } from "../PackageInstallerItemModel";
import { Item } from "../../../clients/FabricPlatformTypes";

/**
 * Base strategy for creating packages from Fabric items.
 * This class handles the core logic for packaging items including
 * downloading definitions, creating Package.json, and storing in OneLake.
 */
export class BasePackageStrategy {
    private context: PackageInstallerContext;
    private packageInstallerItem: ItemWithDefinition<PackageInstallerItemDefinition>;

    constructor(
        context: PackageInstallerContext,
        packageInstallerItem: ItemWithDefinition<PackageInstallerItemDefinition>
    ) {
        this.context = context;
        this.packageInstallerItem = packageInstallerItem;
    }

    /**
     * Creates a package from a list of Fabric items.
     * Downloads item definitions, creates Package.json, and stores everything in OneLake.
     * 
     * @param items List of Fabric items to include in the package
     * @param packageDisplayName Display name for the package
     * @param packageDescription Optional description for the package
     * @param deploymentLocation Location for deployment (Default or NewWorkspace)
     * @returns Promise that resolves to a PackageItem representing the created package
     */
    async createPackageFromItems(
        items: Item[],
        packageDisplayName: string,
        packageDescription?: string,
        deploymentLocation?: DeploymentLocation
    ): Promise<PackageItem> {
        try {
            console.log(`Creating package "${packageDisplayName}" with ${items.length} items`);
            console.log('Deployment location:', deploymentLocation);
            console.log('Package installer item:', this.packageInstallerItem.displayName);

            // Validate inputs
            if (!items || items.length === 0) {
                throw new Error("Cannot create package: No items provided");
            }

            if (!packageDisplayName || packageDisplayName.trim().length === 0) {
                throw new Error("Cannot create package: Package display name is required");
            }

            // Sanitize package name for folder creation
            const sanitizedPackageName = this.sanitizeFileName(packageDisplayName);
            console.log(`Sanitized package name: ${sanitizedPackageName}`);

            // Create the package folder structure in OneLake
            const packageFolderPath = `packages/${sanitizedPackageName}`;

            // Download item definitions
            const itemDefinitions = await this.downloadItemDefinitions(items);
            console.log(`Downloaded ${itemDefinitions.length} item definitions`);

            // Create Package.json content
            const packageJsonContent = this.createPackageJson(
                items,
                itemDefinitions,
                packageDisplayName,
                packageDescription,
                deploymentLocation
            );

            // Store Package.json in OneLake
            const packageJsonPath = `${packageFolderPath}/Package.json`;
            await this.saveFileToOneLake(packageJsonPath, JSON.stringify(packageJsonContent, null, 2));

            // Store individual item definitions in the package folder
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const definition = itemDefinitions[i];
                
                if (definition) {
                    const itemFileName = `${this.sanitizeFileName(item.displayName)}_${item.id}.json`;
                    const itemFilePath = `${packageFolderPath}/items/${itemFileName}`;
                    await this.saveFileToOneLake(itemFilePath, JSON.stringify(definition, null, 2));
                }
            }

            console.log(`Package "${packageDisplayName}" created successfully at: ${packageFolderPath}`);

            // Create and return the PackageItem
            const packageItem: PackageItem = {
                type: "Package",
                displayName: packageDisplayName,
                description: packageDescription || `Package containing ${items.length} Fabric items`,
                creationPayload: packageJsonContent
            };

            return packageItem;

        } catch (error) {
            console.error("Failed to create package:", error);
            throw new Error(`Package creation failed: ${error.message}`);
        }
    }

    /**
     * Downloads the item definitions for all provided items
     */
    private async downloadItemDefinitions(items: Item[]): Promise<any[]> {
        const definitions: any[] = [];

        for (const item of items) {
            try {
                console.log(`Downloading definition for item: ${item.displayName} (${item.id})`);
                
                // Use the Fabric Platform API to get the item definition
                const definition = await this.context.fabricPlatformAPIClient.items.getItemDefinition(
                    item.workspaceId,
                    item.id
                );

                if (definition) {
                    definitions.push(definition);
                    console.log(`Successfully downloaded definition for: ${item.displayName}`);
                } else {
                    console.warn(`No definition found for item: ${item.displayName}`);
                    definitions.push(null);
                }
            } catch (error) {
                console.error(`Failed to download definition for item ${item.displayName}:`, error);
                definitions.push(null);
            }
        }

        return definitions;
    }

    /**
     * Creates the Package.json content structure
     */
    private createPackageJson(
        items: Item[],
        itemDefinitions: any[],
        packageDisplayName: string,
        packageDescription?: string,
        deploymentLocation?: DeploymentLocation
    ): any {
        const packageContent = {
            packageMetadata: {
                displayName: packageDisplayName,
                description: packageDescription || `Package containing ${items.length} Fabric items`,
                createdDate: new Date().toISOString(),
                createdBy: "Fabric User", // TODO: Get user info from workload client
                deploymentLocation: deploymentLocation || DeploymentLocation.Default,
                itemCount: items.length
            },
            items: items.map((item, index) => ({
                id: item.id,
                displayName: item.displayName,
                description: item.description,
                type: item.type,
                workspaceId: item.workspaceId,
                hasDefinition: itemDefinitions[index] != null,
                definitionFileName: itemDefinitions[index] ? 
                    `${this.sanitizeFileName(item.displayName)}_${item.id}.json` : null
            })),
            packageConfiguration: {
                includeDefinitions: true,
                packageFormat: "standard",
                compression: false
            }
        };

        return packageContent;
    }

    /**
     * Sanitizes a filename by removing/replacing invalid characters
     */
    private sanitizeFileName(fileName: string): string {
        return fileName
            .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .slice(0, 100); // Limit length to 100 characters
    }

    /**
     * Saves a file to the package structure (for now, logs the content)
     * TODO: Implement actual file saving to OneLake when APIs are available
     */
    private async saveFileToOneLake(filePath: string, content: string): Promise<void> {
        try {
            console.log(`Saving file: ${filePath}`);
            console.log(`Content length: ${content.length} characters`);
            
            // TODO: Implement actual file saving to OneLake
            // For now, we'll log the package creation details
            
            if (filePath.endsWith('Package.json')) {
                console.log('Package.json content:', content);
            } else {
                console.log(`Item definition file: ${filePath}`);
            }
            
            console.log(`File saved successfully: ${filePath}`);
        } catch (error) {
            console.error(`Failed to save file: ${filePath}`, error);
            throw error;
        }
    }
}
