
import { PackageDeployment, Package, PackageInstallerItemDefinition, PackageItemDefinition, PackageItemPayloadType, PackageItem, PackageItemPart, WorkspaceConfig, DeploymentStatus, DeployedItem, ItemPartInterceptorDefinition, DeploymentVariables, PackageItemData, InstallType, DeploymentJobInfo } from "../PackageInstallerItemModel";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { PackageInstallerContext } from "../package/PackageInstallerContext";
import { ItemDefinition } from "@ms-fabric/workload-client";
import { CreateScheduleRequest, CreateShortcutRequest, Item } from "../../../clients/FabricPlatformTypes";
import { Interceptor, InterceptorFactory } from "../package/InterceptorFactory";
import { DeploymentContext } from "./DeploymentContext";
import { ContentHelper } from "./ContentHelper";

/**
 * Abstract base class for package deployment strategies in the Package Installer Item.
 * 
 * This class provides the core framework for deploying packages to Fabric workspaces,
 * including workspace creation, item deployment, content handling, and status tracking.
 * 
 * Deployment strategies extend this class to implement specific deployment approaches:
 * - UXDeploymentStrategy: Direct API-based deployment
 * - SparkNotebookDeploymentStrategy: Notebook-based deployment with Spark execution
 * - SparkLivyDeploymentStrategy: Livy session-based deployment
 * 
 * Key responsibilities:
 * - Workspace and folder management
 * - Item creation and definition handling
 * - Content payload processing (Asset, Link, InlineBase64)
 * - Deployment progress tracking
 * - Error handling and status management
 */
export abstract class DeploymentStrategy {
  /**
   * Creates a new deployment strategy instance.
   * 
   * @param context - The package installer context providing access to clients and services
   * @param item - The package installer item with its definition
   * @param pack - The package to be deployed
   * @param deployment - The deployment configuration and state
   */
  constructor(
    protected context: PackageInstallerContext,
    protected item: ItemWithDefinition<PackageInstallerItemDefinition>,
    protected pack: Package,
    protected deployment: PackageDeployment,
  ) {
  }

  /**
   * Main deployment orchestration method that coordinates the deployment process.
   * 
   * This method handles:
   * 1. Workspace and folder creation
   * 2. Deployment context initialization
   * 3. Calls to strategy-specific deployment logic
   * 4. Error handling and status management
   * 
   * @param updateDeploymentProgress - Callback function to update deployment progress
   * @returns Promise<PackageDeployment> - The final deployment state
   */
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
   * Abstract method that each deployment strategy must implement to define its specific deployment logic.
   * 
   * This method contains the core deployment implementation that varies between strategies:
   * - UX Strategy: Direct API calls for immediate deployment
   * - Spark Notebook Strategy: Creates and executes deployment notebook
   * - Spark Livy Strategy: Uses Livy sessions for batch processing
   * 
   * @param depContext - The deployment context containing all necessary information for deployment
   * @returns Promise<PackageDeployment> - The deployment result with status and created items
   */
  abstract deployInternal(depContext: DeploymentContext): Promise<PackageDeployment>;

  /**
   * Abstract method to update deployment status based on the strategy's execution model.
   * 
   * Different strategies track deployment progress differently:
   * - UX Strategy: Immediate status updates during execution
   * - Background Strategies: Polling job status and updating accordingly
   * 
   * @returns Promise<PackageDeployment> - Updated deployment with current status
   */
  abstract updateDeploymentStatus(): Promise<PackageDeployment>;

  /**
   * Creates or configures the target workspace and folder structure for deployment.
   * 
   * This method handles:
   * - Creating new workspaces when specified in configuration
   * - Assigning capacity to workspaces
   * - Creating folder structures within workspaces
   * - Updating deployment context with workspace information
   * 
   * @param workspaceConfig - Configuration for the target workspace
   * @param depContext - Deployment context for progress tracking and state management
   * @returns Promise<WorkspaceConfig> - Updated workspace configuration with created IDs
   * @throws Error if workspace creation or folder creation fails
   */
  protected async createWorkspaceAndFolder(workspaceConfig: WorkspaceConfig, depContext: DeploymentContext): Promise<WorkspaceConfig> {

    depContext.updateProgress("Creating Workspace environment...", 30);
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
   * Creates all items defined in the package within the target workspace.
   * 
   * This method orchestrates the creation of Fabric items including:
   * - Processing item definitions and converting payloads
   * - Creating items with their definitions in the workspace
   * - Handling schedules and shortcuts associated with items
   * - Creating additional data files in OneLake if specified
   * - Tracking progress through the deployment process
   * 
   * @param pack - The package containing items to be created
   * @param depContext - Deployment context for progress tracking and logging
   * @throws Error if item creation fails or required dependencies are missing
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
   * Creates a single Fabric item from a package item definition.
   * 
   * This method handles the complete lifecycle of item creation:
   * - Creates the item with its definition in the workspace
   * - Processes and uploads additional data files to OneLake
   * - Creates associated shortcuts to other Fabric items
   * - Sets up schedules for automated execution
   * - Handles different installation types (standard vs. on-finish jobs)
   * 
   * @param depContext - Deployment context for workspace and progress tracking
   * @param packItem - Package item definition containing all item configuration
   * @returns Promise<Item> - The created Fabric item, or undefined for script-based items
   * @throws Error if item creation fails or required configuration is missing
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

  /**
   * Creates the core Fabric item with its definition and content.
   * 
   * This method handles two creation approaches:
   * 1. Creation with payload: Items created with initial content in a single API call
   * 2. Standard creation: Items created first, then definition updated separately
   * 
   * The method processes:
   * - Item metadata (name, description, type)
   * - Creation payload for immediate content setup
   * - Item definition conversion and content processing
   * - Variable replacement in content using deployment context
   * 
   * @param packItem - Package item definition with all configuration
   * @param depContext - Deployment context for workspace and variable mapping
   * @returns Promise<Item> - The created Fabric item with complete definition
   * @throws Error if item creation or definition update fails
   */
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
      //set current item immediately when we have the id
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
      //For data this is needed to upload the data to the OneLake where the id is needed
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
        //set current item immediately when we have the id
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

  /**
   * Converts a package item definition to a Fabric ItemDefinition format.
   * 
   * This method processes package item definition parts and converts them to
   * the format required by Fabric Platform APIs:
   * - Retrieves content for each definition part (Asset, Link, or InlineBase64)
   * - Applies content interceptors for custom processing
   * - Converts all payloads to InlineBase64 format for consistent handling
   * - Performs variable replacement using deployment context
   * 
   * @param depContext - Deployment context for variable mapping and logging
   * @param itemDefinition - Package item definition with parts and format specification
   * @returns Promise<ItemDefinition | undefined> - Converted definition ready for Fabric API
   * @throws Error if content retrieval or conversion fails
   */
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
   * Retrieves and processes content for a package item definition part.
   * 
   * This method handles different payload types and applies processing:
   * - AssetLink: Retrieves content from workload assets
   * - Link: Fetches content from external URLs
   * - InlineBase64: Uses content directly from the package definition
   * - Applies interceptor processing for custom content transformation
   * - Performs variable replacement using deployment context
   * 
   * All content is returned as base64-encoded strings for consistent handling
   * by the Fabric Platform APIs.
   * 
   * @param depContext - Deployment context for variable mapping and logging
   * @param defPart - Package item part definition with payload information
   * @param interceptorDef - Optional interceptor for custom content processing
   * @returns Promise<string> - Base64 encoded content ready for Fabric API
   * @throws Error if content retrieval fails or interceptor processing errors occur
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
        const oneLakeClient = this.context.fabricPlatformAPIClient.oneLakeStorage.createItemWrapper(this.item);
        retVal = await oneLakeClient.readFileAsBase64(defPart.payload);
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

  /**
   * Checks and updates the deployment state by verifying item availability.
   * 
   * This method validates the deployment by:
   * - Checking if deployed items still exist in the workspace
   * - Verifying item accessibility and metadata
   * - Updating deployment status based on item availability
   * - Handling cases where items may have been deleted or become inaccessible
   * 
   * Used by background deployment strategies to monitor long-running deployments
   * and provide accurate status updates to users.
   * 
   * @returns Promise<PackageDeployment> - Updated deployment with current item status
   * @throws Error if workspace access fails or critical validation errors occur
   */
  protected async checkDeploymentState(): Promise<PackageDeployment> {
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
                console.error("Deployment Status is not supported.")
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

  /**
   * Checks the deployment state of individual items within a package deployment.
   * 
   * This method validates that deployed items are still accessible and functional:
   * - Retrieves all existing items in the target workspace
   * - Compares deployed items against current workspace state
   * - Updates deployment status based on item availability
   * - Logs any discrepancies or missing items
   * 
   * @param packDeployment - Package deployment to validate
   * @returns Promise<void> - Updates deployment status in place
   * @throws Error if workspace access fails during validation
   */
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

  /**
   * Finds a deployed item in the workspace that matches a package item definition.
   * 
   * This method searches for items by:
   * - Matching item type (e.g., Notebook, Report, Dataset)
   * - Matching display name exactly
   * - Converting found items to DeployedItem format with metadata
   * 
   * Used during deployment validation to verify that items were created successfully
   * and are accessible in the target workspace.
   * 
   * @param itemDef - Package item definition to search for
   * @param items - List of existing items in the workspace to search through
   * @returns Promise<DeployedItem | undefined> - Found item or undefined if not found
   */
  private async getDeployedItem(itemDef: PackageItem, items: Item[]): Promise<DeployedItem | undefined> {
    // List of supported item types in Fabric
    const name = itemDef.displayName;
    const deployedItem = items.find(i => { return (i.type === itemDef.type && i.displayName === name) });
    if (deployedItem) {
      return {
        ...deployedItem,
        itemDefinitionName: itemDef.displayName
      } as DeployedItem;
    } else {
      return undefined;
    }
  }

  /**
   * Updates deployment job information with the latest status from Fabric scheduler.
   * 
   * This method:
   * - Retrieves current job status from Fabric Platform API
   * - Updates job timing information (start/end times)
   * - Updates job status and failure reason if applicable
   * - Converts UTC timestamps to local Date objects
   * 
   * Used by background deployment strategies to monitor long-running jobs
   * and provide accurate status updates to users.
   * 
   * @param depJobInfo - Deployment job information to update
   * @returns Promise<void> - Updates job information in place
   * @throws Error if job information retrieval fails
   */
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

