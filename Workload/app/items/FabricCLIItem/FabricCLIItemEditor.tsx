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

import { FabricCLIItemDefinition, DEFAULT_FABRIC_CLI_CONFIG } from "./FabricCLIItemModel";
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
            definition: { ...DEFAULT_FABRIC_CLI_CONFIG }
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

  const handleStopSession = () => {
    setSessionActive(false);
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
          t("FabricCLIItem_LakehouseSelected_Title", "Lakehouse Selected"),
          t("FabricCLIItem_LakehouseSelected_Message", { lakehouseName: result.displayName, defaultValue: `Selected: ${result.displayName}` }),
          NotificationType.Success
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to select lakehouse:', error);
      callNotificationOpen(
        workloadClient,
        t("FabricCLIItem_LakehouseError_Title", "Selection Failed"),
        t("FabricCLIItem_LakehouseError_Message", "Could not select lakehouse."),
        NotificationType.Error
      );
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

  const handleShowHistory = () => {
    callNotificationOpen(
      workloadClient,
      t("FabricCLIItem_History_Title", "Command History"),
      t("FabricCLIItem_History_Message", "Command history feature coming soon."),
      NotificationType.Info
    );
  };

  const handleClearTerminal = () => {
    setClearTrigger(prev => prev + 1);
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
          onShowHistory={handleShowHistory}
          onClearTerminal={handleClearTerminal}
          sessionActive={sessionActive}
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
