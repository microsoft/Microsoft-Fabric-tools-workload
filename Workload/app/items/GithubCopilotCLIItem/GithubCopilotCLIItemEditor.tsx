import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, saveWorkloadItem, callGetItem } from "../../controller/ItemCRUDController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { NotificationType } from "@ms-fabric/workload-client";
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

  // Load data when context changes
  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

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
