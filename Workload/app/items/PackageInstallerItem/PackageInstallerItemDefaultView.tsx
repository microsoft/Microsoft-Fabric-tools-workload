import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Button,
} from "@fluentui/react-components";
import { DeleteRegular, PlayRegular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";
import { PackageDeployment, PackageInstallerItemDefinition, DeploymentStatus } from "./PackageInstallerItemModel";
import { WorkspaceDisplayNameCell } from "../../components/WorkspaceDisplayName";
import { FolderDisplayNameCell } from "../../components/FolderDisplayName";
import { PackageDisplayNameCell } from "./components/PackageDisplayName";
import { PackageInstallerContext } from "./package/PackageInstallerContext";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import "./PackageInstallerItem.scss";

interface PackageInstallerItemDefaultViewProps {
  editorItem: ItemWithDefinition<PackageInstallerItemDefinition>;
  context: PackageInstallerContext;
  isDeploymentInProgress: boolean;
  deploymentProgress: {
    deploymentId: string;
    packageName: string;
    currentStep: string;
    progress: number;
  } | null;
  onDeploymentSelected: (deployment: PackageDeployment) => void;
  onStartDeployment: (deployment: PackageDeployment, event?: React.MouseEvent) => Promise<void>;
  onRemoveDeployment: (deploymentId: string) => void;
}

/**
 * PackageInstallerItemDefaultView - Main view showing deployed packages
 * 
 * This component displays the main table of deployed packages and their statuses.
 * It follows the new ItemEditorDefaultView pattern for consistent layout.
 */
export function PackageInstallerItemDefaultView({
  editorItem,
  context,
  isDeploymentInProgress,
  deploymentProgress,
  onDeploymentSelected,
  onStartDeployment,
  onRemoveDeployment
}: PackageInstallerItemDefaultViewProps) {
  const { t } = useTranslation();

  // Main content with deployments table
  const mainContent = (
    <div className="package-installer-content">
      <div className="package-installer-section-header">
        <h2>{t('PackageInstallerItemDefaultView_Title', 'Deployed Packages')}</h2>
        <p className="package-installer-section-description">
          {t('PackageInstallerItemDefaultView_Description', 'View and manage your deployed packages and their statuses.')}
        </p>
      </div>
      
      {editorItem?.definition?.deployments?.length > 0 ? (
        <div className="deployment-container">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>{t('PackageInstallerTable_DeploymentId', 'Deployment Id')}</TableHeaderCell>
                <TableHeaderCell>{t('PackageInstallerTable_PackageType', 'Package Type')}</TableHeaderCell>
                <TableHeaderCell>{t('PackageInstallerTable_DeploymentStatus', 'Deployment Status')}</TableHeaderCell>
                <TableHeaderCell>{t('PackageInstallerTable_DeploymentTriggered', 'Deployment Triggered')}</TableHeaderCell>
                <TableHeaderCell>{t('PackageInstallerTable_WorkspaceName', 'Workspace Name')}</TableHeaderCell>
                <TableHeaderCell>{t('PackageInstallerTable_FolderName', 'Folder Name')}</TableHeaderCell>
                <TableHeaderCell className="actions-cell">{t('PackageInstallerTable_Actions', 'Actions')}</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editorItem.definition.deployments.map((deployment: PackageDeployment) => {
                const isRowDisabled = isDeploymentInProgress && deploymentProgress?.deploymentId !== deployment.id;
                return (
                  <TableRow 
                    key={deployment.id} 
                    className={`deployment-table-row ${!isDeploymentInProgress ? 'clickable' : ''} ${isRowDisabled ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!isDeploymentInProgress) {
                        onDeploymentSelected(deployment);
                      }
                    }} 
                  >
                    <TableCell>{deployment.id}</TableCell>
                    <TableCell>
                      <PackageDisplayNameCell
                        context={context}
                        packageId={deployment.packageId}
                        showIcon={true} />
                    </TableCell>
                    <TableCell>
                      <div className={`status-indicator ${DeploymentStatus[deployment.status].toLowerCase()}`}>
                        {DeploymentStatus[deployment.status]}
                      </div>
                    </TableCell>
                    <TableCell>
                      {deployment.triggeredTime 
                        ? new Date(deployment.triggeredTime).toLocaleString() 
                        : t('PackageInstallerTable_NotStarted', 'Not started yet')}
                    </TableCell>
                    <TableCell>
                      <WorkspaceDisplayNameCell
                        workloadClient={context.workloadClientAPI}
                        workspaceId={deployment.workspace?.id} />
                    </TableCell>
                    <TableCell>
                      <FolderDisplayNameCell
                          workloadClient={context.workloadClientAPI}
                          workspaceId={deployment.workspace?.id} 
                          folderId={deployment.workspace?.folder?.id} />
                    </TableCell>
                    <TableCell className="actions-cell">
                      <div className="deployment-actions">
                        <Button
                            icon={<PlayRegular />}
                            appearance="subtle"
                            size="small"
                            disabled={isDeploymentInProgress || deployment.status !== DeploymentStatus.Pending}
                            onClick={(e: React.MouseEvent) => onStartDeployment(deployment, e)}
                            aria-label={t('PackageInstallerTable_StartDeployment', 'Start deployment')}
                            title={t('PackageInstallerTable_StartDeployment', 'Start deployment')}
                        />
                        <Button
                          icon={<DeleteRegular />}
                          appearance="subtle"
                          size="small"
                          disabled={isDeploymentInProgress || (deployment.status !== DeploymentStatus.Pending 
                            && deployment.status !== DeploymentStatus.Failed)}                                   
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation(); // Prevent row click from triggering
                            onRemoveDeployment(deployment.id);
                          }}
                          aria-label={t('PackageInstallerTable_RemoveDeployment', 'Remove deployment')}
                          title={t('PackageInstallerTable_RemoveDeployment', 'Remove deployment')}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="package-installer-empty-state">
          <Text size={300} style={{ color: 'var(--colorNeutralForeground2)', fontStyle: 'italic', textAlign: 'center' }}>
            {t('PackageInstallerDefaultView_NoPackages', 'No packages have been deployed yet. Create a new deployment to get started.')}
          </Text>
        </div>
      )}
    </div>
  );

  return (
    <ItemEditorDefaultView
      center={{
        content: mainContent,
        className: "package-installer-default-view-center",
        ariaLabel: "Package installer main content"
      }}
    />
  );
}

export default PackageInstallerItemDefaultView;