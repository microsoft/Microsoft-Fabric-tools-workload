import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, saveWorkloadItem, callGetItem } from "../../controller/ItemCRUDController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callDatahubOpen } from "../../controller/DataHubController";
import { NotificationType, Item } from "@ms-fabric/workload-client";
import { ItemEditor, useViewNavigation } from "../../components/ItemEditor";
import { 
  GithubCopilotCLIItemDefinition, 
  TerminalEntry, 
  COPILOT_MODELS,
  CopilotModelId 
} from "./GithubCopilotCLIItemModel";
import { GithubCopilotCLIItemEmptyView } from "./GithubCopilotCLIItemEmptyView";
import { GithubCopilotCLIItemRibbon } from "./GithubCopilotCLIItemRibbon";
import { GithubCopilotCLIItemDefaultView } from "./GithubCopilotCLIItemDefaultView";
import { SparkLivyCloudShellClient, SessionKind } from "../CloudShellItem/engine/SparkLivyCloudShellClient";
import { ItemClient } from "../../clients/ItemClient";
import "./GithubCopilotCLIItem.scss";

export const EDITOR_VIEW_TYPES = {
  EMPTY: 'empty',
  DEFAULT: 'default',
} as const;

export function GithubCopilotCLIItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [item, setItem] = useState<ItemWithDefinition<GithubCopilotCLIItemDefinition>>();
  const [viewSetter, setViewSetter] = useState<((view: string) => void) | null>(null);
  
  // Terminal state
  const [terminalEntries, setTerminalEntries] = useState<TerminalEntry[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<CopilotModelId>(COPILOT_MODELS[0].id);
  
  // Session and lakehouse state
  const [selectedLakehouse, setSelectedLakehouse] = useState<Item | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [systemMessage, setSystemMessage] = useState<{ message: string; timestamp: number } | undefined>();
  
  // Environment state
  const [availableEnvironments, setAvailableEnvironments] = useState<Array<{ id: string; displayName: string }>>([]);
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | undefined>();
  
  // Clients
  const cloudShellClient = new SparkLivyCloudShellClient(workloadClient);
  const itemClient = new ItemClient(workloadClient);

  // Load item data from URL context
  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    if (pageContext.itemObjectId && item?.id === pageContext.itemObjectId) {
      return;
    }

    setIsLoading(true);
    let loadedItem: ItemWithDefinition<GithubCopilotCLIItemDefinition> | undefined = undefined;
    
    if (pageContext.itemObjectId) {
      try {
        loadedItem = await getWorkloadItem<GithubCopilotCLIItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        // Initialize default definition if not present
        if (!loadedItem.definition) {
          loadedItem = {
            ...loadedItem,
            definition: {
              selectedModel: COPILOT_MODELS[0].id
            }
          };
          setIsUnsaved(true);
        }

        setItem(loadedItem);
        
        // Restore model from definition
        if (loadedItem.definition?.selectedModel) {
          setSelectedModel(loadedItem.definition.selectedModel);
        }
        
        // Restore command history if available
        if (loadedItem.definition?.commandHistory) {
          setCommandHistory(loadedItem.definition.commandHistory);
        }
      } catch (error) {
        console.error('Failed to load GithubCopilotCLI item:', error);
        callNotificationOpen(
          workloadClient,
          t("GithubCopilotCLIItem_LoadError_Title", "Failed to Load Item"),
          t("GithubCopilotCLIItem_LoadError_Message", "Could not load the GitHub Copilot CLI item."),
          NotificationType.Error
        );
        setItem(undefined);
      }
    }
    
    setIsLoading(false);
  }

  // Set the correct view after loading completes
  useEffect(() => {
    if (!isLoading && item && viewSetter) {
      // Go directly to default view since Copilot CLI is ready to use
      viewSetter(EDITOR_VIEW_TYPES.DEFAULT);
    }
  }, [isLoading, viewSetter]);

  // Debug: Log item state
  useEffect(() => {
    console.log('[GithubCopilotCLI] Item state changed:', {
      item: item,
      workspaceId: item?.workspaceId,
      id: item?.id,
      displayName: item?.displayName,
      selectedLakehouse: selectedLakehouse,
      selectedLakehouseWorkspaceId: selectedLakehouse?.workspaceId
    });
  }, [item, selectedLakehouse]);

  // Load data when context changes
  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  // Load environments from current workspace or lakehouse's workspace
  useEffect(() => {
    console.log('[GithubCopilotCLI] Environment load effect triggered');
    console.log('[GithubCopilotCLI] Current item:', item?.id, 'workspaceId:', item?.workspaceId);
    console.log('[GithubCopilotCLI] Current selectedLakehouse:', selectedLakehouse?.id, 'workspaceId:', selectedLakehouse?.workspaceId);
    console.log('[GithubCopilotCLI] isLoading:', isLoading);
    
    // Don't load environments while item is still loading
    if (isLoading) {
      console.log('[GithubCopilotCLI] Still loading item, skipping environment load');
      return;
    }
    
    const loadEnvironments = async () => {
      // Use lakehouse's workspace if selected, otherwise use item's workspace
      const workspaceId = selectedLakehouse?.workspaceId || item?.workspaceId;
      console.log('[GithubCopilotCLI] Computed workspaceId:', workspaceId);
      
      if (workspaceId) {
        let environments: Array<{ id: string; displayName: string }> = [];
        
        // Try the dedicated environments endpoint first
        try {
          console.log('[GithubCopilotCLI] Trying dedicated /environments endpoint for workspace:', workspaceId);
          const environmentsResult = await itemClient.listEnvironments(workspaceId);
          console.log('[GithubCopilotCLI] Dedicated environments API response:', environmentsResult);
          
          environments = (environmentsResult.value || []).map(env => ({
            id: env.id || '',
            displayName: env.displayName || 'Unknown'
          }));
        } catch (error: any) {
          console.warn('[GithubCopilotCLI] Dedicated /environments endpoint failed, trying fallback:', {
            message: error?.message,
            status: error?.statusCode,
            errorCode: error?.errorCode
          });
          
          // Fallback: Try listing all items and filter by type
          try {
            console.log('[GithubCopilotCLI] Fallback: Listing all items and filtering by Environment type');
            const allItems = await itemClient.listItems(workspaceId);
            console.log('[GithubCopilotCLI] All items in workspace:', allItems.value?.length || 0);
            console.log('[GithubCopilotCLI] Item types found:', [...new Set(allItems.value?.map(i => i.type) || [])]);
            
            const envItems = (allItems.value || []).filter(item => 
              item.type === 'Environment' || 
              item.type?.toLowerCase().includes('environment')
            );
            
            environments = envItems.map(env => ({
              id: env.id || '',
              displayName: env.displayName || 'Unknown'
            }));
          } catch (fallbackError: any) {
            console.error('[GithubCopilotCLI] Fallback also failed:', {
              message: fallbackError?.message,
              status: fallbackError?.statusCode,
              errorCode: fallbackError?.errorCode
            });
          }
        }
        
        console.log('[GithubCopilotCLI] Final environments count:', environments.length);
        
        if (environments.length === 0) {
          console.log('[GithubCopilotCLI] No environments found. Possible causes:');
          console.log('  1. No Environment items exist in the workspace');
          console.log('  2. User lacks Workspace.Read.All permission');
          console.log('  3. Livy API tenant setting may not be enabled');
        } else {
          console.log('[GithubCopilotCLI] Found environments:', environments);
        }
        
        setAvailableEnvironments(environments);
        
        // Auto-select first environment if none selected
        if (!selectedEnvironmentId && environments.length > 0) {
          console.log('[GithubCopilotCLI] Auto-selecting first environment:', environments[0].id);
          setSelectedEnvironmentId(environments[0].id);
        }
      } else {
        console.log('[GithubCopilotCLI] No workspace ID available yet');
      }
    };
    loadEnvironments();
  }, [selectedLakehouse?.workspaceId, item?.workspaceId, isLoading]);

  // Restore lakehouse from item definition
  useEffect(() => {
    if (item?.definition?.selectedLakehouse && !selectedLakehouse) {
      setSelectedLakehouse(item.definition.selectedLakehouse as Item);
    }
    if (item?.definition?.environmentId && !selectedEnvironmentId) {
      setSelectedEnvironmentId(item.definition.environmentId);
    }
  }, [item?.definition]);

  // Handle lakehouse selection
  const handleSelectLakehouse = async (): Promise<boolean> => {
    try {
      const result = await callDatahubOpen(
        workloadClient,
        ['Lakehouse'],
        t("GithubCopilotCLIItem_SelectLakehouse_Title", "Select a Lakehouse"),
        false
      );

      if (result) {
        setSelectedLakehouse(result);
        
        // Clear session since lakehouse changed
        if (sessionId) {
          setSessionId(null);
          setSessionActive(false);
        }
        
        // Update definition
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
              sessionId: null // Clear session ID when lakehouse changes
            }
          };
          setItem(updatedItem);
          setIsUnsaved(true);
        }
        
        addSystemMessage(t("GithubCopilotCLIItem_Lakehouse_Selected", "Lakehouse selected: {{name}}", { name: result.displayName }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to select lakehouse:', error);
      addSystemMessage("Failed to select lakehouse");
      return false;
    }
  };

  // Add system message to terminal
  const addSystemMessage = (message: string) => {
    setTerminalEntries(prev => [...prev, {
      type: 'system',
      content: message,
      timestamp: new Date()
    }]);
  };

  // Handle environment selection
  const handleSelectEnvironment = (environmentId: string) => {
    setSelectedEnvironmentId(environmentId);
    
    // Update item definition
    if (item) {
      const updatedItem = {
        ...item,
        definition: {
          ...item.definition,
          environmentId
        }
      };
      setItem(updatedItem);
      setIsUnsaved(true);
    }
    
    const envName = availableEnvironments.find(e => e.id === environmentId)?.displayName || environmentId;
    addSystemMessage(`Environment selected: ${envName}`);
  };

  // Handle session start
  const handleStartSession = async () => {
    if (!selectedLakehouse?.workspaceId || !selectedLakehouse?.id || !selectedEnvironmentId) {
      addSystemMessage("Please select a Lakehouse and Environment first.");
      return;
    }

    setIsConnecting(true);
    addSystemMessage("Starting Spark session...");

    try {
      // Skip CLI check since ms-cloud-shell might not be available
      // This allows running Python commands even without fab CLI
      const session = await cloudShellClient.initializeSession(
        {
          workspaceId: selectedLakehouse.workspaceId,
          lakehouseId: selectedLakehouse.id,
          environmentId: selectedEnvironmentId,
          sessionKind: SessionKind.PYTHON
        },
        (progress) => addSystemMessage(progress),
        true  // skipCliCheck - don't require fab CLI
      );

      setSessionId(session.id?.toString() || null);
      setSessionActive(true);
      
      // Update item definition with session ID
      if (item) {
        const updatedItem = {
          ...item,
          definition: {
            ...item.definition,
            sessionId: session.id?.toString()
          }
        };
        setItem(updatedItem);
      }
      
      addSystemMessage("✓ Session started! You can now run commands.");
      addSystemMessage("💡 Try: python -c \"print('Hello from Spark!')\"");
    } catch (error: any) {
      console.error('Failed to start session:', error);
      addSystemMessage(`Failed to start session: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle session stop
  const handleStopSession = async () => {
    if (!sessionId || !selectedLakehouse?.workspaceId || !selectedLakehouse?.id) {
      return;
    }

    try {
      addSystemMessage("Stopping session...");
      await cloudShellClient.cancelSession(
        selectedLakehouse.workspaceId,
        selectedLakehouse.id,
        sessionId
      );
      setSessionId(null);
      setSessionActive(false);
      addSystemMessage("Session stopped.");
    } catch (error: any) {
      console.error('Failed to stop session:', error);
      addSystemMessage(`Failed to stop session: ${error.message}`);
    }
  };

  // Execute a command in the Spark session
  const handleExecuteCommand = async (command: string): Promise<{ success: boolean; output: string }> => {
    if (!sessionId || !selectedLakehouse?.workspaceId || !selectedLakehouse?.id) {
      return { success: false, output: "No active session" };
    }

    try {
      const result = await cloudShellClient.executeShellCommand(
        selectedLakehouse.workspaceId,
        selectedLakehouse.id,
        sessionId,
        command
      );
      return { success: result.success, output: result.output };
    } catch (error: any) {
      return { success: false, output: `Execution error: ${error.message}` };
    }
  };

  const saveItem = async () => {
    if (!item) return;
    
    try {
      const itemToSave: ItemWithDefinition<GithubCopilotCLIItemDefinition> = {
        ...item,
        definition: {
          ...item.definition,
          selectedModel,
          commandHistory: commandHistory.slice(-50), // Keep last 50 commands
        }
      };

      await saveWorkloadItem(workloadClient, itemToSave);
      setItem(itemToSave);
      setIsUnsaved(false);
      
      callNotificationOpen(
        workloadClient,
        t("GithubCopilotCLIItem_SaveSuccess_Title", "Saved"),
        t("GithubCopilotCLIItem_SaveSuccess_Message", "Item saved successfully."),
        NotificationType.Success
      );
    } catch (error) {
      console.error('Failed to save item:', error);
      callNotificationOpen(
        workloadClient,
        t("GithubCopilotCLIItem_SaveError_Title", "Save Failed"),
        t("GithubCopilotCLIItem_SaveError_Message", "Could not save the item."),
        NotificationType.Error
      );
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

  const handleStartCopilot = () => {
    if (viewSetter) {
      viewSetter(EDITOR_VIEW_TYPES.DEFAULT);
    }
  };

  const handleModelChange = (model: CopilotModelId) => {
    setSelectedModel(model);
    setIsUnsaved(true);
    
    // Update item definition
    if (item) {
      setItem({
        ...item,
        definition: {
          ...item.definition,
          selectedModel: model
        }
      });
    }
  };

  const handleClearTerminal = () => {
    setTerminalEntries([]);
  };

  const EmptyViewWrapper = () => {
    const { setCurrentView } = useViewNavigation();
    return (
      <GithubCopilotCLIItemEmptyView
        onStartCopilot={() => {
          setCurrentView(EDITOR_VIEW_TYPES.DEFAULT);
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
        <GithubCopilotCLIItemDefaultView
          workloadClient={workloadClient}
          item={item}
          terminalEntries={terminalEntries}
          setTerminalEntries={setTerminalEntries}
          commandHistory={commandHistory}
          setCommandHistory={setCommandHistory}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          sessionId={sessionId}
          onExecuteCommand={handleExecuteCommand}
        />
      )
    }
  ];

  return (
    <ItemEditor
      isLoading={isLoading}
      loadingMessage={t("GithubCopilotCLIItem_Loading", "Loading GitHub Copilot CLI...")}
      ribbon={(viewContext) => (
        <GithubCopilotCLIItemRibbon
          {...props}
          viewContext={viewContext}
          isSaveButtonEnabled={isUnsaved}
          saveItemCallback={saveItem}
          openSettingsCallback={handleOpenSettings}
          onClearTerminal={handleClearTerminal}
          onSelectLakehouse={handleSelectLakehouse}
          onStartSession={handleStartSession}
          onStopSession={handleStopSession}
          sessionActive={sessionActive}
          isConnecting={isConnecting}
          selectedLakehouseName={selectedLakehouse?.displayName}
          onSelectEnvironment={handleSelectEnvironment}
          availableEnvironments={availableEnvironments}
          selectedEnvironmentId={selectedEnvironmentId}
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
