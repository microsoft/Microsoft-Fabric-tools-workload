
import { DeploymentStrategy } from "./BaseDeploymentStrategy";
import { UXDeploymentStrategy } from "./UXDeploymentStrategy";
import { SparkNotebookDeploymentStrategy } from "./SparkNotebookDeploymentStrategy";
import { PackageDeployment, Package, DeploymentType, PackageInstallerItemDefinition } from "../PackageInstallerItemModel";
import { PackageInstallerContext } from "../package/PackageInstallerContext";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";

/**
 * Factory class for creating deployment strategy instances based on deployment configuration.
 * 
 * This factory implements the Factory Pattern to create appropriate deployment strategies
 * based on the deployment type specified in the package configuration. It supports:
 * 
 * - UX Deployment: Direct API-based deployment for immediate execution
 * - Spark Notebook Deployment: Notebook-based deployment using Spark execution
 * - Additional strategies can be easily added by extending the factory
 * 
 * The factory encapsulates the strategy creation logic and ensures type safety
 * while providing a clean interface for deployment strategy instantiation.
 */
export class DeploymentStrategyFactory {
  /**
   * Creates a deployment strategy based on the provided configuration.
   * 
   * @param context - The package installer context providing access to clients and services
   * @param item - The package installer item with its definition
   * @param pack - The package to be deployed
   * @param deployment - The deployment configuration and state
   * @returns DeploymentStrategy - The created deployment strategy instance
   */
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
