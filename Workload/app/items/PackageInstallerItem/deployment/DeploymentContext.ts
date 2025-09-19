import { PackageDeployment, Package, PackageItem, DeploymentVariables } from "../PackageInstallerItemModel";
import { Item } from "../../../clients/FabricPlatformTypes";
import { BaseContext } from "../package/BaseContext";
import { sortPackageItemsByDependencies } from "../package/PackageDependencyUtils";



/**
 * Central context object that manages state and operations during package deployment.
 * This class serves as the primary coordination point for deployment activities,
 * maintaining progress tracking, variable substitution, logging, and item management.
 * 
 * Key responsibilities:
 * - Track deployment progress and communicate updates
 * - Manage variable substitution for dynamic content
 * - Provide centralized logging capabilities
 * - Maintain current item context during deployment
 * - Handle item naming with optional suffixes
 */
export class DeploymentContext extends BaseContext {
  /** The package being deployed */
  pack: Package;
  
  /** The deployment configuration and state */
  deployment: PackageDeployment;
  
  /** Current progress percentage (0-100) */
  currentProgress: number;
  
  /** The currently active Fabric item being processed */
  private currentItem: Item;
  
  /** The currently active package item definition being processed */
  private currentPackageItem: PackageItem;
  
  /** Callback function to report progress updates to the UI */
  private updateDeploymentProgress: (message: string, progress: number) => void;
  
  /**
   * Creates a new deployment context for managing package deployment operations.
   * Initializes variable mappings, progress tracking, and item name processing.
   * 
   * @param pack - The package definition containing items to deploy
   * @param deployment - The deployment configuration and target workspace information
   * @param updateDeploymentProgress - Callback function to report progress updates to the UI
   * 
   * @example
   * ```typescript
   * const context = new DeploymentContext(
   *   packageDefinition,
   *   deploymentConfig,
   *   (message, progress) => console.log(`${progress}%: ${message}`)
   * );
   * ```
   */
  constructor(
    pack: Package,
    deployment: PackageDeployment,
    updateDeploymentProgress: (message: string, progress: number) => void
  ) {
    super();
    this.pack = pack;
    this.deployment = deployment;    
    // adding parameters 
    if (Array.isArray(this.pack.deploymentConfig?.parameters) && this.pack.deploymentConfig.parameters.length > 0) {
      for (const [key, value] of this.pack.deploymentConfig.parameters) {
        this.variableMap[`{{${key}}}`] = value;
      }
    }
    // Initialize variable map with deployment variables
    this.variableMap[DeploymentVariables.DEPLOYMENT_ID] = deployment.id;
    this.variableMap[DeploymentVariables.PACKAGE_ID] = pack.id;
    this.variableMap[DeploymentVariables.WORKSPACE_ID] = deployment.workspace?.id;
    this.variableMap[DeploymentVariables.FOLDER_ID] = deployment.workspace?.folder?.id;    
    this.currentProgress = 0;
    this.updateDeploymentProgress = updateDeploymentProgress;
    this.init()
  }

  /**
   * Initializes the deployment context by setting up package and deployment copies,
   * and processing item display names with optional suffixes.
   * @private
   */
  private init(){
   this.pack = {...this.pack}
   this.deployment = {...this.deployment}
    // Update display names for all items in the package
    if ( this.pack.deploymentConfig.suffixItemNames && 
        this.pack.items && this.pack.items.length > 0) {
      for (const item of this.pack.items) {
        const originalDisplayName = item.displayName;
        // Update the item's display name with suffix if configured
        item.displayName = this.getSuffixedItemName(item);
        this.log(`Updated item display name: ${originalDisplayName} -> ${item.displayName}`);
      }
    }
  }

  /**
   * Gets the list of package items sorted based on their dependencies.
   * @returns The list of package items sorted based on their dependencies.
   */
  getSortedItems(): PackageItem[] {
    //Sorting the items based on dependencies
    const sortedItems =  sortPackageItemsByDependencies(this.pack.items);
    return sortedItems;
  }


  /**
   * Gets the workspace ID from the deployment configuration.
   * @returns The workspace ID where items will be deployed, or undefined if not set
   */
  getWorkspaceId(){
    return this.deployment.workspace?.id;
  }

  /**
   * Gets the folder ID from the deployment configuration.
   * @returns The folder ID where items will be deployed, or undefined if not set
   */
  getFolderId(){
    return this.deployment.workspace?.folder?.id;
  }

  /**
   * Sets the currently active item being processed during deployment.
   * Updates the variable map with item-specific variables for template substitution.
   * 
   * @param itemPac - The package item definition being processed (can be undefined)
   * @param item - The actual Fabric item that was created (can be undefined)
   * 
   * @remarks
   * This method automatically creates variable mappings:
   * - `{{ITEM_ID_<itemName>}}` - Maps to the specific item's ID
   * - `{{<itemName>}}` - Also maps to the item's ID for convenience
   * - `{{ITEM_ID}}` - Maps to the current item's ID
   * 
   * @example
   * ```typescript
   * context.setCurrentItem(packageItemDef, createdFabricItem);
   * // Now variables like {{MyNotebook}} will resolve to the item's ID
   * ```
   */
  setCurrentItem(itemPac: PackageItem, item: Item): void {
    if(itemPac === undefined){
      this.log("Created item package is undefined in context.");
    } else if(item === undefined){
      this.log("Created item is undefined in context for item: ", itemPac.displayName);
    }

    this.currentItem = item;
    this.currentPackageItem = itemPac;
    //Setting the name variable in case the item is already available
    //There are situations where the item is not created immediately
    //remove the suffix to get the original itemName
    const itemName = itemPac ? this.getRemovedSuffixItemName(itemPac) : item?.displayName;
    const itemId = item?.id || '<undefined>';
    if(itemName) {
      this.variableMap[`{{ITEM_ID_${itemName}}}`] = itemId ;
      this.variableMap[`{{${itemName}}}`] = itemId ;
    }
    //Setting the current Item_ID variable as well to make sure they can use current id
    this.variableMap[`${DeploymentVariables.ITEM_ID}`] = itemId;
  }

  /**
   * Generates a display name for an item with optional suffix based on deployment configuration.
   * @param item - The package item to generate a name for
   * @returns The item's display name, optionally suffixed with the deployment ID
   * @private
   */
  private getSuffixedItemName(item: PackageItem): string {
    return this.pack.deploymentConfig.suffixItemNames ? `${item.displayName}_${this.deployment.id}` : item.displayName;
  }

  /**
   * Removes the deployment suffix from an item name to get the original name.
   * @param item - The package item whose name needs suffix removal
   * @returns The item's display name without the deployment suffix
   * @private
   */
  private getRemovedSuffixItemName(item: PackageItem): string {
    return this.pack.deploymentConfig.suffixItemNames ? item.displayName.replace(`_${this.deployment.id}`, '') : item.displayName;
  } 

  /**
   * Gets the currently active Fabric item being processed during deployment.
   * @returns The current Fabric item instance
   */
  getCurrentItem(): Item {
    return this.currentItem;
  }

  /**
   * Gets the currently active package item definition being processed during deployment.
   * @returns The current package item definition
   */
  getCurrentPackageItem(): PackageItem {
    return this.currentPackageItem;
  }

  /**
   * Updates the deployment progress with a message and optional progress percentage.
   * Also logs the message to the deployment logs.
   * 
   * @param message - Progress message to display and log
   * @param progress - Optional progress percentage (0-100)
   * 
   * @example
   * ```typescript
   * context.updateProgress("Creating notebook...", 25);
   * context.updateProgress("Deployment complete");
   * ```
   */
  updateProgress(message: string, progress?: number) {
    if(progress){
      this.currentProgress = progress;
    }
    this.updateDeploymentProgress(message, this.currentProgress);
    this.log(message)
  }

}
