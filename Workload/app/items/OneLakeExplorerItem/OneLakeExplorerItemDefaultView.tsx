import React from "react";
import { TabValue } from "@fluentui/react-components";
import { editor } from "monaco-editor";
import { OneLakeExplorerItemDefinition, OneLakeFileReference } from "./OneLakeExplorerItemModel";
import { OneLakeView } from "../../components/OneLakeView";
import { FileEditorView } from "./FileEditorView";
import { TableEditorView } from "./TableEditorView";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { PageProps } from "../../App";
import { ItemEditorDetailView } from "../../components/ItemEditor";
import "./OneLakeExplorerItem.scss";

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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <OneLakeView
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

  // Create the editor content for the center panel based on view mode
  const viewMode = item.definition?.viewMode || 'file';
  const editorContent = viewMode === 'table' ? (
    <TableEditorView
      item={item}
      tableName={item.definition?.selectedTable?.tableName}
      oneLakeLink={item.definition?.selectedTable?.oneLakeLink}
      currentTheme={currentTheme}
      onCreateNewFile={onCreateNewFile}
      onUploadFile={onUploadFile}
      onOpenItem={onOpenItem}
    />
  ) : (
    <FileEditorView
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
    <ItemEditorDetailView
      left={{
        content: explorerContent,
        title: "OneLake Explorer",
        width: 350,
        minWidth: 280,
        maxWidth: 600,
        collapsible: true,
        enableUserResize: true,
        onWidthChange: (newWidth) => {
          console.log(`OneLake Explorer panel resized to: ${newWidth}px`);
        }
      }}
      center={{
        content: editorContent,
        ariaLabel: viewMode === 'table' ? "Table viewer workspace" : "Code editor workspace"
      }}
    />
  );
}