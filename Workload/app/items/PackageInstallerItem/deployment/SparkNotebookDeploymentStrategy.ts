import { DeploymentContext } from "./DeploymentContext";
import { DeploymentStrategy } from "./BaseDeploymentStrategy";
import { DeployedItem, PackageDeployment, DeploymentStatus, PackageItem } from "../PackageInstallerItemModel";
import { ContentHelper } from "./ContentHelper";

// Spark Notebook Deployment Strategy
export class SparkNotebookDeploymentStrategy extends DeploymentStrategy {


  async deployInternal(depContext: DeploymentContext): Promise<PackageDeployment> {
    console.log(`Deploying package via Spark Notebook for item: ${this.item.id}. Deployment: ${this.deployment.id} with type: ${this.pack.id}`);

    if (!this.pack.deploymentConfig.deploymentFile) {
      throw new Error("No deployment file specified in package for Spark Notebook deployment.");
    }

    const createdItems: DeployedItem[] = [];    

    const depConfig = this.pack.deploymentConfig;
    const fabricAPI = this.context.fabricPlatformAPIClient;

    depContext.updateProgress("Deploying Notebook for further deployment  ....", 40);
    const nbItemDef: PackageItem = {
      displayName: `Deploy_${this.pack.id}`,
      type: "Notebook", // Spark Notebook item type
      description: this.pack.description || 'Deployment Notebook',
      definition: {
        //make sure the id is created that we can use it later
        creationMode: "CreateAndUpdateDefinition",
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
    const notebookItem = await this.createItem(depContext, nbItemDef);
    console.log(`Created notebook for deployment: ${notebookItem.id}`, undefined);

    createdItems.push({
      ...notebookItem,
      itemDefenitionName: "<Spark Notebook Deployment file>"
    });

    //create the parameters object for the notebook
    const notebookParameters = { ...this.pack.deploymentConfig.parameters || {} };
    ContentHelper.replaceVariablesInObject(notebookParameters, depContext.variableMap);

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

    const newDeplyoment = await this.checkDeployementState();

    // Create updated job info with converted dates
    const updatedJob = {
      ...this.deployment.job,
    };

    this.updateDeploymentJobInfo(updatedJob);
    // Map the job status to deployment status
    const deploymentStatus = this.mapJobStatusToDeploymentStatus(updatedJob.status);
    newDeplyoment.status = deploymentStatus;
    newDeplyoment.job = updatedJob;
    return newDeplyoment;
  }

}
