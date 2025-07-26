import React, { useEffect, useState, useCallback, useRef } from "react";
import { Text } from "@fluentui/react";
import { TabValue, Tab, TabList } from "@fluentui/react-components";
import { Editor } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { ContextProps, PageProps } from "../../App";
import { VSCodeEditorItemRibbon } from "./VSCodeEditorItemEditorRibbon";
import { getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { useLocation, useParams } from "react-router-dom";
import "../../styles.scss";
import { VSCodeEditorItemDefinition } from "./VSCodeEditorItemModel";
import { VSCodeEditorItemEmpty } from "./VSCodeEditorItemEditorEmpty";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { callNotificationOpen } from "../../controller/NotificationController";

export function VSCodeEditorItemEditor(props: PageProps) {
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { workloadClient } = props;
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [editorItem, setEditorItem] = useState<ItemWithDefinition<VSCodeEditorItemDefinition>>(undefined);
  const [selectedTab, setSelectedTab] = useState<TabValue>("empty");
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Default editor settings
  const defaultSettings = {
    fontSize: 14,
    wordWrap: true,
    minimap: true,
    lineNumbers: true
  };

  // Current editor state
  const definition = editorItem?.definition;
  const openFiles = definition?.openFiles || [];
  const activeFileIndex = definition?.activeFileIndex || 0;
  const currentFile = openFiles[activeFileIndex];
  const currentTheme = definition?.theme || "vs-dark";

  // Helper function to update item definition immutably
  const updateItemDefinition = useCallback((updates: Partial<VSCodeEditorItemDefinition>) => {
    setEditorItem(prevItem => {
      if (!prevItem) return prevItem;
      
      return {
        ...prevItem,
        definition: {
          ...prevItem.definition,
          ...updates
        }
      };
    });
  }, []);

  // Helper function to detect language from file extension
  const detectLanguage = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown',
      'yml': 'yaml',
      'yaml': 'yaml',
      'sql': 'sql',
      'sh': 'shell',
      'ps1': 'powershell',
      'cs': 'csharp',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust'
    };
    return languageMap[extension || ''] || 'plaintext';
  };

  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  async function SaveItem() {
    const successResult = await saveItemDefinition<VSCodeEditorItemDefinition>(
      workloadClient,
      editorItem.id,
      editorItem.definition
    );
    if (successResult) {
      callNotificationOpen(
        workloadClient,
        "VSCode Editor Saved",
        `Your code has been saved successfully.`,
        undefined,
        undefined
      );
    }
  }

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoadingData(true);
    let item: ItemWithDefinition<VSCodeEditorItemDefinition> = undefined;
    
    if (pageContext.itemObjectId) {
      try {
        item = await getWorkloadItem<VSCodeEditorItemDefinition>(
          workloadClient,
          pageContext.itemObjectId
        );
        
        // Initialize empty definition if needed
        if (!item.definition) {
          item = {
            ...item,
            definition: {
              openFiles: [],
              activeFileIndex: 0,
              theme: currentTheme,
              editorSettings: defaultSettings
            }
          };
        }
        
        setEditorItem(item);
      } catch (error) {
        setEditorItem(undefined);
      }
    }
    
    // Set initial tab based on whether we have files
    if (item?.definition?.openFiles && item.definition.openFiles.length > 0) {
      setSelectedTab("editor");
    } else {
      setSelectedTab("empty");
    }
    
    setIsLoadingData(false);
  }

  // File operations
  const handleCreateNewFile = useCallback(() => {
    const fileName = `untitled-${Date.now()}.txt`;
    const newFile = {
      fileName,
      content: "// Welcome to VSCode Editor\n// Start typing your code here...\n",
      language: "plaintext",
      isDirty: false
    };

    const updatedFiles = [...openFiles, newFile];
    updateItemDefinition({
      openFiles: updatedFiles,
      activeFileIndex: updatedFiles.length - 1
    });
    setSelectedTab("editor");
  }, [openFiles, updateItemDefinition]);

  const handleUploadFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.js,.ts,.html,.css,.json,.md,.py,.cs,.java,.cpp,.c,.php,.rb,.go,.rs,.xml,.yml,.yaml,.sql,.sh,.ps1';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const language = detectLanguage(file.name);
          
          const newFile = {
            fileName: file.name,
            content,
            language,
            isDirty: false
          };

          const updatedFiles = [...openFiles, newFile];
          updateItemDefinition({
            openFiles: updatedFiles,
            activeFileIndex: updatedFiles.length - 1
          });
          setSelectedTab("editor");
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  }, [openFiles, updateItemDefinition]);

  const handleThemeChange = useCallback((theme: string) => {
    updateItemDefinition({ theme });
  }, [updateItemDefinition]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined && currentFile) {
      const updatedFiles = [...openFiles];
      updatedFiles[activeFileIndex] = {
        ...currentFile,
        content: value,
        isDirty: true
      };
      
      updateItemDefinition({
        openFiles: updatedFiles
      });
    }
  }, [currentFile, openFiles, activeFileIndex, updateItemDefinition]);

  const handleTabChange = useCallback((event: any, data: { value: TabValue }) => {
    if (data.value === "empty") {
      setSelectedTab("empty");
    } else {
      const fileIndex = parseInt(data.value as string);
      if (!isNaN(fileIndex) && fileIndex >= 0 && fileIndex < openFiles.length) {
        updateItemDefinition({ activeFileIndex: fileIndex });
        setSelectedTab("editor");
      }
    }
  }, [openFiles.length, updateItemDefinition]);

  const handleCloseFile = useCallback((fileIndex: number) => {
    const updatedFiles = openFiles.filter((_, index: number) => index !== fileIndex);
    let newActiveIndex = activeFileIndex;
    
    if (fileIndex === activeFileIndex) {
      newActiveIndex = Math.max(0, fileIndex - 1);
    } else if (fileIndex < activeFileIndex) {
      newActiveIndex = activeFileIndex - 1;
    }
    
    updateItemDefinition({
      openFiles: updatedFiles,
      activeFileIndex: updatedFiles.length > 0 ? newActiveIndex : 0
    });
    
    if (updatedFiles.length === 0) {
      setSelectedTab("empty");
    }
  }, [openFiles, activeFileIndex, updateItemDefinition]);

  const handleSearch = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.trigger('', 'actions.find', null);
    }
  }, []);

  const handleRun = useCallback(() => {
    if (currentFile) {
      callNotificationOpen(
        workloadClient,
        "Code Execution",
        `Running ${currentFile.fileName}... (This is a demo - actual execution would require backend integration)`,
        undefined,
        undefined
      );
    }
  }, [currentFile, workloadClient]);

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Configure editor options
    editor.updateOptions({
      fontSize: definition?.editorSettings?.fontSize || defaultSettings.fontSize,
      wordWrap: definition?.editorSettings?.wordWrap ? 'on' : 'off',
      minimap: { enabled: definition?.editorSettings?.minimap ?? defaultSettings.minimap },
      lineNumbers: definition?.editorSettings?.lineNumbers ? 'on' : 'off',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      tabSize: 2,
      insertSpaces: true
    });
  }, [definition?.editorSettings]);

  if (isLoadingData) {
    return <ItemEditorLoadingProgressBar message="Loading VSCode Editor..." />;
  }

  if (!editorItem) {
    return (
      <div style={{ padding: "20px" }}>
        <Text variant="large">Failed to load VSCode Editor item.</Text>
      </div>
    );
  }

  const showEmpty = selectedTab === "empty" || openFiles.length === 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <VSCodeEditorItemRibbon
        onNewFile={handleCreateNewFile}
        onOpenFile={handleUploadFile}
        onSave={SaveItem}
        onThemeChange={handleThemeChange}
        onSearch={handleSearch}
        onRun={handleRun}
        currentTheme={currentTheme}
        fileName={currentFile?.fileName}
        isDirty={currentFile?.isDirty || false}
        language={currentFile?.language}
      />

      {openFiles.length > 0 && (
        <div style={{ borderBottom: "1px solid #e1dfdd" }}>
          <TabList onTabSelect={handleTabChange} selectedValue={selectedTab}>
            {openFiles.map((file: any, index: number) => (
              <Tab 
                key={index} 
                value={index.toString()}
                style={{ position: 'relative' }}
              >
                {file.fileName}{file.isDirty ? ' •' : ''}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseFile(index);
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
        {showEmpty ? (
          <VSCodeEditorItemEmpty
            onCreateNewFile={handleCreateNewFile}
            onUploadFile={handleUploadFile}
          />
        ) : (
          <Editor
            height="100%"
            language={currentFile?.language || "plaintext"}
            value={currentFile?.content || ""}
            theme={currentTheme}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
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
        )}
      </div>
    </div>
  );
}
