import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
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
  Badge,
} from "@fluentui/react-components";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { DevOpsItemDefinition, WorkspaceGitConnection } from "./DevOpsItemDefinition";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import { FabricPlatformAPIClient } from "../../clients/FabricPlatformAPIClient";
import "./DevOpsItem.scss";

interface DevOpsItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<DevOpsItemDefinition>;
  definition: DevOpsItemDefinition;
  onDefinitionChange: (newDefinition: DevOpsItemDefinition) => void;
  onScanCallback?: (scanFn: () => Promise<void>) => void;
}

export function DevOpsItemDefaultView({
  workloadClient,
  item,
  definition,
  onDefinitionChange,
  onScanCallback,
}: DevOpsItemDefaultViewProps) {
  const { t } = useTranslation();
  const [workspaceConnections, setWorkspaceConnections] = useState<WorkspaceGitConnection[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Scan all workspaces for Git connections
  const scanWorkspaces = async () => {
    setIsScanning(true);
    setErrorMessage("");

    try {
      const fabricAPI = FabricPlatformAPIClient.create(workloadClient);
      
      // Get all workspaces the user has access to
      const workspaces = await fabricAPI.workspaces.getAllWorkspaces();
      
      // Scan each workspace for Git connections
      const connections: WorkspaceGitConnection[] = [];
      
      for (const workspace of workspaces) {
        try {
          // Try to get Git connection for this workspace
          const gitConnection = await fabricAPI.git.getGitConnection(workspace.id);
          
          // Check if Git is actually enabled by verifying GitStatus
          let gitStatus;
          try {
            gitStatus = await fabricAPI.git.getGitStatus(workspace.id);
          } catch (statusError) {
            // If we can't get status, Git might not be fully enabled
            console.warn(`Could not get Git status for workspace ${workspace.id}:`, statusError);
            continue; // Skip this workspace
          }
          
          // If GitStatus is empty/null, Git is not enabled
          if (!gitStatus || !gitStatus.workspaceHead) {
            continue; // Skip workspaces without active Git status
          }
          
          // Get connection state for last sync time
          let lastSyncTime: string | undefined;
          let gitSyncStatus: string | undefined;
          try {
            const connectionState = await fabricAPI.git.getGitConnectionState(workspace.id);
            lastSyncTime = connectionState.lastSyncTime;
            gitSyncStatus = connectionState.gitSyncStatus;
          } catch (stateError) {
            // State might not be available, continue without it
            console.warn(`Could not get connection state for workspace ${workspace.id}:`, stateError);
          }

          connections.push({
            workspaceId: workspace.id,
            workspaceName: workspace.displayName,
            organizationName: gitConnection.organizationName,
            projectName: gitConnection.projectName,
            repositoryName: gitConnection.repositoryName,
            branchName: gitConnection.branchName,
            gitProviderType: gitConnection.gitProviderType,
            lastSyncTime,
            gitSyncStatus,
          });
        } catch (error: any) {
          // 404 means no Git connection for this workspace, skip it
          if (error?.status !== 404) {
            console.warn(`Error getting Git connection for workspace ${workspace.displayName}:`, error);
          }
        }
      }

      setWorkspaceConnections(connections);
      
      // Update definition with scan results
      onDefinitionChange({
        ...definition,
        workspaceGitConnections: connections,
        lastScanned: new Date().toISOString(),
      });
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to scan workspaces');
      console.error('Error scanning workspaces:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Load cached connections on mount or scan if none cached
  useEffect(() => {
    if (definition.workspaceGitConnections && definition.workspaceGitConnections.length > 0) {
      setWorkspaceConnections(definition.workspaceGitConnections);
    } else {
      // Auto-scan on first load
      scanWorkspaces();
    }
    
    // Expose scan function to parent via callback
    if (onScanCallback) {
      onScanCallback(scanWorkspaces);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Define table columns
  const columns: TableColumnDefinition<WorkspaceGitConnection>[] = [
    createTableColumn<WorkspaceGitConnection>({
      columnId: 'workspaceName',
      compare: (a, b) => a.workspaceName.localeCompare(b.workspaceName),
      renderHeaderCell: () => t('DevOpsItem_Column_Workspace', 'Workspace'),
      renderCell: (item) => (
        <TableCellLayout>
          <Text weight="semibold">{item.workspaceName}</Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<WorkspaceGitConnection>({
      columnId: 'gitProviderType',
      renderHeaderCell: () => t('DevOpsItem_Column_Provider', 'Provider'),
      renderCell: (item) => (
        <TableCellLayout>
          <Badge appearance="tint" color={item.gitProviderType === 'AzureDevOps' ? 'brand' : 'important'}>
            {item.gitProviderType}
          </Badge>
        </TableCellLayout>
      ),
    }),
    createTableColumn<WorkspaceGitConnection>({
      columnId: 'organizationName',
      renderHeaderCell: () => t('DevOpsItem_Column_Organization', 'Organization'),
      renderCell: (item) => item.organizationName,
    }),
    createTableColumn<WorkspaceGitConnection>({
      columnId: 'projectName',
      renderHeaderCell: () => t('DevOpsItem_Column_Project', 'Project'),
      renderCell: (item) => item.projectName,
    }),
    createTableColumn<WorkspaceGitConnection>({
      columnId: 'repositoryName',
      renderHeaderCell: () => t('DevOpsItem_Column_Repository', 'Repository'),
      renderCell: (item) => item.repositoryName,
    }),
    createTableColumn<WorkspaceGitConnection>({
      columnId: 'branchName',
      renderHeaderCell: () => t('DevOpsItem_Column_Branch', 'Branch'),
      renderCell: (item) => (
        <TableCellLayout>
          <Text font="monospace">{item.branchName}</Text>
        </TableCellLayout>
      ),
    }),
    createTableColumn<WorkspaceGitConnection>({
      columnId: 'gitSyncStatus',
      renderHeaderCell: () => t('DevOpsItem_Column_Status', 'Status'),
      renderCell: (item) => {
        if (!item.gitSyncStatus) return '-';
        
        const statusColor = 
          item.gitSyncStatus === 'Synchronized' ? 'success' :
          item.gitSyncStatus === 'Conflict' ? 'danger' :
          item.gitSyncStatus === 'UpdateRequired' ? 'warning' :
          item.gitSyncStatus === 'Updating' ? 'informative' :
          'subtle';
        
        return (
          <TableCellLayout>
            <Badge appearance="filled" color={statusColor}>
              {item.gitSyncStatus}
            </Badge>
          </TableCellLayout>
        );
      },
    }),
    createTableColumn<WorkspaceGitConnection>({
      columnId: 'lastSyncTime',
      renderHeaderCell: () => t('DevOpsItem_Column_LastSync', 'Last Sync'),
      renderCell: (item) => 
        item.lastSyncTime 
          ? new Date(item.lastSyncTime).toLocaleString() 
          : t('DevOpsItem_NoSyncTime', 'Never'),
    }),
  ];

  // Main content panel
  const contentPanel = (
    <div className="devops-item-content">
      {isScanning ? (
        <div className="loading-container">
          <Spinner label={t('DevOpsItem_Loading', 'Scanning workspaces for Git connections...')} />
        </div>
      ) : errorMessage ? (
        <div className="error-container">
          <Text>{errorMessage}</Text>
        </div>
      ) : workspaceConnections.length === 0 ? (
        <div className="empty-container">
          <Text>
            {t('DevOpsItem_NoConnections', 
              'No workspaces with Git integration found. Connect your workspaces to Azure DevOps or GitHub.')}
          </Text>
        </div>
      ) : (
        <>
          {definition.lastScanned && (
            <div className="info-section">
              <Text size={200}>
                {t('DevOpsItem_LastScanned', 'Last scanned: {{date}} • Found {{count}} workspace(s) with Git integration', {
                  date: new Date(definition.lastScanned).toLocaleString(),
                  count: workspaceConnections.length,
                })}
              </Text>
            </div>
          )}
          <DataGrid
            items={workspaceConnections}
            columns={columns}
            sortable
            selectionMode="single"
            size="small"
            className="git-connections-grid"
          >
            <DataGridHeader>
              <DataGridRow>
                {({ renderHeaderCell }) => (
                  <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                )}
              </DataGridRow>
            </DataGridHeader>
            <DataGridBody<WorkspaceGitConnection>>
              {({ item, rowId }) => (
                <DataGridRow<WorkspaceGitConnection> key={rowId}>
                  {({ renderCell }) => (
                    <DataGridCell>{renderCell(item)}</DataGridCell>
                  )}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        </>
      )}
    </div>
  );

  return (
    <ItemEditorDefaultView
      center={{
        content: contentPanel
      }}
    />
  );
}

