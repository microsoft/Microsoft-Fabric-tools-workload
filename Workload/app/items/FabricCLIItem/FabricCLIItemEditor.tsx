import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, saveWorkloadItem, callGetItem } from "../../controller/ItemCRUDController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callDatahubOpen } from "../../controller/DataHubController";
import { callDialogOpen } from "../../controller/DialogController";
import { NotificationType, ItemDefinitionPart, PayloadType } from "@ms-fabric/workload-client";
import { ItemEditor, useViewNavigation } from "../../components/ItemEditor";
import { ItemClient } from "../../clients/ItemClient";
import { ExecutionMode, SparkLivyFabricCLIClient } from "./SparkLivyFabricCLIClient";

import { FabricCLIItemDefinition, PythonScript, PythonScriptMetadata } from "./FabricCLIItemModel";
import { FabricCLIItemEmptyView } from "./FabricCLIItemEmptyView";
import { FabricCLIItemRibbon } from "./FabricCLIItemRibbon";
import { FabricCLIItemDefaultView } from "./FabricCLIItemDefaultView";
import { ScriptDetailView } from "./ScriptDetailView";
import { Item } from "../../clients/FabricPlatformTypes";
import { CreateScriptDialogResult } from "./CreateScriptDialog";

import "./FabricCLIItem.scss";

export const EDITOR_VIEW_TYPES = {
  EMPTY: 'empty',
  DEFAULT: 'default',
  SCRIPT: 'script'
} as const;

export function FabricCLIItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [item, setItem] = useState<ItemWithDefinition<FabricCLIItemDefinition>>();
  const [selectedLakehouse, setSelectedLakehouse] = useState<Item | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [viewSetter, setViewSetter] = useState<((view: string) => void) | null>(null);
  const [availableEnvironments, setAvailableEnvironments] = useState<Item[]>([]);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(ExecutionMode.FAB_CLI);
  const [systemMessage, setSystemMessage] = useState<{ message: string; timestamp: number }>();
  const [selectedScript, setSelectedScript] = useState<PythonScript | undefined>();
  const [scriptsMap, setScriptsMap] = useState<Map<string, string>>(new Map()); // scriptName -> content
  
  // Session state (lifted from DefaultView to persist across view changes)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [terminalEntries, setTerminalEntries] = useState<Array<{ type: 'command' | 'response' | 'error' | 'system'; content: string | React.ReactNode; timestamp: Date; executionMode?: ExecutionMode }>>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  // Load item data from URL context
  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    let loadedItem: ItemWithDefinition<FabricCLIItemDefinition> = undefined;
    
    if (pageContext.itemObjectId) {
      try {
        loadedItem = await getWorkloadItem<FabricCLIItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        // Initialize default definition if not present
        if (!loadedItem.definition) {
          loadedItem = {
            ...loadedItem,
            definition: {  }
          };
          setIsUnsaved(true);
        }

        setItem(loadedItem);
      } catch (error) {
        console.error('Failed to load FabricCLI item:', error);
        callNotificationOpen(
          workloadClient,
          t("FabricCLIItem_LoadError_Title", "Failed to Load Item"),
          t("FabricCLIItem_LoadError_Message", "Could not load the Fabric CLI item."),
          NotificationType.Error
        );
        setItem(undefined);
      }
    } else {
      console.log(`Non-editor context. Current Path: ${pathname}`);
    }
    
    setIsLoading(false);
  }

  // Set the correct view after loading completes (only on initial load, not after saves)
  useEffect(() => {
    if (!isLoading && item && viewSetter) {
      const correctView = item.definition?.selectedLakehouse ? EDITOR_VIEW_TYPES.DEFAULT : EDITOR_VIEW_TYPES.EMPTY;
      viewSetter(correctView);
    }
  }, [isLoading, viewSetter]);

  // Load data when context changes
  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  // Load available environments
  useEffect(() => {
    const loadEnvironments = async () => {
      // Load environments from the lakehouse's workspace, not the item's workspace
      const workspaceId = item?.definition?.selectedLakehouse?.workspaceId;
      if (!workspaceId) return;
      
      try {
        const itemClient = new ItemClient(workloadClient);
        const workspaceItems = await itemClient.listItems(workspaceId, { type: 'Environment' });
        setAvailableEnvironments(workspaceItems.value);
      } catch (error) {
        console.error('Failed to load environments:', error);
      }
    };
    
    loadEnvironments();
  }, [item?.definition?.selectedLakehouse?.workspaceId]);

  /**
   * Central save method with error handling
   * Always includes script definition parts from scriptsMap
   * @param itemToSave The item to save
   * @param showNotification Whether to show success/error notifications (default: false)
   * @param scriptsMapOverride Optional scriptsMap to use instead of state (for handling async state updates)
   */
  const saveItemInternal = async (
    itemToSave: ItemWithDefinition<FabricCLIItemDefinition>,
    showNotification: boolean = false,
    scriptsMapOverride?: Map<string, string>
  ): Promise<boolean> => {
    try {
      // Use override if provided, otherwise use state scriptsMap
      const currentScriptsMap = scriptsMapOverride || scriptsMap;
      
      // Always build additionalDefinitionParts for scripts from scriptsMap
      const additionalParts: ItemDefinitionPart[] = [];
      
      itemToSave.definition?.scripts?.forEach(scriptMeta => {
        const scriptContent = currentScriptsMap.get(scriptMeta.name) || "";
        additionalParts.push({
          path: `scripts/${scriptMeta.name}`,
          payload: btoa(scriptContent),
          payloadType: PayloadType.InlineBase64
        });
        console.log(`[FabricCLI] Saving script ${scriptMeta.name}: ${scriptContent.length} chars`);
      });

      const itemWithParts: ItemWithDefinition<FabricCLIItemDefinition> = {
        ...itemToSave,
        additionalDefinitionParts: additionalParts
      };

      await saveWorkloadItem(workloadClient, itemWithParts);
      setIsUnsaved(false);
      
      if (showNotification) {
        callNotificationOpen(
          workloadClient,
          t("FabricCLIItem_SaveSuccess_Title", "Saved"),
          t("FabricCLIItem_SaveSuccess_Message", "Item saved successfully."),
          NotificationType.Success
        );
      }
      return true;
    } catch (error) {
      console.error('Failed to save item:', error);
      setIsUnsaved(true);
      
      if (showNotification) {
        callNotificationOpen(
          workloadClient,
          t("FabricCLIItem_SaveError_Title", "Save Failed"),
          t("FabricCLIItem_SaveError_Message", "Could not save the item."),
          NotificationType.Error
        );
      }
      return false;
    }
  };

  const saveItem = async () => {
    if (!item) return;
    await saveItemInternal(item, true);
  };

  const handleStartSession = () => {
    setSessionActive(true);
    if (viewSetter) {
      viewSetter(EDITOR_VIEW_TYPES.DEFAULT);
    }
  };

  const handleStopSession = async () => {
    setSessionActive(false);
    setSessionId(null);
    
    // Clear session ID when stopping session
    if (item) {
      const updatedItem = {
        ...item,
        definition: {
          ...item.definition,
          lastSparkSessionId: ''
        }
      };
      setItem(updatedItem);
      
      // Auto-save the cleared session ID
      await saveItemInternal(updatedItem);
    }
  };

  const handleSelectLakehouse = async (): Promise<boolean> => {
    try {
      const result = await callDatahubOpen(
        workloadClient,
        ['Lakehouse'],
        t("FabricCLIItem_SelectLakehouse_Title", "Select a Lakehouse"),
        false
      );

      if (result) {
        setSelectedLakehouse(result);
        
        // Update definition and clear session ID since lakehouse changed
        if (item) {
          const updatedItem = {
            ...item,
            definition: {
              ...item.definition,
              selectedLakehouse: {
                id: result.id,
                workspaceId: result.workspaceId,
                displayName: result.displayName,
                type: result.type
              },
              lastSparkSessionId: '' // Clear session ID when lakehouse changes
            }
          };
          setItem(updatedItem);
          setIsUnsaved(true);
        }
        
        // Add system message to terminal
        setSystemMessage({
          message: t("FabricCLIItem_SelectLakehouse_Success", "Connected to lakehouse: {{lakehouseName}}", { lakehouseName: result.displayName }),
          timestamp: Date.now()
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to select lakehouse:', error);
      setSystemMessage({
        message: t("FabricCLIItem_SelectLakehouse_Error", "Could not select lakehouse."),
        timestamp: Date.now()
      });
      return false;
    }
  };

  const handleOpenSettings = async () => {
    if (item) {
      try {
        const item_res = await callGetItem(workloadClient, item.id);
        await callOpenSettings(workloadClient, item_res.item, 'About');
      } catch (error) {
        console.error('Failed to open settings:', error);
      }
    }
  };

  const handleClearTerminal = () => {
    setTerminalEntries([]);
  };

  const handleSessionCreated = async (newSessionId: string) => {
    setSessionId(newSessionId);
        if (!item) return;
    
    const updatedItem = {
      ...item,
      definition: {
        ...item.definition,
        lastSparkSessionId: sessionId
      }
    };
    setItem(updatedItem);
    
    // Auto-save the session ID
    await saveItemInternal(updatedItem);
  };

  const handleSelectEnvironment = async (environmentId: string) => {
    if (!item) return;
    
    const selectedEnv = availableEnvironments.find(env => env.id === environmentId);
    if (!selectedEnv) return;
    
    const updatedItem = {
      ...item,
      definition: {
        ...item.definition,
        selectedSparkEnvironment: {
          id: selectedEnv.id,
          workspaceId: selectedEnv.workspaceId,
          displayName: selectedEnv.displayName,
          type: selectedEnv.type
        }
      }
    };
    setItem(updatedItem);
    
    // Auto-save the environment selection
    const success = await saveItemInternal(updatedItem);
    
    // Add system message to terminal
    setSystemMessage({
      message: success 
        ? t("FabricCLIItem_EnvironmentSelected_Message", "Selected environment: {{environmentName}}", { environmentName: selectedEnv.displayName })
        : t("FabricCLIItem_SelectEnvironment_Error", "Could not save environment selection."),
      timestamp: Date.now()
    });
  };

  const handleSelectExecutionMode = (mode: ExecutionMode) => {
    setExecutionMode(mode);
  };

  const handleCreateScriptDialog = async () => {
    if (!item) return;
    
    // Pass existing script names to prevent duplicates
    const existingNames = (item.definition?.scripts || []).map(s => s.name).join(',');
    const path = `/FabricCLIItem-create-script/${item.id}?existing=${encodeURIComponent(existingNames)}`;
    
    const dialogResult = await callDialogOpen(
      workloadClient,
      process.env.WORKLOAD_NAME,
      path,
      400,
      300,
      true
    );
    
    const result = dialogResult?.value as CreateScriptDialogResult;
    if (result?.state === 'created' && result.scriptName) {
      await handleScriptCreate(result.scriptName);
    }
  };

  // Script management handlers
  const handleScriptCreate = async (name: string) => {
    if (!item) return;

    const newScript: PythonScriptMetadata = {
      name,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };

    const updatedItem = {
      ...item,
      definition: {
        ...item.definition,
        scripts: [...(item.definition?.scripts || []), newScript]
      }
    };

    // Load default script template
    let defaultScriptContent = "# New Python script\n";
    try {
      const response = await fetch('/assets/items/FabricCLIItem/DefaultScript.py');
      if (response.ok) {
        defaultScriptContent = await response.text();
      }
    } catch (error) {
      console.warn('Failed to load default script template, using fallback', error);
    }

    // Create updated scriptsMap with new script content
    const updatedScriptsMap = new Map(scriptsMap).set(newScript.name, defaultScriptContent);
    
    setItem(updatedItem);
    setScriptsMap(updatedScriptsMap);

    // Save the item with the new script, passing the updated map to avoid async state issues
    await saveItemInternal(updatedItem, false, updatedScriptsMap);

    // Navigate to new script
    setSelectedScript({ ...newScript, content: defaultScriptContent });
    if (viewSetter) {
      viewSetter(EDITOR_VIEW_TYPES.SCRIPT);
    }
  };

  const handleScriptSelect = (scriptName: string) => {
    if (!item) return;

    const scriptMeta = item.definition?.scripts?.find(s => s.name === scriptName);
    if (scriptMeta) {
      const content = scriptsMap.get(scriptName) || "";
      console.log(`[FabricCLI] handleScriptSelect - scriptName: ${scriptName}, content length: ${content.length}`);
      console.log(`[FabricCLI] handleScriptSelect - scriptsMap size: ${scriptsMap.size}, keys:`, Array.from(scriptsMap.keys()));
      setSelectedScript({ ...scriptMeta, content });
      if (viewSetter) {
        viewSetter(EDITOR_VIEW_TYPES.SCRIPT);
      }
    }
  };

  const handleScriptDelete = (scriptName: string) => {
    if (!item) return;

    const updatedItem = {
      ...item,
      definition: {
        ...item.definition,
        scripts: item.definition?.scripts?.filter(s => s.name !== scriptName) || []
      }
    };

    setItem(updatedItem);
    setScriptsMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(scriptName);
      return newMap;
    });
    setIsUnsaved(true);

    // If we deleted the currently selected script, go back to default view
    if (selectedScript?.name === scriptName) {
      setSelectedScript(undefined);
      if (viewSetter) {
        viewSetter(EDITOR_VIEW_TYPES.DEFAULT);
      }
    }
  };

  const handleScriptSave = async (script: PythonScript) => {
    if (!item) return;

    // Update the script content in the map
    const updatedScriptsMap = new Map(scriptsMap).set(script.name, script.content);
    setScriptsMap(updatedScriptsMap);

    // Update script metadata including parameters
    const updatedItem = {
      ...item,
      definition: {
        ...item.definition,
        scripts: item.definition?.scripts?.map(s => 
          s.name === script.name 
            ? { 
                ...s, 
                modifiedAt: script.modifiedAt,
                parameters: script.parameters 
              }
            : s
        ) || []
      }
    };

    setItem(updatedItem);
    setSelectedScript(script);
    
    // Auto-save the script changes with notification
    await saveItemInternal(updatedItem, true, updatedScriptsMap);
  };

  const handleScriptRunByName = async (scriptName: string) => {
    if (!item) return;

    const scriptMeta = item.definition?.scripts?.find(s => s.name === scriptName);
    if (!scriptMeta) {
      console.error('Script not found:', scriptName);
      return;
    }

    const content = scriptsMap.get(scriptName) || "";
    await handleScriptRun({ ...scriptMeta, content });
  };

  const handleScriptRun = async (script: PythonScript) => {
    if (!item?.definition?.selectedLakehouse || !item?.definition?.selectedSparkEnvironment) {
      callNotificationOpen(
        workloadClient,
        t("FabricCLIItem_Script_Run_Error_Title", "Cannot Run Script"),
        t("FabricCLIItem_Script_Run_Error_Message", "Please select a lakehouse and Spark environment before running scripts."),
        NotificationType.Error
      );
      return;
    }

    const lakehouseId = item.definition.selectedLakehouse.id;
    const workspaceId = item.definition.selectedLakehouse.workspaceId;
    const environmentId = item.definition.selectedSparkEnvironment.id;

    try {
      // Create batch job to run the script
      const cliClient = new SparkLivyFabricCLIClient(workloadClient);
      const batchResponse = await cliClient.runScriptAsBatch(
        workspaceId,
        lakehouseId,
        environmentId,
        script.name,
        script.content,
        script.parameters // Pass full parameter objects with type info
      );

      const jobId = batchResponse.id || batchResponse.artifactId || 'unknown';
      
      callNotificationOpen(
        workloadClient,
        t("FabricCLIItem_Script_Run_Started_Title", "Script Execution Started"),
        t("FabricCLIItem_Script_Run_Started_Message", "Script '{{scriptName}}' submitted as batch job. Job ID: {{jobId}}", 
          { scriptName: script.name, jobId }),
        NotificationType.Success
      );

      // Optional: Wait for completion in the background and show result
      // You could add this as an enhancement
      
    } catch (error: any) {
      console.error('Failed to run script:', error);
      callNotificationOpen(
        workloadClient,
        t("FabricCLIItem_Script_Run_Failed_Title", "Script Execution Failed"),
        t("FabricCLIItem_Script_Run_Failed_Message", "Could not run script: {{error}}", { error: error.message }),
        NotificationType.Error
      );
    }
  };

  // Load script contents from definition parts
  useEffect(() => {
    if (!item) return;

    console.log('[FabricCLI] Loading scripts - metadata:', item.definition?.scripts);
    console.log('[FabricCLI] Loading scripts - definition parts:', item.additionalDefinitionParts);
    console.log('[FabricCLI] Available paths:', item.additionalDefinitionParts?.map(p => p.path));

    setScriptsMap(prevMap => {
      const newScriptsMap = new Map<string, string>(prevMap);
      
      item.definition?.scripts?.forEach(scriptMeta => {
        // Find the corresponding definition part using the same path format as save
        const expectedPath = `scripts/${scriptMeta.name}`;
        const part = item.additionalDefinitionParts?.find(p => p.path === expectedPath);
        console.log(`[FabricCLI] Script ${scriptMeta.name}: looking for '${expectedPath}', found:`, part ? 'YES' : 'NO');
        
        if (part && part.payload) {
          try {
            const content = atob(part.payload);
            console.log(`[FabricCLI] Script ${scriptMeta.name}: loaded ${content.length} chars from definition part`);
            // Only update if we don't already have content for this script
            if (!newScriptsMap.has(scriptMeta.name) || newScriptsMap.get(scriptMeta.name) === "") {
              newScriptsMap.set(scriptMeta.name, content);
            } else {
              console.log(`[FabricCLI] Script ${scriptMeta.name}: keeping existing content (${newScriptsMap.get(scriptMeta.name)?.length} chars)`);
            }
          } catch (error) {
            console.error(`Failed to decode script ${scriptMeta.name}:`, error);
            if (!newScriptsMap.has(scriptMeta.name)) {
              newScriptsMap.set(scriptMeta.name, "");
            }
          }
        } else {
          // No definition part found
          if (!newScriptsMap.has(scriptMeta.name)) {
            console.warn(`[FabricCLI] Script ${scriptMeta.name}: NO CONTENT FOUND at path '${expectedPath}', setting empty`);
            newScriptsMap.set(scriptMeta.name, "");
          } else {
            console.log(`[FabricCLI] Script ${scriptMeta.name}: NO DEFINITION PART but keeping existing content (${newScriptsMap.get(scriptMeta.name)?.length} chars)`);
          }
        }
      });
      
      // Remove scripts that are no longer in metadata
      const currentScriptNames = new Set(item.definition?.scripts?.map(s => s.name) || []);
      for (const [name] of newScriptsMap) {
        if (!currentScriptNames.has(name)) {
          console.log(`[FabricCLI] Removing script ${name} from map (no longer in metadata)`);
          newScriptsMap.delete(name);
        }
      }

      console.log(`[FabricCLI] Final scriptsMap:`, Array.from(newScriptsMap.entries()).map(([name, content]) => ({name, contentLength: content.length})));
      return newScriptsMap;
    });
  }, [item?.definition?.scripts, item?.additionalDefinitionParts]); // Re-run when scripts metadata or definition parts change

  const EmptyViewWrapper = () => {
    const { setCurrentView } = useViewNavigation();
    return (
      <FabricCLIItemEmptyView
        onSelectLakehouse={async () => {
          const success = await handleSelectLakehouse();
          if (success) {
            setCurrentView(EDITOR_VIEW_TYPES.DEFAULT);
          }
        }}
      />
    );
  };

  const views = [
    {
      name: EDITOR_VIEW_TYPES.EMPTY,
      component: <EmptyViewWrapper />
    },
    {
      name: EDITOR_VIEW_TYPES.DEFAULT,
      component: (
        <FabricCLIItemDefaultView
          workloadClient={workloadClient}
          item={item}
          selectedLakehouse={selectedLakehouse}
          isUnsaved={isUnsaved}
          sessionActive={sessionActive}
          setSessionActive={setSessionActive}
          sessionId={sessionId}
          setSessionId={setSessionId}
          terminalEntries={terminalEntries}
          setTerminalEntries={setTerminalEntries}
          commandHistory={commandHistory}
          setCommandHistory={setCommandHistory}
          onSessionCreated={handleSessionCreated}
          showSystemMessage={systemMessage}
          executionMode={executionMode}
          onScriptSelect={handleScriptSelect}
          onScriptCreate={handleCreateScriptDialog}
          onScriptDelete={handleScriptDelete}
          onScriptRun={handleScriptRunByName}
        />
      )
    },
    {
      name: EDITOR_VIEW_TYPES.SCRIPT,
      isDetailView: true,
      component: selectedScript ? (
        <ScriptDetailView
          script={selectedScript}
          currentTheme="light"
          onSave={handleScriptSave}
          onRun={handleScriptRun}
        />
      ) : null
    }
  ];

  return (
    <ItemEditor
      isLoading={isLoading}
      ribbon={(viewContext) => (
        <FabricCLIItemRibbon
          {...props}
          viewContext={viewContext}
          openSettingsCallback={handleOpenSettings}
          saveItemCallback={saveItem}
          isSaveButtonEnabled={isUnsaved}
          onStartTerminal={handleStartSession}
          onStopSession={handleStopSession}
          onClearTerminal={handleClearTerminal}
          sessionActive={sessionActive}
          onSelectLakehouse={handleSelectLakehouse}
          onSelectEnvironment={handleSelectEnvironment}
          availableEnvironments={availableEnvironments.map(env => ({
            id: env.id,
            displayName: env.displayName || env.id
          }))}
          selectedEnvironmentId={item?.definition?.selectedSparkEnvironment?.id}
          onSelectExecutionMode={handleSelectExecutionMode}
          selectedExecutionMode={executionMode}
          onCreateScript={handleCreateScriptDialog}
        />
      )}
      views={views}
      viewSetter={(setCurrentView) => {
        if (!viewSetter) {
          setViewSetter(() => setCurrentView);
        }
      }}
    />
  );
}
