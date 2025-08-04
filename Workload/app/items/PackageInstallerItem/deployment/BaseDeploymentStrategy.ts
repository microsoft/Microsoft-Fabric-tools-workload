
import { PackageDeployment, Package, PackageInstallerItemDefinition, PackageItemDefinition, PackageItemPayloadType, PackageItem, PackageItemPart, WorkspaceConfig, DeploymentStatus, DeployedItem, ItemPartInterceptorDefinition, DeploymentVariables, PackageItemData, InstallType, DeploymentJobInfo } from "../PackageInstallerItemModel";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { PackageInstallerContext } from "../package/PackageInstallerContext";
import { ItemDefinition } from "@ms-fabric/workload-client";
import { CreateScheduleRequest, CreateShortcutRequest, Item } from "../../../clients/FabricPlatformTypes";
import { Interceptor, InterceptorFactory } from "../package/InterceptorFactory";
import { DeploymentContext } from "./DeploymentContext";
import { ContentHelper } from "./ContentHelper";

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
    const depContext: DeploymentContext = new DeploymentContext(this.pack, this.deployment, updateDeploymentProgress);
    try {

      const newWorkspace = await this.createWorkspaceAndFolder(this.deployment.workspace, depContext);
      depContext.deployment.workspace = newWorkspace;

      return this.deployInternal(depContext);
    } catch (error) {
      depContext.logError(`Error in deployment: ${error}`);
      depContext.deployment.status = DeploymentStatus.Failed;
    } finally {
      this.writeLogsToOneLake(depContext);
    }
    return depContext.deployment;
  }

  private async writeLogsToOneLake(depContext: DeploymentContext): Promise<void> {
    const log = await depContext.getLogText();
    const oneLakeClient = this.context.getOneLakeClientItemWrapper(this.item);
    await oneLakeClient.writeFileAsText(`Files/DeploymentLogs/DeploymentLog_${depContext.deployment.id}.txt`, log);
  }

  /**
   * Abstract method that each strategy must implement
   * @param depContext the object that holds the context on all operations
   */
  abstract deployInternal(depContext: DeploymentContext): Promise<PackageDeployment>;

  /**
   * Abstract method to update deployment status depending on the underlying strategy
   */
  abstract updateDeploymentStatus(): Promise<PackageDeployment>;

  // Common functionality that all strategies can use
  protected async createWorkspaceAndFolder(workspaceConfig: WorkspaceConfig, depContext: DeploymentContext): Promise<WorkspaceConfig> {

    depContext.updateProgress("Creating Workspace enviroment ....", 30);
    const fabricAPI = this.context.fabricPlatformAPIClient;

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


  protected async startOnFinishJobs(depContext: DeploymentContext): Promise<void> {
    if (depContext.pack.deploymentConfig?.onFinishJobs?.length > 0) {
      const onFinishJobs = depContext.pack.deploymentConfig?.onFinishJobs || [];
      depContext.log(`Starting ${onFinishJobs.length} on-finish jobs`);

      // Initialize the onFinishJobs array if it doesn't exist
      if (!depContext.deployment.onFinishJobs) {
        depContext.deployment.onFinishJobs = [];
      }

      const promises = onFinishJobs.map(async (job) => {
        try {
          depContext.updateProgress(`Starting on-finish job: ${job.jobType} for item: ${job.itemId}`);

          let executionData = job.executionData;
          if (executionData) {
            executionData = await ContentHelper.replaceVariablesInObject(executionData, depContext.variableMap);
          }

          const jobId = await this.context.fabricPlatformAPIClient.scheduler.runOnDemandItemJob(
            job.workspaceId,
            job.itemId,
            job.jobType,
            executionData ? { executionData: executionData } : undefined
          );

          depContext.deployment.onFinishJobs.push({
            id: jobId,
            item: {
              id: job.itemId,
              workspaceId: job.workspaceId,
            },
            deploymentPolicy: job.deploymentPolicy,
            jobStatus: "InProgress"
          });

          depContext.log(`Successfully started on-finish job: ${job.jobType} with ID: ${jobId}`);
        } catch (error) {
          depContext.logError(`Failed to start on-finish job: ${job.jobType}`, error);
        }
      });

      await Promise.all(promises);
      depContext.log(`Completed starting ${onFinishJobs.length} on-finish jobs`);
    }
  }

  /**
   * Creates the items in the 
   * @param pack The package containing the items to create
   * @param depContext The deployment context
   */
  protected async createItems(pack: Package, depContext: DeploymentContext): Promise<void> {
    var percIteration = 70 / this.pack.items?.length
    depContext.currentProgress = 30;
    // Create each item defined in the package
    if (this.pack.items?.length > 0) {
      for (const itemDef of this.pack.items) {
        depContext.updateProgress(`Creating item: ${itemDef.displayName} of type: ${itemDef.type}`);
        //create the item
        await this.createItem(depContext, itemDef);
        depContext.currentProgress += percIteration;

      }
    }
  }

  protected async createData(pack: Package, depContext: DeploymentContext): Promise<void> {
    // If data is provided we upload the data to the OneLake folders
    if (pack.data?.length > 0) {
      depContext.updateProgress(`Uploading ${pack.data.length} data files to OneLake`);
      var packDataPromises = pack.data.map(async (packData) => {
        // Upload the data to OneLake
        //get the item from workspace id and item id in the data
        const item = await this.context.fabricPlatformAPIClient.items.getItem(packData.workspaceId, packData.itemId);
        depContext.setCurrentItem(undefined, item);
        if (item) {
          await this.createPackageItemData(depContext, packData);
        } else {
          depContext.updateProgress(`Item not found: ${packData.itemId} in workspace: ${packData.workspaceId}`);
        }
      });

      await Promise.all(packDataPromises);
    }
  }

  /**
   * Creates the item in the 
   * @param item The item to create
   * @param workspaceId The workspace ID where the item should be created 
   * @param folderId
   * @param itemNameSuffix Optional suffix to append to the item name
   * @param direct If true, the item will be created directly in the create call if false two api calls for create and update definition will be used. In this case the returned item cann be null because the call is async
   * @returns 
   */
  protected async createItem(depContext: DeploymentContext, packItem: PackageItem): Promise<Item> {
    let newItem: Item | undefined;
    if (packItem.installType === InstallType.OnFinishJob) {
      // Handle script installation
      depContext.logDebug(`Skipping item, will be created with a script: ${packItem.displayName}`);
    }
    else {
      newItem = await this.createItemDefinition(packItem, depContext);
      await this.createItemData(depContext, packItem);
      await this.createItemShortcuts(depContext, packItem);
      await this.createItemSchedules(depContext, packItem);
    }
    return newItem;
  }

  protected async createItemDefinition(packItem: PackageItem, depContext: DeploymentContext): Promise<Item> {

    let newItem;
    if (packItem.creationPayload) {
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
    } else if (
      packItem.definition?.creationMode === "WithoutDefinition" ||
      packItem.definition?.creationMode === "CreateAndUpdateDefinition" ||
      packItem.definition?.creationMode === undefined && (
        packItem.definition?.interceptor ||
        packItem.schedules?.length > 0 ||
        packItem.data?.files?.length > 0)) {
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
      if (newItem && packItem.definition?.creationMode !== "WithoutDefinition") {
        //set current item immedieately when we have the id
        depContext.setCurrentItem(packItem, newItem);
        const itemDef = await this.convertPackageItemDefinition(depContext, packItem.definition);
        if (itemDef) {
          //There can be cases where no item def is provided (e.g. only files should be added)
          await this.context.fabricPlatformAPIClient.items.updateItemDefinition(
            depContext.getWorkspaceId(),
            newItem.id,
            {
              definition: itemDef
            }
          );
        }
      }
    }
    //not created so far let's try to create it with the definition
    if (!newItem) {
      // in all other cases we create the item with the definition directly
      const itemDef = await this.convertPackageItemDefinition(depContext, packItem.definition);
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
    depContext.log(`Successfully created item ${packItem?.displayName} with id ${newItem?.id}`);
    return newItem;
  }

  private async createItemData(depContext: DeploymentContext, packItem: PackageItem): Promise<void> {
    // Copy every file to the item OneLake storage into the specified path
    if (packItem.data?.files?.length > 0) {
      depContext.log(`Copying ${packItem.data.files.length} data files to OneLake for item: ${packItem.displayName}`);
      // Process all files in parallel
      await this.createPackageItemData(depContext, packItem.data);
    }
  }

  private async createPackageItemData(depContext: DeploymentContext, packageItemData: PackageItemData): Promise<void> {

    let interceptor: Interceptor<any>;
    if (packageItemData.interceptor) {
      interceptor = InterceptorFactory.createInterceptor(packageItemData.interceptor, depContext);
    }

    const filePromises = packageItemData.files.map(async (file) => {
      try {
        let filePath = file.path;
        let workspaceId = depContext.getCurrentItem().workspaceId;
        let fileId = depContext.getCurrentItem().id;
        // If an interceptor is defined, apply it to the parameters that should be used to create the OneLake file
        if (interceptor) {
          workspaceId = await interceptor.interceptText(workspaceId);
          fileId = await interceptor.interceptText(fileId);
          filePath = await interceptor.interceptText(filePath);
        }

        depContext.updateProgress(`Deploying file: ${file.path} for item: ${depContext.getCurrentItem().displayName}`);

        // Get the file content based on payload type
        const fileContent = await this.getPackageItemPartContent(depContext, file, packageItemData.interceptor);

        // Write file to OneLake
        const oneLakeClient = this.context.getOneLakeClientItemWrapper(depContext.getCurrentItem());
        oneLakeClient.writeFileAsBase64(filePath, fileContent);

        depContext.log(`Successfully copied file ${file.path} to OneLake for item: ${depContext.getCurrentItem().displayName}`);
      } catch (error) {
        depContext.updateProgress(`Failed to copy file: ${file.path} for item: ${depContext.getCurrentItem().displayName}`, 0);
        depContext.logError(`Failed to copy file ${file.path} to OneLake for item: ${depContext.getCurrentItem().displayName}`, error);
      }
    });
    await Promise.all(filePromises);
  }


  protected async createItemSchedules(depContext: DeploymentContext, item: PackageItem): Promise<void> {
    if (item.schedules?.length > 0) {
      depContext.log(`Creating ${item.schedules.length} schedules for item: ${item.displayName}`);

      // Create all schedules in parallel
      const schedulePromises = item.schedules.map(async (schedule) => {
        depContext.updateProgress(`Creating schedule for item: ${item.displayName} with type: ${schedule.configuration.type}`);
        depContext.log(`Creating schedule for item: ${item.displayName} with type: ${schedule.configuration.type}`);
        const request: CreateScheduleRequest = { ...schedule };
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
   * Creates shortcuts for the item in the 
   * @param item The item to create shortcuts for
   * @param depContext The deployment context containing workspace and item information
   * @returns Promise<void>
   */
  protected async createItemShortcuts(depContext: DeploymentContext, item: PackageItem): Promise<void> {
    if (item.shortcuts?.length > 0) {
      depContext.log(`Creating ${item.shortcuts.length} shortcuts for item: ${item.displayName}`);

      // Create all shortcuts in parallel
      const shortcutPromises = item.shortcuts.map(async (shortcut) => {
        depContext.updateProgress(`Creating shortcut for item: ${item.displayName} with name: ${shortcut.configuration.name}`);
        depContext.log(`Creating shortcut for item: ${item.displayName} with name: ${shortcut.configuration.name}`);
        var request: CreateShortcutRequest = {
          ...shortcut.configuration
        };
        request = await ContentHelper.replaceVariablesInObject(request, depContext.variableMap);
        return this.context.fabricPlatformAPIClient.shortcuts.createShortcut(
          depContext.getWorkspaceId(),
          depContext.getCurrentItem().id,
          request
        );
      });

      await Promise.all(shortcutPromises);
    }
  }



  protected async convertPackageItemDefinition(depContext: DeploymentContext, itemDefinition: PackageItemDefinition): Promise<ItemDefinition | undefined> {
    const definitionParts = [];
    if (itemDefinition?.parts?.length > 0) {
      for (const defPart of itemDefinition.parts) {
        let payloadData = await this.getPackageItemPartContent(depContext, defPart, itemDefinition.interceptor);

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
  private async getPackageItemPartContent(depContext: DeploymentContext, defPart: PackageItemPart, interceptorDef?: ItemPartInterceptorDefinition<any>): Promise<string> {

    let retVal: string;
    switch (defPart.payloadType) {
      case PackageItemPayloadType.AssetLink:
        // Fetch content from asset and encode as base64 (handles both text and binary)
        retVal = await ContentHelper.getAssetContentAsBase64(depContext, defPart.payload);
        break;
      case PackageItemPayloadType.Link:
        retVal = await ContentHelper.getLinkContentAsBase64(depContext, defPart.payload);
        break;
      case PackageItemPayloadType.OneLake:
        retVal = await this.context.fabricPlatformAPIClient.oneLake.readFileAsBase64(defPart.payload);
        break;
      case PackageItemPayloadType.InlineBase64:
        // Use base64 payload directly
        retVal = defPart.payload;
        break;
      default:
        throw new Error(`Unsupported payload type: ${defPart.payloadType}`);
    }
    if (interceptorDef) {
      const interceptorInstance = InterceptorFactory.createInterceptor(interceptorDef, depContext);
      retVal = await interceptorInstance.interceptBase64(retVal);
    }
    return retVal;
  }


  protected async checkDeployementState(): Promise<PackageDeployment> {
    console.log(`Checking item availability for deployment: ${this.deployment.id}`);

    // Create a copy of the original deployment
    const deploymentCopy: PackageDeployment = {
      ...this.deployment,
      deployedItems: []
    };
    await this.checkItemDeploymentState(deploymentCopy);
    await this.checkOnFinishJobsState(deploymentCopy);
    console.log(`Deployment check complete. ${deploymentCopy.deployedItems.length} out of ${this.pack.items.length} items are available`);

    try {
      var depStatus = DeploymentStatus.Succeeded;
      if(deploymentCopy.onFinishJobs){
        deploymentCopy.onFinishJobs.forEach(element => {
          if(element.deploymentPolicy === "FailOnError"){
            const tempDepStatus = this.mapJobStatusToDeploymentStatus(element.status)
            switch(tempDepStatus) {
              case DeploymentStatus.Pending:
                if(depStatus != DeploymentStatus.Cancelled &&
                  depStatus != DeploymentStatus.Failed){
                  depStatus = DeploymentStatus.Pending;
                }
                break;              
              case DeploymentStatus.InProgress:
                if(depStatus != DeploymentStatus.Cancelled &&
                  depStatus != DeploymentStatus.Failed){
                    depStatus = DeploymentStatus.InProgress;
                }
                break;
              case DeploymentStatus.Succeeded:
                //No change needed
                break;
              case DeploymentStatus.Cancelled:
                  depStatus = DeploymentStatus.Cancelled;
                break;
              case DeploymentStatus.Failed:
                depStatus = DeploymentStatus.Failed;
                break;
              default:
                console.error("Deplyoment Status is not supported.")
            }
          }
        });
      }

      // Log summary of existing items in workspace for reference
      if (depStatus == DeploymentStatus.Succeeded && 
        deploymentCopy.deployedItems?.length === this.pack.items?.length) {
        console.log(`All items deployed for deployment:`, deploymentCopy.id);                    
      } else {
        //give the UX job a timeout to finish all item creation
        const jobTimeoutTime = this.deployment.job?.endTime?.getTime() + 10 * 60 * 1000
        const now = Date.now()
        if(jobTimeoutTime > now) {
          //use a timeout of the job as some of the deployment can be async for UX deployed items
          depStatus = DeploymentStatus.InProgress
        } else {
          depStatus = DeploymentStatus.Failed
        }
      }
       //set the actual status
       deploymentCopy.status = depStatus;      
    } catch (error) {
      console.error(`Error checking items availability: ${error}`);
    }

    return deploymentCopy;
  }

  private async checkItemDeploymentState(packDeployment: PackageDeployment): Promise<void> {

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
    const promises = this.pack.items.map(async itemDef => {
      console.log(`Checking availability for item: ${itemDef.displayName} of type: ${itemDef.type}`);

      try {
        // Check if the item type is supported/available
        const deployedItem = await this.getDeployedItem(itemDef, existingWorkspaceItems);

        if (deployedItem) {
          // Determine the final display name (with suffix if configured)            
          packDeployment.deployedItems.push(deployedItem);
          console.log(`✓ Item ${itemDef.displayName} is deployed.`);
        } else {
          console.log(`✗ Item ${itemDef.displayName} is not deployed.`);
        }
      } catch (error) {
        console.warn(`Error checking availability for item ${itemDef.displayName}:`, error);
      }
    });
    // Wait for all item checks to complete
    await Promise.all(promises);
  }

  private async checkOnFinishJobsState(packDeployment: PackageDeployment): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if(packDeployment.onFinishJobs){
          console.log(`Checking start on finish jobs for deployment: ${packDeployment.id}`);
          packDeployment.onFinishJobs.map(jobInfo => {
            this.updateDeploymentJobInfo(jobInfo);
            if(jobInfo.status === "Completed") {
              console.log(`✓ Job ${jobInfo.id} is completed.`);
            } else {
              console.log(`✗ Job ${jobInfo.id} is not completed.`);
            }
          });
        }
        resolve();
      } catch (error) {
        console.error(`Error checking start on finish jobs for deployment ${packDeployment.id}:`, error);
        reject(error);
      }
    });
  }

  private async getDeployedItem(itemDef: PackageItem, items: Item[]): Promise<DeployedItem | undefined> {
    // List of supported item types in Fabric
    const name = itemDef.displayName;
    const deployedItem = items.find(i => { return (i.type === itemDef.type && i.displayName === name) });
    if (deployedItem) {
      return {
        ...deployedItem,
        itemDefenitionName: itemDef.displayName
      } as DeployedItem;
    } else {
      return undefined;
    }
  }

  protected async updateDeploymentJobInfo(depJobInfo: DeploymentJobInfo): Promise<void> {
    const fabricAPI = this.context.fabricPlatformAPIClient;
    const job = await fabricAPI.scheduler.getItemJobInstance(depJobInfo.item.workspaceId,
      depJobInfo.item.id,
      depJobInfo.id);
    // Create updated job info with converted dates
    depJobInfo.startTime = job.startTimeUtc ? new Date(job.startTimeUtc) : undefined;
    depJobInfo.status = job.status;
    depJobInfo.endTime = job.endTimeUtc ? new Date(job.endTimeUtc) : undefined;
    depJobInfo.failureReason = job.failureReason && { failureReason: job.failureReason };
  }

  /**
 * Maps job status from the API to deployment status
 * @param jobStatus The job status from the API
 * @returns The corresponding deployment status
 */
  protected mapJobStatusToDeploymentStatus(jobStatus: string): DeploymentStatus {
    switch (jobStatus) {
      case "Completed":
        return DeploymentStatus.Succeeded;
      case "Failed":
        return DeploymentStatus.Failed;
      case "Cancelled":
        return DeploymentStatus.Cancelled;
      default:
        console.log(`Job status ${jobStatus} is still in progress or pending.`);
        return DeploymentStatus.InProgress;
    }
  }
}

