import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, saveItemDefinition, callGetItem } from "../../controller/ItemCRUDController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callDatahubOpen } from "../../controller/DataHubController";
import { NotificationType } from "@ms-fabric/workload-client";
import { ItemEditor } from "../../components/ItemEditor";

import { SparkTerminalItemDefinition, DEFAULT_SPARK_TERMINAL_CONFIG } from "./SparkTerminalItemModel";
import { SparkTerminalItemEmptyView } from "./SparkTerminalItemEmptyView";
import { SparkTerminalItemRibbon } from "./SparkTerminalItemRibbon";
import { SparkTerminalItemDefaultView } from "./SparkTerminalItemDefaultView";
import { Item } from "../../clients/FabricPlatformTypes";

import "../../styles.scss";

export const EDITOR_VIEW_TYPES = {
  EMPTY: 'empty',
  DEFAULT: 'default'
} as const;

export function SparkTerminalItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [isUnsaved, setIsUnsaved] = useState(false);
  const [item, setItem] = useState<ItemWithDefinition<SparkTerminalItemDefinition>>();
  const [selectedLakehouse, setSelectedLakehouse] = useState<Item | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [currentViewSetter, setCurrentViewSetter] = useState<((view: string) => void) | null>(null);

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
    if (!isLoading && item && currentViewSetter) {
      const stored = sessionStorage.getItem(getStorageKey(item.id));
      if (stored === EDITOR_VIEW_TYPES.DEFAULT || stored === EDITOR_VIEW_TYPES.EMPTY) {
        currentViewSetter(stored);
      } else {
        currentViewSetter(EDITOR_VIEW_TYPES.EMPTY);
      }
    }
  }, [isLoading, item, currentViewSetter]);

  // Load data when context changes
  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  const saveItem = async () => {
    if (!item) return;

    try {
      await saveItemDefinition(workloadClient, item.id, item.definition);
      setIsUnsaved(false);
      callNotificationOpen(
        workloadClient,
        t("SparkTerminalItem_SaveSuccess_Title", "Saved"),
        t("SparkTerminalItem_SaveSuccess_Message", "Item saved successfully."),
        NotificationType.Success
      );
    } catch (error) {
      console.error('Failed to save item:', error);
      callNotificationOpen(
        workloadClient,
        t("SparkTerminalItem_SaveError_Title", "Save Failed"),
        t("SparkTerminalItem_SaveError_Message", "Could not save the item."),
        NotificationType.Error
      );
    }
  };

  const handleStartTerminal = () => {
    setSessionActive(true);
    if (currentViewSetter) {
      currentViewSetter(EDITOR_VIEW_TYPES.DEFAULT);
      if (item) {
        sessionStorage.setItem(getStorageKey(item.id), EDITOR_VIEW_TYPES.DEFAULT);
      }
    }
  };

  const handleStopSession = () => {
    setSessionActive(false);
    if (currentViewSetter) {
      currentViewSetter(EDITOR_VIEW_TYPES.EMPTY);
      if (item) {
        sessionStorage.setItem(getStorageKey(item.id), EDITOR_VIEW_TYPES.EMPTY);
      }
    }
  };

  const handleSelectLakehouse = async () => {
    try {
      const result = await callDatahubOpen(
        workloadClient,
        ['Lakehouse'],
        t("SparkTerminalItem_SelectLakehouse_Title", "Select a Lakehouse"),
        false
      );

      if (result) {
        setSelectedLakehouse(result);
        
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
              }
            }
          };
          setItem(updatedItem);
          setIsUnsaved(true);
        }

        callNotificationOpen(
          workloadClient,
          t("SparkTerminalItem_LakehouseSelected_Title", "Lakehouse Selected"),
          t("SparkTerminalItem_LakehouseSelected_Message", `Selected: ${result.displayName}`),
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
    callNotificationOpen(
      workloadClient,
      t("SparkTerminalItem_History_Title", "Command History"),
      t("SparkTerminalItem_History_Message", "Command history feature coming soon."),
      NotificationType.Info
    );
  };

  const handleClearTerminal = () => {
    // Terminal component will handle clearing
  };

  const views = [
    {
      id: EDITOR_VIEW_TYPES.EMPTY,
      component: (
        <SparkTerminalItemEmptyView
          workloadClient={workloadClient}
          item={item}
          onStartTerminal={handleStartTerminal}
        />
      )
    },
    {
      id: EDITOR_VIEW_TYPES.DEFAULT,
      component: (
        <SparkTerminalItemDefaultView
          workloadClient={workloadClient}
          item={item}
          selectedLakehouse={selectedLakehouse}
          isUnsaved={isUnsaved}
        />
      )
    }
  ];

  return (
    <ItemEditor
      item={item}
      isLoading={isLoading}
      views={views}
      ribbon={
        <SparkTerminalItemRibbon
          workloadClient={workloadClient}
          item={item}
          viewContext={{
            currentView: EDITOR_VIEW_TYPES.DEFAULT, // Ribbon is always visible, context managed by ItemEditor
            setView: (view) => { if (currentViewSetter) currentViewSetter(view); }
          }}
          openSettingsCallback={handleOpenSettings}
          saveItemCallback={saveItem}
          isSaveButtonEnabled={isUnsaved}
          onStartTerminal={handleStartTerminal}
          onStopSession={handleStopSession}
          onSelectLakehouse={handleSelectLakehouse}
          onShowHistory={handleShowHistory}
          onClearTerminal={handleClearTerminal}
          sessionActive={sessionActive}
        />
      }
      onViewChange={(view) => {
        if (item) {
          sessionStorage.setItem(getStorageKey(item.id), view);
        }
      }}
      setViewSetter={setCurrentViewSetter}
    />
  );
}
