import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { FabricPlatformClient } from "./FabricPlatformClient";
import { SCOPE_PAIRS } from "./FabricPlatformScopes";
import { 
  GitConnection,
  GitConnectionState,
  GitStatus,
  AuthenticationConfig
} from "./FabricPlatformTypes";

/**
 * Fabric Git Integration API Client
 * Provides methods to interact with Fabric's Git integration features
 * 
 * Based on the official Fabric REST API:
 * https://learn.microsoft.com/en-us/rest/api/fabric/core/git
 * 
 * Uses method-based scope selection:
 * - GET operations use read-only workspace scopes
 * - POST/PUT/PATCH/DELETE operations use read-write workspace scopes
 */
export class GitClient extends FabricPlatformClient {
  constructor(workloadClientOrAuth: WorkloadClientAPI | AuthenticationConfig) {
    // Use Git scope pairs which include Workspace.GitUpdate.All for Git status operations
    // GET operations will use GIT_READ scopes, other operations will use GIT scopes
    super(workloadClientOrAuth, SCOPE_PAIRS.GIT);
  }

  /**
   * Get the Git connection details for a workspace
   * @param workspaceId The workspace ID
   * @returns Promise resolving to the Git connection details
   */
  async getGitConnection(workspaceId: string): Promise<GitConnection> {
    return this.get<GitConnection>(`/workspaces/${workspaceId}/git/connection`);
  }

  /**
   * Get the Git connection state for a workspace
   * @param workspaceId The workspace ID
   * @returns Promise resolving to the Git connection state
   */
  async getGitConnectionState(workspaceId: string): Promise<GitConnectionState> {
    return this.get<GitConnectionState>(`/workspaces/${workspaceId}/git/connection/state`);
  }

  /**
   * Get the Git status for a workspace
   * @param workspaceId The workspace ID
   * @returns Promise resolving to the Git status
   */
  async getGitStatus(workspaceId: string): Promise<GitStatus> {
    return this.get<GitStatus>(`/workspaces/${workspaceId}/git/status`);
  }

  /**
   * Initialize a Git connection for a workspace
   * @param workspaceId The workspace ID
   * @param connectionRequest The Git connection details
   * @returns Promise resolving to the created connection
   */
  async initializeGitConnection(
    workspaceId: string, 
    connectionRequest: Partial<GitConnection>
  ): Promise<GitConnection> {
    return this.post<GitConnection>(
      `/workspaces/${workspaceId}/git/initializeConnection`,
      connectionRequest
    );
  }

  /**
   * Update a Git connection for a workspace
   * @param workspaceId The workspace ID
   * @param connectionRequest The updated Git connection details
   * @returns Promise resolving to the updated connection
   */
  async updateGitConnection(
    workspaceId: string,
    connectionRequest: Partial<GitConnection>
  ): Promise<GitConnection> {
    return this.patch<GitConnection>(
      `/workspaces/${workspaceId}/git/connection`,
      connectionRequest
    );
  }

  /**
   * Disconnect Git from a workspace
   * @param workspaceId The workspace ID
   * @returns Promise resolving when the connection is removed
   */
  async disconnectGit(workspaceId: string): Promise<void> {
    return this.delete<void>(`/workspaces/${workspaceId}/git/connection`);
  }

  /**
   * Commit changes to Git from a workspace
   * @param workspaceId The workspace ID
   * @param commitRequest The commit details (message, items, etc.)
   * @returns Promise resolving when commit is complete
   */
  async commitToGit(workspaceId: string, commitRequest: any): Promise<void> {
    return this.post<void>(`/workspaces/${workspaceId}/git/commitToGit`, commitRequest);
  }

  /**
   * Update workspace from Git
   * @param workspaceId The workspace ID
   * @param updateRequest The update details
   * @returns Promise resolving when update is complete
   */
  async updateFromGit(workspaceId: string, updateRequest: any): Promise<void> {
    return this.post<void>(`/workspaces/${workspaceId}/git/updateFromGit`, updateRequest);
  }
}
