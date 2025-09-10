import { DeploymentContext } from "./DeploymentContext";
import { DeploymentStrategy } from "./BaseDeploymentStrategy";
import { PackageDeployment, DeploymentStatus, PackageItemPayloadType, WorkspaceConfig } from "../PackageInstallerItemModel";
import { BatchRequest, BatchState } from "../../../clients/FabricPlatformTypes";
import { EnvironmentConstants } from "../../../constants";
import { ContentHelper } from "./ContentHelper";
import { OneLakeStorageClient } from "../../../clients/OneLakeStorageClient";

const defaultDeploymentSparkFile = "/assets/samples/items/PackageInstallerItem/jobs/DefaultPackageInstaller.py";

export interface SparkDeployment {
  deploymentScript: string;
  workspace: WorkspaceConfig; // location information where to deploy to
  deploymentId?: string; // The deployment id
  items: SparkDeploymentItem[]
}

export interface SparkDeploymentItem {
  name: string;
  description: string;
  itemType: string;
  definitionParts?: SparkDeploymentItemDefinition[]; // Optional parts of the item definition
}

export enum SparkDeploymentReferenceType {
  OneLake = "OneLake", 
  Link = "Link",
  InlineBase64 = "InlineBase64"
}

export interface SparkDeploymentItemDefinition {
  path: string; // The OneLake file path for the item definition
  payload: string; // The file reference for the item definition
  payloadType: SparkDeploymentReferenceType
}

// Spark Livy Deployment Strategy
export class SparkLivyDeploymentStrategy extends DeploymentStrategy {


  async deployInternal(depContext: DeploymentContext): Promise<PackageDeployment> {

    depContext.updateProgress("Copy data to OneLake...", 40);
    const sparkDeployment = await this.copyPackageContentToItem(depContext);
    //TODO needs to be implemented!
    const lakehouseId: string = undefined;
    if (!lakehouseId) {
      throw new Error("Lakehouse ID is not defined for the package deployment.");
    }

    depContext.updateProgress("Starting deployment batch job...", 40);
    const batchRequest: BatchRequest = {
      name: `${this.item.displayName} - Deployment - ${this.deployment.packageId} - ${this.deployment.id}`,
      file: sparkDeployment.deploymentScript,
      args: [],
      conf: {          
        "spark.itemId": this.item.id,
        "spark.itemWorkspaceId": this.item.workspaceId,
        "spark.packageType": this.deployment.packageId,
        "spark.deployment": JSON.stringify(sparkDeployment),
      },
      tags: {
        source: "Solution Deployment",
        analysisType: this.deployment.packageId
      }
    };
    
    depContext.log("Starting the analysis with batch request:", batchRequest);
    
    const fabricAPI = this.context.fabricPlatformAPIClient;
    const batchResponse = await fabricAPI.sparkLivy.createBatch(
      this.item.workspaceId,
      lakehouseId,
      batchRequest
    );

    // Map BatchState to DeploymentStatus
    const deploymentStatus = this.mapBatchStateToDeploymentStatus(batchResponse.state);
    
    depContext.deployment.job = {
        id: batchResponse.id,
        item: {
          id: lakehouseId, 
          workspaceId: this.item.workspaceId,
        },
      };
      depContext.deployment.status = deploymentStatus

    return depContext.deployment;
  }

  async updateDeploymentStatus(): Promise<PackageDeployment> {
    if (!this.deployment.job || !this.deployment.job.id) {
      throw new Error("No job ID found for deployment status update");
    }
    const newPackageDeployment = await this.checkDeploymentState();

    const fabricAPI = this.context.fabricPlatformAPIClient;
    const batch = await fabricAPI.sparkLivy.getBatch(
      this.deployment.workspace.id, 
      undefined,
      this.deployment.job.id
    );

    // Map BatchState to DeploymentStatus
    const deploymentStatus = this.mapBatchStateToDeploymentStatus(batch.state);
    
    // Create updated job info with converted dates from livyInfo
    const updatedJob = {
      ...this.deployment.job,
      startTime: batch.livyInfo?.startedAt ? new Date(batch.livyInfo.startedAt) : undefined,
      endTime: batch.livyInfo?.endedAt ? new Date(batch.livyInfo.endedAt) : undefined,
    };
    newPackageDeployment.status = deploymentStatus;
    newPackageDeployment.job = updatedJob;

    return newPackageDeployment;
  }

  private async copyPackageContentToItem(depContext: DeploymentContext): Promise<SparkDeployment> {
    depContext.log(`Copying package content for item: ${this.item.id} and package type: ${this.pack.id}`);
    
    const sparkDeploymentConf: SparkDeployment = {
      deploymentId: this.deployment.id,
      deploymentScript: "",
      workspace: this.deployment.workspace,
      items: [],      
    };

    // Process all items
    const itemPromises = this.pack.items.map(async (configItem) => {
      const itemConfig: SparkDeploymentItem = {
        name: configItem.displayName,
        description: configItem.description,
        itemType: configItem.type,
        definitionParts: []
      };
      
      await Promise.all(configItem.definition.parts.map(async (itemDefinitionReference) => {
        const definitionPart: SparkDeploymentItemDefinition = {
          path: itemDefinitionReference.path,
          payload: undefined,
          payloadType: undefined
        };
        
        switch (itemDefinitionReference.payloadType) {
          case PackageItemPayloadType.AssetLink:
            definitionPart.payload = await this.copyAssetToOneLake(depContext, itemDefinitionReference.payload);
            definitionPart.payloadType = SparkDeploymentReferenceType.OneLake;
            break;
          case PackageItemPayloadType.Link:
            definitionPart.payload = itemDefinitionReference.payload;
            definitionPart.payloadType = SparkDeploymentReferenceType.Link;
            break;
          case PackageItemPayloadType.InlineBase64:
            definitionPart.payload = itemDefinitionReference.payload;
            definitionPart.payloadType = SparkDeploymentReferenceType.InlineBase64;
            break;
          case PackageItemPayloadType.OneLake:
            definitionPart.payload = itemDefinitionReference.payload;
            definitionPart.payloadType = SparkDeploymentReferenceType.OneLake;
            break;
          default:
            throw new Error(`Unsupported item definition reference type: ${itemDefinitionReference.payloadType}`);  
        }
        
        itemConfig.definitionParts.push(definitionPart);
        depContext.log(`Successfully uploaded definition in OneLake: ${definitionPart.path}`);
      }));
      
      return itemConfig;
    });
    
    sparkDeploymentConf.items = await Promise.all(itemPromises);

    // Handle deployment file
    const deploymentConfig = this.pack.deploymentConfig;
    let deploymentFileDestPath;
    if (!deploymentConfig.deploymentFile) {
      deploymentFileDestPath = await this.copyAssetToOneLake(depContext, defaultDeploymentSparkFile);
    } else if (deploymentConfig.deploymentFile?.payloadType === PackageItemPayloadType.AssetLink) {
      deploymentFileDestPath = await this.copyAssetToOneLake(depContext, deploymentConfig.deploymentFile.payload);
    } else if (deploymentConfig.deploymentFile?.payloadType === PackageItemPayloadType.Link) {
      deploymentFileDestPath = await this.copyLinkToOneLake(depContext, deploymentConfig.deploymentFile.payload);
    }

    depContext.log(`Successfully uploaded deployment script to OneLake: ${deploymentFileDestPath}`);
    const oneLakeScriptDeploymentUrl = this.convertOneLakeLinktoABFSSLink(deploymentFileDestPath, this.item.workspaceId);
    depContext.log("Deployment script URL:", oneLakeScriptDeploymentUrl);

    return {
      ...sparkDeploymentConf,
      deploymentScript: oneLakeScriptDeploymentUrl
    };
  }

  private async copyAssetToOneLake(depContext: DeploymentContext, path: string): Promise<string> {
    const assetContent = await ContentHelper.getAssetContent(depContext, path);
    const destinationSubPath = `Packages/${this.getContentSubPath(path)}`;
    const destinationPath = OneLakeStorageClient.getFilePath(this.item.workspaceId, this.item.id, destinationSubPath);
    await this.context.fabricPlatformAPIClient.oneLakeStorage.writeFileAsText(destinationPath, assetContent);
    return EnvironmentConstants.OneLakeDFSBaseUrl + "/" + destinationPath;
  }

  private async copyLinkToOneLake(depContext: DeploymentContext, path: string): Promise<string> {
    const response = await fetch(path);
    if (response.ok) {
      const destinationSubPath = `Packages/${this.getContentSubPath(path)}`;
      const destinationPath = OneLakeStorageClient.getFilePath(this.item.workspaceId, this.item.id, destinationSubPath);
      await this.context.fabricPlatformAPIClient.oneLakeStorage.writeFileAsText(destinationPath, response.body.toString());
      return EnvironmentConstants.OneLakeDFSBaseUrl + "/" + destinationPath;
    } else {
      depContext.logError('Error fetching content:', path);
      throw new Error(`Failed to fetch content: ${response.status} ${response.statusText}`);
    }
  }

  private getContentSubPath(path: string): string {
    const fileReference = path.substring(path.lastIndexOf("/") + 1);
    return `${this.pack.id}/${fileReference}`;
  }

  private convertOneLakeLinktoABFSSLink(oneLakeLink: string, workspaceId: string): string {
    let retVal = oneLakeLink.replace(`${workspaceId}/`, "");
    retVal = retVal.replace("https://", `abfss://${workspaceId}@`);
    return retVal;
  }

  /**
   * Maps a BatchState to the corresponding DeploymentStatus
   * @param batchState The Spark Livy batch state
   * @returns The corresponding deployment status
   */
  private mapBatchStateToDeploymentStatus(batchState: BatchState): DeploymentStatus {
    switch (batchState) {
      case BatchState.SUCCESS:
        return DeploymentStatus.Succeeded;
      case BatchState.ERROR:
      case BatchState.DEAD:
        return DeploymentStatus.Failed;
      case BatchState.KILLED:
        return DeploymentStatus.Cancelled;
      case BatchState.STARTING:
      case BatchState.RUNNING:
      case BatchState.SUBMITTING:
        return DeploymentStatus.InProgress;
      case BatchState.NOT_STARTED:
      case BatchState.NOT_SUBMITTED:
        return DeploymentStatus.Pending;
      default:
        return DeploymentStatus.InProgress;
    }
  }
}
