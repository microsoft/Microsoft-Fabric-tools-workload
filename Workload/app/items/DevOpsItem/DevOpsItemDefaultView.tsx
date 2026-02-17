import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Input,
  Label,
  Text,
  Spinner,
  DataGrid,
  DataGridHeader,
  DataGridRow,
  DataGridHeaderCell,
  DataGridBody,
  DataGridCell,
  TableColumnDefinition,
  createTableColumn,
  TableCellLayout,
} from "@fluentui/react-components";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { DevOpsItemDefinition } from "./DevOpsItemDefinition";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import "./DevOpsItem.scss";

interface DevOpsItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<DevOpsItemDefinition>;
  definition: DevOpsItemDefinition;
  onDefinitionChange: (newDefinition: DevOpsItemDefinition) => void;
}

interface GitHubBranch {
  name: string;
  commitSha: string;
  commitMessage: string;
  commitAuthor: string;
  commitDate: string;
}

export function DevOpsItemDefaultView({
  workloadClient,
  item,
  definition,
  onDefinitionChange,
}: DevOpsItemDefaultViewProps) {
  const { t } = useTranslation();
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Fetch branches from GitHub API
  const fetchBranches = async () => {
    if (!definition.repositoryOwner || !definition.repositoryName) {
      return;
    }

    setIsLoadingBranches(true);
    setErrorMessage("");

    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };

      // Add authentication if token is provided
      if (definition.githubToken) {
        headers['Authorization'] = `Bearer ${definition.githubToken}`;
      }

      const response = await fetch(
        `https://api.github.com/repos/${definition.repositoryOwner}/${definition.repositoryName}/branches`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Repository not found. Please check the owner and repository name.');
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please check your GitHub token.');
        } else {
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      
      // Fetch detailed commit info for each branch
      const branchesWithCommits = await Promise.all(
        data.map(async (branch: any) => {
          try {
            const commitResponse = await fetch(branch.commit.url, { headers });
            const commitData = await commitResponse.json();
            
            return {
              name: branch.name,
              commitSha: branch.commit.sha.substring(0, 7),
              commitMessage: commitData.commit.message.split('\n')[0], // First line only
              commitAuthor: commitData.commit.author.name,
              commitDate: new Date(commitData.commit.author.date).toLocaleString(),
            };
          } catch (error) {
            return {
              name: branch.name,
              commitSha: branch.commit.sha.substring(0, 7),
              commitMessage: 'Unable to fetch commit details',
              commitAuthor: '',
              commitDate: '',
            };
          }
        })
      );

      setBranches(branchesWithCommits);
    } catch (error) {
      setErrorMessage(error.message || 'Failed to fetch branches');
      console.error('Error fetching branches:', error);
    } finally {
      setIsLoadingBranches(false);
    }
  };

  // Auto-fetch branches when definition changes
  useEffect(() => {
    if (definition.repositoryOwner && definition.repositoryName) {
      fetchBranches();
    }
  }, [definition.repositoryOwner, definition.repositoryName, definition.githubToken]);

  // Define table columns
  const columns: TableColumnDefinition<GitHubBranch>[] = [
    createTableColumn<GitHubBranch>({
      columnId: 'name',
      compare: (a, b) => a.name.localeCompare(b.name),
      renderHeaderCell: () => t('DevOpsItem_Column_Branch', 'Branch'),
      renderCell: (item) => (
        <TableCellLayout>
          <Text weight="semibold">{item.name}</Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<GitHubBranch>({
      columnId: 'commitSha',
      renderHeaderCell: () => t('DevOpsItem_Column_Commit', 'Commit'),
      renderCell: (item) => (
        <TableCellLayout>
          <Text font="monospace">{item.commitSha}</Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<GitHubBranch>({
      columnId: 'commitMessage',
      renderHeaderCell: () => t('DevOpsItem_Column_Message', 'Message'),
      renderCell: (item) => (
        <TableCellLayout truncate>
          {item.commitMessage}
        </TableCellLayout>
      ),
    }),
    createTableColumn<GitHubBranch>({
      columnId: 'commitAuthor',
      renderHeaderCell: () => t('DevOpsItem_Column_Author', 'Author'),
      renderCell: (item) => item.commitAuthor,
    }),
    createTableColumn<GitHubBranch>({
      columnId: 'commitDate',
      renderHeaderCell: () => t('DevOpsItem_Column_Date', 'Date'),
      renderCell: (item) => item.commitDate,
    }),
  ];

  // Configuration panel (left side)
  const configurationPanel = (
    <div className="devops-item-config">
      <div className="config-section">
        <Label htmlFor="repo-owner" required>
          {t('DevOpsItem_RepoOwner_Label', 'Repository Owner')}
        </Label>
        <Input
          id="repo-owner"
          value={definition.repositoryOwner || ''}
          onChange={(e, data) => onDefinitionChange({ 
            ...definition, 
            repositoryOwner: data.value 
          })}
          placeholder="microsoft"
        />
      </div>

      <div className="config-section">
        <Label htmlFor="repo-name" required>
          {t('DevOpsItem_RepoName_Label', 'Repository Name')}
        </Label>
        <Input
          id="repo-name"
          value={definition.repositoryName || ''}
          onChange={(e, data) => onDefinitionChange({ 
            ...definition, 
            repositoryName: data.value 
          })}
          placeholder="fabric-samples"
        />
      </div>

      <div className="config-section">
        <Label htmlFor="github-token">
          {t('DevOpsItem_Token_Label', 'GitHub Token (Optional)')}
        </Label>
        <Input
          id="github-token"
          type="password"
          value={definition.githubToken || ''}
          onChange={(e, data) => onDefinitionChange({ 
            ...definition, 
            githubToken: data.value 
          })}
          placeholder="ghp_..."
        />
        <Text size={200}>
          {t('DevOpsItem_Token_Help', 'Required for private repos or higher rate limits')}
        </Text>
      </div>

      {definition.lastRefreshed && (
        <div className="config-section">
          <Text size={200}>
            {t('DevOpsItem_LastRefreshed', 'Last refreshed: {{date}}', {
              date: new Date(definition.lastRefreshed).toLocaleString()
            })}
          </Text>
        </div>
      )}
    </div>
  );

  // Branches panel (center)
  const branchesPanel = (
    <div className="devops-item-branches">
      {isLoadingBranches ? (
        <div className="loading-container">
          <Spinner label={t('DevOpsItem_Loading', 'Loading branches...')} />
        </div>
      ) : errorMessage ? (
        <div className="error-container">
          <Text>{errorMessage}</Text>
        </div>
      ) : branches.length === 0 ? (
        <div className="empty-container">
          <Text>
            {t('DevOpsItem_NoBranches', 
              'Configure your repository to see branches and commits.')}
          </Text>
        </div>
      ) : (
        <DataGrid
          items={branches}
          columns={columns}
          sortable
          selectionMode="single"
          size="small"
          className="branches-grid"
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<GitHubBranch>>
            {({ item, rowId }) => (
              <DataGridRow<GitHubBranch> key={rowId}>
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </div>
  );

  return (
    <ItemEditorDefaultView
      left={{
        content: configurationPanel,
        width: 320,
        minWidth: 280,
        title: t('DevOpsItem_Config_Title', 'Configuration'),
        enableUserResize: true,
        collapsible: true
      }}
      center={{
        content: branchesPanel
      }}
    />
  );
}
