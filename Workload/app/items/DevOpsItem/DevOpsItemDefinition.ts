/***
 * Interface representing the definition of a DevOps item.
 * This information is stored in Fabric as Item definition. 
 * It will be returned once the item definition is loaded.
 */

/**
 * Workspace Git connection information
 */
export interface WorkspaceGitConnection {
  /** Workspace ID */
  workspaceId: string;
  /** Workspace name */
  workspaceName: string;
  /** Git organization name */
  organizationName: string;
  /** Git project name */
  projectName: string;
  /** Git repository name */
  repositoryName: string;
  /** Git branch name */
  branchName: string;
  /** Last sync time */
  lastSyncTime?: string;
  /** Git provider type (AzureDevOps or GitHub) */
  gitProviderType: string;
  /** Git sync status */
  gitSyncStatus?: string;
}

export interface DevOpsItemDefinition {
  /** Cached workspace Git connections */
  workspaceGitConnections?: WorkspaceGitConnection[];
  /** Last scan timestamp */
  lastScanned?: string;
}

