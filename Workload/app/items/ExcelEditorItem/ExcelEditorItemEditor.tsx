import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageProps, ContextProps } from "../../App";
import { ExcelEditorItemRibbon } from "./ExcelEditorItemRibbon";
import { callGetItem, getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import "./ExcelEditorItem.scss";
import { ExcelEditorItemDefinition } from "./ExcelEditorItemDefinition";
import { isWorkflowStateValid, EditorRuntimeState } from "./ExcelEditorItemModel";
import { ExcelEditorItemEmptyView } from "./ExcelEditorItemEmptyView";
import { ExcelEditorItemDefaultView } from "./ExcelEditorItemDefaultView";
import { ExcelEditorItemDetailView } from "./ExcelEditorItemDetailView";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callOpenSettings } from "../../controller/SettingsController";
import { ItemEditor } from "../../components/ItemEditor";

/**
 * Different views that are available for the Excel Editor item
 */
export const EDITOR_VIEW_TYPES = {
  EMPTY: 'empty',
  DEFAULT: 'default',
  DETAIL: 'detail'
} as const;

/**
 * ExcelEditorItemEditor - Main editor component for Excel Editor item
 * 
 * Follows the new ItemEditor pattern with static views array and viewSetter
 */
export function ExcelEditorItemEditor(props: PageProps) {
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { workloadClient } = props;
  
  // State management following PackageInstallerItem pattern
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<ExcelEditorItemDefinition>>();
  const [isUnsaved, setIsUnsaved] = useState<boolean>(false);
  const [sparkSessionId, setSparkSessionId] = useState<string | null>(null);
  const [isSparkSessionStarting, setIsSparkSessionStarting] = useState(false);
  const [currentViewSetter, setCurrentViewSetter] = useState<((view: string) => void) | null>(null);
  const [runtimeState, setRuntimeState] = useState<EditorRuntimeState>({});

  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  // Effect to set the correct view after loading completes
  useEffect(() => {
    if (!isLoading && item && currentViewSetter) {
      const hasCanvasItems = isWorkflowStateValid(item.definition);
      const correctInitialView = hasCanvasItems ? EDITOR_VIEW_TYPES.DEFAULT : EDITOR_VIEW_TYPES.EMPTY;
      console.log('🔄 Editor: Setting initial view to:', correctInitialView, 'hasCanvasItems:', hasCanvasItems);
      currentViewSetter(correctInitialView);
    }
  }, [isLoading, item, currentViewSetter]);

  async function openSettings() {
    if (item) {
      const itemDetails = await callGetItem(workloadClient, item.id);
      await callOpenSettings(workloadClient, itemDetails.item, 'About');
    }
  }

  async function saveItemWithSuccessDialog(definition?: ExcelEditorItemDefinition) {
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
      console.error('ExcelEditorItemEditor: Error saving item:', error);
    }
  }

  async function SaveItem(definition?: ExcelEditorItemDefinition) {
    var successResult = await saveItemDefinition<ExcelEditorItemDefinition>(
      workloadClient,
      item.id,
      definition || item.definition);
    setIsUnsaved(!successResult); 
    return successResult;  
  }

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    var loadedItem: ItemWithDefinition<ExcelEditorItemDefinition> = undefined;    
    if (pageContext.itemObjectId) {
      try {
        loadedItem = await getWorkloadItem<ExcelEditorItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,          
        );
        
        // Ensure item definition is properly initialized
        if (!loadedItem.definition) {
          loadedItem = {
            ...loadedItem,
            definition: {
              canvasItems: []
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
      const canvasItems = item?.definition?.canvasItems;
      const canvasItem = canvasItems?.find(
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

  // Callback for adding tables - shared by EmptyView and Ribbon
  const handleAddTable = useCallback(async () => {
    console.log('🎯 Add Table clicked from Editor!');
    
    try {
      console.log('🔍 Opening OneLake catalog for table selection...');
      const { callDatahubWizardOpen } = await import('../../controller/DataHubController');
      
      const result = await callDatahubWizardOpen(
        workloadClient,
        ["Lakehouse"],
        "Select Table",
        "Select a table from your lakehouse to edit with Excel Online",
        false, // Single selection
        true,  // Show files folder (enables table browsing)
        true   // Workspace navigation enabled
      );
      
      console.log('📊 OneLake catalog result:', result);
      
      if (result && result.selectedPath && result.selectedPath.includes('/')) {
        console.log('✅ Table selected:', result.selectedPath);
        
        // Parse the path to get table name
        const pathParts = result.selectedPath.split('/');
        const tableName = pathParts[pathParts.length - 1];
        
        // Fetch lakehouse name from Fabric API
        let lakehouseName = 'Unknown Lakehouse';
        try {
          const { ItemClient } = await import('../../clients/ItemClient');
          const itemClient = new ItemClient(workloadClient);
          const lakehouseItem = await itemClient.getItem(result.workspaceId, result.id);
          lakehouseName = lakehouseItem.displayName || 'Unknown Lakehouse';
        } catch (error) {
          console.warn('⚠️ Could not fetch lakehouse name:', error);
        }
        
        // Create canvas item
        const canvasItem = {
          id: `${result.id}-${tableName}`,
          type: 'lakehouse-table' as const,
          name: tableName,
          displayName: tableName,
          source: {
            lakehouse: { 
              id: result.id,
              name: lakehouseName,
              workspaceId: result.workspaceId
            },
            table: { name: tableName, displayName: tableName, schema: [] as Array<{ name: string; dataType: string }>, rowCount: 0 }
          },
          lastEdited: new Date().toISOString()
        };
        
        // Update state with new canvas item
        const currentItems = item?.definition?.canvasItems || [];
        const updatedItems = [...currentItems, canvasItem];
        const updatedDefinition: ExcelEditorItemDefinition = {
          ...item?.definition,
          canvasItems: updatedItems
        };
        
        // Save to backend
        await saveItemDefinition(workloadClient, item!.id, updatedDefinition);
        
        // Update parent item state
        if (item) {
          const updatedItem: ItemWithDefinition<ExcelEditorItemDefinition> = {
            ...item,
            definition: updatedDefinition
          };
          setItem(updatedItem);
        }
        
        console.log('✅ Table added successfully');
      } else {
        console.log('❌ No table selected');
      }
    } catch (error) {
      console.error('❌ Error adding table:', error);
    }
  }, [workloadClient, item]);

  // Callback for refreshing Excel view
  const handleRefreshExcel = useCallback(async () => {
    console.log('🔄 Refreshing Excel view...');
    // The refresh logic will be implemented in DetailView
    // This callback is just a placeholder for future implementation
  }, []);

  // Callback for saving to lakehouse
  const handleSaveToLakehouse = useCallback(async () => {
    console.log('💾 Saving to lakehouse...');
    // The save logic will be implemented in DetailView
    // This callback is just a placeholder for future implementation
  }, []);

  // Static view definitions
  const views = [
    {
      name: EDITOR_VIEW_TYPES.EMPTY,
      component: (
        <ExcelEditorItemEmptyView
          workloadClient={workloadClient}
          item={item}
          onAddTable={handleAddTable}
          onItemUpdate={setItem}
        />
      )
    },
    {
      name: EDITOR_VIEW_TYPES.DEFAULT,
      component: (
        <ExcelEditorItemDefaultView
          workloadClient={workloadClient}
          item={item}
          onNavigateToDetailView={async (canvasItem) => {
            console.log('🧭 Navigating to detail view for:', canvasItem);
            
            // Store current editing item in runtime state (not persisted)
            setRuntimeState({
              ...runtimeState,
              currentEditingItem: canvasItem
            });
            
            // Navigate to detail view
            if (currentViewSetter) {
              currentViewSetter(EDITOR_VIEW_TYPES.DETAIL);
            }
          }}
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
        <ExcelEditorItemDetailView
          workloadClient={workloadClient}
          item={item}
          currentEditingItem={runtimeState.currentEditingItem}
          sparkSessionId={sparkSessionId}
          onRefreshExcel={handleRefreshExcel}
          onSaveToLakehouse={handleSaveToLakehouse}
        />
      )
    }
  ];

  return (
    <ItemEditor
      isLoading={isLoading}
      loadingMessage={t("Loading Excel Editor item...", "Loading Excel item...")}
      ribbon={(viewContext) => (
        <ExcelEditorItemRibbon
          {...props}      
          saveItemCallback={() => saveItemWithSuccessDialog()}
          openSettingsCallback={openSettings}
          addTableCallback={handleAddTable}
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
