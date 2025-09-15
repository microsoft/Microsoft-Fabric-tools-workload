import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Text } from "@fluentui/react-components";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, callGetItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { ExcelTableEditorItemDefinition, OneLakeTable, FabricTableItem, ExcelApiRequestBody, TableSchema } from "./ExcelTableEditorItemModel";
import { ExcelTableEditorItemEmpty } from "./ExcelTableEditorItemEditorEmpty";
import { ExcelTableEditorItemRibbon } from "./ExcelTableEditorItemEditorRibbon";
import { ExcelTableEditorItemTreeNavigation, TreeItem } from "./ExcelTableEditorItemTreeNavigation";
import { ExcelTableEditorItemExcelView } from "./ExcelTableEditorItemExcelView";
import "../../styles.scss";

const VIEW_TYPES = {
  EMPTY: 'empty',
  EDITOR: 'editor'
} as const;

type CurrentView = typeof VIEW_TYPES[keyof typeof VIEW_TYPES];

export function ExcelTableEditorItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<ExcelTableEditorItemDefinition>>();
  const [currentView, setCurrentView] = useState<CurrentView>(VIEW_TYPES.EMPTY);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [selectedTable, setSelectedTable] = useState<OneLakeTable | null>(null);
  const [treeData, setTreeData] = useState<TreeItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Excel Online state
  const [excelOnlineUrl, setExcelOnlineUrl] = useState<string>('');
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);

  const { pathname } = useLocation();

  // Build tree structure from fabric items with tables
  const buildTreeFromFabricItems = useCallback((fabricItems: FabricTableItem[]): TreeItem[] => {
    return fabricItems.map(fabricItem => ({
      id: `item-${fabricItem.id}`,
      name: fabricItem.displayName || `Item ${fabricItem.id}`,
      type: 'item',
      fabricItem: fabricItem,
      children: fabricItem.tables?.map(table => ({
        id: `table-${fabricItem.id}-${table.name}`,
        name: table.name,
        type: 'table',
        table: table,
        isExpanded: false
      })) || [],
      isExpanded: false
    }));
  }, []);

  // Helper function to update item definition immutably
  const updateItemDefinition = useCallback((updates: Partial<ExcelTableEditorItemDefinition>) => {
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
    var LoadedItem: ItemWithDefinition<ExcelTableEditorItemDefinition> = undefined;
    if (pageContext.itemObjectId) {
      try {
        LoadedItem = await getWorkloadItem<ExcelTableEditorItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        // Ensure item definition is properly initialized without mutation
        if (!LoadedItem.definition) {
          LoadedItem = {
            ...LoadedItem,
            definition: {
              tableList: [], // Start with empty table list - will be populated when real Fabric items are loaded
            }
          };
        } else {
          // Keep existing definition with empty table list fallback
          LoadedItem = {
            ...LoadedItem,
            definition: {
              ...LoadedItem.definition,
              tableList: LoadedItem.definition.tableList || [], // Use existing or empty list
            }
          };
        }

        setItem(LoadedItem);
        setCurrentView(LoadedItem?.definition?.tableList?.length > 0 ? VIEW_TYPES.EDITOR : VIEW_TYPES.EMPTY);
        
        // Build tree structure with empty data initially
        const tree = buildTreeFromFabricItems([]);
        setTreeData(tree);

        // Set selected table if one is saved
        const currentTables = LoadedItem?.definition?.tableList || [];
        if (LoadedItem.definition.selectedTable) {
          console.log('🎯 Restoring selected table from saved state:', LoadedItem.definition.selectedTable.name);
          setSelectedTable(LoadedItem.definition.selectedTable);
        } else if (currentTables.length > 0) {
          console.log('🎯 No saved selection, selecting first table:', currentTables[0].name);
          setSelectedTable(currentTables[0]); // Select first table by default
        }

      } catch (error) {
        setItem(undefined);
      }
    } else {
      console.log(`non-editor context. Current Path: ${pathname}`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    setHasUnsavedChanges(false);
  }, [currentView, item?.id]);

  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  // Auto-load Excel Online when selectedTable changes
  useEffect(() => {
    console.log('🔄 selectedTable useEffect triggered:', {
      selectedTable: selectedTable?.name,
      currentView,
      viewIsEditor: currentView === VIEW_TYPES.EDITOR
    });
    
    if (selectedTable && currentView === VIEW_TYPES.EDITOR) {
      console.log('🔄 Selected table changed, loading Excel Online:', selectedTable.name);
      loadExcelOnline(selectedTable);
    }
  }, [selectedTable, currentView]);

  const handleTablesSelected = (selectedItem: any, selectedTables: OneLakeTable[]) => {
    console.log('📊 Tables selected from DataHub:', { selectedItem, selectedTables });
    console.log('📊 SelectedItem properties:', Object.keys(selectedItem));
    console.log('📊 SelectedItem displayName:', selectedItem.displayName);
    console.log('📊 SelectedItem name:', selectedItem.name);
    
    // Create a FabricTableItem from the selected item and tables
    const fabricItem: FabricTableItem = {
      ...selectedItem,
      id: selectedItem.id,
      displayName: selectedItem.displayName,
      type: selectedItem.type, 
      workspaceId: selectedItem.workspaceId,
      description: selectedItem.description,
      tables: selectedTables
    };

    // Update the item definition with the selected tables
    updateItemDefinition({ 
      isInitialized: true,
      tableList: selectedTables,
      selectedTable: selectedTables.length > 0 ? selectedTables[0] : undefined
    });

    // Build tree structure with the selected fabric item
    const tree = buildTreeFromFabricItems([fabricItem]);
    setTreeData(tree);

    // Auto-expand the selected item and select the first table
    const newExpanded = new Set<string>();
    if (tree.length > 0) {
      newExpanded.add(tree[0].id);
      // Select the first table if available
      if (selectedTables.length > 0) {
        setSelectedTable(selectedTables[0]);
      }
    }
    setExpandedItems(newExpanded);

    // Transition to the editor view
    setCurrentView(VIEW_TYPES.EDITOR);
  };

  const toggleTreeItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleTreeItemClick = (item: TreeItem) => {
    if (item.type === 'table' && item.table) {
      handleTableSelect(item.table);
    } else {
      toggleTreeItem(item.id);
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

  const handleSaveItem = async () => {
    if (!item) return;

    const definition: ExcelTableEditorItemDefinition = {
      ...item.definition,
      selectedTable: selectedTable || undefined,
      isInitialized: currentView === VIEW_TYPES.EDITOR,
    };

    const successResult = await saveItemDefinition<ExcelTableEditorItemDefinition>(
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

  const handleTableSelect = (table: OneLakeTable) => {
    setSelectedTable(table);
    updateItemDefinition({
      selectedTable: table
    });
    
    // Load Excel Online when table is selected
    loadExcelOnline(table);
  };

  // Build request body for Excel API - extracted for easy modification
  const buildExcelApiRequestBody = (table: OneLakeTable): ExcelApiRequestBody => {
    return {
      tableName: table.name,
      tableData: [], // TODO: Replace with actual table data from Fabric API
      schema: [
        { name: 'Column1', dataType: 'string' },
        { name: 'Column2', dataType: 'number' },
        { name: 'Column3', dataType: 'date' }
      ] as TableSchema[],
      metadata: {
        lakehouseId: table.item.id,
        tableName: table.name,
        workspaceId: table.item.workspaceId
      }
    };
  };

  // Excel Online functions
  const loadExcelOnline = async (table: OneLakeTable) => {
    console.log('🚀 loadExcelOnline called with table:', table?.name);
    console.log('🚀 Current state - isLoadingExcel:', isLoadingExcel, 'excelOnlineUrl:', excelOnlineUrl);
    
    setIsLoadingExcel(true);
    try {
      console.log('🚀 Loading Excel Online for table:', table.name);
      
      // Use WOPI service to generate Excel Online URL
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:60006' : window.location.origin;
      console.log('🚀 Using baseUrl:', baseUrl);
      
      // Create file from lakehouse table data using the real Excel API
      const response = await fetch(`${baseUrl}/api/excel/create-real`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildExcelApiRequestBody(table))
      });
      
      console.log('🚀 Real Excel API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Real Excel API response:', result);
        
        if (result.success && result.embedUrl) {
          // Use the real Excel Online embed URL
          console.log('✅ Setting real Excel embedUrl:', result.embedUrl);
          setExcelOnlineUrl(result.embedUrl);
        } else {
          // API returned success=false, use demo Excel fallback
          console.warn('⚠️ Real Excel API returned success=false:', result.error);
          const fallbackFileId = `table_${table.name}_${Date.now()}`;
          const fallbackUrl = `${baseUrl}/demo-excel?fileId=${fallbackFileId}&token=demo`;
          console.log('🔄 Using demo Excel fallback URL:', fallbackUrl);
          setExcelOnlineUrl(fallbackUrl);
        }
      } else {
        console.error('❌ Failed to call real Excel API:', response.statusText);
        // Fallback to demo Excel
        const fallbackFileId = `table_${table.name}_${Date.now()}`;
        const fallbackUrl = `${baseUrl}/demo-excel?fileId=${fallbackFileId}&token=demo`;
        console.log('🔄 Using demo Excel fallback URL:', fallbackUrl);
        setExcelOnlineUrl(fallbackUrl);
      }
    } catch (error) {
      console.error('❌ Error loading Excel Online:', error);
      // Fallback to demo Excel
      const baseUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:60006' : window.location.origin;
      const fallbackFileId = `table_${table.name}_${Date.now()}`;
      const fallbackUrl = `${baseUrl}/demo-excel?fileId=${fallbackFileId}&token=demo`;
      console.log('🔄 Error fallback URL:', fallbackUrl);
      setExcelOnlineUrl(fallbackUrl);
    } finally {
      console.log('🔄 Setting isLoadingExcel to false');
      setIsLoadingExcel(false);
    }
  };

  const handleRefresh = () => {
    // TODO: In a real implementation, this would refresh the table list from OneLake using Fabric APIs
    callNotificationOpen(
      workloadClient,
      "Refreshed",
      "Table list refreshed successfully.",
      undefined,
      undefined
    );
  };

  const handleOpenTable = () => {
    // TODO: In a real implementation, this would open a dialog to browse OneLake tables using Fabric APIs
    callNotificationOpen(
      workloadClient,
      "Open Table",
      "Table browser would open here to select tables from Lakehouses, Warehouses, and Datasets.",
      undefined,
      undefined
    );
  };

  const handleSaveToLakehouse = () => {
    if (!selectedTable) return;
    console.log('💾 Saving changes to lakehouse for table:', selectedTable.name);
    // In a real implementation, this would save changes back to the lakehouse
  };

  const handleRefreshData = () => {
    if (!selectedTable) return;
    console.log('🔄 Refreshing data from lakehouse for table:', selectedTable.name);
    loadExcelOnline(selectedTable);
  };

  if (isLoading) {
    return <ItemEditorLoadingProgressBar message="Loading Excel OneLake Table Editor..." />;
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
        <ExcelTableEditorItemRibbon
          hasUnsavedChanges={hasUnsavedChanges}
          selectedTable={selectedTable}
          onSave={handleSaveItem}
          onRefresh={handleRefresh}
          onOpenTable={handleOpenTable}
          onSettings={handleOpenSettings}
          isLoading={isLoading}
        />
        <ExcelTableEditorItemEmpty 
          workloadClient={workloadClient}
          onTablesSelected={handleTablesSelected}
        />
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ExcelTableEditorItemRibbon
        hasUnsavedChanges={hasUnsavedChanges}
        selectedTable={selectedTable}
        onSave={handleSaveItem}
        onRefresh={handleRefresh}
        onOpenTable={handleOpenTable}
        onSettings={handleOpenSettings}
        onSaveToLakehouse={handleSaveToLakehouse}
        onRefreshData={handleRefreshData}
        isLoading={isLoading}
        isLoadingExcel={isLoadingExcel}
      />
      
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Left Panel - Tree Navigation */}
        <ExcelTableEditorItemTreeNavigation
          treeData={treeData}
          expandedItems={expandedItems}
          selectedTable={selectedTable}
          onTreeItemClick={handleTreeItemClick}
        />

        {/* Right Panel - Excel Editor */}
        {selectedTable ? (
          <ExcelTableEditorItemExcelView
            selectedTable={selectedTable}
            excelOnlineUrl={excelOnlineUrl}
            isLoadingExcel={isLoadingExcel}
            onRetryLoading={() => {
              console.log('🔄 Retry loading triggered for table:', selectedTable?.name);
              loadExcelOnline(selectedTable);
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
              Select a Table to Edit
            </Text>
            <Text style={{ fontSize: "14px", color: "#605e5c" }}>
              Choose a table from the left panel to start editing in Excel Online
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}