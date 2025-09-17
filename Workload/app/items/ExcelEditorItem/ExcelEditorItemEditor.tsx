import React, { useEffect, useState, useCallback } from "react";
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
  // Excel Online state
  const [excelOnlineUrl, setExcelOnlineUrl] = useState<string>('');
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);

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

  // Fix the loadExcelOnline dependencies to prevent infinite loop
  const loadExcelOnline = useCallback(async (content: ContentReference): Promise<void> => {
    console.log('🚀 loadExcelOnline called with content:', content?.displayName);
    
    // Prevent multiple simultaneous loading attempts
    if (isLoadingExcel) {
      console.log('🚫 Already loading Excel, skipping duplicate request');
      return;
    }
    
    setIsLoadingExcel(true);
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('⏰ Excel loading timed out after 30 seconds');
      setIsLoadingExcel(false);
      setExcelOnlineUrl('');
    }, 30000); // 30 seconds timeout
    
    try {
      console.log('🚀 Loading Excel Online for content:', content.displayName);

      // Get the appropriate Excel strategy
      const strategy = OneLakeExcelStrategyFactory.getStrategy(content);
      console.log('🏭 Using strategy:', strategy.constructor.name);
      
      // Load the data using the strategy
      const requestBody = await strategy.buildExcelApiRequestBody(workloadClient, content);
      
      // Use WOPI service to generate Excel Online URL
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:60006' : window.location.origin;
      console.log('🚀 Using baseUrl:', baseUrl);
      
      // Try real Excel API first, fallback to demo if not available
      let response;
      
      try {
        console.log('🎯 Attempting real Excel API...');
        response = await fetch(`${baseUrl}/api/excel/create-real`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          throw new Error(`Real Excel API failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Real Excel API indicated failure');
        }
        
        console.log('✅ Real Excel API succeeded:', result);
        setExcelOnlineUrl(result.embedUrl);
        
      } catch (realExcelError) {
        console.warn('⚠️ Real Excel API failed, falling back to demo:', realExcelError.message);
        
        // Fallback to demo Excel API
        try {
          response = await fetch(`${baseUrl}/wopi/createFromLakehouse`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tableName: requestBody.tableName,
              data: requestBody.tableData,
              metadata: requestBody.metadata
            })
          });
          
          console.log('🚀 Demo Excel API response status:', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Demo Excel API response:', result);
            
            if (result.fileId && result.excelOnlineUrl) {
              console.log('✅ Setting demo Excel embedUrl:', result.excelOnlineUrl);
              setExcelOnlineUrl(result.excelOnlineUrl);
            } else {
              console.error('❌ Demo Excel API missing required fields:', result);
              setExcelOnlineUrl('');
            }
          } else {
            console.error('❌ Failed to call demo Excel API:', response.statusText);
            setExcelOnlineUrl('');
          }
        } catch (demoError) {
          console.error('❌ Both real and demo Excel APIs failed:', demoError);
          setExcelOnlineUrl('');
        }
      }
    } catch (error) {
      console.error('❌ Error loading Excel Online:', error);
      // Clear any previous URL on error
      setExcelOnlineUrl('');
    } finally {
      // Clear the timeout and reset loading state
      clearTimeout(timeoutId);
      console.log('🔄 Setting isLoadingExcel to false');
      setIsLoadingExcel(false);
    }
  }, [workloadClient, isLoadingExcel]); // Include isLoadingExcel to track loading state

  // Auto-load Excel Online when selectedContent changes
  useEffect(() => {
    console.log('🔄 selectedContent useEffect triggered:', {
      selectedContent: selectedContent?.displayName,
      currentView,
      viewIsEditor: currentView === VIEW_TYPES.EDITOR
    });
    
    if (selectedContent && currentView === VIEW_TYPES.EDITOR) {
      console.log('🔄 Selected content changed, loading Excel Online:', selectedContent.displayName);
      loadExcelOnline(selectedContent);
    }
  }, [selectedContent, currentView, loadExcelOnline]);

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
    // TODO: Implement refresh functionality
    callNotificationOpen(
      workloadClient,
      "Refreshed",
      "Content list refreshed successfully.",
      undefined,
      undefined
    );
  };


  const onFileSelected = async (fileName: string, oneLakeLink: string): Promise<void> => {
    console.log('File selected:', fileName, oneLakeLink);
    setSelectedContent({
      id: item.definition.selectedLakehouse.id,
      workspaceId: item.definition.selectedLakehouse.workspaceId,
      displayName: fileName,
      contentType: "file",
      path: oneLakeLink,
      itemType: "Lakehouse"
    });
    // TODO: Implement file selection logic
  }

 const onTableSelected = async (tableName: string, oneLakeLink: string): Promise<void> => {
    console.log('Table selected:', tableName, oneLakeLink);
    setSelectedContent({
      id: item.definition.selectedLakehouse.id,
      workspaceId: item.definition.selectedLakehouse.workspaceId,
      displayName: tableName,
      contentType: "table",
      path: oneLakeLink,
      itemType: "Lakehouse"
    });
    // TODO: Implement table selection logic
  }

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
          onItemChanged={async (item: any) => {
            console.log('Item changed:', item);
            // Update the selected lakehouse when the user changes the item in the explorer
            if (item && item.id && item.workspaceId) {
              updateItemDefinition({
                selectedLakehouse: item,
                selectedContent: undefined // Clear selected content when changing lakehouse
              });
              setSelectedContent(null); // Clear selected content in state as well
            }
          }}
          config={{
            allowItemSelection: true,
            refreshTrigger: Date.now(),
            initialItem: item?.definition?.selectedLakehouse ? {
              id: item.definition.selectedLakehouse.id,
              workspaceId: item.definition.selectedLakehouse.workspaceId,
              displayName: (item.definition.selectedLakehouse as any).displayName || (item.definition.selectedLakehouse as any).type || 'Selected Lakehouse'
            } : undefined
          }}
        />

        {/* Right Panel - Excel Editor */}
        {selectedContent ? (
          <ExcelEditorItemExcelView
            selectedContent={selectedContent}
            excelOnlineUrl={excelOnlineUrl}
            isLoadingExcel={isLoadingExcel}
            onRetryLoading={() => {
              console.log('🔄 Retry loading triggered for content:', selectedContent?.displayName);
              loadExcelOnline(selectedContent);
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