import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Stack } from "@fluentui/react";
import { Text } from "@fluentui/react-components";

import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callGetItem } from "../../controller/ItemCRUDController";
import { callDatahubOpen } from "../../controller/DataHubController";
import { NotificationType } from "@ms-fabric/workload-client";

import { SparkTerminalItemDefinition, DEFAULT_SPARK_TERMINAL_CONFIG } from "./SparkTerminalItemModel";
import { SparkTerminalItemEditorEmpty } from "./SparkTerminalItemEditorEmpty";
import { SparkTerminalItemEditorRibbon } from "./SparkTerminalItemEditorRibbon";
import { SampleSparkTerminal } from "../../samples/views/SampleSparkTerminal/SampleSparkTerminal";
import { Item } from "../../clients/FabricPlatformTypes";

import "../../styles.scss";

/**
 * Main editor component for SparkTerminal item
 * Manages the terminal state and integrates with the SampleSparkTerminal component
 */
export function SparkTerminalItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [item, setItem] = useState<ItemWithDefinition<SparkTerminalItemDefinition>>();
  const [currentView, setCurrentView] = useState<'empty' | 'terminal'>('empty');
  const [selectedLakehouse, setSelectedLakehouse] = useState<Item | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  // Get storage key for this specific item
  const getStorageKey = (itemId: string) => `spark-terminal-editor-state-${itemId}`;

  // Load item data from URL context
  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    let loadedItem: ItemWithDefinition<SparkTerminalItemDefinition> = undefined;
    
    if (pageContext.itemObjectId) {
      try {
        loadedItem = await getWorkloadItem<SparkTerminalItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        // Initialize default definition if not present
        if (!loadedItem.definition) {
          loadedItem = {
            ...loadedItem,
            definition: { ...DEFAULT_SPARK_TERMINAL_CONFIG }
          };
          setIsUnsaved(true);
        }

        setItem(loadedItem);
      } catch (error) {
        console.error('Failed to load SparkTerminal item:', error);
        callNotificationOpen(
          workloadClient,
          t("SparkTerminalItem_LoadError_Title", "Failed to Load Item"),
          t("SparkTerminalItem_LoadError_Message", "Could not load the Spark Terminal item."),
          NotificationType.Error
        );
        setItem(undefined);
      }
    } else {
      console.log(`Non-editor context. Current Path: ${pathname}`);
    }
    
    setIsLoading(false);
  }

  // Initialize view state from session storage
  useEffect(() => {
    if (pageContext?.itemObjectId) {
      const stored = sessionStorage.getItem(getStorageKey(pageContext.itemObjectId));
      if (stored === 'terminal' || stored === 'empty') {
        setCurrentView(stored);
      } else {
        setCurrentView('empty'); // default for new items
      }
    } else {
      setCurrentView('empty');
    }
  }, [pageContext?.itemObjectId]);

  // Load data when context changes
  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  // Helper function to update item definition
  const updateItemDefinition = useCallback((updates: Partial<SparkTerminalItemDefinition>) => {
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

  // Save item definition to Fabric
  const saveItem = useCallback(async () => {
    if (!item || !isUnsaved) return;

    try {
      await saveItemDefinition(workloadClient, item.id, item.definition);
      setIsUnsaved(false);
      
      callNotificationOpen(
        workloadClient,
        t("SparkTerminalItem_SaveSuccess_Title", "Saved"),
        t("SparkTerminalItem_SaveSuccess_Message", "Spark Terminal configuration saved successfully."),
        NotificationType.Success
      );
    } catch (error) {
      console.error('Failed to save SparkTerminal item:', error);
      callNotificationOpen(
        workloadClient,
        t("SparkTerminalItem_SaveError_Title", "Save Failed"),
        t("SparkTerminalItem_SaveError_Message", "Could not save the Spark Terminal configuration."),
        NotificationType.Error
      );
    }
  }, [item, isUnsaved, workloadClient, t]);

  // Auto-save when unsaved changes exist
  useEffect(() => {
    if (isUnsaved) {
      const saveTimer = setTimeout(saveItem, 2000); // Auto-save after 2 seconds
      return () => clearTimeout(saveTimer);
    }
    // Return undefined for the case when isUnsaved is false
    return undefined;
  }, [isUnsaved, saveItem]);

  // Save current view state to sessionStorage
  const saveViewState = (view: 'empty' | 'terminal') => {
    if (pageContext?.itemObjectId) {
      sessionStorage.setItem(getStorageKey(pageContext.itemObjectId), view);
    }
  };

  // Navigation functions
  const navigateToTerminal = () => {
    setCurrentView('terminal');
    saveViewState('terminal');
  };

  // Terminal action handlers
  const handleStartTerminal = () => {
    navigateToTerminal();
  };

  const handleStopSession = () => {
    setSessionActive(false);
    // Terminal component will handle actual session cleanup
  };

  const handleSelectLakehouse = async () => {
    try {
      const result = await callDatahubOpen(
        workloadClient, 
        ['Lakehouse'],
        "Select Lakehouse for Spark Terminal",
        false
      );
      if (result) {
        setSelectedLakehouse(result);
        
        // Update item definition with selected lakehouse
        updateItemDefinition({
          selectedLakehouse: {
            workspaceId: result.workspaceId,
            id: result.id
          }
        });

        callNotificationOpen(
          workloadClient,
          t("SparkTerminalItem_LakehouseSelected_Title", "Lakehouse Selected"),
          t("SparkTerminalItem_LakehouseSelected_Message", `Connected to lakehouse: ${result.displayName}`),
          NotificationType.Success
        );
      }
    } catch (error) {
      console.error('Failed to select lakehouse:', error);
      callNotificationOpen(
        workloadClient,
        t("SparkTerminalItem_LakehouseError_Title", "Selection Failed"),
        t("SparkTerminalItem_LakehouseError_Message", "Could not select lakehouse."),
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

  const handleShowHistory = () => {
    // Implementation for showing command history
    callNotificationOpen(
      workloadClient,
      t("SparkTerminalItem_History_Title", "Command History"),
      t("SparkTerminalItem_History_Message", "Command history feature coming soon."),
      NotificationType.Info
    );
  };

  const handleClearTerminal = () => {
    // Terminal component will handle clearing
    // This is passed as a callback to the terminal component
  };

  // Show loading state
  if (isLoading) {
    return (
      <ItemEditorLoadingProgressBar
        message={t("SparkTerminalItem_Loading", "Loading Spark Terminal...")}
      />
    );
  }

  // Render appropriate view
  return (
    <>
      {currentView === 'empty' ? (
        <SparkTerminalItemEditorEmpty
          workloadClient={workloadClient}
          item={item}
          onStartTerminal={handleStartTerminal}
        />
      ) : (
        <Stack className="editor" data-testid="spark-terminal-editor-active">
          {/* Ribbon for active terminal */}
          <SparkTerminalItemEditorRibbon
            workloadClient={workloadClient}
            item={item}
            openSettingsCallback={handleOpenSettings}
            onSaveAsClicked={saveItem}
            isSaveButtonEnabled={isUnsaved}
            onStartTerminal={handleStartTerminal}
            onStopSession={handleStopSession}
            onSelectLakehouse={handleSelectLakehouse}
            onShowHistory={handleShowHistory}
            onClearTerminal={handleClearTerminal}
            isEmptyState={false}
            sessionActive={sessionActive}
          />

          {/* Terminal Interface */}
          <Stack className="terminal-content" style={{ flex: 1, padding: '16px' }}>
            <SampleSparkTerminal
              workloadClient={workloadClient}
              workspaceId={item?.definition?.selectedLakehouse?.workspaceId || selectedLakehouse?.workspaceId}
              lakehouseId={item?.definition?.selectedLakehouse?.id || selectedLakehouse?.id}
            />
          </Stack>

          {/* Status indicator */}
          {isUnsaved && (
            <Stack horizontal style={{ padding: '8px 16px', backgroundColor: 'var(--colorWarningBackground1)' }}>
              <Text size={200}>
                {t("SparkTerminalItem_UnsavedChanges", "Configuration changes will be saved automatically...")}
              </Text>
            </Stack>
          )}
        </Stack>
      )}
    </>
  );
}
