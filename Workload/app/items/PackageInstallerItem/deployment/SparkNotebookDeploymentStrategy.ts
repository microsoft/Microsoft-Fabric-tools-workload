import { DeploymentContext, DeploymentStrategy } from "./DeploymentStrategy";
import { DeployedItem, PackageDeployment, DeploymentStatus, PackageItem } from "../PackageInstallerItemModel";

// Spark Notebook Deployment Strategy
export class SparkNotebookDeploymentStrategy extends DeploymentStrategy {


  async deployInternal(depContext: DeploymentContext): Promise<PackageDeployment> {
    console.log(`Deploying package via Spark Notebook for item: ${this.item.id}. Deployment: ${this.deployment.id} with type: ${this.pack.id}`);
    
    if (!this.pack.deploymentConfig.deploymentFile) {
      throw new Error("No deployment file specified in package for Spark Notebook deployment.");
    }

    const createdItems: DeployedItem[] = [];

    // Create workspace and folder if needed
    const newWorkspace = await this.createWorkspaceAndFolder(this.deployment.workspace, depContext);
    depContext.deployment.workspace = newWorkspace;
    
    const depConfig = this.pack.deploymentConfig;
    const fabricAPI = this.context.fabricPlatformAPIClient;
    
    depContext.updateProgress("Deploying Notebook for further deployment  ....", 40);
    const nbItemDef:PackageItem = {
        displayName: `Deploy_${this.pack.id}`,
        type: "Notebook", // Spark Notebook item type
        description: this.pack.description || 'Deployment Notebook',
        definition: {
          format: "ipynb",
          parts: [
            {
              path: "notebook-content.ipynb",
              payload: depConfig.deploymentFile.payload,
              payloadType: depConfig.deploymentFile.payloadType
            }
          ]
        }
    }
    const notebookItem = await this.createItemUX(nbItemDef, depContext);
    console.log(`Created notebook for deployment: ${notebookItem.id}`, undefined);
    
    createdItems.push({
        ...notebookItem,
        itemDefenitionName: "<Spark Notebook Deployment file>"
      });
    
    //create the parameters object for the notebook
    const deploymentParameters = this.pack.deploymentConfig.parameters || {};
    //convert the deployment parameters to parameters that can be parsed to the notebook run
    const notebookParameters: Record<string, { value: string; type: string }> = {};
    
    // Add deployment parameters
    Object.entries(deploymentParameters).forEach(([paramName, param]) => {
      notebookParameters[paramName] = {
        value: param.value || "",
        type: param.type
      };
    });

    // add the deployment specific parameters
    notebookParameters["deploymentId"] = {
      value: this.deployment.id,
      type: "string"
    };

    // Start a RunNotebook job on the created notebook
    depContext.updateProgress("Starting background deployment job  ....", 50);
    const jobInstanceId = await fabricAPI.scheduler.runOnDemandItemJob(
      depContext.deployment.workspace.id,
      notebookItem.id,
      "RunNotebook",
      {
        executionData: {
          parameters: notebookParameters,
          configuration: {
            //"conf": {
            //    "spark.conf1": "value"
            //},
            //"environment": {
            //    "id": "<environment_id>",
            //    "name": workspaceSparkSetting.environment.name
            //},
            //"defaultLakehouse": {
            //    "name": "<lakehouse-name>",
            //    "id": "<lakehouse-id>",
            //    "workspaceId": "<(optional) workspace-id-that-contains-the-lakehouse>"
            //},
            //"useStarterPool": true,
            //"useWorkspacePool":  "<workspace-pool-name>"
            },
        }
      }
    );
    depContext.updateProgress(`Started RunNotebook job for notebook: ${notebookItem.displayName}, Job ID: ${jobInstanceId}`, 60);
    
    const jobId = jobInstanceId.substring(jobInstanceId.lastIndexOf("/") + 1); // Extract just the job ID
    depContext.deployment.job = {
      id: jobId,
      item: {
        ...notebookItem
      },
    };
    depContext.deployment.deployedItems = createdItems
    depContext.deployment.status = DeploymentStatus.InProgress
  
    return depContext.deployment;
  }

  async updateDeploymentStatus(): Promise<PackageDeployment> {
    
    const newDeplyoment = await this.checkDeployedItems();
    
    // Check status of the job
    const fabricAPI = this.context.fabricPlatformAPIClient;
    const depJob = this.deployment.job;

    const job = await fabricAPI.scheduler.getItemJobInstance(depJob.item.workspaceId, 
                                                            depJob.item.id,
                                                            depJob.id);
    
    // Map the job status to deployment status
    const deploymentStatus = this.mapJobStatusToDeploymentStatus(job.status);
    
    // Create updated job info with converted dates
    const updatedJob = {
      ...depJob,
      startTime: job.startTimeUtc ? new Date(job.startTimeUtc) : undefined,
      endTime: job.endTimeUtc ? new Date(job.endTimeUtc) : undefined,
      ...(job.failureReason && { failureReason: job.failureReason })
    };
    newDeplyoment.status = deploymentStatus;
    newDeplyoment.job = updatedJob;    
    return newDeplyoment;
  }

  /**
   * Maps job status from the API to deployment status
   * @param jobStatus The job status from the API
   * @returns The corresponding deployment status
   */
  private mapJobStatusToDeploymentStatus(jobStatus: string): DeploymentStatus {
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
