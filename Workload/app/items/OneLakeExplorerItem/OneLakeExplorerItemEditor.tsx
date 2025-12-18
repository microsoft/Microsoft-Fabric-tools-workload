import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { editor } from "monaco-editor";
import { ContextProps, PageProps } from "../../App";
import { getWorkloadItem, saveItemDefinition, callGetItem } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { useLocation, useParams } from "react-router-dom";
import { OneLakeExplorerItemDefinition, OneLakeFileReference } from "./OneLakeExplorerItemModel";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callDatahubOpen } from "../../controller/DataHubController";
import { OneLakeExplorerItemRibbon } from "./OneLakeExplorerItemRibbon";
import { OneLakeExplorerItemEmptyView } from "./OneLakeExplorerItemEmptyView";
import { OneLakeStorageClient } from "../../clients/OneLakeStorageClient";
import { getConfiguredWorkloadItemTypes } from "../../controller/ConfigurationController";
import { ItemEditor } from "../../components/ItemEditor";
import { OneLakeExplorerItemDefaultView } from "./OneLakeExplorerItemDefaultView";
import "./OneLakeExplorerItem.scss";



const FILETYPES_ACCEPT = ".txt,.js,.ts,.html,.css,.json,.md,.py,.cs,.java,.cpp,.c,.php,.rb,.go,.rs,.xml,.yml,.yaml,.sql,.csv,.ipynb";

/**
 * Different views that are available for the OneLakeExplorer item
 */
export const EDITOR_VIEW_TYPES = {
  EXPLORER: "explorer",
  EMPTY: "empty"
} as const;


export function OneLakeExplorerItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  
  // State management following HelloWorldItem pattern
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<OneLakeExplorerItemDefinition>>();
  const [isUnsaved, setIsUnsaved] = useState<boolean>(false);
  const [isSavingFiles, setIsSavingFiles] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const [currentViewSetter, setCurrentViewSetter] = useState<((view: string) => void) | null>(null);
  
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const ALLOWED_ITEM_TYPES = ["Lakehouse", ...getConfiguredWorkloadItemTypes()];

  // Default editor settings
  const defaultEditorSettings = {
    fontSize: 14,
    wordWrap: true,
    minimap: true,
    lineNumbers: true
  };

  // Current editor state derived from item
  const definition = item?.definition;
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
    } else if (item) {
      return {
        ...item
      };
    }
    return undefined;
  }, [definition?.itemReference?.id, definition?.itemReference?.workspaceId, definition?.itemReference?.displayName, definition?.itemReference?.type, item?.id, item?.workspaceId, item?.displayName]);

  // Helper function to update item definition immutably
  const updateItemDefinition = useCallback((updates: Partial<OneLakeExplorerItemDefinition>) => {
    setItem(prevItem => {
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
    setItem(prevItem => {
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

  // Effect to set the correct view after loading completes
  useEffect(() => {
    if (!isLoading && item && currentViewSetter) {
      // Determine the correct view based on item state
      const correctView = !item.definition?.itemReference ? EDITOR_VIEW_TYPES.EMPTY : EDITOR_VIEW_TYPES.EXPLORER;
      currentViewSetter(correctView);
    }
  }, [isLoading, item, currentViewSetter]);

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    let LoadedItem: ItemWithDefinition<OneLakeExplorerItemDefinition> = undefined;
    
    if (pageContext.itemObjectId) {
      try {
        LoadedItem = await getWorkloadItem<OneLakeExplorerItemDefinition>(
          workloadClient,
          pageContext.itemObjectId
        );
        
        // Initialize empty definition if needed
        if (!LoadedItem.definition) {
          LoadedItem = {
            ...LoadedItem,
            definition: {
              openFiles: [],
              activeFileIndex: 0,
              theme: currentTheme,
              editorSettings: defaultEditorSettings,
              itemReference: {
                id: LoadedItem.id,
                workspaceId: LoadedItem.workspaceId,
                displayName: LoadedItem.displayName,
                type: LoadedItem.type,
                description: LoadedItem.description
              }
            }
          };
        } else if (!LoadedItem.definition.itemReference) {
          // Add itemReference if it doesn't exist
          LoadedItem.definition.itemReference = {
            id: LoadedItem.id,
            workspaceId: LoadedItem.workspaceId,
            displayName: LoadedItem.displayName,
            type: LoadedItem.type,
            description: LoadedItem.description
          };
        }

        setItem(LoadedItem);
      } catch (error) {
        setItem(undefined);
      }
    }
    setIsLoading(false);
  }

  async function openSettings() {
    if (item) {
      //TODO: this needs to be updated to use the Item instead of Itemv2
      const itemDetails = await callGetItem(workloadClient, item.id);
      await callOpenSettings(workloadClient, itemDetails.item, 'About');
    }
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
    const targetItem = definition?.itemReference || item;
    
    // If we have workspace and item info, create OneLake path
    if (targetItem?.workspaceId && targetItem?.id) {
      oneLakeLink = `${targetItem.workspaceId}/${targetItem.id}/Files/${fileName}`;
    }
    const oneLakeClient = new OneLakeStorageClient(workloadClient);
    await oneLakeClient.writeFileAsText(oneLakeLink, content);

    const newFile: OneLakeFileReference = {
      ...targetItem,
      oneLakeLink: oneLakeLink,
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
  }, [definition?.itemReference, item, openFiles, updateItemDefinition, workloadClient, detectLanguage, refreshItemExplorer]);

  // File operations
  const handleCreateNewFile = useCallback(async () => {
    const fileName = `untitled-${Date.now()}.txt`;
    await writeToItemOneLakeFolder(fileName, "// Welcome to OneLake Explorer\n// Start typing your code here...\n");
  }, [writeToItemOneLakeFolder]);

  const handleItemChanged = useCallback(async (item: any) => {
    // Handle when the user changes the selected item in the explorer
    if (item) {
      // Store the selected item reference and clear open files since we're switching to a new item
      // Also reset view mode and clear any selected tables to show empty state
      updateItemDefinition({
        itemReference: {
          ...item,
        },
        openFiles: [],
        activeFileIndex: 0,
        viewMode: undefined, // Reset view mode to show empty state
        selectedTable: undefined // Clear any selected table
      });
      
      // Switch to empty view when changing items
      if (currentViewSetter) {
        currentViewSetter(EDITOR_VIEW_TYPES.EMPTY);
      }
      
      // Refresh the explorer to load files from the new item
      refreshItemExplorer();
    }
  }, [updateItemDefinition, refreshItemExplorer, currentViewSetter]);

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
    return new Promise<void>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = FILETYPES_ACCEPT;
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const content = e.target?.result as string;
              await writeToItemOneLakeFolder(file.name, content);
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsText(file);
        } else {
          resolve(); // User cancelled file selection
        }
      };
      
      // Handle case where user cancels the file dialog
      input.addEventListener('cancel', () => resolve());
      
      input.click();
    });
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

  const handleTabChange = useCallback((event: any, data: { value: unknown }) => {
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
        // File type not supported - could add user notification here if needed
        return;
      }

      // Check if file is already open
      const existingFileIndex = openFiles.findIndex(file => file.oneLakeLink === oneLakeLink);
      
      if (existingFileIndex !== -1) {
        // File is already open, just switch to it (no need to mark as unsaved)
        // Also switch to file view mode
        updateItemDefinitionSilently({ 
          activeFileIndex: existingFileIndex,
          viewMode: 'file'
        });
        return;
      }

      // Load the file content from OneLake
      const oneLakeClient = new OneLakeStorageClient(workloadClient);
      const content = await oneLakeClient.readFileAsText(oneLakeLink);
      const language = detectLanguage(fileName);

      const newFile: OneLakeFileReference = {
        ...definition?.itemReference,
        oneLakeLink: oneLakeLink,
        fileName,
        content,
        language,
        isDirty: false, // File from OneLake starts clean
      };

      const updatedFiles = [...openFiles, newFile];
      // Opening a clean file from OneLake shouldn't mark the item as unsaved
      // Switch to file view mode when a file is selected
      updateItemDefinitionSilently({
        openFiles: updatedFiles,
        activeFileIndex: updatedFiles.length - 1,
        viewMode: 'file'
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
  }, [openFiles, updateItemDefinitionSilently, workloadClient, detectLanguage, definition?.itemReference]);

  const handleTableExplorerSelection = useCallback(async (tableName: string, oneLakeLink: string) => {
    // Update item definition to show table view and store selected table information
    console.log("Table selected:", tableName, oneLakeLink);
    
    updateItemDefinition({
      viewMode: 'table',
      selectedTable: {
        tableName,
        oneLakeLink
      }
    });
  }, [updateItemDefinition]);

  async function SaveItem() {
    setIsSavingFiles(true);
    
    // First, save any dirty files back to OneLake
    if (item?.definition?.openFiles) {

      const savePromises = item.definition.openFiles
        .filter(file => file.isDirty)
        .map(async (file) => {
          try {
            let oneLakeLink = file.oneLakeLink;
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
      item.id,
      item.definition
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

  // Save function for success notification
  async function saveItemWithSuccessDialog() {
    await SaveItem();
    callNotificationOpen(
      workloadClient,
      "Item Saved",
      "OneLake Explorer item has been saved successfully.",
      undefined,
      undefined
    );
  }

  const isSaveEnabled = (currentView: string) => {
    return isUnsaved || isSavingFiles;
  };

  // Static view definitions - no function wrapper needed!
  const views = [
    {
      name: EDITOR_VIEW_TYPES.EMPTY,
      component: (
        <OneLakeExplorerItemEmptyView
          onCreateNewFile={async () => {
            await handleCreateNewFile();
            if (currentViewSetter) {
              currentViewSetter(EDITOR_VIEW_TYPES.EXPLORER);
            }
          }}
          onUploadFile={async () => {
            await handleUploadFile();
            if (currentViewSetter) {
              currentViewSetter(EDITOR_VIEW_TYPES.EXPLORER);
            }
          }}
          onOpenItem={async () => {
            await handleOpenItem();
            if (currentViewSetter) {
              currentViewSetter(EDITOR_VIEW_TYPES.EXPLORER);
            }
          }}
        />
      )
    },
    {
      name: EDITOR_VIEW_TYPES.EXPLORER,
      component: (
        <OneLakeExplorerItemDefaultView
          {...props}
          item={item}
          openFiles={openFiles}
          currentFile={currentFile}
          currentTheme={currentTheme}
          explorerInitialItem={explorerInitialItem}
          lastRefreshTime={lastRefreshTime}
          allowedItemTypes={ALLOWED_ITEM_TYPES}
          onFileExplorerSelection={handleFileExplorerSelection}
          onTableExplorerSelection={handleTableExplorerSelection}
          onItemChanged={handleItemChanged}
          onTabChange={handleTabChange}
          onCloseFile={handleCloseFile}
          onEditorChange={handleEditorChange}
          onEditorDidMount={handleEditorDidMount}
          onCreateNewFile={handleCreateNewFile}
          onUploadFile={handleUploadFile}
          onOpenItem={handleOpenItem}
        />
      )
    }
  ];

  // Render with view registration following HelloWorldItem pattern and built-in loading support
  return (
    <ItemEditor
      isLoading={isLoading}
      loadingMessage="Loading OneLake Explorer..."
      ribbon={(context) => (
        <OneLakeExplorerItemRibbon
          {...props}
          viewContext={context}
          onNewFile={async () => {
            await handleCreateNewFile();
            if (currentViewSetter) {
              currentViewSetter(EDITOR_VIEW_TYPES.EXPLORER);
            }
          }}
          onOpenItem={async () => {
            await handleOpenItem();
            if (currentViewSetter) {
              currentViewSetter(EDITOR_VIEW_TYPES.EXPLORER);
            }
          }}
          onUploadFile={async () => {
            await handleUploadFile();
            if (currentViewSetter) {
              currentViewSetter(EDITOR_VIEW_TYPES.EXPLORER);
            }
          }}
          saveItemCallback={saveItemWithSuccessDialog}
          openSettingsCallback={openSettings}
          isSaveButtonEnabled={isSaveEnabled(context.currentView)}
        />
      )}
      views={views}
      viewSetter={(setCurrentView) => {
        // Store the setCurrentView function so we can use it after loading
        if (!currentViewSetter) {
          setCurrentViewSetter(() => setCurrentView);
        }
      }}
    />
  );
}
