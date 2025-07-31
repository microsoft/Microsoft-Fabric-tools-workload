import { BasePackageStrategy } from "./BasePackageStrategy";
import { PackageInstallerContext } from "./PackageInstallerContext";
import { ItemWithDefinition } from "../../../controller/ItemCRUDController";
import { PackageInstallerItemDefinition } from "../PackageInstallerItemModel";

/**
 * Factory for creating package strategy instances.
 * Allows for different packaging strategies based on requirements.
 */
export class PackageStrategyFactory {
    /**
     * Creates a package strategy instance
     * @param strategyType The type of packaging strategy to create
     * @param context The package installer context
     * @param packageInstallerItem The package installer item
     * @returns BasePackageStrategy instance
     */
    static createStrategy(
        strategyType: PackageStrategyType,
        context: PackageInstallerContext,
        packageInstallerItem: ItemWithDefinition<PackageInstallerItemDefinition>
    ): BasePackageStrategy {
        switch (strategyType) {
            case PackageStrategyType.Standard:
            default:
                return new BasePackageStrategy(context, packageInstallerItem);
            // Future strategy types can be added here:
            // case PackageStrategyType.Minimal:
            //     return new MinimalPackageStrategy(context, packageInstallerItem);
            // case PackageStrategyType.Advanced:
            //     return new AdvancedPackageStrategy(context, packageInstallerItem);
        }
    }
}

/**
 * Enumeration of available packaging strategy types
 */
export enum PackageStrategyType {
    /** Standard packaging strategy that includes all definition parts except defaults */
    Standard = "Standard",
    // Future strategy types:
    // /** Minimal packaging strategy that includes only essential parts */
    // Minimal = "Minimal",
    // /** Advanced packaging strategy with additional processing and optimization */
    // Advanced = "Advanced"
}
