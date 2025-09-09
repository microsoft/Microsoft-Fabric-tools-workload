import { BasePackageStrategy } from "./BasePackageStrategy";
import { PackageInstallerContext } from "./PackageInstallerContext";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { PackageInstallerItemDefinition } from "../PackageInstallerItemModel";

/**
 * Factory for creating package strategy instances.
 * Allows for different packaging strategies based on requirements.
 */
export class PackageCreationStrategyFactory {
    
    /**
     * Creates a package strategy instance
     * @param strategyType The type of packaging strategy to create
     * @param context The package installer context
     * @param packageInstallerItem The package installer item
     * @returns BasePackageStrategy instance
     */
    static createStrategy(        
        strategyType: PackageCreationStrategyType,
        context: PackageInstallerContext,
        packageInstallerItem: ItemWithDefinition<PackageInstallerItemDefinition>
    ): BasePackageStrategy {
        switch (strategyType) {
            case PackageCreationStrategyType.Standard:
                return new BasePackageStrategy(context, packageInstallerItem);
            default:
                throw new Error(`Unsupported package creation strategy type: ${strategyType}`);
        }
    }
}

/**
 * Enumeration of available packaging strategy types
 */
export enum PackageCreationStrategyType {
    /** Standard packaging strategy that includes all definition parts except defaults */
    Standard = "Standard",
}
