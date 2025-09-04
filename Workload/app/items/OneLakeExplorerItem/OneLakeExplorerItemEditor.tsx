import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Text, TabValue, Tab, TabList } from "@fluentui/react-components";
import { Editor } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import { ContextProps, PageProps } from "../../App";
import { getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { useLocation, useParams } from "react-router-dom";
import "../../styles.scss";
import { OneLakeExplorerItemDefinition, OneLakeFileReference } from "./OneLakeExplorerItemModel";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callDatahubOpen } from "../../controller/DataHubController";
import { OneLakeItemExplorerComponent } from "../../samples/views/SampleOneLakeItemExplorer/SampleOneLakeItemExplorer";
import { Stack } from "@fluentui/react";
import { OneLakeExplorerItemEditorRibbon } from "./OneLakeExplorerItemEditorRibbon";
import { OneLakeExplorerItemEditorEmpty } from "./OneLakeExplorerItemEditorEmpty";
import { OneLakeStorageClient } from "../../clients/OneLakeStorageClient";


const FILETYPES_ACCEPT = ".txt,.js,.ts,.html,.css,.json,.md,.py,.cs,.java,.cpp,.c,.php,.rb,.go,.rs,.xml,.yml,.yaml,.sql,.csv,.ipynb";


export function OneLakeExplorerItemEditor(props: PageProps) {
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { workloadClient } = props;
  const [isUnsaved, setIsUnsaved] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [editorItem, setEditorItem] = useState<ItemWithDefinition<OneLakeExplorerItemDefinition>>(undefined);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isSavingFiles, setIsSavingFiles] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const ALLOWED_ITEM_TYPES = ["Lakehouse",
                                process.env.WORKLOAD_NAME + ".PackageInstaller",
                                process.env.WORKLOAD_NAME + ".OneLakeExplorer",
                                process.env.WORKLOAD_NAME + ".ExternalDataShare"]

  // Default editor settings
  const defaultEditorSettings = {
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
  const currentTheme = definition?.theme || "vs";

  // Memoize the initial item for the explorer to prevent unnecessary re-renders
  const explorerInitialItem = useMemo(() => {
    if (definition?.itemReference) {
      return {
        id: definition.itemReference.id,
        workspaceId: definition.itemReference.workspaceId,
        displayName: definition.itemReference.displayName || definition.itemReference.type
      };
    } else if (editorItem) {
      return {
        ...editorItem
      };
    }
    return undefined;
  }, [definition?.itemReference?.id, definition?.itemReference?.workspaceId, definition?.itemReference?.displayName, definition?.itemReference?.type, editorItem?.id, editorItem?.workspaceId, editorItem?.displayName]);

  // Helper function to update item definition immutably
  const updateItemDefinition = useCallback((updates: Partial<OneLakeExplorerItemDefinition>) => {
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
    setIsUnsaved(true);
  }, []);

  // Helper function to update item definition without marking as unsaved (for file selection)
  const updateItemDefinitionSilently = useCallback((updates: Partial<OneLakeExplorerItemDefinition>) => {
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
      'ipynb': 'jupyter',
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
    setIsSavingFiles(true);
    
    // First, save any dirty files back to OneLake
    if (editorItem?.definition?.openFiles) {

      const savePromises = editorItem.definition.openFiles
        .filter(file => file.isDirty)
        .map(async (file) => {
          try {
            let oneLakeLink = file.onelakeLink;
            const oneLakeClient = new OneLakeStorageClient(workloadClient)
            await oneLakeClient.writeFileAsText(oneLakeLink, file.content);
              // Mark file as clean
              file.isDirty = false;
              return { success: true, fileName: file.fileName };
          } catch (error) {
            return { success: false, fileName: file.fileName, error };
          }
        });

      if (savePromises.length > 0) {
        const results = await Promise.all(savePromises);
        const failures = results.filter(r => !r.success);
        
        if (failures.length > 0) {
          callNotificationOpen(
            workloadClient,
            "Partial Save Failed",
            `Failed to save ${failures.length} file(s) to OneLake: ${failures.map(f => f.fileName).join(', ')}`,
            undefined,
            undefined
          );
        } else {
          callNotificationOpen(
            workloadClient,
            "Files Saved",
            `Successfully saved ${results.length} file(s) to OneLake`,
            undefined,
            undefined
          );
          // Refresh the explorer to show updated files
          refreshItemExplorer();
        }
      }
    }

    // Then save the item definition
    const successResult = await saveItemDefinition<OneLakeExplorerItemDefinition>(
      workloadClient,
      editorItem.id,
      editorItem.definition
    );
    setIsUnsaved(!successResult);
    
    if (successResult) {
      callNotificationOpen(
        workloadClient,
        "OneLake Explorer Saved",
        `Your files have been saved successfully.`,
        undefined,
        undefined
      );
    }
    
    setIsSavingFiles(false);
  }

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoadingData(true);
    let item: ItemWithDefinition<OneLakeExplorerItemDefinition> = undefined;
    
    if (pageContext.itemObjectId) {
      try {
        item = await getWorkloadItem<OneLakeExplorerItemDefinition>(
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
              editorSettings: defaultEditorSettings,
              itemReference: {
                id: item.id,
                workspaceId: item.workspaceId,
                displayName: item.displayName,
                type: item.type,
                description: item.description
              }
            }
          };
        } else if (!item.definition.itemReference) {
          // Add itemReference if it doesn't exist
          item.definition.itemReference = {
            id: item.id,
            workspaceId: item.workspaceId,
            displayName: item.displayName,
            type: item.type,
            description: item.description
          };
        }
        
        setEditorItem(item);
      } catch (error) {
        setEditorItem(undefined);
      }
    }
   
    setIsLoadingData(false);
  }

  // Function to refresh the OneLake item explorer
  const refreshItemExplorer = useCallback(() => {
    // Update timestamp to trigger a re-fetch of files
    setLastRefreshTime(Date.now());
  }, []);

  // Function to write a file to the OneLake folder and add it to the editor
  const writeToItemOneLakeFolder = useCallback(async (fileName: string, content: string) => {
    const language = detectLanguage(fileName);
    let oneLakeLink = "";
    
    // Use itemReference if available, otherwise fall back to editorItem
    const targetItem = definition?.itemReference || editorItem;
    
    // If we have workspace and item info, create OneLake path
    if (targetItem?.workspaceId && targetItem?.id) {
      oneLakeLink = `${targetItem.workspaceId}/${targetItem.id}/Files/${fileName}`;
    }
    const oneLakeClient = new OneLakeStorageClient(workloadClient);
    await oneLakeClient.writeFileAsText(oneLakeLink, content);

    const newFile: OneLakeFileReference = {
      ...targetItem,
      onelakeLink: oneLakeLink,
      fileName: fileName,
      content,
      language,
      isDirty: true, // Mark as dirty so it will be saved to OneLake
    };

    const updatedFiles = [...openFiles, newFile];
    updateItemDefinition({
      openFiles: updatedFiles,
      activeFileIndex: updatedFiles.length - 1
    });
    refreshItemExplorer();
  }, [definition?.itemReference, editorItem, openFiles, updateItemDefinition, workloadClient, detectLanguage, refreshItemExplorer]);

  // File operations
  const handleCreateNewFile = useCallback(async () => {
    const fileName = `untitled-${Date.now()}.txt`;
    writeToItemOneLakeFolder(fileName, "// Welcome to OneLake Explorer\n// Start typing your code here...\n");
  }, [writeToItemOneLakeFolder]);

  const handleItemChanged = useCallback(async (item: any) => {
    // Handle when the user changes the selected item in the explorer
    if (item) {
      // Store the selected item reference and clear open files since we're switching to a new item
      updateItemDefinition({
        itemReference: {
          ...item,
        },
        openFiles: [],
        activeFileIndex: 0
      });
      
      // Refresh the explorer to load files from the new item
      refreshItemExplorer();
      
      console.log("Item changed and stored:", item);
    }
  }, [updateItemDefinition, refreshItemExplorer]);

  const handleOpenItem = useCallback(async () => {
    try {
      const selectedItem = await callDatahubOpen(
        workloadClient,
        ALLOWED_ITEM_TYPES, // Support Lakehouse items
        "Select an Item to show in the editor",
        false, // Single selection
        true, // workspace navigation enabled
      );

      if (selectedItem) {
        try {
          // Use handleItemChanged to properly set the selected item
          await handleItemChanged(selectedItem);
        } catch (error) {
          callNotificationOpen(
            workloadClient,
            "Error Opening Item",
            `Failed to open item: ${error.message || error}`,
            undefined,
            undefined
          );
        }
      }
    } catch (error) {
      callNotificationOpen(
        workloadClient,
        "Error",
        `Failed to open item selector: ${error.message || error}`,
        undefined,
        undefined
      );
    }
  }, [workloadClient, handleItemChanged]);

  const handleUploadFile = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = FILETYPES_ACCEPT;
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          writeToItemOneLakeFolder(file.name, content);
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  }, [writeToItemOneLakeFolder]);


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
    const fileIndex = parseInt(data.value as string);
    if (!isNaN(fileIndex) && fileIndex >= 0 && fileIndex < openFiles.length) {
      updateItemDefinitionSilently({ activeFileIndex: fileIndex });
    }
  }, [openFiles.length, updateItemDefinitionSilently]);

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

  }, [openFiles, activeFileIndex, updateItemDefinition]);

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // Configure editor options
    editor.updateOptions({
      fontSize: definition?.editorSettings?.fontSize || defaultEditorSettings.fontSize,
      wordWrap: definition?.editorSettings?.wordWrap ? 'on' : 'off',
      minimap: { enabled: definition?.editorSettings?.minimap ?? defaultEditorSettings.minimap },
      lineNumbers: definition?.editorSettings?.lineNumbers ? 'on' : 'off',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      tabSize: 2,
      insertSpaces: true
    });
  }, [definition?.editorSettings]);

  const handleFileExplorerSelection = useCallback(async (fileName: string, oneLakeLink: string) => {
    try {
      // Check if file type is supported
      const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
      const acceptedTypes = FILETYPES_ACCEPT.split(',');
      
      if (!acceptedTypes.includes(fileExtension)) {
        console.log(`File type not supported: ${fileName} (extension: ${fileExtension}). Supported types: ${FILETYPES_ACCEPT}`);
        return;
      }

      // Check if file is already open
      const existingFileIndex = openFiles.findIndex(file => file.onelakeLink === oneLakeLink);
      
      if (existingFileIndex !== -1) {
        // File is already open, just switch to it (no need to mark as unsaved)
        updateItemDefinitionSilently({ activeFileIndex: existingFileIndex });
        return;
      }

      // Load the file content from OneLake
      const oneLakeClient = new OneLakeStorageClient(workloadClient);
      const content = await oneLakeClient.readFileAsText(oneLakeLink);
      const language = detectLanguage(fileName);

      const newFile: OneLakeFileReference = {
        ...definition?.itemReference,
        onelakeLink: oneLakeLink,
        fileName,
        content,
        language,
        isDirty: false, // File from OneLake starts clean
      };

      const updatedFiles = [...openFiles, newFile];
      // Opening a clean file from OneLake shouldn't mark the item as unsaved
      updateItemDefinitionSilently({
        openFiles: updatedFiles,
        activeFileIndex: updatedFiles.length - 1
      });
    } catch (error) {
      callNotificationOpen(
        workloadClient,
        "Error Opening File",
        `Failed to open file from OneLake: ${error.message || error}`,
        undefined,
        undefined
      );
    }
  }, [openFiles, updateItemDefinitionSilently, workloadClient, detectLanguage]);

  const handleTableExplorerSelection = useCallback(async (tableName: string, oneLakeLink: string) => {
    // We don't handle table selection in the file editor, so this is a no-op
    console.log("Table selected:", tableName, oneLakeLink);
  }, []);

  if (isLoadingData) {
    return <ItemEditorLoadingProgressBar message="Loading OneLake Explorer..." />;
  }

  if (!editorItem) {
    return (
      <div style={{ padding: "20px" }}>
        <Text size={400}>Failed to load OneLake Explorer item.</Text>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <OneLakeExplorerItemEditorRibbon
        {...props}
        onNewFile={handleCreateNewFile}
        onOpenItem={handleOpenItem}
        onUploadFile={handleUploadFile}
        saveItemCallback={SaveItem}
        isSaveButtonEnabled={isUnsaved || isSavingFiles}
        selectedTab="home"
        onTabChange={() => {}}
      />

      <Stack className="main" style={{ height: "calc(100vh - 120px)", overflow: "hidden" }}>
        <span style={{ height: "100%", overflow: "auto", padding: "16px" }}>
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
                  workloadClient={workloadClient}
                  onFileSelected={handleFileExplorerSelection}
                  onTableSelected={handleTableExplorerSelection}
                  onItemChanged={handleItemChanged}
                  config={{
                    allowedItemTypes: ALLOWED_ITEM_TYPES,
                    allowItemSelection: true,
                    refreshTrigger: lastRefreshTime,
                    initialItem: explorerInitialItem
                  }}
                />
              </div>
            </div>

            {/* Right panel - Editor */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {openFiles.length > 0 && (
                <div style={{ borderBottom: "1px solid #e1dfdd" }}>
                  {/* Tab list for open files */}
                  <TabList onTabSelect={handleTabChange} >
                    {openFiles.map((file: OneLakeFileReference, index: number) => (
                      <Tab 
                        key={index} 
                        value={index.toString()}
                        style={{ position: 'relative' }}
                      >
                        {file.fileName}
                        {file.isDirty ? ' •' : ''}                        
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
              {editorItem.definition?.openFiles?.length > 0 ? (
                <div style={{ flex: 1, overflow: "hidden" }}>
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
                </div>
                ) : (
                  <OneLakeExplorerItemEditorEmpty
                    onCreateNewFile={handleCreateNewFile}
                    onUploadFile={handleUploadFile}
                    onOpenItem={handleOpenItem}
                  />                
                )}
              </div>
          </div>
        </span>
      </Stack>
    </div>
  );
}
