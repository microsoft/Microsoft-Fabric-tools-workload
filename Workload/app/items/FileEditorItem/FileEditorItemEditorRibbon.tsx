import React from "react";
import { Toolbar, ToolbarButton, SelectTabData, SelectTabEvent, Tab, TabList, TabValue, Tooltip } from "@fluentui/react-components";
import { 
  DocumentAdd24Regular,
  FolderOpen24Regular,
  Save24Regular,
} from "@fluentui/react-icons";
import { t } from "i18next";
import { PageProps } from "../../App";


const FileEditorItemEditorRibbonHomeTabToolbar = (props: FileEditorItemEditorRibbonProps) => {

async function onSaveAsClicked() {
    // your code to save as here
    await props.saveItemCallback();
    return;
  }

  return (
    <Toolbar>
      <Tooltip
        content={t("ItemEditor_Ribbon_Save_Label")}
        relationship="label">
        <ToolbarButton
          disabled={!props.isSaveButtonEnabled}
          aria-label={t("ItemEditor_Ribbon_Save_Label")}
          data-testid="item-editor-save-btn"
          icon={<Save24Regular />}
          onClick={onSaveAsClicked} />
      </Tooltip>
      <Tooltip
        content={t("Open Item")}
        relationship="label">
        <ToolbarButton
          aria-label={t("Open Item")}
          data-testid="item-editor-open-btn"
          icon={<FolderOpen24Regular />}
          onClick={props.onOpenItem} />
      </Tooltip>
      <Tooltip
        content={t("Upload File")}
        relationship="label">
        <ToolbarButton
          aria-label={t("Upload File")}
          data-testid="item-editor-upload-btn"
          icon={<DocumentAdd24Regular />}
          onClick={props.onUploadFile} />
      </Tooltip>
    </Toolbar>
  );
};

export interface FileEditorItemEditorRibbonProps extends PageProps {
  saveItemCallback: () => Promise<void>;
  isSaveButtonEnabled?: boolean;
  onTabChange: (tabValue: TabValue) => void;
  selectedTab: TabValue;
  onOpenItem: () => Promise<void>;
  onUploadFile: () => Promise<void>;
  onNewFile: () => Promise<void>;
}


export function FileEditorItemEditorRibbon(props: FileEditorItemEditorRibbonProps) {
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
        <FileEditorItemEditorRibbonHomeTabToolbar {...props} />
      </div>
    </div>
  );
};