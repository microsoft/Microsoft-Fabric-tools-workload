import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ExcelTableEditorItemRibbon } from "./ExcelTableEditorItemRibbon";
import { callGetItem, getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import "./ExcelTableEditorItem.scss";
import { ExcelTableEditorItemDefinition, EDITOR_VIEW_TYPES, isWorkflowStateValid, createEmptyWorkflowState, ExcelTableEditorWorkflowState } from "./ExcelTableEditorItemModel";
import { ExcelTableEditorItemEmptyView } from "./ExcelTableEditorItemEmptyView";
import { ExcelTableEditorItemDefaultView } from "./ExcelTableEditorItemDefaultView";
import { ExcelTableEditorItemDetailView } from "./ExcelTableEditorItemDetailView";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { ItemEditor } from "../../components/ItemEditor";

/**
 * ExcelTableEditorItemEditor - Main editor component for Excel Table Editor item
 * 
 * Follows the new ItemEditor pattern with static views array and viewSetter
 */
export function ExcelTableEditorItemEditor(props: PageProps) {
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { workloadClient } = props;
  
  // State management following PackageInstallerItem pattern
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<ExcelTableEditorItemDefinition>>();
  const [isUnsaved, setIsUnsaved] = useState<boolean>(false);
  const [sparkSessionId, setSparkSessionId] = useState<string | null>(null);
  const [isSparkSessionStarting, setIsSparkSessionStarting] = useState(false);
  const [currentViewSetter, setCurrentViewSetter] = useState<((view: string) => void) | null>(null);
  const [addTableCallback, setAddTableCallback] = useState<(() => Promise<void>) | undefined>(undefined);



  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  // Effect to set the correct view after loading completes
  useEffect(() => {
    if (!isLoading && item && currentViewSetter) {
      const hasCanvasItems = isWorkflowStateValid(item.definition?.state);
      const correctInitialView = hasCanvasItems ? EDITOR_VIEW_TYPES.DEFAULT : EDITOR_VIEW_TYPES.EMPTY;
      currentViewSetter(correctInitialView);
    }
  }, [isLoading, currentViewSetter]);

  async function openSettings() {
    if (item) {
      const itemDetails = await callGetItem(workloadClient, item.id);
      await callOpenSettings(workloadClient, itemDetails.item, 'About');
    }
  }

  async function saveItemWithSuccessDialog(definition?: ExcelTableEditorItemDefinition) {
    try {
      const successResult = await SaveItem(definition);
      if (successResult) {
        callNotificationOpen(
          workloadClient,
          t("ItemEditor_Saved_Notification_Title"),
          t("ItemEditor_Saved_Notification_Text", { itemName: item.displayName }),
          undefined,
          undefined
        );
      }
    } catch (error) {
      console.error('ExcelTableEditorItemEditor: Error saving item:', error);
    }
  }

  async function SaveItem(definition?: ExcelTableEditorItemDefinition) {
    var successResult = await saveItemDefinition<ExcelTableEditorItemDefinition>(
      workloadClient,
      item.id,
      definition || item.definition);
    setIsUnsaved(!successResult); 
    return successResult;  
  }

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    var loadedItem: ItemWithDefinition<ExcelTableEditorItemDefinition> = undefined;    
    if (pageContext.itemObjectId) {
      try {
        loadedItem = await getWorkloadItem<ExcelTableEditorItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,          
        );
        
        // Ensure item definition is properly initialized
        if (!loadedItem.definition) {
          loadedItem = {
            ...loadedItem,
            definition: {
              state: createEmptyWorkflowState()
            }
          };
        }
        
        setItem(loadedItem);        
      } catch (error) {
        setItem(undefined);        
      } 
    }
    setIsUnsaved(false);
    setIsLoading(false);
  }

  // Callback for starting Spark session
  const handleStartSparkSession = useCallback(async () => {
    console.log('🚀 Starting Spark session...');
    setIsSparkSessionStarting(true);
    
    try {
      const workflowState = item?.definition?.state;
      const canvasItem = workflowState?.canvasItems?.find(
        (ci: any) => ci.source?.lakehouse?.id && ci.source?.lakehouse?.workspaceId
      );

      if (!canvasItem) {
        callNotificationOpen(
          workloadClient,
          "No Lakehouse Connected",
          "Please add a table from a lakehouse first before starting a Spark session.",
          undefined,
          undefined
        );
        return;
      }

      const workspaceId = canvasItem.source.lakehouse.workspaceId;
      const lakehouseId = canvasItem.source.lakehouse.id;

      const { SparkLivyClient } = await import('../../clients/SparkLivyClient');
      const { getOrCreateSparkSession } = await import('./utils/SparkQueryHelper');

      const sparkClient = new SparkLivyClient(workloadClient);
      const session = await getOrCreateSparkSession(sparkClient, workspaceId, lakehouseId);
      
      setSparkSessionId(session.id);
      console.log('✅ Spark session ready:', session.id);

      callNotificationOpen(
        workloadClient,
        "Spark Session Ready",
        `Session ${session.id.substring(0, 8)}... is ready to process queries.`,
        undefined,
        undefined
      );
    } catch (error: any) {
      console.error('❌ Error starting Spark session:', error);
      callNotificationOpen(
        workloadClient,
        "Spark Session Error",
        `Failed to start Spark session: ${error.message}`,
        undefined,
        undefined
      );
    } finally {
      setIsSparkSessionStarting(false);
    }
  }, [workloadClient, item]);

  // Static view definitions
  const views = [
    {
      name: EDITOR_VIEW_TYPES.EMPTY,
      component: (
        <ExcelTableEditorItemEmptyView
          workloadClient={workloadClient}
          item={item}
          onAddTableCallbackChange={setAddTableCallback}
          onItemUpdate={setItem}
        />
      )
    },
    {
      name: EDITOR_VIEW_TYPES.DEFAULT,
      component: (
        <ExcelTableEditorItemDefaultView
          workloadClient={workloadClient}
          item={item}
          onNavigateToDetailView={async (canvasItem) => {
            // Save currentEditingItem to state and navigate to detail view
            console.log('Navigate to detail view for:', canvasItem);
            
            const currentState = item?.definition?.state as ExcelTableEditorWorkflowState || {};
            const updatedState: ExcelTableEditorWorkflowState = {
              ...currentState,
              currentEditingItem: canvasItem as any
            };
            
            if (workloadClient && item) {
              await saveItemDefinition(workloadClient, item.id, { state: updatedState } as ExcelTableEditorItemDefinition);
              console.log('✅ currentEditingItem saved, navigating to detail view');
              
              // Navigate to detail view
              if (currentViewSetter) {
                currentViewSetter(EDITOR_VIEW_TYPES.DETAIL);
              }
            }
          }}
          onAddTableCallbackChange={setAddTableCallback}
          onItemUpdate={setItem}
          sparkSessionId={sparkSessionId}
          onSparkSessionCreated={setSparkSessionId}
          onSparkSessionStarting={setIsSparkSessionStarting}
        />
      )
    },
    {
      name: EDITOR_VIEW_TYPES.DETAIL,
      isDetailView: true,
      component: (
        <ExcelTableEditorItemDetailView
          workloadClient={workloadClient}
          item={item}
          sparkSessionId={sparkSessionId}
        />
      )
    }
  ];

  return (
    <ItemEditor
      isLoading={isLoading}
      loadingMessage={t("Loading Excel Table Editor item...", "Loading Excel Table Editor item...")}
      ribbon={(viewContext) => (
        <ExcelTableEditorItemRibbon
          {...props}      
          saveItemCallback={() => saveItemWithSuccessDialog()}
          openSettingsCallback={openSettings}
          addTableCallback={addTableCallback}
          startSparkSessionCallback={handleStartSparkSession}
          isSparkSessionStarting={isSparkSessionStarting}
          sparkSessionId={sparkSessionId}
          isSaveButtonEnabled={isUnsaved}
          viewContext={viewContext}
        />
      )}
      views={views}
      viewSetter={(setCurrentView) => {
        if (!currentViewSetter) {
          setCurrentViewSetter(() => setCurrentView);
        }
      }}
    />
  );
}
