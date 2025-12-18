import { DeploymentContext } from "./DeploymentContext";
import { DeploymentStrategy } from "./BaseDeploymentStrategy";
import { PackageDeployment, DeploymentStatus } from "../PackageInstallerItemModel";


/**
 * UX Deployment Strategy
 * 
 * This is the default deployment strategy that directly calls the Fabric Platform APIs for deployment
 * from the UX without the need for any backend hosting. It provides immediate feedback and real-time
 * deployment status updates.
 * 
 * Key features:
 * - Direct API calls to Fabric Platform
 * - Real-time deployment tracking
 * - No backend infrastructure required
 * - Immediate item creation and configuration
 */
export class UXDeploymentStrategy extends DeploymentStrategy {

  /**
   * Internal deployment implementation for UX strategy
   * 
   * Executes the deployment process by:
   * 1. Creating deployment job context
   * 2. Creating items from the package
   * 3. Running post-deployment jobs
   * 4. Updating deployment status
   * 
   * @param depContext - The deployment context containing package and deployment information
   * @returns Promise<PackageDeployment> - The updated deployment object
   * @throws Error if deployment fails at any stage
   */
  async deployInternal(depContext: DeploymentContext): Promise<PackageDeployment> {
    console.log(`Deploying package via UX for item: ${this.item.id}. Deployment: ${this.deployment.id} with type: ${this.pack.id}`);
    try {

      depContext.deployment.job = {
        id: "",
        startTime: new Date(),
        item: {
          id: this.item.id,
          workspaceId: depContext.deployment.workspace.id,
        },
      }

      await this.createItems(depContext.pack, depContext);

      await this.startOnFinishJobs(depContext);
      depContext.deployment.job.endTime = new Date();
      this.deployment = {
        ...depContext.deployment
      }
      return await this.updateDeploymentStatus()
    } catch (error) {
      console.error(`Error in UX deployment: ${error}`);
      depContext.deployment.status = DeploymentStatus.Failed;
      depContext.deployment.job.endTime = new Date();
      depContext.deployment.job.failureReason = error;
      throw error;
    }
  }

  /**
   * Updates the deployment status by checking the current deployment state
   * 
   * @returns Promise<PackageDeployment> - The deployment with updated status
   */
  async updateDeploymentStatus(): Promise<PackageDeployment> {
    return this.checkDeploymentState();
  }

}
