import React from "react";
import { 
  Divider,
  Body1,
  Caption1,
  Button
} from "@fluentui/react-components";
import { Play20Regular } from "@fluentui/react-icons";
import { useTranslation } from "react-i18next";
import { PackageDeployment, DeploymentStatus, PackageInstallerItemDefinition, DeployedItem } from "./PackageInstallerItemModel";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { getItemTypeIcon } from "./components/UIHelper";
import { WorkspaceDisplayNameLabel } from "./components/WorkspaceDisplayName";
import { FolderDisplayNameLabel } from "./components/FolderDisplayName";
import { DeploymentJobLabel } from "./components/DeploymentJob";
import { PackageInstallerContext } from "./package/PackageInstallerContext";
import { navigateToItem } from "../../controller/NavigationController";
import { ItemEditorDetailView, DetailViewAction } from "../../controls/ItemEditor";
import "./PackageInstallerItem.scss";

// Props for the PackageDetailCard component
export interface DeploymentDetailViewProps {
  context: PackageInstallerContext;
  deployment: PackageDeployment;
  item: ItemWithDefinition<PackageInstallerItemDefinition>;
  onStartDeployment?: () => void; // Callback when package is updated
}

/**
 * Component that displays details of a deployment and provides 
 * actions to manage the deployment lifecycle.
 * Now follows the BaseItemEditorDetailView pattern for consistency.
 */
export const DeploymentDetailView: React.FC<DeploymentDetailViewProps> = ({ 
  context,
  deployment,
  item,
  onStartDeployment
}) => {
  const { t } = useTranslation();
  const pack = context.packageRegistry.getPackage(deployment.packageId);

  // Define detail view actions (deploy button only - back action provided by BaseItemEditorDetailView)
  const actions: DetailViewAction[] = [
    {
      key: 'deploy',
      label: deployment.status === DeploymentStatus.Pending 
        ? t('PackageInstallerDetailView_StartDeployment', 'Start Deployment')
        : t('PackageInstallerDetailView_DeploymentStarted', 'Deployment Started'),
      icon: Play20Regular,
      onClick: onStartDeployment || (() => {}),
      appearance: 'subtle', // Use 'subtle' appearance for toolbar buttons per Fabric guidelines
      disabled: deployment.status !== DeploymentStatus.Pending || !onStartDeployment,
      tooltip: deployment.status === DeploymentStatus.Pending
        ? t('PackageInstallerDetailView_StartDeploymentTooltip', 'Start the deployment process')
        : t('PackageInstallerDetailView_DeploymentNotPendingTooltip', 'Deployment is not in pending status')
    }
  ];

  // Main detail content
  const detailContent = (
    <div className="package-installer-detail-container">
      {/* Header section with package info and status */}
      <div className="package-detail-header-section">
        <div className="package-header-content">
          <div className="package-icon-container">
            <img 
              src={pack?.icon || "/assets/items/PackageInstallerItem/PackageDefault-icon.png"} 
              alt={pack?.displayName}
              className="package-icon"
            />
          </div>
          <div className="package-header-text">
            <h2 className="package-title">
              {pack?.displayName}
            </h2>
          </div>
          <div className="package-status-container">
            <div className={`status-indicator ${DeploymentStatus[deployment.status].toLowerCase()}`}>
              {DeploymentStatus[deployment.status]}
            </div>
            <div className="deployment-action-container">
              <Button
                appearance="subtle"
                size="medium"
                icon={<Play20Regular />}
                disabled={deployment.status !== DeploymentStatus.Pending || !onStartDeployment}
                onClick={onStartDeployment}
              >
                {deployment.status === DeploymentStatus.Pending 
                  ? t('PackageInstallerDetailView_StartDeployment', 'Start Deployment')
                  : t('PackageInstallerDetailView_DeploymentStarted', 'Deployment Started')
                }
              </Button>
            </div>
          </div>
        </div>
      </div>

        <div className="deployment-info">
          {/* Deployment Details Section */}
          <div className="deployment-details-section">
            <div className="deployment-details-header">
              <h3>{t('PackageInstallerDetailView_DeploymentDetails', 'Deployment Details')}</h3>
            </div>
            <Caption1>{t('PackageInstallerDetailView_DeploymentDetailsDescription', 'Configuration and information about this deployment.')}</Caption1>
          </div>

          <div className="deployment-details-box">
            <div className="deployment-detail-row">
              <span className="label">{t('PackageInstallerDetailView_DeploymentId', 'Deployment ID')}</span>
              <span className="value">{deployment.id}</span>
            </div>
            <div className="deployment-detail-row">
              <span className="label">{t('PackageInstallerDetailView_PackageName', 'Package Name')}</span>
              <span className="value">{pack?.displayName}</span>
            </div>    
            <div className="deployment-detail-row">
              <span className="label">{t('PackageInstallerDetailView_DeploymentType', 'Deployment Type')}</span>
              <span className="value">{pack?.deploymentConfig?.location}</span>
            </div>  

            <div className="deployment-detail-row">
              <span className="label">{t('PackageInstallerDetailView_WorkspaceName', 'Workspace Name')}</span>
              <div className="value">
                <WorkspaceDisplayNameLabel
                  context={context}
                  workspaceId={deployment.workspace?.id} />
              </div>
            </div>
            <div className="deployment-detail-row">
              <span className="label">{t('PackageInstallerDetailView_FolderName', 'Folder Name')}</span>
              <div className="value">
                <FolderDisplayNameLabel
                  context={context}
                  workspaceId={deployment.workspace?.id}
                  folderId={deployment.workspace?.folder?.id} />
              </div>
            </div>
            <div className="deployment-detail-row">
              <span className="label">{t('PackageInstallerDetailView_DeploymentJob', 'Deployment Job')}</span>
              <div className="value">
                <DeploymentJobLabel
                  context={context}
                  jobInfo={deployment.job} />
              </div>
            </div>
          </div>

          <Divider className="deployment-divider" />
          
          {deployment.status !== DeploymentStatus.Succeeded && (
            <div className="deployment-items">
              <h3>{t('PackageInstallerDetailView_ConfiguredItems', 'Configured Items')}</h3>
              <Caption1>{t('PackageInstallerDetailView_ConfiguredItemsDescription', 'Items that will be created as part of the deployment.')}</Caption1>
              {pack?.items && pack.items.length > 0 ? (
                <ul className="items-list">
                  {pack.items.map((item, index) => (
                    <li key={index} className="item-entry">
                      <div className="item-icon">
                        {getItemTypeIcon(item.type)}
                      </div>
                      <div className="item-content">
                        <Body1 className="item-name">{item.displayName}</Body1>
                        <div className="item-details">
                          <Caption1>{item.description}</Caption1>
                        </div>
                        {item.data?.files && item.data.files.length > 0 && (
                          <div className="item-details">
                            <Caption1><strong>{t('PackageInstallerDetailView_DataFiles', 'Data Files')} ({item.data.files.length}):</strong></Caption1>
                            <ul className="data-files-list">
                              {item.data.files.map((dataFile, dataIndex) => (
                                <li key={dataIndex}>
                                  <Caption1 className="file-path">
                                    {dataFile.path}
                                  </Caption1>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {item.schedules && item.schedules.length > 0 && (
                          <div className="item-details">
                            <Caption1><strong>{t('PackageInstallerDetailView_Schedules', 'Schedules')} ({item.schedules.length}):</strong></Caption1>
                            <ul className="schedules-list">{item.schedules.map((schedule, scheduleIndex) => {
                                const config = schedule.configuration;
                                let scheduleDetails = "";
                                
                                if (config.type === 'Daily' && 'times' in config && Array.isArray(config.times)) {
                                  scheduleDetails = ` at ${config.times.join(", ")}`;
                                } else if (config.type === 'Weekly' && 'weekdays' in config && 'times' in config && Array.isArray(config.weekdays) && Array.isArray(config.times)) {
                                  scheduleDetails = ` on ${config.weekdays.join(", ")} at ${config.times.join(", ")}`;
                                } else if (config.type === 'Cron' && 'interval' in config) {
                                  scheduleDetails = ` every ${config.interval} minutes`;
                                }
                                
                                return (
                                  <li key={scheduleIndex}>
                                    <Caption1 className="schedule-details">
                                      {schedule.jobType} - {config.type}
                                      {scheduleDetails}
                                      {!schedule.enabled && " (Disabled)"}
                                    </Caption1>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="no-items-message">
                  <Body1>{t('PackageInstallerDetailView_NoItemsConfigured', 'No items defined for this deployment')}</Body1>
                </div>
              )}
            </div>
          )}
          
          {deployment.status !== DeploymentStatus.Succeeded && <Divider className="deployment-divider" />}
          
          {deployment.status === DeploymentStatus.Succeeded && (
            <div className="created-items">
              <h3>{t('PackageInstallerDetailView_CreatedItems', 'Created Items')}</h3>
              <Caption1>{t('PackageInstallerDetailView_CreatedItemsDescription', 'Items that have been created by this deployment.')}</Caption1>
              {deployment.deployedItems && deployment.deployedItems.length > 0 ? (
                <ul className="items-list">
                  {deployment.deployedItems.map((item: DeployedItem) => (
                    <li key={item.id} className="item-entry">
                      <div className="item-icon">
                        {getItemTypeIcon(item.type)}
                      </div>
                      <div className="item-content">
                        <Body1 
                          className="item-name clickable"
                          onClick={() => navigateToItem(context.workloadClientAPI, item)}
                          title={`Click to open ${item.displayName || item.id}`}
                        >
                          {item.displayName || item.id}
                        </Body1>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="no-items-message">
                  <Body1>{t('PackageInstallerDetailView_NoItemsCreated', 'No items created yet')}</Body1>
                </div>
              )}
            </div>
          )}
          
          {/* Show package-level data files if any exist */}
          {pack?.data && pack.data.length > 0 && (
            <>
              <Divider className="deployment-divider" />
              <div className="package-data">
                <h3>{t('PackageInstallerDetailView_PackageData', 'Package Data')}</h3>
                <Caption1>{t('PackageInstallerDetailView_PackageDataDescription', 'Data files that are part of the package deployment.')}</Caption1>
                {pack.data.map((dataItem, dataIndex) => (
                  <div key={dataIndex} className="package-data-item">
                    {dataItem.files && dataItem.files.length > 0 && (
                      <div className="package-data-files">
                        <Caption1><strong>{t('PackageInstallerDetailView_DataFiles', 'Data Files')} ({dataItem.files.length}):</strong></Caption1>
                        <ul className="data-files-list">
                          {dataItem.files.map((dataFile, fileIndex) => (
                            <li key={fileIndex}>
                              <Caption1 className="file-path">
                                {dataFile.path}
                              </Caption1>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Show onFinishJobs if any exist */}
          {pack?.deploymentConfig?.onFinishJobs && pack.deploymentConfig.onFinishJobs.length > 0 && (
            <>
              <Divider className="deployment-divider" />
              <div className="on-finish-jobs">
                <h3>{t('PackageInstallerDetailView_OnFinishJobs', 'On Finish Jobs')}</h3>
                <Caption1>{t('PackageInstallerDetailView_OnFinishJobsDescription', 'Jobs that will be executed after the deployment completes.')}</Caption1>
                <ul className="jobs-list">
                  {pack.deploymentConfig.onFinishJobs.map((job, jobIndex) => (
                    <li key={jobIndex} className="item-entry">
                      <div className="item-content">
                        <Body1 className="item-name">{job.jobType || "Job"}</Body1>
                        <div className="item-details">
                          <Caption1>Workspace ID: {job.workspaceId}</Caption1>
                        </div>
                        <div className="item-details">
                          <Caption1>Item ID: {job.itemId}</Caption1>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
    </div>
  );

  return (
    <ItemEditorDetailView
      center={{
        content: detailContent,
        className: "package-installer-detail-view-center",
        ariaLabel: "Package deployment details"
      }}
      actions={actions}
    />
  );
};