import React from "react";
import { TabValue } from "@fluentui/react-components";
import { editor } from "monaco-editor";
import { OneLakeExplorerItemDefinition, OneLakeFileReference } from "./OneLakeExplorerItemModel";
import { OneLakeItemExplorer } from "../../controls/OneLakeItemExplorer";
import { OneLakeExplorerItemFileEditorComponent } from "./OneLakeExplorerItemFileEditorComponent";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { PageProps } from "../../App";
import { BaseItemEditorDetailView } from "../../controls/BaseItemEditorDetailView";

interface OneLakeExplorerItemDefaultViewProps extends PageProps {
  item: ItemWithDefinition<OneLakeExplorerItemDefinition>;
  openFiles: OneLakeFileReference[];
  currentFile: OneLakeFileReference | undefined;
  currentTheme: string;
  explorerInitialItem: any;
  lastRefreshTime: number;
  allowedItemTypes: string[];
  onFileExplorerSelection: (fileName: string, oneLakeLink: string) => Promise<void>;
  onTableExplorerSelection: (tableName: string, oneLakeLink: string) => Promise<void>;
  onItemChanged: (item: any) => Promise<void>;
  onTabChange: (event: any, data: { value: TabValue }) => void;
  onCloseFile: (index: number) => void;
  onEditorChange: (value: string | undefined) => void;
  onEditorDidMount: (editor: editor.IStandaloneCodeEditor) => void;
  onCreateNewFile: () => Promise<void>;
  onUploadFile: () => Promise<void>;
  onOpenItem: () => Promise<void>;
}

export function OneLakeExplorerItemDefaultView(props: OneLakeExplorerItemDefaultViewProps) {
  const {
    item,
    workloadClient,
    openFiles,
    currentFile,
    currentTheme,
    explorerInitialItem,
    lastRefreshTime,
    allowedItemTypes,
    onFileExplorerSelection,
    onTableExplorerSelection,
    onItemChanged,
    onTabChange,
    onCloseFile,
    onEditorChange,
    onEditorDidMount,
    onCreateNewFile,
    onUploadFile,
    onOpenItem
  } = props;

  // Create the OneLake explorer content for the left panel
  const explorerContent = (
    <div style={{ height: "100%", overflow: "hidden" }}>
      <OneLakeItemExplorer
        workloadClient={workloadClient}
        config={{
          mode: "edit",
          allowedItemTypes: allowedItemTypes,
          allowItemSelection: true,
          refreshTrigger: lastRefreshTime,
          initialItem: explorerInitialItem
        }}
        callbacks={{
          onFileSelected: onFileExplorerSelection,
          onTableSelected: onTableExplorerSelection,
          onItemChanged: onItemChanged
        }}
      />
    </div>
  );

  // Create the editor content for the center panel
  const editorContent = (
    <OneLakeExplorerItemFileEditorComponent
      item={item}
      openFiles={openFiles}
      currentFile={currentFile}
      currentTheme={currentTheme}
      onTabChange={onTabChange}
      onCloseFile={onCloseFile}
      onEditorChange={onEditorChange}
      onEditorDidMount={onEditorDidMount}
      onCreateNewFile={onCreateNewFile}
      onUploadFile={onUploadFile}
      onOpenItem={onOpenItem}
    />
  );

  return (
    <BaseItemEditorDetailView
      left={{
        content: explorerContent,
        title: "OneLake Explorer",
        width: 350,
        minWidth: 280,
        collapsible: true
      }}
      center={{
        content: editorContent,
        ariaLabel: "Code editor workspace"
      }}
    />
  );
}