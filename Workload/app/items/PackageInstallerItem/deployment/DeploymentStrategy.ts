
import { PackageDeployment, Package, PackageInstallerItemDefinition, PackageItemDefinition, PackageItemPayloadType, PackageItem, PackageItemPart, WorkspaceConfig, DeploymentStatus, DeployedItem, ItemPartInterceptorDefinition, DeploymentVariables } from "../PackageInstallerItemModel";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { PackageInstallerContext } from "../package/PackageInstallerContext";
import { ItemDefinition } from "@ms-fabric/workload-client";
import { CreateScheduleRequest, CreateShortcutRequest, Item } from "../../../clients/FabricPlatformTypes";
import { getOneLakePath, writeToOneLakeFileAsBase64 } from "../../../clients/OneLakeClient";
import { InterceptorFactory } from "../package/InterceptorFactory";



export class DeploymentContext {
  pack: Package;
  deployment: PackageDeployment
  currentProgress: number;
  variableMap: Record<string, string> = {};
  private currentItem: Item;
  private currentPackageItem: PackageItem;  
  private updateDeploymentProgress: (message: string, progress: number) => void;

  constructor(
    pack: Package,
    deployment: PackageDeployment,
    updateDeploymentProgress: (message: string, progress: number) => void
  ) {
    this.pack = pack;
    this.deployment = deployment;    
    this.variableMap[DeploymentVariables.PACKAGE_ID] = pack.id;
    this.variableMap[DeploymentVariables.WORKSPACE_ID] = deployment.workspace?.id;
    this.variableMap[DeploymentVariables.FOLDER_ID] = deployment.workspace?.folder?.id;    
    this.currentProgress = 0;
    this.updateDeploymentProgress = updateDeploymentProgress;
    this.init()
  }

  private init(){
   this.pack = {...this.pack}
   this.deployment = {...this.deployment}
    // Update display names for all items in the package
    if (this.pack.items && this.pack.items.length > 0) {
      for (const item of this.pack.items) {
        const originalDisplayName = item.displayName;
        // Update the item's display name with suffix if configured
        item.displayName = this.getSuffixedItemName(item);
        console.log(`Updated item display name: ${originalDisplayName} -> ${item.displayName}`);
      }
    }
  }

  getWorkspaceId(){
    return this.deployment.workspace?.id;
  }

  getFolderId(){
    return this.deployment.workspace?.folder?.id;
  }

  setCurrentItem(itemPac: PackageItem, item: Item): void {
    this.currentItem = item;
    this.currentPackageItem = itemPac;
    //Setting the name variable
    //remove the suffix if needed
    var itemName = this.getRemovedSuffixItemName(itemPac);
    this.variableMap[`{{${itemName}}}`] = item.id;
    //Setting the current Item_ID variable as well to make sure they can use current id
    this.variableMap[`${DeploymentVariables.ITEM_ID}`] = item.id;
  }

  private getSuffixedItemName(item: PackageItem): string {
    return this.pack.deploymentConfig.suffixItemNames ? `${item.displayName}_${this.deployment.id}` : item.displayName;
  }

  private getRemovedSuffixItemName(item: PackageItem): string {
    return this.pack.deploymentConfig.suffixItemNames ? item.displayName.replace(`_${this.deployment.id}`, '') : item.displayName;
  } 

  getCurrentItem(): Item {
    return this.currentItem;
  }

  getCurrentPackageItem(): PackageItem {
    return this.currentPackageItem;
  }

  updateProgress(message: string, progress?: number) {
    if(progress){
      this.currentProgress = progress;
    }
    this.updateDeploymentProgress(message, this.currentProgress);
    console.log(message)
  }
}

// Abstract base class for deployment strategies
export abstract class DeploymentStrategy {
  constructor(
    protected context: PackageInstallerContext,
    protected item: ItemWithDefinition<PackageInstallerItemDefinition>,
    protected pack: Package,
    protected deployment: PackageDeployment,    
  ) {
  }

  async deploy(updateDeploymentProgress: (step: string, progress: number) => void): Promise<PackageDeployment> {
    const depContext:DeploymentContext = new DeploymentContext(this.pack, this.deployment, updateDeploymentProgress);
    try{
      
      const newWorkspace = await this.createWorkspaceAndFolder(this.deployment.workspace, depContext);
      depContext.deployment.workspace = newWorkspace;

      return this.deployInternal(depContext);
    } catch (error) {
      console.error(`Error in deployment: ${error}`);
      depContext.deployment.status = DeploymentStatus.Failed;
    }
    return depContext.deployment;
  }

  // Abstract method that each strategy must implement
  abstract deployInternal(depContext: DeploymentContext): Promise<PackageDeployment>;

  //Abstract method to update deployment status depending on the underlying strategy
  abstract updateDeploymentStatus(): Promise<PackageDeployment>;

  // Common functionality that all strategies can use
  protected async createWorkspaceAndFolder(workspaceConfig: WorkspaceConfig, depContext: DeploymentContext): Promise<WorkspaceConfig> {    
    
    depContext.updateProgress("Creating Workspace enviroment ....", 30);
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
      depContext.variableMap[DeploymentVariables.WORKSPACE_ID] = workspace.id;
      depContext.updateProgress(`Created new workspace: ${newWorkspaceConfig.name}`);
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
      depContext.variableMap[DeploymentVariables.FOLDER_ID] = folder.id;
      depContext.updateProgress(`Created new folder ${folder.displayName} for workspace: ${newWorkspaceConfig.name}`);
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
  protected async createItemUX(item: PackageItem, depContext: DeploymentContext): Promise<Item> {


    var newItem = await this.createItemDefinitionUX(item, depContext);
    await this.createItemDataUX(item, depContext)
    await this.createItemShortcutsUX(item, depContext)
    await this.createItemSchedulesUX(item, depContext);

    return newItem;
  }

  protected async createItemDefinitionUX(packItem: PackageItem, depContext: DeploymentContext): Promise<Item> {

    let newItem;
    if(packItem.creationPayload){
      // If creation payload is provided we create the item with the payload
      newItem = await this.context.fabricPlatformAPIClient.items.createItem(
          depContext.getWorkspaceId(),
          {
            displayName: packItem.displayName,
            type: packItem.type,
            description: packItem.description || '',
            folderId: depContext.getFolderId(),
            creationPayload: packItem.creationPayload
          }
        );
      //set current item immedieately when we have the id
      depContext.setCurrentItem(packItem, newItem);
    } else if(packItem.definition?.interceptor ||
      packItem.schedules?.length > 0 ||
      packItem.data?.files?.length > 0) {
      //If there is any case where the id of the item is required immediately we first create the item to have the itemId for further calls
      //For the interceptor this is needed replace variables like {{WORKSPACE_ID}}, {{ITEM_ID}}, etc.
      //For data this is needed to upload the data to the Onelake where the id is needed
      //For schedules this is needed to create a schedule on a specific item
      newItem = await this.context.fabricPlatformAPIClient.items.createItem(
          depContext.getWorkspaceId(),
          {
            displayName: packItem.displayName,
            type: packItem.type,
            description: packItem.description || '',
            folderId: depContext.getFolderId(),
            creationPayload: undefined
          }
        );
      //set current item immedieately when we have the id
      depContext.setCurrentItem(packItem, newItem);
      const itemDef = await this.convertPackageItemDefinition(packItem.definition, depContext);
      if(itemDef){
        //There can be cases where no item def is provided (e.g. only files should be added)
        await this.context.fabricPlatformAPIClient.items.updateItemDefinition(
            depContext.getWorkspaceId(),
            newItem.id,
            {
              definition: itemDef
            }
          );
      }
    } else {
      // in all other cases we create the item with the definition directly
      const itemDef = await this.convertPackageItemDefinition(packItem.definition, newItem);
      newItem = await this.context.fabricPlatformAPIClient.items.createItem(
          depContext.getWorkspaceId(),
          {
            displayName: packItem.displayName,
            type: packItem.type,
            description: packItem.description || '',
            folderId: depContext.getFolderId(),
            definition: (itemDef?.parts?.length > 0) ? itemDef : undefined,
          }
        );  
      depContext.setCurrentItem(packItem, newItem);   
    }
    console.log(`Successfully created item: ${newItem.id}`);    
    return newItem;
  }

  private async createItemDataUX(packItem: PackageItem, depContext: DeploymentContext): Promise<void> {
    // Copy every file to the item OneLake storage into the specified path
    if(packItem.data?.files?.length > 0) {
      console.log(`Copying ${packItem.data.files.length} data files to OneLake for item: ${packItem.displayName}`);      
      
      // Process all files in parallel
      const filePromises = packItem.data.files.map(async (file) => {
        try {
          depContext.updateProgress(`Deploying file: ${file.path} for item: ${depContext.getCurrentItem().displayName}`);
          // Get the file content based on payload type
          const fileContent = await this.getPackageItemPartContent(file, depContext, packItem.data.interceptor);

          // Construct OneLake file path (files go to the Files folder)
          const oneLakeFilePath = getOneLakePath(depContext.getWorkspaceId(), depContext.getCurrentItem().id, file.path);

          // Write file to OneLake
          await writeToOneLakeFileAsBase64(this.context.workloadClientAPI, oneLakeFilePath, fileContent);

          console.log(`Successfully copied file ${file.path} to OneLake for item: ${packItem.displayName}`);
        } catch (error) {
          console.error(`Failed to copy file ${file.path} to OneLake for item: ${packItem.displayName}`, error);
          //TODO: Continue with other files even if one fails
        }
      });
      
      await Promise.all(filePromises);
    }
  }
  

  protected async createItemSchedulesUX(item: PackageItem, depContext: DeploymentContext): Promise<void> {
    if(item.schedules?.length > 0) {
      console.log(`Creating ${item.schedules.length} schedules for item: ${item.displayName}`);
      
      // Create all schedules in parallel
      const schedulePromises = item.schedules.map(async (schedule) => {
        depContext.updateProgress(`Creating schedule for item: ${item.displayName} with type: ${schedule.configuration.type}`);
        console.log(`Creating schedule for item: ${item.displayName} with type: ${schedule.configuration.type}`);
        const request: CreateScheduleRequest = {...schedule };
        return this.context.fabricPlatformAPIClient.scheduler.createItemSchedule(
          depContext.getWorkspaceId(),
          depContext.getCurrentItem().id,
          schedule.jobType,
          request
        );
      });
      
      await Promise.all(schedulePromises);
    }
  } 

  /**
   * Creates shortcuts for the item in the UX
   * @param item The item to create shortcuts for
   * @param depContext The deployment context containing workspace and item information
   * @returns Promise<void>
   */
  protected async createItemShortcutsUX(item: PackageItem, depContext: DeploymentContext): Promise<void> {
    if(item.shortcuts?.length > 0){
      console.log(`Creating ${item.shortcuts.length} shortcuts for item: ${item.displayName}`);
      
      // Create all shortcuts in parallel
      const shortcutPromises = item.shortcuts.map(async (shortcut) => {
        depContext.updateProgress(`Creating shortcut for item: ${item.displayName} with name: ${shortcut.configuration.name}`);
        console.log(`Creating shortcut for item: ${item.displayName} with name: ${shortcut.configuration.name}`);
        var request: CreateShortcutRequest = {
          ...shortcut.configuration };
        request = await this.replaceVariablesInObject(request, depContext.variableMap);
        return this.context.fabricPlatformAPIClient.shortcuts.createShortcut(
          depContext.getWorkspaceId(),
          depContext.getCurrentItem().id,
          request
        );
      });
      
      await Promise.all(shortcutPromises);
    }
  }


  /**
   * Method that iterats over an object and replaces the value of all strings if they match a variable name
   * @param obj The object to iterate over
   * @param variableMap The map of variables to replace
   * @returns The object with replaced values
   */
  protected async replaceVariablesInObject(obj: any, variableMap: Record<string, string>): Promise<any> {
    if (typeof obj === 'string') {
      return variableMap[obj] || obj;
    } else if (Array.isArray(obj)) {
      return Promise.all(obj.map(item => this.replaceVariablesInObject(item, variableMap)));
    } else if (typeof obj === 'object' && obj !== null) {
      const newObj: Record<string, any> = {};
      for (const key in obj) {
        newObj[key] = await this.replaceVariablesInObject(obj[key], variableMap);
      }
      return newObj;
    }
    return obj;
  }

  protected async convertPackageItemDefinition(itemDefinition: PackageItemDefinition, depContext: DeploymentContext): Promise<ItemDefinition | undefined> {
    const definitionParts = [];
    if(itemDefinition?.parts?.length > 0) {
      for (const defPart of itemDefinition.parts) {
        let payloadData = await this.getPackageItemPartContent(defPart, depContext, itemDefinition.interceptor);
        
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
  private async getPackageItemPartContent(defPart: PackageItemPart, 
                                          depContext: DeploymentContext,
                                          interceptorDef?: ItemPartInterceptorDefinition<any>): Promise<string> {

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
    if(interceptorDef){
      const interceptorInstance = InterceptorFactory.createInterceptor(interceptorDef, depContext);
      retVal = await interceptorInstance.interceptContent(retVal);
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
      if (deploymentCopy.deployedItems?.length  === this.pack.items?.length) {
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
    const name = itemDef.displayName;
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

