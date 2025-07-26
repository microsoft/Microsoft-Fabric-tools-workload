import { DeploymentContext, DeploymentStrategy } from "./DeploymentStrategy";
import { PackageDeployment, DeploymentStatus } from "../PackageInstallerItemModel";


// UX Deployment Strategy
export class UXDeploymentStrategy extends DeploymentStrategy {

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
                  
      var percIteration = 70/this.pack.items?.length
      depContext.currentProgress = 30;
      // Create each item defined in the package
      for (const itemDef of this.pack.items) {
        console.log(`Creating item: ${itemDef.displayName} of type: ${itemDef.type}`);
        depContext.updateProgress(`Creating item: ${itemDef.displayName} of type: ${itemDef.type}`);

        //create the item
        await this.createItemUX(itemDef, depContext);
        depContext.currentProgress += percIteration;
      }
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

  async updateDeploymentStatus(): Promise<PackageDeployment>{
    return this.checkDeployedItems();
  }


  
}
