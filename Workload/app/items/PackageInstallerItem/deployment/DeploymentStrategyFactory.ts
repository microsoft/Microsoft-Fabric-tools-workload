
import { DeploymentStrategy } from "./BaseDeploymentStrategy";
import { UXDeploymentStrategy } from "./UXDeploymentStrategy";
import { SparkNotebookDeploymentStrategy } from "./SparkNotebookDeploymentStrategy";
import { PackageDeployment, Package, DeploymentType, PackageInstallerItemDefinition } from "../PackageInstallerItemModel";
import { PackageInstallerContext } from "../package/PackageInstallerContext";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";

// Deployment Factory
export class DeploymentStrategyFactory {
  static createStrategy(
      context: PackageInstallerContext, 
      item: ItemWithDefinition<PackageInstallerItemDefinition>, 
      pack: Package, 
      deployment: PackageDeployment
  ): DeploymentStrategy {
    console.info(`Creating deployment strategy for type: ${pack.deploymentConfig.type}, package: ${pack.id}, deployment: ${deployment.id}`);
    switch (pack.deploymentConfig.type) {
      case DeploymentType.UX:
        return new UXDeploymentStrategy(context, item, pack, deployment);
      case DeploymentType.SparkNotebook:
        return new SparkNotebookDeploymentStrategy(context, item, pack, deployment);
      default:
        throw new Error(`Unsupported deployment type: ${pack.deploymentConfig.type}`);
    }
  }
}
