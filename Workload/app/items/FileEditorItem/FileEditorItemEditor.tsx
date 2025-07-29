import React, { useEffect, useState, useCallback, useRef } from "react";
import { Text, TabValue } from "@fluentui/react-components";
import { editor } from "monaco-editor";
import { ContextProps, PageProps } from "../../App";
import { FileEditorItemEditorRibbon } from "./FileEditorItemEditorRibbon";
import { getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { useLocation, useParams } from "react-router-dom";
import "../../styles.scss";
import { FileEditorItemDefinition, OneLakeFileReference } from "./FileEditorItemModel";
import { FileEditorItemEditorEmpty } from "./FileEditorItemEditorEmpty";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callDatahubOpen } from "../../controller/DataHubController";
import { readOneLakeFileAsText, writeToOneLakeFileAsText } from "../../clients/OneLakeClient";
import { FileExplorer } from "./FileExplorer";
import { Stack } from "@fluentui/react";

export function FileEditorItemEditor(props: PageProps) {
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { workloadClient } = props;
  const [isUnsaved, setIsUnsaved] = useState<boolean>(false);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [editorItem, setEditorItem] = useState<ItemWithDefinition<FileEditorItemDefinition>>(undefined);
  const [selectedTab, setSelectedTab] = useState<TabValue>("empty");
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isSavingFiles, setIsSavingFiles] = useState<boolean>(false);
  const ALLOWED_ITEM_TYPES = ["Lakehouse",
                                process.env.WORKLOAD_NAME + "." + process.env.DEFAULT_ITEM_NAME,
                                process.env.WORKLOAD_NAME + ".CalculatorSample"]

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
  const currentTheme = definition?.theme || "vs";

  // Helper function to update item definition immutably
  const updateItemDefinition = useCallback((updates: Partial<FileEditorItemDefinition>) => {
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
    setIsSavingFiles(true);
    
    // First, save any dirty files back to OneLake
    if (editorItem?.definition?.openFiles) {

      const savePromises = editorItem.definition.openFiles
        .filter(file => file.isDirty)
        .map(async (file) => {
          try {
            let oneLakeLink = file.onelakeLink;
            
              await writeToOneLakeFileAsText(workloadClient, oneLakeLink, file.content);
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
        }
      }
    }

    // Then save the item definition
    const successResult = await saveItemDefinition<FileEditorItemDefinition>(
      workloadClient,
      editorItem.id,
      editorItem.definition
    );
    setIsUnsaved(!successResult);
    
    if (successResult) {
      callNotificationOpen(
        workloadClient,
        "File Editor Saved",
        `Your files have been saved successfully.`,
        undefined,
        undefined
      );
    }
    
    setIsSavingFiles(false);
  }

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoadingData(true);
    let item: ItemWithDefinition<FileEditorItemDefinition> = undefined;
    
    if (pageContext.itemObjectId) {
      try {
        item = await getWorkloadItem<FileEditorItemDefinition>(
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
              editorSettings: defaultSettings,
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
    
    // Set initial tab based on whether we have files
    if (item?.definition?.openFiles && item.definition.openFiles.length > 0) {
      setSelectedTab("home");
    } else {
      setSelectedTab("empty");
    }
    
    setIsLoadingData(false);
  }

  // File operations
  const handleCreateNewFile = useCallback(async () => {
    const fileName = `untitled-${Date.now()}.txt`;
    let oneLakeLink = "";
    
    // If we have workspace and item info, create OneLake path
    if (editorItem?.workspaceId && editorItem?.id) {
      oneLakeLink = `${editorItem.workspaceId}/${editorItem.id}/Files/${fileName}`;
    }
    
    const newFile: OneLakeFileReference = {
      ...editorItem,
      onelakeLink: oneLakeLink,
      fileName,
      content: "// Welcome to File Editor\n// Start typing your code here...\n",
      language: "plaintext",
      isDirty: true, // Mark as dirty so it will be saved to OneLake
    };

    const updatedFiles = [...openFiles, newFile];
    updateItemDefinition({
      openFiles: updatedFiles,
      activeFileIndex: updatedFiles.length - 1
    });
    setSelectedTab("home");
  }, [openFiles, updateItemDefinition, editorItem]);

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
          // set the selected item as the active item in the item editor
          //setEditorItem(selectedItem);
        } catch (error) {
          callNotificationOpen(
            workloadClient,
            "Error Opening Item",
            `Failed to read item from OneLake: ${error.message || error}`,
            undefined,
            undefined
          );
        }
      }
    } catch (error) {
      callNotificationOpen(
        workloadClient,
        "Error",
        `Failed to open OneLake file selector: ${error.message || error}`,
        undefined,
        undefined
      );
    }
  }, [workloadClient, openFiles, updateItemDefinition]);

  const handleUploadFile = useCallback(async () => {
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
          
          let oneLakeLink = "";
          
          // If we have workspace and item info, create OneLake path
          if (editorItem?.workspaceId && editorItem?.id) {
            oneLakeLink = `${editorItem.workspaceId}/${editorItem.id}/Files/${file.name}`;
          }
          
          const newFile: OneLakeFileReference = {
            ...editorItem || definition?.itemReference,
            onelakeLink: oneLakeLink,
            fileName: file.name,
            content,
            language,
            isDirty: true, // Mark as dirty so it will be saved to OneLake
          };

          const updatedFiles = [...openFiles, newFile];
          updateItemDefinition({
            openFiles: updatedFiles,
            activeFileIndex: updatedFiles.length - 1
          });
          setSelectedTab("home");
        };
        reader.readAsText(file);
      }
    };
    
    input.click();
  }, [openFiles, updateItemDefinition, editorItem]);


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
    } else if (data.value === "home") {
      setSelectedTab("home");
    } else {
      const fileIndex = parseInt(data.value as string);
      if (!isNaN(fileIndex) && fileIndex >= 0 && fileIndex < openFiles.length) {
        updateItemDefinition({ activeFileIndex: fileIndex });
        setSelectedTab("home");
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

  const handleFileExplorerSelection = useCallback(async (fileName: string, oneLakeLink: string) => {
    try {
      // Check if file is already open
      const existingFileIndex = openFiles.findIndex(file => file.onelakeLink === oneLakeLink);
      
      if (existingFileIndex !== -1) {
        // File is already open, just switch to it
        updateItemDefinition({ activeFileIndex: existingFileIndex });
        setSelectedTab("home");
        return;
      }

      // Load the file content from OneLake
      const content = await readOneLakeFileAsText(workloadClient, oneLakeLink);
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
      updateItemDefinition({
        openFiles: updatedFiles,
        activeFileIndex: updatedFiles.length - 1
      });
      setSelectedTab("home");
    } catch (error) {
      callNotificationOpen(
        workloadClient,
        "Error Opening File",
        `Failed to open file from OneLake: ${error.message || error}`,
        undefined,
        undefined
      );
    }
  }, [openFiles, updateItemDefinition, workloadClient, detectLanguage]);

  const handleTableExplorerSelection = useCallback(async (tableName: string, oneLakeLink: string) => {
    // We don't handle table selection in the file editor, so this is a no-op
    console.log("Table selected:", tableName, oneLakeLink);
  }, []);

  const handleItemChanged = useCallback(async (item: any) => {
    // Handle when the user changes the selected item in the explorer
    if (item) {
      // Store the selected item reference in the model
      updateItemDefinition({
        itemReference: {
          ...item,
        }
      });
      
      console.log("Item changed and stored:", item);
    }
  }, [updateItemDefinition]);

  if (isLoadingData) {
    return <ItemEditorLoadingProgressBar message="Loading File Editor..." />;
  }

  if (!editorItem) {
    return (
      <div style={{ padding: "20px" }}>
        <Text size={400}>Failed to load File Editor item.</Text>
      </div>
    );
  }

  const showEmpty = selectedTab === "empty" || openFiles.length === 0;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <FileEditorItemEditorRibbon
        {...props}
        onNewFile={handleCreateNewFile}
        onOpenFile={handleOpenItem}
        onUploadFile={handleUploadFile}
        saveItemCallback={SaveItem}
        isSaveButtonEnabled={isUnsaved || isSavingFiles}
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
      />

      <Stack className="main" style={{ height: "calc(100vh - 120px)", overflow: "hidden" }}>
        <span style={{ height: "100%", overflow: "auto", padding: "16px" }}>
          {showEmpty ? (
            <FileEditorItemEditorEmpty
              onCreateNewFile={handleCreateNewFile}
              onUploadFile={handleUploadFile}
              onOpenItem={handleOpenItem}
            />
          ) : (
            <FileExplorer
              workloadClient={workloadClient}
              onFileSelected={handleFileExplorerSelection}
              onTableSelected={handleTableExplorerSelection}
              onItemChanged={handleItemChanged}
              config={{
                allowedItemTypes: ALLOWED_ITEM_TYPES,
                initialItem: definition?.itemReference || {
                  id: editorItem.id,
                  workspaceId: editorItem.workspaceId,
                  displayName: editorItem.displayName || "Local",
                  type: editorItem.type,
                  description: editorItem.description
                }
              }}
              // Pass editor-related props
              openFiles={openFiles}
              activeFileIndex={activeFileIndex}
              currentFile={currentFile}
              currentTheme={currentTheme}
              selectedFile={selectedTab}
              onFileChanged={handleTabChange}
              onCloseFile={handleCloseFile}
              onEditorChange={handleEditorChange}
              onEditorDidMount={handleEditorDidMount}
            />
          )}
        </span>
      </Stack>
    </div>
  );
}
