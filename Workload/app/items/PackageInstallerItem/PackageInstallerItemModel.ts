import { Item, JobStatus, ScheduleConfig, ShortcutConflictPolicy } from "../../clients/FabricPlatformTypes";
import { ItemReference } from "../../controller/ItemCRUDController";

/**
 * Static class containing deployment variable placeholders used for template substitution.
 * These variables are replaced with actual values during deployment processing.
 * 
 * @example
 * ```typescript
 * // Variables are used in templates like:
 * const template = `workspace: ${DeploymentVariables.WORKSPACE_ID}`;
 * // Gets replaced with actual values during deployment
 * ```
 */
export class DeploymentVariables {
  /** Placeholder for the deployment ID - replaced with actual deployment identifier */
  static readonly DEPLOYMENT_ID: string = "{{DEPLOYMENT_ID}}";
  /** Placeholder for the package ID - replaced with actual package identifier */
  static readonly PACKAGE_ID: string = "{{PACKAGE_ID}}";
  /** Placeholder for the workspace ID - replaced with actual workspace identifier */
  static readonly WORKSPACE_ID: string = "{{WORKSPACE_ID}}";
  /** Placeholder for the folder ID - replaced with actual folder identifier */
  static readonly FOLDER_ID: string = "{{FOLDER_ID}}";
  /** Placeholder for the current item ID - replaced with actual item identifier */
  static readonly ITEM_ID: string = "{{ITEM_ID}}";
}


/**
 * Defines the structure for a Package Installer Item that can contain multiple deployments.
 * This is the root interface for package installation definitions.
 */
export interface PackageInstallerItemDefinition {
  /** Optional array of package deployments that can be executed */
  deployments?: PackageDeployment[];
  /** Additional packages that can be installed with this item */
  oneLakePackages?: string[];
}

/**
 * Represents a single deployment instance of a package.
 * Contains all information about the deployment status, target workspace, and deployed items.
 * 
 * @example
 * ```typescript
 * const deployment: PackageDeployment = {
 *   id: "deploy-001",
 *   status: DeploymentStatus.InProgress,
 *   packageId: "my-package",
 *   deployedItems: [],
 *   workspace: { createNew: true, name: "My Workspace" }
 * };
 * ```
 */
export interface PackageDeployment {
  /** Unique identifier for this deployment */
  id: string;
  /** Current status of the deployment */
  status: DeploymentStatus;
  /** User who initiated this deployment */
  triggeredBy?: string;
  /** Timestamp when the deployment was started */
  triggeredTime?: Date;
  /** ID of the package being deployed */
  packageId: string;
  /** Array of items that have been deployed as part of this deployment */
  deployedItems: DeployedItem[];
  /** Optional jobs to execute after deployment completion */
  onFinishJobs?: OnFinishJobInfo[];
  /** Target workspace configuration for the deployment */
  workspace?: WorkspaceConfig;
  /** Spark job information if deployment uses Spark jobs */
  job?: DeploymentJobInfo;
}

/**
 * Information about a Spark job used for package deployment.
 * Tracks the job lifecycle from creation to completion.
 */
export interface DeploymentJobInfo {
  /** Unique identifier for the deployment job */
  id: string;
  /** Reference to the Fabric item that executes the job */
  item: ItemReference
  /** Timestamp when the job was started */
  startTime?: Date;
  /** Timestamp when the job completed */
  endTime?: Date;
  /** Current status of the job execution */
  status?: JobStatus;
  /** Error information if the job failed */
  failureReason?: any;
}

/**
 * Represents a Fabric item that has been deployed as part of a package deployment.
 * Extends the base Item interface with deployment-specific metadata.
 */
export interface DeployedItem extends Item {
  /** Name of the item definition used to create this deployed item */
  itemDefinitionName: string;
}

/**
 * Configuration for the target workspace where packages will be deployed.
 * Supports both creating new workspaces and deploying to existing ones.
 * 
 * @example
 * ```typescript
 * // Create new workspace
 * const config: WorkspaceConfig = {
 *   createNew: true,
 *   name: "Analytics Workspace",
 *   description: "Workspace for analytics packages"
 * };
 * 
 * // Use existing workspace
 * const existingConfig: WorkspaceConfig = {
 *   createNew: false,
 *   id: "workspace-123"
 * };
 * ```
 */
export interface WorkspaceConfig {
  /** Whether to create a new workspace or use an existing one */
  createNew: boolean;
  /** ID of existing workspace (required if createNew is false) */
  id?: string;
  /** Name for the workspace (required if createNew is true) */
  name?: string;
  /** Optional description for the workspace */
  description?: string;
  /** Capacity ID to associate with the workspace */
  capacityId?: string;
  /** Folder configuration within the workspace */
  folder?: FolderConfig;
}

/**
 * Configuration for organizing deployed items within folders in the workspace.
 * Supports creating new folders or using existing folder structures.
 */
export interface FolderConfig {
  /** Whether to create a new folder or use an existing one */
  createNew: boolean;
  /** ID of parent folder when creating a new folder */
  parentFolderId?: string;
  /** ID of existing folder (required if createNew is false) */
  id?: string;
  /** Name of the folder */
  name: string;
}

/**
 * Enumeration of possible deployment statuses throughout the deployment lifecycle.
 */
export enum DeploymentStatus {
  /** Deployment is queued but not yet started */
  Pending = "Pending",
  /** Deployment is currently executing */
  InProgress = "InProgress",
  /** Deployment completed successfully */
  Succeeded = "Succeeded",
  /** Deployment failed with errors */
  Failed = "Failed",
  /** Deployment was cancelled by user or system */
  Cancelled = "Cancelled",
}

/**
 * Represents a complete package that can be deployed to Microsoft Fabric.
 * Contains all items, data, and configuration needed for deployment.
 * 
 * @example
 * ```typescript
 * const package: Package = {
 *   id: "analytics-package-v1",
 *   displayName: "Analytics Starter Package",
 *   description: "Complete analytics solution with notebooks and datasets",
 *   items: [notebookItem, datasetItem],
 *   deploymentConfig: { type: DeploymentType.UX }
 * };
 * ```
 */
export interface Package {
  /** Unique identifier for the package */
  id: string;
  /** Human-readable name for the package */
  displayName: string;
  /** Optional description of the package contents and purpose */
  description?: string;
  /** Optional icon or image URL for the package */
  icon?: string;
  /** Configuration settings for package deployment */
  deploymentConfig?: DeploymentConfiguration;
  /** Array of Fabric items included in this package */
  items?: PackageItem[];
  /** Data files and assets to be uploaded to OneLake */
  data?: PackageData[];
}

/**
 * Configuration settings that control how a package is deployed.
 * Includes deployment strategy, location preferences, and runtime parameters.
 */
export interface DeploymentConfiguration {
  /** Deployment strategy to use (defaults to UX) */
  type?: DeploymentType;
  /** Target location for deployment (defaults to NewWorkspace) */
  location?: DeploymentLocation;
  /** Reference to external deployment file */
  deploymentFile?: DeploymentFile;
  /** Whether to add deployment ID suffix to item names */
  suffixItemNames?: boolean;
  /** Key-value parameters for deployment customization */
  parameters?: Record<string, DeploymentParameter>;
  /** Global interceptors */
  globalInterceptors?: Record<string, ItemPartInterceptorDefinition<any>>;
  /** Jobs to execute after successful deployment */
  onFinishJobs?: OnFinishJob[];
}

/**
 * Extended job information for jobs that run after deployment completion.
 * Includes deployment-specific policies and status tracking.
 */
export interface OnFinishJobInfo extends DeploymentJobInfo {
  /** How to handle job failures - fail deployment or continue */
  deploymentPolicy: "FailOnError" | "IgnoreErrors";
  /** Current status of the job execution */
  jobStatus: JobStatus
}

/**
 * Definition of a job to be executed after package deployment completes.
 * These jobs can perform additional setup, data loading, or validation tasks.
 * 
 * @example
 * ```typescript
 * const dataLoadJob: OnFinishJob = {
 *   itemId: "data-loader-notebook",
 *   jobType: "SparkJob",
 *   deploymentPolicy: "FailOnError",
 *   executionData: { dataSource: "external-api" }
 * };
 * ```
 */
export interface OnFinishJob {
  /** Workspace ID where the job item is located */
  workspaceId?: string;
  /** ID of the Fabric item that will execute the job */
  itemId: string;
  /** Type of job to execute (e.g., "SparkJob", "DataflowJob") */
  jobType: string;
  /** How to handle job failures during deployment */
  deploymentPolicy: "FailOnError" | "IgnoreErrors";
  /** Optional data to pass to the job execution */
  executionData?: any;
}

/**
 * Defines a configurable parameter for deployment customization.
 * Parameters allow users to customize package behavior during deployment.
 * 
 * @example
 * ```typescript
 * const dbConnectionParam: DeploymentParameter = {
 *   type: "string",
 *   displayName: "Database Connection String",
 *   description: "Connection string for the source database",
 *   value: "default-connection"
 * };
 * ```
 */
export interface DeploymentParameter {
  /** Data type of the parameter (e.g., "string", "number", "boolean") */
  type: string;
  /** Current or default value of the parameter */
  value?: string;
  /** User-friendly name shown in deployment UI */
  displayName?: string;
  /** Detailed description explaining the parameter's purpose */
  description?: string;
}

/**
 * Reference to an external file used during deployment.
 * Can point to local assets or external resources.
 */
export interface DeploymentFile {
  /** How the file content is stored/referenced */
  payloadType: PackageItemPayloadType;
  /** The actual file content or reference */
  payload: string;
}

/**
 * Enumeration of available deployment strategies.
 * Different strategies handle deployment execution in different ways.
 */
export enum DeploymentType {
  /** Standard UI-based deployment strategy */
  UX = "UX",
  /** Spark notebook-based deployment strategy for compute-intensive tasks */
  SparkNotebook = "SparkNotebook"
}

/**
 * Enumeration of target locations for package deployment.
 */
export enum DeploymentLocation {
  /** Use default deployment location settings */
  Default = "Default",
  /** Create a new workspace specifically for this package */
  NewWorkspace = "NewWorkspace",
}

/**
 * Enumeration of installation types for package items.
 */
export enum InstallType {
  /** Standard installation during main deployment phase */
  Default = "Default",
  /** Installation as part of post-deployment job execution */
  OnFinishJob = "OnFinishJob",
}

/**
 * Represents an individual item within a package that will be deployed to Fabric.
 * Items can be notebooks, datasets, reports, or any other Fabric artifact.
 * 
 * @example
 * ```typescript
 * const notebookItem: PackageItem = {
 *   type: "Notebook",
 *   displayName: "Data Analysis Notebook",
 *   description: "Performs customer segmentation analysis",
 *   definition: {
 *     format: "ipynb",
 *     parts: [{ payloadType: "AssetLink", payload: "notebooks/analysis.ipynb", path: "/" }]
 *   }
 * };
 * ```
 */
export interface PackageItem {
  /** Type of Fabric item (e.g., "Notebook", "Dataset", "Report") */
  type: string;
  /** Human-readable name for the item */
  displayName: string;
  /** Description of the item's purpose and functionality */
  description: string;
  /** When this item should be installed during deployment */
  installType?: InstallType;
  /** Item definition including content and metadata */
  definition?: PackageItemDefinition;
  /** Additional data files associated with this item */
  data?: PackageItemData;
  /** Fabric API payload for item creation */
  creationPayload?: any;
  /** Automated schedules for item execution */
  schedules?: ItemSchedule[];
  /** OneLake shortcuts to be created for this item */
  shortcuts?: OneLakeShortcutDefinition[];
  /** A list of dependencies for this item. */
  dependsOn?: PackageItemDependency[]
}

/**
 * Defines an automated schedule for executing a package item.
 * Schedules allow items to run automatically at specified intervals.
 */
export interface ItemSchedule {
  /** Whether this schedule is currently active */
  enabled: boolean;
  /** Type of job to execute (e.g., "SparkJob", "DataflowJob") */
  jobType: string;
  /** Detailed schedule configuration (timing, recurrence, etc.) */
  configuration: ScheduleConfig;
}

/**
 * Enumeration of supported payload types for package item content.
 * Determines how item content is stored and accessed during deployment.
 */
export enum PackageItemPayloadType {
  /** Reference to an asset bundled with the application */
  AssetLink = "AssetLink",
  /** Reference to an external URL or resource */
  Link = "Link",
  /** Content embedded directly as base64-encoded data */
  InlineBase64 = "InlineBase64",
  /** Reference to a OneLake resource */
  OneLake = "OneLake"
}

/**
 * Defines the structure and content of a package item.
 * Contains the actual definition files and processing instructions.
 */
export interface PackageItemDefinition {
  /** File format of the item (e.g., "ipynb" for Jupyter Notebooks) */
  format?: string;
  /** Individual parts/files that make up the item definition */
  parts?: PackageItemPart[];
  /** Optional content processing interceptor */
  interceptor?: ItemPartInterceptorDefinition<any>;
  /** How the item should be created or updated in Fabric.
   * this is needed as some items have difficulties to be created with definition. 
   * Default we use createandupdateDefinition as createwithdefinition will not return the id of the item immediately which we need for interceptors*/
  creationMode?: "WithoutDefinition" | "WithDefinition" | "CreateAndUpdateDefinition";
}

/**
 * Defines a dependency for other items. 
 * The dependency can be absolute (when the workspaceId and itemId are set) or relative (when only the itemId is set, it will be resolved in the current workspace).
 */
export interface PackageItemDependency {
  /** The workspace ID where the item is located */
  workspaceId?: string;
  /** The item ID of the dependency */
  itemId: string;
  /** The type of the dependency */
  itemType?: string;
}

/**
 * Defines content processing that occurs before item deployment.
 * Interceptors can modify content, perform substitutions, or apply transformations.
 * 
 * @template T - The configuration type for the interceptor
 */
export interface ItemPartInterceptorDefinition<T extends ItemPartInterceptorDefinitionConfig> {
  /** Type of interceptor processing to apply */
  type: ItemPartInterceptorType;
  /** Configuration object specific to the interceptor type */
  config: T;
}

/**
 * Enumeration of available interceptor types for content processing.
 */
export enum ItemPartInterceptorType {
  /** Global reference interceptor */
  Reference = "Reference",
  /** Performs find-and-replace operations on content */
  StringReplacement = "StringReplacement",
}

/**
 * Base interface for interceptor configuration objects.
 * Specific interceptor types extend this interface with their own configuration properties.
 */
export interface ItemPartInterceptorDefinitionConfig {
}

export interface ReferenceInterceptorDefinitionConfig extends ItemPartInterceptorDefinitionConfig {
  /** Id of the global defined interceptor */
  id: string
}

/**
 * Configuration for string replacement interceptor.
 * Defines key-value pairs for find-and-replace operations on item content.
 * 
 * @example
 * ```typescript
 * const config: StringReplacementInterceptorDefinitionConfig = {
 *   replacements: {
 *     "{{API_ENDPOINT}}": "https://api.example.com",
 *     "{{DATABASE_NAME}}": "production_db"
 *   }
 * };
 * ```
 */
export interface StringReplacementInterceptorDefinitionConfig extends ItemPartInterceptorDefinitionConfig {
  /** Map of search strings to replacement values */
  replacements: Record<string, string>;
}

/**
 * Extended package data that includes workspace and item references.
 * Used for data that needs to be associated with specific Fabric items.
 */
export interface PackageData extends PackageItemData {
  /** Target workspace ID for data storage */
  workspaceId?: string;
  /** Target item ID for data association */
  itemId?: string;
  /** OneLake shortcuts to create for data access */
  shortcuts?: OneLakeShortcutDefinition[];
}

/**
 * Base interface for data associated with package items.
 * Contains files and optional content processing instructions.
 */
export interface PackageItemData {
  /** Array of files to be uploaded or processed */
  files?: PackageItemPart[];
  /** Optional content processing interceptor */
  interceptor?: ItemPartInterceptorDefinition<any>;
}

/**
 * Represents a single file or content part within a package item.
 * Defines how content is stored and where it should be placed.
 * 
 * @example
 * ```typescript
 * const notebookPart: PackageItemPart = {
 *   payloadType: "AssetLink",
 *   payload: "assets/analysis.ipynb",
 *   path: "/notebooks/"
 * };
 * ```
 */
export interface PackageItemPart {
  /** How the content is stored/referenced */
  payloadType: PackageItemPayloadType;
  /** The actual content or reference to content */
  payload: string;
  /** Target path where this content should be placed */
  path: string;
}

/**
 * Defines a OneLake shortcut that provides access to external data sources.
 * Shortcuts allow items to reference data without copying it physically.
 * 
 * @example
 * ```typescript
 * const dataShortcut: OneLakeShortcutDefinition = {
 *   conflictPolicy: "Abort",
 *   configuration: {
 *     path: "/external-data/",
 *     target: { ... }
 *   }
 * };
 * ```
 */
export interface OneLakeShortcutDefinition {
  /** How to handle conflicts if shortcut already exists */
  conflictPolicy?: ShortcutConflictPolicy,
  /** Shortcut configuration matching Fabric API requirements */
  configuration: any;
}






