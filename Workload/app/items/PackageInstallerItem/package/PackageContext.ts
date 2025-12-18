import { Item, ItemDefinitionPart } from "src/clients/FabricPlatformTypes";
import { Package } from "../PackageInstallerItemModel";
import { BaseContext } from "./BaseContext";
import { OneLakeStorageClientItemWrapper } from "../../../clients/OneLakeStorageClientItemWrapper";

/**
 * Context class for managing package creation and configuration during the package building process.
 * 
 * This class extends BaseContext to provide package-specific functionality for:
 * - Creating and managing package metadata and structure
 * - Organizing OneLake storage paths for package assets
 * - Validating item types and definitions for package inclusion
 * - Managing original item information and relationships
 * - Providing structured access to package components
 * 
 * The PackageContext is primarily used during the package creation workflow where
 * existing Fabric items are analyzed, processed, and packaged into deployable units
 * that can be later installed in other workspaces.
 */
export class PackageContext extends BaseContext {

    /** 
     * Item types that do not support definition extraction during package creation.
     * These items cannot have their definitions included in packages due to platform limitations.
     */
    private static readonly UNSUPPORTED_ITEM_DEFINITION_TYPES = ["Lakehouse"]
    
    /** 
     * Item types that are not supported for package creation at all.
     * These items cannot be included in packages and will be filtered out during selection.
     */
    public static readonly UNSUPPORTED_PACKAGE_ITEM_TYPES = ["SQLEndpoint"]

    /** The package being created with all its metadata and item configurations */
    pack: Package
    
    /** 
     * Record of original item information keyed by item ID.
     * Stores original metadata that may be needed during package creation.
     */
    originalItemInfo: Record<string, string>;
    
    /** Identifier for the global interceptor used during package processing */
    globalInterceptorId: string;
    
    /** OneLake storage client wrapper for accessing and managing package assets */
    oneLakeClient: OneLakeStorageClientItemWrapper

    /**
     * Creates a new PackageContext for building a package from selected Fabric items.
     * 
     * @param displayName - The display name for the package being created
     * @param oneLakeClient - OneLake storage client wrapper for asset management
     * 
     * @example
     * ```typescript
     * const context = new PackageContext("My Analytics Package", oneLakeWrapper);
     * // Package ID will be sanitized version: "My_Analytics_Package"
     * ```
     */
    constructor(displayName: string, oneLakeClient: OneLakeStorageClientItemWrapper){
        super()
        this.oneLakeClient = oneLakeClient;
        this.originalItemInfo = {};
        this.pack = {
            id: this.sanitizeString(displayName, 25),
            displayName: displayName,
            description: "",
            items: []
        }
    }

    /**
     * Determines if an item supports definition extraction for package inclusion.
     * 
     * Some Fabric item types do not support having their definitions extracted
     * and included in packages due to platform limitations or security restrictions.
     * 
     * @param item - The Fabric item to check for definition support
     * @returns true if the item's definition can be included in the package
     * 
     * @example
     * ```typescript
     * if (context.supportsDefinition(notebookItem)) {
     *   // Include notebook definition in package
     * } else {
     *   // Skip definition, only include metadata
     * }
     * ```
     */
    supportsDefinition(item: Item) {
        return !PackageContext.UNSUPPORTED_ITEM_DEFINITION_TYPES.includes(item.type);
    }

    /**
     * Gets the OneLake folder path where all package assets are stored within an item.
     * 
     * This path serves as the root directory for all package-related files and
     * follows the convention: Files/packages/{packageId}
     * 
     * @returns The OneLake folder path for package storage
     * 
     * @example
     * ```typescript
     * // For package ID "MyPackage"
     * // Returns: "Files/packages/MyPackage"
     * const packagePath = context.OneLakePackageFolderPathInItem;
     * ```
     */
    get OneLakePackageFolderPathInItem() {
        return`Files/packages/${this.pack.id}`;
    }

    /**
     * Gets the OneLake file path for the main package.json configuration file.
     * 
     * This file contains the complete package metadata, item definitions,
     * and deployment configuration in JSON format.
     * 
     * @returns The OneLake file path for the package.json file
     * 
     * @example
     * ```typescript
     * // For package ID "MyPackage"
     * // Returns: "Files/packages/MyPackage/package.json"
     * const jsonPath = context.OneLakePackageJsonPathInItem;
     * ```
     */
    get OneLakePackageJsonPathInItem() {
        return `${this.OneLakePackageFolderPathInItem}/package.json`;
    }

    /**
     * Gets the OneLake folder path for storing an item's definition files.
     * 
     * Item definitions include notebooks, reports, datasets, and other Fabric
     * item configurations that need to be preserved for package deployment.
     * 
     * @param item - The Fabric item whose definition path is needed
     * @returns The OneLake folder path for the item's definition files
     * 
     * @example
     * ```typescript
     * // For item "Sales Report" in package "MyPackage"
     * // Returns: "Files/packages/MyPackage/Sales_Report/definitions"
     * const defPath = context.getOneLakeDefinitionPathInItem(reportItem);
     * ```
     */
    getOneLakeDefinitionPathInItem(item: Item): string{
        return `${this.OneLakePackageFolderPathInItem}/${this.sanitizeString(item.displayName)}/definitions`;
    }

    /**
     * Gets the OneLake folder path for storing an item's additional data files.
     * 
     * Data files include any supplementary files that belong to an item but
     * are not part of its core definition, such as sample data, configuration
     * files, or supporting resources.
     * 
     * @param item - The Fabric item whose data path is needed
     * @returns The OneLake folder path for the item's data files
     * 
     * @example
     * ```typescript
     * // For item "Customer Dataset" in package "MyPackage"  
     * // Returns: "Files/packages/MyPackage/Customer_Dataset/data"
     * const dataPath = context.getOneLakeDataPathInItem(datasetItem);
     * ```
     */
    getOneLakeDataPathInItem(item: Item): string{
        return `${this.OneLakePackageFolderPathInItem}/${this.sanitizeString(item.displayName)}/data`;
    }

    /**
     * Gets the OneLake file path for a specific item definition part.
     * 
     * Item definitions can consist of multiple parts (e.g., notebook content,
     * metadata, configuration). This method provides the exact path where
     * each part should be stored within the item's definition folder.
     * 
     * @param item - The Fabric item that owns the definition part
     * @param part - The specific definition part requiring a storage path
     * @returns The complete OneLake file path for the definition part
     * 
     * @example
     * ```typescript
     * // For notebook item with part.path = "notebook-content.ipynb"
     * // Returns: "Files/packages/MyPackage/My_Notebook/definitions/notebook-content.ipynb"
     * const partPath = context.getOneLakeDefinitionPartPathInItem(item, part);
     * ```
     */
    getOneLakeDefinitionPartPathInItem(item: Item, part: ItemDefinitionPart): string {
        return `${this.getOneLakeDefinitionPathInItem(item)}/${part.path}`
    }

    /**
     * Sanitizes a display name by removing/replacing invalid characters for use in file paths.
     * 
     * This method ensures that item display names can be safely used as folder and file names
     * in OneLake storage by:
     * - Replacing invalid file system characters with underscores
     * - Converting spaces to underscores  
     * - Collapsing multiple underscores to single underscores
     * - Removing leading and trailing underscores
     * - Limiting length to prevent path length issues
     * 
     * @param value - The string to sanitize (typically an item display name)
     * @param length - Maximum length for the sanitized string (default: 100)
     * @returns A sanitized string safe for use in file paths
     * 
     * @example
     * ```typescript
     * // Input: "Sales Report: Q4 2023"
     * // Output: "Sales_Report_Q4_2023"
     * const safeName = context.sanitizeString("Sales Report: Q4 2023");
     * 
     * // With length limit
     * const shortName = context.sanitizeString("Very Long Name", 10); // "Very_Long_"
     * ```
     */
    private sanitizeString(value: string, length?: number): string {
        return value
            .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .slice(0, length || 100); // Limit length to 100 characters
    }

}