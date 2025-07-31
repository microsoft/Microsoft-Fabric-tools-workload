import React from "react";
import { Tab, TabList } from '@fluentui/react-tabs';
import { Toolbar, ToolbarDivider } from '@fluentui/react-toolbar';
import {
  SelectTabEvent, SelectTabData, TabValue,
  ToolbarButton, Tooltip
} from '@fluentui/react-components';
import {
  Add24Regular,
  Save24Regular,
  ArrowSync24Regular,
  DocumentAdd24Regular,
  Settings24Regular,
  BoxMultiple24Regular,
} from "@fluentui/react-icons";
import { PageProps } from 'src/App';
import './../../styles.scss';
import { t } from "i18next";

const PackageInstallerItemEditorRibbonHome = (props: PackageInstallerItemEditorRibbonProps) => {

  async function onSaveAsClicked() {
    // your code to save as here
    await props.saveItemCallback();
    return;
  }

  async function onSettingsClicked() {
    await props.openSettingsCallback();
    return;
  }

  async function onCreateInstallationClicked() {
    if (props.addInstallationCallback) {
      props.addInstallationCallback();
    }
  }

  async function onRefreshDeploymentsClicked() {
    if (props.refreshDeploymentsCallback) {
      props.refreshDeploymentsCallback();
    }
  }

  async function onUploadPackageClicked() {
    if (props.uploadPackageCallback) {
      props.uploadPackageCallback();
    }
  }

  async function onCreatePackageClicked() {
    if (props.createPackageCallback) {
      props.createPackageCallback();
    }
  }

  return (
    <Toolbar>
      <Tooltip
        content={t("ItemEditor_Ribbon_Save_Label")}
        relationship="label">
        <ToolbarButton
          disabled={!props.isSaveButtonEnabled || props.isDeploymentInProgress}
          aria-label={t("ItemEditor_Ribbon_Save_Label")}
          data-testid="item-editor-save-btn"
          icon={<Save24Regular />}
          onClick={onSaveAsClicked} />
      </Tooltip>
      <Tooltip
        content={t("ItemEditor_Ribbon_Settings_Label")}
        relationship="label">
        <ToolbarButton
          aria-label={t("ItemEditor_Ribbon_Settings_Label")}
          data-testid="item-editor-settings-btn"
          icon={<Settings24Regular />}
          onClick={onSettingsClicked} />
      </Tooltip>
      <ToolbarDivider />
      <Tooltip
        content="Create Installation"
        relationship="label">
        <ToolbarButton
          disabled={props.isDeploymentInProgress}
          aria-label="Add Package"
          data-testid="item-editor-add-package-btn"
          icon={<Add24Regular />}
          onClick={ onCreateInstallationClicked } />
      </Tooltip>

      <Tooltip
        content="Refresh Deployment Status"
        relationship="label">
        <ToolbarButton
          disabled={props.isDeploymentInProgress}
          aria-label="Refresh Deployments"
          data-testid="item-editor-refresh-deployments-btn"
          icon={<ArrowSync24Regular />}
          onClick={ onRefreshDeploymentsClicked } />
      </Tooltip>

      <Tooltip
        content="Upload Package JSON"
        relationship="label">
        <ToolbarButton
          disabled={props.isDeploymentInProgress}
          aria-label="Upload Package JSON"
          data-testid="item-editor-upload-package-btn"
          icon={<DocumentAdd24Regular />}
          onClick={ onUploadPackageClicked } />
      </Tooltip>

      <Tooltip
        content="Create Package"
        relationship="label">
        <ToolbarButton
          disabled={props.isDeploymentInProgress}
          aria-label="Create Package"
          data-testid="item-editor-create-package-btn"
          icon={<BoxMultiple24Regular />}
          onClick={ onCreatePackageClicked } />
      </Tooltip>
    </Toolbar>
  );
};

export interface PackageInstallerItemEditorRibbonProps extends PageProps {
  onTabChange: (tabValue: TabValue) => void;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => Promise<void>;
  addInstallationCallback: () => void;
  refreshDeploymentsCallback: () => Promise<void>;
  uploadPackageCallback: () => Promise<void>;
  createPackageCallback: () => Promise<void>;
  isSaveButtonEnabled?: boolean;
  isDeploymentInProgress?: boolean;
  selectedTab: TabValue;
}


export function PackageInstallerItemEditorRibbon(props: PackageInstallerItemEditorRibbonProps) {
  const { onTabChange, selectedTab } = props;
  const onTabSelect = (_: SelectTabEvent, data: SelectTabData) => {
    onTabChange(data.value);
  };

  return (
    <div className="ribbon">
      <TabList
        disabled={selectedTab === "empty"}
        selectedValue={selectedTab}
        onTabSelect={onTabSelect}>
        <Tab value="home" data-testid="home-tab-btn">
          {t("ItemEditor_Ribbon_Home_Label")}</Tab>
      </TabList>
      <div className="toolbarContainer">
        <PackageInstallerItemEditorRibbonHome {...props} />
      </div>
    </div>
  );
};
