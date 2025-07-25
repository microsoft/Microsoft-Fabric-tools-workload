
import { PackageDeployment, Package, PackageInstallerItemDefinition, PackageItemDefinition, PackageItemPayloadType, PackageItem, PackageItemPart, WorkspaceConfig, DeploymentStatus, DeployedItem, ItemPartInterceptor } from "../PackageInstallerItemModel";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { PackageInstallerContext } from "../package/PackageInstallerContext";
import { ItemDefinition } from "@ms-fabric/workload-client";
import { CreateScheduleRequest, Item } from "../../../clients/FabricPlatformTypes";
import { getOneLakeFilePath, writeToOneLakeFileAsBase64 } from "../../../clients/OneLakeClient";
import { InterceptorFactory } from "../package/InterceptorFactory";

// Abstract base class for deployment strategies
export abstract class DeploymentStrategy {
  constructor(
    protected context: PackageInstallerContext,
    protected item: ItemWithDefinition<PackageInstallerItemDefinition>,
    protected pack: Package,
    protected deployment: PackageDeployment,    
  ) {}

  

  // Abstract method that each strategy must implement
  abstract deploy(updateDeploymentProgress: (step: string, progress: number) => void): Promise<PackageDeployment>;

  //Abstract method to update deployment status depending on the underlying strategy
  abstract updateDeploymentStatus(): Promise<PackageDeployment>;

  // Common functionality that all strategies can use
  protected async createWorkspaceAndFolder(workspaceConfig: WorkspaceConfig): Promise<WorkspaceConfig> {    
    const fabricAPI =this.context.fabricPlatformAPIClient;

    const newWorkspaceConfig: WorkspaceConfig = {
      ...workspaceConfig
    }

    // Check if we need to create a new workspace
    if (newWorkspaceConfig?.createNew) {
      const workspace = await fabricAPI.workspaces.createWorkspace({
        displayName: newWorkspaceConfig.name,
        description: newWorkspaceConfig.description,          
        capacityId: newWorkspaceConfig.capacityId
      });
      newWorkspaceConfig.id = workspace.id
      console.log(`Created new workspace: ${newWorkspaceConfig.id}`);
    }

    // Check if we need to create a new folder
    if (newWorkspaceConfig?.folder?.createNew) {
      const folder = await fabricAPI.folders.createFolder(
        newWorkspaceConfig.id, 
        {
          displayName: newWorkspaceConfig.folder.name,
          parentFolderId: newWorkspaceConfig.folder.parentFolderId,
        }
      );
      newWorkspaceConfig.folder.id = folder.id;
      console.log(`Created new folder: ${newWorkspaceConfig.folder.id}`);
    }
    return newWorkspaceConfig;
  }

  protected async getAssetContent(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
      console.error('Error fetching content:', path);
      throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  }

  protected async getAssetContentBlob(path: string): Promise<Blob> {
    const response = await fetch(path);
    if (!response.ok) {
      console.error('Error fetching content:', path);
      throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
    }
    return await response.blob();
  }

 protected async getLinkContentAsBase64(url: string): Promise<string> {  
  // Validate that the URL is absolute
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error(`Invalid URL format. Expected absolute URL starting with http:// or https://, got: ${url}`);
  }
  
  // Create a proper URL object to ensure it's valid
  const validatedUrl = new URL(url);
  console.log(`Validated URL: ${validatedUrl.toString()}`);
  
  const response = await fetch(validatedUrl.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch deployment file from link: ${response.status} ${response.statusText}`);
  }
  
  // Always use arrayBuffer approach for consistent handling of both text and binary
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Convert bytes to binary string
  let binaryString = '';
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binaryString);        
 }

  protected async getAssetContentAsBase64(path: string): Promise<string> {
    const response = await fetch(path);
    if (!response.ok) {
      console.error('Error fetching content:', path);
      throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
    }
    
    // Always use arrayBuffer approach for consistent handling of both text and binary
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convert bytes to binary string
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binaryString);
  }

  /**
   * Creates the item in the UX
   * @param item The item to create
   * @param workspaceId The workspace ID where the item should be created 
   * @param folderId
   * @param itemNameSuffix Optional suffix to append to the item name
   * @param direct If true, the item will be created directly in the create call if false two api calls for create and update definition will be used. In this case the returned item cann be null because the call is async
   * @returns 
   */
  protected async createItemUX(item: PackageItem, workspaceId: string, folderId: string, itemNameSuffix: string): Promise<Item> {

    var newItem = await this.createItemDefinitionUX(item, workspaceId, folderId, itemNameSuffix);
    await this.createItemDataUX(item, workspaceId, newItem)
    await this.createItemSchedulesUX(item, workspaceId, newItem.id);
        
    return newItem;
  }

  protected async createItemDefinitionUX(packItem: PackageItem, 
    workspaceId: string, folderId: string, itemNameSuffix: 
    string): Promise<Item> {

    let newItem;
    if(packItem.creationPayload){
      // If creation payload is provided we create the item with the payload
      newItem = await this.context.fabricPlatformAPIClient.items.createItem(
          workspaceId,
          {
            displayName: itemNameSuffix ? `${packItem.displayName}${itemNameSuffix}` : packItem.displayName,
            type: packItem.type,
            description: packItem.description || '',
            folderId: folderId || undefined,
            creationPayload: packItem.creationPayload
          }
        );
    } else if(packItem.definition?.interceptor){
      //If there is an interceptor defined
      //first create the item to have the context to update the definitions with the interceptor
      //this is needed because the interceptor needs the item context to replace variables like {{WORKSPACE_ID}}, {{ITEM_ID}}, etc.
      //and we cannot pass the item to the interceptor directly because it is not available at this point
      //so we create the item first and then update the definition with the interceptor
      newItem = await this.context.fabricPlatformAPIClient.items.createItem(
          workspaceId,
          {
            displayName: itemNameSuffix ? `${packItem.displayName}${itemNameSuffix}` : packItem.displayName,
            type: packItem.type,
            description: packItem.description || '',
            folderId: folderId || undefined,
            creationPayload: undefined
          }
        );
      const itemDef = await this.convertPackageItemDefinition(packItem.definition, newItem);
      await this.context.fabricPlatformAPIClient.items.updateItemDefinition(
          workspaceId,
          newItem.id,
          {
            definition: itemDef
          }
        );
    } else {
      // in all other cases we create the item with the definition directly
      const itemDef = await this.convertPackageItemDefinition(packItem.definition, newItem);
      newItem = await this.context.fabricPlatformAPIClient.items.createItem(
          workspaceId,
          {
            displayName: itemNameSuffix ? `${packItem.displayName}${itemNameSuffix}` : packItem.displayName,
            type: packItem.type,
            description: packItem.description || '',
            folderId: folderId || undefined,
            definition: (itemDef?.parts?.length > 0) ? itemDef : undefined,
          }
        );     
    }
    console.log(`Successfully created item: ${newItem.id}`);
    return newItem;
  }

  protected async createItemDataUX(packItem: PackageItem, workspaceId: string, item: Item): Promise<void> {
    // Copy every file to the item OneLake storage into the specified path
    if(packItem.data && packItem.data.files && packItem.data.files.length > 0) {
      console.log(`Copying ${packItem.data.files.length} data files to OneLake for item: ${packItem.displayName}`);      
      for (const file of packItem.data.files) {
        try {
          // Get the file content based on payload type
          const fileContent = await this.getPackageItemPartContent(file, packItem.data.interceptor, item);
          
          // Construct OneLake file path (files go to the Files folder)
          const oneLakeFilePath = getOneLakeFilePath(workspaceId, item.id, file.path);

          // Write file to OneLake
          await writeToOneLakeFileAsBase64(this.context.workloadClientAPI, oneLakeFilePath, fileContent);

          console.log(`Successfully copied file ${file.path} to OneLake for item: ${packItem.displayName}`);
        } catch (error) {
          console.error(`Failed to copy file ${file.path} to OneLake for item: ${packItem.displayName}`, error);
          // Continue with other files even if one fails
        }
      }
    }
  }
  

    protected async createItemSchedulesUX(item: PackageItem, workspaceId: string, itemId: string): Promise<void> {
    if(item.schedules && item.schedules.length > 0) {
      console.log(`Creating ${item.schedules.length} schedules for item: ${item.displayName}`);
      for (const schedule of item.schedules) {
        console.log(`Creating schedule for item: ${item.displayName} with type: ${schedule.configuration.type}`);
        const request: CreateScheduleRequest = {...schedule };
        await this.context.fabricPlatformAPIClient.scheduler.createItemSchedule(
          workspaceId,
          itemId,
          schedule.jobType,
          request
        );
      }
    }
  } 

  protected async convertPackageItemDefinition(itemDefinition: PackageItemDefinition, item?: Item): Promise<ItemDefinition | undefined> {

    const definitionParts = [];
    if(itemDefinition?.parts?.length > 0) {
      for (const defPart of itemDefinition.parts) {
        let payloadData = await this.getPackageItemPartContent(defPart, itemDefinition.interceptor, item);
        
        definitionParts.push({
          path: defPart.path,
          payload: payloadData,
          payloadType: "InlineBase64" as const
        });
      }
      return {
          format: itemDefinition.format,
          parts: definitionParts
        } as ItemDefinition;
    } else {
      return undefined;
    }
  }


  /** 
   * Retrieves the content of the deployment file based on its payload type
   * @returns Promise<string> Base64 encoded content of the deployment file
   */
  private async getPackageItemPartContent(defPart: PackageItemPart, interceptor?: ItemPartInterceptor, item?: Item): Promise<string> {

    let retVal: string;
    switch (defPart.payloadType) {
      case PackageItemPayloadType.AssetLink:
        // Fetch content from asset and encode as base64 (handles both text and binary)
        retVal = await this.getAssetContentAsBase64(defPart.payload);
        break;
      case PackageItemPayloadType.Link:
        retVal = await this.getLinkContentAsBase64(defPart.payload);
        break;
      case PackageItemPayloadType.InlineBase64:
        // Use base64 payload directly
        retVal = defPart.payload;
        break;
      default:
        throw new Error(`Unsupported payload type: ${defPart.payloadType}`);
    }
    if(interceptor){
      const interceptorInstance = InterceptorFactory.createInterceptor(interceptor.config);
      retVal = await interceptorInstance.interceptContent(retVal, item);
    }
    return retVal;
  }


  async checkDeployedItems(): Promise<PackageDeployment> {
    console.log(`Checking item availability for deployment: ${this.deployment.id}`);
    
    // Create a copy of the original deployment
    const deploymentCopy: PackageDeployment = {
      ...this.deployment,
      deployedItems: []
    };

    if (!this.pack.items || this.pack.items.length === 0) {
      console.log("No items defined in package");
      return deploymentCopy;
    }

    // Get all existing items in the workspace to check for conflicts
    let existingWorkspaceItems: Item[] = [];
    if (this.deployment.workspace?.id) {
      try {
        const fabricAPI = this.context.fabricPlatformAPIClient;
        existingWorkspaceItems = await fabricAPI.items.getAllItems(this.deployment.workspace.id);
        console.log(`Found ${existingWorkspaceItems.length} existing items in target workspace`);
      } catch (error) {
        console.warn(`Could not retrieve existing workspace items:`, error);
      }
    }

    try {
      // Iterate over each item in the package
      for (const itemDef of this.pack.items) {
        console.log(`Checking availability for item: ${itemDef.displayName} of type: ${itemDef.type}`);
        
        try {
          // Check if the item type is supported/available
          const deployedItem = await this.getDeployedItem(itemDef, existingWorkspaceItems);
          
          if (deployedItem) {
            // Determine the final display name (with suffix if configured)            
            deploymentCopy.deployedItems.push(deployedItem);
            console.log(`✓ Item ${itemDef.displayName} is deployed.`);
          } else {
            console.log(`✗ Item ${itemDef.displayName} is not deployed.`);
          }
        } catch (error) {
          console.warn(`Error checking availability for item ${itemDef.displayName}:`, error);
        }
      }
      
      console.log(`Deployment check complete. ${deploymentCopy.deployedItems.length} out of ${this.pack.items.length} items are available`);
      
      // Log summary of existing items in workspace for reference
      if (this.pack.items &&
        deploymentCopy.deployedItems?.length  === this.pack.items?.length) {
        deploymentCopy.status = DeploymentStatus.Succeeded;
        console.log(`All items deployed for deployment:`, deploymentCopy.id);
      }      
    } catch (error) {
      console.error(`Error checking items availability: ${error}`);
    }
    
    return deploymentCopy;
  }

  private async getDeployedItem(itemDef: PackageItem, items: Item[]): Promise<DeployedItem | undefined> {
    // List of supported item types in Fabric
    const name = this.pack.deploymentConfig.suffixItemNames ? 
              `${itemDef.displayName}_${this.deployment.id}` : 
              itemDef.displayName;
    const deployedItem = items.find(i => { return (i.type === itemDef.type && i.displayName === name)});
    if(deployedItem){
      return {
        ...deployedItem,
        itemDefenitionName: itemDef.displayName
      } as DeployedItem;
    } else {
      return undefined;
    }
  }
}

