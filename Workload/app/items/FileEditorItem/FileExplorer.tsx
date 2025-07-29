import React from "react";
import {
  Tab,
  TabList,
  TabValue,
} from "@fluentui/react-components";
import { Editor } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import "../../styles.scss";
import { OneLakeItemExplorerComponent, OneLakeItemExplorerComponentProps } from "../../samples/views/SampleOneLakeItemExplorer/SampleOneLakeItemExplorer";
import { OneLakeFileReference } from "./FileEditorItemModel";

interface FileExplorerProps extends OneLakeItemExplorerComponentProps {
  // Editor-related props
  openFiles: OneLakeFileReference[];
  activeFileIndex: number;
  currentFile?: OneLakeFileReference;
  currentTheme: string;
  selectedFile: TabValue;
  onFileChanged: (event: any, data: { value: TabValue }) => void;
  onCloseFile: (fileIndex: number) => void;
  onEditorChange: (value: string | undefined) => void;
  onEditorDidMount: (editor: editor.IStandaloneCodeEditor) => void;
}

export function FileExplorer(props: FileExplorerProps) {

  return (
    <div style={{ height: "100%", display: "flex", flex: 1 }}>
      {/* Left panel - File Explorer */}
      <div className="explorer" style={{
        height: "100%",
        margin: 0,
        borderRadius: 0,
        borderRight: "1px solid #e1dfdd",
        boxShadow: "none"
      }}>

        <div style={{ height: "calc(100% - 60px)", overflow: "hidden" }}>
          <OneLakeItemExplorerComponent
            workloadClient={props.workloadClient}
            onFileSelected={props.onFileSelected}
            onTableSelected={props.onTableSelected}
            onItemChanged={props.onItemChanged}
            config={props.config}
          />
        </div>
      </div>

      {/* Right panel - Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {props.openFiles.length > 0 && (
          <div style={{ borderBottom: "1px solid #e1dfdd" }}>
            {/* Tab list for open files */}
            <TabList onTabSelect={props.onFileChanged} selectedValue={props.selectedFile}>
              {props.openFiles.map((file: OneLakeFileReference, index: number) => (
                <Tab 
                  key={index} 
                  value={index.toString()}
                  style={{ position: 'relative' }}
                >
                  {file.fileName}
                  {file.isDirty ? ' •' : ''}
                  {file.onelakeLink && (
                    <span style={{ marginLeft: '4px', fontSize: '10px', color: '#0078d4' }}>☁</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onCloseFile(index);
                    }}
                    style={{
                      marginLeft: '8px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#666'
                    }}
                  >
                    ×
                  </button>
                </Tab>
              ))}
            </TabList>
          </div>
        )}

        <div style={{ flex: 1, overflow: "hidden" }}>
          <Editor
            height="100%"
            language={props.currentFile?.language || "plaintext"}
            value={props.currentFile?.content || ""}
            theme={props.currentTheme}
            onChange={props.onEditorChange}
            onMount={props.onEditorDidMount}
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
      </div>
    </div>
  );
}
