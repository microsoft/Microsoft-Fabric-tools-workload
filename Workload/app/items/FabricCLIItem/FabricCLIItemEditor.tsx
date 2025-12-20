import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, saveItemDefinition, callGetItem } from "../../controller/ItemCRUDController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callDatahubOpen } from "../../controller/DataHubController";
import { NotificationType } from "@ms-fabric/workload-client";
import { ItemEditor, useViewNavigation } from "../../components/ItemEditor";
import { ItemClient } from "../../clients/ItemClient";
import { ExecutionMode } from "./SparkLivyFabricCLIClient";

import { FabricCLIItemDefinition } from "./FabricCLIItemModel";
import { FabricCLIItemEmptyView } from "./FabricCLIItemEmptyView";
import { FabricCLIItemRibbon } from "./FabricCLIItemRibbon";
import { FabricCLIItemDefaultView } from "./FabricCLIItemDefaultView";
import { Item } from "../../clients/FabricPlatformTypes";

import "./FabricCLIItem.scss";

export const EDITOR_VIEW_TYPES = {
  EMPTY: 'empty',
  DEFAULT: 'default'
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
  const [clearTrigger, setClearTrigger] = useState(0);
  const [availableEnvironments, setAvailableEnvironments] = useState<Item[]>([]);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(ExecutionMode.FAB_CLI);
  const [systemMessage, setSystemMessage] = useState<{ message: string; timestamp: number }>();

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

  // Set the correct view after loading completes
  useEffect(() => {
    if (!isLoading && item && viewSetter) {
      const correctView = item.definition?.selectedLakehouse ? EDITOR_VIEW_TYPES.DEFAULT : EDITOR_VIEW_TYPES.EMPTY;
      viewSetter(correctView);
    }
  }, [isLoading, item, viewSetter]);

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

  const saveItem = async () => {
    if (!item) return;

    try {
      await saveItemDefinition(workloadClient, item.id, item.definition);
      setIsUnsaved(false);
      callNotificationOpen(
        workloadClient,
        t("FabricCLIItem_SaveSuccess_Title", "Saved"),
        t("FabricCLIItem_SaveSuccess_Message", "Item saved successfully."),
        NotificationType.Success
      );
    } catch (error) {
      console.error('Failed to save item:', error);
      callNotificationOpen(
        workloadClient,
        t("FabricCLIItem_SaveError_Title", "Save Failed"),
        t("FabricCLIItem_SaveError_Message", "Could not save the item."),
        NotificationType.Error
      );
    }
  };

  const handleStartSession = () => {
    setSessionActive(true);
    if (viewSetter) {
      viewSetter(EDITOR_VIEW_TYPES.DEFAULT);
    }
  };

  const handleStopSession = async () => {
    setSessionActive(false);
    
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
      setIsUnsaved(true);
      
      // Auto-save the cleared session ID
      try {
        await saveItemDefinition(workloadClient, item.id, updatedItem.definition);
        setIsUnsaved(false);
      } catch (error) {
        console.error('Failed to clear session ID:', error);
      }
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
    setClearTrigger(prev => prev + 1);
  };

  const handleSessionCreated = async (sessionId: string) => {
    if (!item) return;
    
    const updatedItem = {
      ...item,
      definition: {
        ...item.definition,
        lastSparkSessionId: sessionId
      }
    };
    setItem(updatedItem);
    setIsUnsaved(true);
    
    // Auto-save the session ID
    try {
      await saveItemDefinition(workloadClient, item.id, updatedItem.definition);
      setIsUnsaved(false);
    } catch (error) {
      console.error('Failed to save session ID:', error);
    }
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
    setIsUnsaved(true);
    
    // Auto-save the environment selection
    try {
      await saveItemDefinition(workloadClient, item.id, updatedItem.definition);
      setIsUnsaved(false);
      
      // Add system message to terminal
      setSystemMessage({
        message: t("FabricCLIItem_EnvironmentSelected_Message", "Selected environment: {{environmentName}}", { environmentName: selectedEnv.displayName }),
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Failed to save environment selection:', error);
      setSystemMessage({
        message: t("FabricCLIItem_SelectEnvironment_Error", "Could not save environment selection."),
        timestamp: Date.now()
      });
    }
  };

  const handleSelectExecutionMode = (mode: ExecutionMode) => {
    setExecutionMode(mode);
  };

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
          clearTrigger={clearTrigger}
          onSessionCreated={handleSessionCreated}
          showSystemMessage={systemMessage}
          executionMode={executionMode}
        />
      )
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
