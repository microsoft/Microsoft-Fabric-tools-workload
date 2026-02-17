/***
 * Interface representing the definition of a DevOps item.
 * This information is stored in Fabric as Item definition. 
 * It will be returned once the item definition is loaded.
 */
export interface DevOpsItemDefinition {
  /** GitHub repository owner/organization name */
  repositoryOwner?: string;
  /** GitHub repository name */
  repositoryName?: string;
  /** GitHub Personal Access Token (encrypted) */
  githubToken?: string;
  /** Last refresh timestamp */
  lastRefreshed?: string;
}
