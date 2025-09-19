import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Text } from "@fluentui/react-components";
import { PageProps, ContextProps} from  "../../App";
import { ItemWithDefinition, getWorkloadItem, callGetItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { ExcelEditorItemDefinition, ContentReference } from "./ExcelEditorItemModel";
import { ExcelEditorItemEmpty } from "./ExcelEditorItemEditorEmpty";
import { ExcelEditorItemRibbon } from "./ExcelEditorItemEditorRibbon";
import { ExcelEditorItemExcelView } from "./ExcelEditorItemExcelView";
import { OneLakeExcelStrategyFactory } from "./OneLakeExcelStrategyFactory";
import { wopiExcelService } from "./services/WOPIExcelService";
import { OneLakeItemExplorerComponent } from "../../samples/views/SampleOneLakeItemExplorer/SampleOneLakeItemExplorer";
import "../../styles.scss";
import { callDatahubOpen } from "../../controller/DataHubController";

const VIEW_TYPES = {
  EMPTY: 'empty',
  EDITOR: 'editor'
} as const;

type CurrentView = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];

export function ExcelEditorItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<ExcelEditorItemDefinition>>();
  const [currentView, setCurrentView] = useState<CurrentView>(VIEW_TYPES.EMPTY);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [selectedContent, setSelectedContent] = useState<ContentReference | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(Date.now());
  // Excel state - WOPI integration
  const [excelData, setExcelData] = useState<any[][]>([]);
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const [excelOnlineUrl, setExcelOnlineUrl] = useState<string>('');
  const isLoadingExcelRef = useRef(false);
  const previousSelectedContentRef = useRef<ContentReference | null>(null);

  const { pathname } = useLocation();

  // Helper function to update item definition immutably
  const updateItemDefinition = useCallback((updates: Partial<ExcelEditorItemDefinition>) => {
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
    setHasUnsavedChanges(true);
  }, []);

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    var loadedItem: ItemWithDefinition<ExcelEditorItemDefinition> = undefined;
    if (pageContext.itemObjectId) {
      try {
        loadedItem = await getWorkloadItem<ExcelEditorItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        setItem(loadedItem);
        setCurrentView(loadedItem?.definition?.selectedLakehouse ? VIEW_TYPES.EDITOR : VIEW_TYPES.EMPTY);
        
        // Set selected content if one is saved
        setSelectedContent(loadedItem.definition.selectedContent || null);
      } catch (error) {
        console.error('Error loading item:', error);
        // Create a minimal item structure for new items or when loading fails
        loadedItem = {
          id: '',
          workspaceId: '',
          type: 'ExcelEditorItem',
          displayName: 'New Excel Editor Item',
          definition: {
            selectedLakehouse: undefined,
            selectedContent: undefined
          }
        };
        setItem(loadedItem);
        setCurrentView(VIEW_TYPES.EMPTY);
      }
    } else {
      console.log(`Creating new item context. Current Path: ${pathname}`);
      // Create a new empty item definition for new items
      loadedItem = {
        id: '',
        workspaceId: '',
        type: 'ExcelEditorItem',
        displayName: 'New Excel Editor Item',
        definition: {
          selectedLakehouse: undefined,
          selectedContent: undefined
        }
      };
      setItem(loadedItem);
      setCurrentView(VIEW_TYPES.EMPTY);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [item?.definition, item?.id]);

  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  // Load Excel data using WOPI integration
  const loadExcelData = useCallback(async (content: ContentReference): Promise<void> => {
    console.log('🚀 loadExcelData called with content:', content?.displayName);
    
    // Prevent multiple simultaneous loading attempts using ref
    if (isLoadingExcelRef.current) {
      console.log('🚫 Already loading Excel, skipping duplicate request');
      return;
    }
    
    isLoadingExcelRef.current = true;
    setIsLoadingExcel(true);
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Excel loading timed out after 30 seconds');
      isLoadingExcelRef.current = false;
      setIsLoadingExcel(false);
      setExcelData([]);
    }, 30000); // 30 seconds timeout
    
    try {
      console.log('🚀 Loading Excel data for content:', content.displayName);

      // Get the appropriate Excel strategy
      const strategy = OneLakeExcelStrategyFactory.getStrategy(content);
      console.log('🏭 Using strategy:', strategy.constructor.name);
      
      // Load the data using the strategy (modified to return ExcelData directly)
      const excelData = await strategy.loadData(workloadClient, content);
      
      if (excelData.success && excelData.data.length > 0) {
        console.log('✅ Data loaded successfully:', excelData.data.length, 'rows');
        setExcelData(excelData.data);
        
        // Initialize WOPI Excel service and generate Excel Online URL
        try {
          const initialized = await wopiExcelService.initialize();
          if (initialized) {
            // Generate Excel Online URL from content reference
            const excelUrl = await wopiExcelService.createExcelFromContentReference(content);
            
            if (excelUrl) {
              setExcelOnlineUrl(excelUrl);
              console.log('✅ WOPI Excel Online URL generated');
            } else {
              console.log('📋 No valid Excel file URL available, using table view only');
              setExcelOnlineUrl('');
            }
          } else {
            console.warn('⚠️ WOPI service failed to initialize');
            setExcelOnlineUrl('');
          }
        } catch (wopiError) {
          console.warn('⚠️ WOPI Excel failed, displaying data in table mode:', wopiError);
          setExcelOnlineUrl('');
        }
      } else {
        console.error('❌ Failed to load data:', excelData.error);
        setExcelData([]);
        setExcelOnlineUrl('');
      }
    } catch (error) {
      console.error('❌ Error loading Excel data:', error);
      setExcelData([]);
      setExcelOnlineUrl('');
    } finally {
      // Clear the timeout and reset loading state
      clearTimeout(timeoutId);
      console.log('🔄 Setting isLoadingExcel to false');
      isLoadingExcelRef.current = false;
      setIsLoadingExcel(false);
    }
  }, [workloadClient]); // Removed isLoadingExcel dependency to prevent infinite loop

  // Auto-load Excel data when selectedContent changes
  useEffect(() => {
    console.log('🔄 selectedContent useEffect triggered:', {
      selectedContent: selectedContent?.displayName,
      currentView,
      viewIsEditor: currentView === VIEW_TYPES.EDITOR,
      isCurrentlyLoading: isLoadingExcelRef.current,
      previousContent: previousSelectedContentRef.current?.displayName
    });
    
    // Check if content actually changed (not just a re-render with same content)
    const contentChanged = selectedContent?.displayName !== previousSelectedContentRef.current?.displayName ||
                          selectedContent?.path !== previousSelectedContentRef.current?.path;
    
    // Only load if we have content, we're in editor view, we're not already loading, and content actually changed
    if (selectedContent && currentView === VIEW_TYPES.EDITOR && !isLoadingExcelRef.current && contentChanged) {
      console.log('🔄 Selected content changed, loading Excel data:', selectedContent.displayName);
      previousSelectedContentRef.current = selectedContent;
      loadExcelData(selectedContent);
    } else if (selectedContent) {
      // Update the ref even if we don't load (to track current content)
      previousSelectedContentRef.current = selectedContent;
    }
  }, [selectedContent, currentView, loadExcelData]);

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

  const handleRefresh = () => {
    // Update refresh trigger to force OneLake explorer refresh
    setRefreshTrigger(Date.now());
    callNotificationOpen(
      workloadClient,
      "Refreshed",
      "Content list refreshed successfully.",
      undefined,
      undefined
    );
  };


  const onFileSelected = useCallback(async (fileName: string, oneLakeLink: string): Promise<void> => {
    console.log('File selected:', fileName, oneLakeLink);
    
    if (!item?.definition?.selectedLakehouse) {
      console.warn('No lakehouse selected, cannot set file content');
      return;
    }
    
    setSelectedContent({
      ...item.definition.selectedLakehouse,
      displayName: fileName,
      contentType: "file",
      path: oneLakeLink,
      itemType: "Lakehouse"
    });
  }, [item?.definition?.selectedLakehouse]);

 const onTableSelected = useCallback(async (tableName: string, oneLakeLink: string): Promise<void> => {
    console.log('Table selected:', tableName, oneLakeLink);
    
    if (!item?.definition?.selectedLakehouse) {
      console.warn('No lakehouse selected, cannot set table content');
      return;
    }
    
    setSelectedContent({
      ...item.definition.selectedLakehouse,
      displayName: tableName,
      contentType: "table",
      path: oneLakeLink,
      itemType: "Lakehouse"
    });
  }, [item?.definition?.selectedLakehouse]);

  const handleOpenItem = async () => {
    // Open DataHub wizard to select Lakehouse tables
    try {
      const result = await callDatahubOpen(
        workloadClient,
        ["Lakehouse"],
        "Select a Lakehouse to explore",
        false
      );
      
      if (result) {
        console.log('Selected item from DataHub:', result);
        updateItemDefinition({
          selectedLakehouse: result
        });
        setCurrentView(VIEW_TYPES.EDITOR);
      }
    } catch (error) {
      console.error('Failed to open DataHub:', error);
      callNotificationOpen(
        workloadClient,
        "Error",
        "Failed to open item selector.",
        undefined,
        undefined
      );
    }
  };

  const handleSaveItem = async () => {
    if (!item) return;

    const definition: ExcelEditorItemDefinition = {
      ...item.definition,
      selectedContent: selectedContent || undefined,
    };

    const successResult = await saveItemDefinition<ExcelEditorItemDefinition>(
      workloadClient,
      item.id,
      definition
    );
    
    const wasSaved = Boolean(successResult);
    setHasUnsavedChanges(!wasSaved);
    
    if (wasSaved) {
      callNotificationOpen(
        workloadClient,
        "Item Saved",
        `${item.displayName} has been saved successfully.`,
        undefined,
        undefined
      );
    }
  };

  const handleLakehouseSelected = (lakehouse: any) => {
    console.log('Lakehouse selected:', lakehouse);
    // Update the item definition with the selected lakehouse
    updateItemDefinition({
      selectedLakehouse: lakehouse
    });
    // Transition to editor view
    setCurrentView(VIEW_TYPES.EDITOR);
  };

  const handleItemChanged = useCallback(async (item: any) => {
    console.log('Item changed:', item);
    // Update the selected lakehouse when the user changes the item in the explorer
    if (item && item.id && item.workspaceId) {
      updateItemDefinition({
        selectedLakehouse: item,
        selectedContent: undefined // Clear selected content when changing lakehouse
      });
      setSelectedContent(null); // Clear selected content in state as well
    }
  }, [updateItemDefinition]);

  // Memoize the OneLake explorer config to prevent unnecessary re-renders
  const oneLakeExplorerConfig = useMemo(() => ({
    allowItemSelection: true,
    refreshTrigger: refreshTrigger,
    initialItem: item?.definition?.selectedLakehouse ? {
      id: item.definition.selectedLakehouse.id,
      workspaceId: item.definition.selectedLakehouse.workspaceId,
      displayName: (item.definition.selectedLakehouse as any).displayName || (item.definition.selectedLakehouse as any).type || 'Selected Lakehouse'
    } : undefined
  }), [refreshTrigger, item?.definition?.selectedLakehouse?.id, item?.definition?.selectedLakehouse?.workspaceId, (item?.definition?.selectedLakehouse as any)?.displayName, (item?.definition?.selectedLakehouse as any)?.type]);

  if (isLoading) {
    return <ItemEditorLoadingProgressBar message="Loading Excel OneLake content Editor..." />;
  }

  if (!item) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <Text>Unable to load item. Please try again.</Text>
      </div>
    );
  }

  if (currentView === VIEW_TYPES.EMPTY) {
    return (
      <div style={{ height: "100%" }}>
        <ExcelEditorItemRibbon
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={handleSaveItem}
          onRefresh={handleRefresh}
          openItem={handleOpenItem}
          onSettings={handleOpenSettings}
          isLoading={isLoading}
        />
        <ExcelEditorItemEmpty
          workloadClient={workloadClient}
          onLakehouseSelected={handleLakehouseSelected}
        />
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ExcelEditorItemRibbon
        hasUnsavedChanges={hasUnsavedChanges}
        onSave={handleSaveItem}
        onRefresh={handleRefresh}
        openItem={handleOpenItem}
        onSettings={handleOpenSettings}
        isLoading={isLoading}
        isLoadingExcel={isLoadingExcel}
      />
      
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Left Panel - OneLake Item Explorer */}
        <OneLakeItemExplorerComponent
          workloadClient={workloadClient}
          onFileSelected={onFileSelected}
          onTableSelected={onTableSelected}
          onItemChanged={handleItemChanged}
          config={oneLakeExplorerConfig}
        />

        {/* Right Panel - Excel Editor */}
        {selectedContent ? (
          <ExcelEditorItemExcelView
            selectedContent={selectedContent}
            excelData={excelData}
            excelOnlineUrl={excelOnlineUrl}
            isLoadingExcel={isLoadingExcel}
            onRetryLoading={() => {
              console.log('🔄 Retry loading triggered for content:', selectedContent?.displayName);
              loadExcelData(selectedContent);
            }}
          />
        ) : (
          <div style={{ 
            flex: 1, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            flexDirection: "column",
            padding: "40px"
          }}>
            <Text style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>
              Select a content to Edit
            </Text>
            <Text style={{ fontSize: "14px", color: "#605e5c" }}>
              Choose a content from the left panel to start editing in Excel Online
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}