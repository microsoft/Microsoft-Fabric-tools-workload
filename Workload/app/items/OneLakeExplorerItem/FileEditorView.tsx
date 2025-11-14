import React from "react";
import { TabValue, Tab, TabList } from "@fluentui/react-components";
import { Editor } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { OneLakeExplorerItemDefinition, OneLakeFileReference } from "./OneLakeExplorerItemModel";
import { OneLakeExplorerItemEmptyView } from "./OneLakeExplorerItemEmptyView";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import "./OneLakeExplorerItem.scss";

interface FileEditorViewProps {
  item: ItemWithDefinition<OneLakeExplorerItemDefinition>;
  openFiles: OneLakeFileReference[];
  currentFile: OneLakeFileReference | undefined;
  currentTheme: string;
  onTabChange: (event: any, data: { value: TabValue }) => void;
  onCloseFile: (index: number) => void;
  onEditorChange: (value: string | undefined) => void;
  onEditorDidMount: (editor: editor.IStandaloneCodeEditor) => void;
  onCreateNewFile: () => Promise<void>;
  onUploadFile: () => Promise<void>;
  onOpenItem: () => Promise<void>;
}

/**
 * FileEditorView
 * 
 * A dedicated component for handling the file editor workspace within the OneLake Explorer.
 * This component manages:
 * - File tabs for open files
 * - Monaco editor for code editing
 * - Empty state when no files are open
 * - File operations (create, upload, open)
 */
export function FileEditorView({
  item,
  openFiles,
  currentFile,
  currentTheme,
  onTabChange,
  onCloseFile,
  onEditorChange,
  onEditorDidMount,
  onCreateNewFile,
  onUploadFile,
  onOpenItem
}: FileEditorViewProps) {

  return (
    <div className="file-editor-view">
      {/* File Tabs Section */}
      {openFiles.length > 0 && (
        <div className="file-tabs-section">
          <TabList onTabSelect={onTabChange}>
            {openFiles.map((file: OneLakeFileReference, index: number) => (
              <Tab 
                key={index} 
                value={index.toString()}
                className="file-tab"
              >
                {file.fileName}
                {file.isDirty ? ' •' : ''}                        
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseFile(index);
                  }}
                  className="close-button"
                  aria-label={`Close ${file.fileName}`}
                  title={`Close ${file.fileName}`}
                >
                  ×
                </button>
              </Tab>
            ))}
          </TabList>
        </div>
      )}

      {/* Editor or Empty State Section */}
      {item.definition?.openFiles?.length > 0 ? (
        <div className="editor-section">
          <Editor
            height="100%"
            language={currentFile?.language || "plaintext"}
            value={currentFile?.content || ""}
            theme={currentTheme}
            onChange={onEditorChange}
            onMount={onEditorDidMount}
            options={{
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderWhitespace: 'selection',
              tabSize: 2,
              insertSpaces: true,
              wordWrap: 'on',
              minimap: { enabled: true },
              lineNumbers: 'on'
            }}
          />
        </div>
      ) : (
        <OneLakeExplorerItemEmptyView
          onCreateNewFile={onCreateNewFile}
          onUploadFile={onUploadFile}
          onOpenItem={onOpenItem}
        />
      )}
    </div>
  );
}

export default FileEditorView;