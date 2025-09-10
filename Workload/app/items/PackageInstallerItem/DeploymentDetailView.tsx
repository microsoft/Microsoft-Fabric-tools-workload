import React from "react";
import { 
  Card,
  CardHeader,
  Text,
  Button,
  Badge,
  Divider,
  Body1,
  Caption1
} from "@fluentui/react-components";
import { useTranslation } from "react-i18next";
import { PackageDeployment, DeploymentStatus, PackageInstallerItemDefinition, DeployedItem } from "./PackageInstallerItemModel";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { getItemTypeIcon } from "./components/UIHelper";
import { WorkspaceDisplayNameLabel } from "./components/WorkspaceDisplayName";
import { FolderDisplayNameLabel } from "./components/FolderDisplayName";
import { DeploymentJobLabel } from "./components/DeploymentJob";
import { PackageInstallerContext } from "./package/PackageInstallerContext";
import { navigateToItem } from "../../controller/NavigationController";

// Props for the PackageDetailCard component
export interface DeploymentDetailViewProps {
  context: PackageInstallerContext;
  deployment: PackageDeployment;
  item: ItemWithDefinition<PackageInstallerItemDefinition>;
  onBackToHome: () => void;
  onStartDeployment?: () => void; // Callback when package is updated
}

/**
 * Component that displays details of a package and provides 
 * a button to start deployment if the package is in Pending status.
 */
export const DeploymentDetailView: React.FC<DeploymentDetailViewProps> = ({ 
  context,
  deployment,
  item,
  onBackToHome,
  onStartDeployment
}) => {
  const { t } = useTranslation();
  const pack = context.packageRegistry.getPackage(deployment.packageId);
 

  // Function to get status badge color based on deployment status
  const getStatusBadgeColor = (status: DeploymentStatus) => {
    switch (status) {
      case DeploymentStatus.Succeeded:
        return "success";
      case DeploymentStatus.Failed:
        return "danger";
      case DeploymentStatus.InProgress:
        return "informative";
      case DeploymentStatus.Pending:
      default:
        return "subtle";
    }
  };

  return (
    <Card className="package-detail-card">
      <CardHeader
        image={          
          <img 
            src={pack?.icon || "/assets/items/PackageInstallerItem/PackageDefault-icon.png"} 
            alt={pack?.displayName}
            style={{ width: "32px", height: "32px", objectFit: "contain" }}
          />          
        }
        header={
          <Text weight="semibold" size={500}>
            {pack?.displayName}
          </Text>
        }
        description={
          <Badge 
            appearance="filled"
            color={getStatusBadgeColor(deployment.status)}
            style={{ marginTop: "4px" }}
          >
            {DeploymentStatus[deployment.status]}
          </Badge>
        }
        action={
          <div style={{ display: "flex", gap: "8px" }}>
            <Button 
              appearance="secondary"
              onClick={() => onBackToHome()}
            >
              {t("Back to Home")}
            </Button>
            {(deployment.status === DeploymentStatus.Pending  || 
              deployment.status === DeploymentStatus.Failed ) && (
              <Button 
                appearance="primary"
                onClick={() => onStartDeployment()}
              >
                {t("Start Deployment")}
              </Button>
            )}
          </div>
        }
      />

      <div className="deployment-info" style={{ padding: "0 16px" }}>
        <div className="deployment-detail-row">
          <Caption1>{t("Deployment ID")}:</Caption1>
          <Body1>{deployment.id}</Body1>
        </div>
        <div className="deployment-detail-row">
          <Caption1>{t("Package Name")}:</Caption1>
          <Body1>{pack?.displayName}</Body1>
        </div>    
        <div className="deployment-detail-row">
          <Caption1>{t("Deployment Type")}:</Caption1>
          <Body1>{pack.deploymentConfig.location}</Body1>
        </div>  

        <div className="deployment-detail-row">
          <Caption1>{t("Workspace Name")}:</Caption1>
          <WorkspaceDisplayNameLabel
            context={context}
            workspaceId={deployment.workspace?.id} />
        </div>
        <div className="deployment-detail-row">
          <Caption1>{t("Folder Name")}:</Caption1>
          <FolderDisplayNameLabel
            context={context}
            workspaceId={deployment.workspace?.id}
            folderId={deployment.workspace?.folder?.id} />
        </div>
        <div className="deployment-detail-row">
          <Caption1>{t("Deployment Job")}:</Caption1>
          <DeploymentJobLabel
            context={context}
            jobInfo={deployment.job} />
        </div>

        <Divider style={{ margin: "12px 0" }} />
        
        {deployment.status !== DeploymentStatus.Succeeded && (
          <div className="deployment-items">
            <h2>{t("Configured Items")}:</h2>
            <Caption1>{t("Shows a list of all items that will be create as part of the deployment.")}</Caption1>
            {pack?.items && pack.items.length > 0 ? (
              <ul className="items-list" style={{ margin: "8px 0", paddingLeft: "20px" }}>
                {pack.items.map((item, index) => (
                  <li key={index} style={{ display: "flex", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ marginRight: "8px", marginTop: "2px" }}>
                      {getItemTypeIcon(item.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Body1>{item.displayName}</Body1>
                      <div style={{ marginLeft: "0px" }}>
                        <Caption1>{item.description}</Caption1>
                      </div>
                      {item.data?.files && item.data.files.length > 0 && (
                        <div style={{ marginLeft: "0px", marginTop: "4px" }}>
                          <Caption1><strong>{t("Data Files")} ({item.data.files.length}):</strong></Caption1>
                          <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
                            {item.data.files.map((dataFile, dataIndex) => (
                              <li key={dataIndex} style={{ marginBottom: "2px" }}>
                                <Caption1 style={{ fontSize: "11px", color: "#605e5c" }}>
                                  {dataFile.path}
                                </Caption1>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {item.schedules && item.schedules.length > 0 && (
                        <div style={{ marginLeft: "0px", marginTop: "4px" }}>
                          <Caption1><strong>{t("Schedules")} ({item.schedules.length}):</strong></Caption1>
                          <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
                            {item.schedules.map((schedule, scheduleIndex) => {
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
                                <li key={scheduleIndex} style={{ marginBottom: "2px" }}>
                                  <Caption1 style={{ fontSize: "11px", color: "#605e5c" }}>
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
              <div style={{ marginLeft: "8px" }}>
                <Body1 italic>{t("No items defined for this deployment")}</Body1>
              </div>
            )}
          </div>
        )}
        
        {deployment.status !== DeploymentStatus.Succeeded && <Divider style={{ margin: "12px 0" }} />}
        
        {deployment.status === DeploymentStatus.Succeeded && (
          <div className="created-items">
            <h2>{t("Created Items")}:</h2>
            <Caption1>{t("Shows a list of all items that have been created by this deployment.")}</Caption1>
            {deployment.deployedItems && deployment.deployedItems.length > 0 ? (
              <ul className="items-list" style={{ margin: "8px 0", paddingLeft: "20px" }}>
                {deployment.deployedItems.map((item: DeployedItem) => (
                  <li key={item.id} style={{ display: "flex", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ marginRight: "8px", marginTop: "2px" }}>
                      {getItemTypeIcon(item.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Body1 
                        style={{ 
                          cursor: "pointer", 
                          color: "#0078d4",
                          textDecoration: "underline"
                        }}
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
              <div style={{ marginLeft: "8px" }}>
                <Body1 italic>{t("No items created yet")}</Body1>
              </div>
            )}
          </div>
        )}
        
        {/* Show package-level data files if any exist */}
        {pack?.data && pack.data.length > 0 && (
          <>
            <Divider style={{ margin: "12px 0" }} />
            <div className="package-data">
              <h2>{t("Package Data")}:</h2>
              <Caption1>{t("Shows data files that are part of the package deployment.")}</Caption1>
              {pack.data.map((dataItem, dataIndex) => (
                <div key={dataIndex} style={{ marginTop: "8px" }}>
                  {dataItem.files && dataItem.files.length > 0 && (
                    <div style={{ marginLeft: "8px" }}>
                      <Caption1><strong>{t("Data Files")} ({dataItem.files.length}):</strong></Caption1>
                      <ul style={{ margin: "4px 0", paddingLeft: "16px" }}>
                        {dataItem.files.map((dataFile, fileIndex) => (
                          <li key={fileIndex} style={{ marginBottom: "2px" }}>
                            <Caption1 style={{ fontSize: "11px", color: "#605e5c" }}>
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
            <Divider style={{ margin: "12px 0" }} />
            <div className="on-finish-jobs">
              <h2>{t("On Finish Jobs")}:</h2>
              <Caption1>{t("Shows jobs that will be executed after the deployment completes.")}</Caption1>
              <ul className="jobs-list" style={{ margin: "8px 0", paddingLeft: "20px" }}>
                {pack.deploymentConfig.onFinishJobs.map((job, jobIndex) => (
                  <li key={jobIndex} style={{ display: "flex", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <Body1>{job.jobType || "Job"}</Body1>
                      <div style={{ marginLeft: "0px" }}>
                        <Caption1>Workspace ID: {job.workspaceId}</Caption1>
                      </div>
                      <div style={{ marginLeft: "0px" }}>
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

    </Card>
  );
};

// Add some basic styles to improve the component's appearance
export const styles = `
.deployment-detail-card {
  margin-bottom: 16px;
  width: 100%;
  max-width: 600px;
}

.deployment-info {
  padding: 0 16px 16px;
}

.deployment-detail-row {
  display: flex;
  justify-content: space-between;
  margin: 6px 0;
}

.created-items {
  margin-top: 8px;
}

.items-list {
  margin: 8px 0;
  padding-left: 20px;
}

.items-list li {
  margin: 4px 0;
}

.items-list li span[style*="cursor: pointer"]:hover {
  color: #106ebe !important;
  text-decoration: underline !important;
}
`;