import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Text,
  Spinner,
  Tooltip,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from "@fluentui/react-components";
import {
  TableSimple20Regular,
  Delete20Regular,
  TableAdd20Regular,
  WindowNew24Regular,
  ChevronDown20Regular,
} from "@fluentui/react-icons";
import { WorkloadClientAPI, NotificationType, NotificationToastDuration } from "@ms-fabric/workload-client";
import { ItemWithDefinition, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callDatahubWizardOpen } from "../../controller/DataHubController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { ExcelTableEditorItemDefinition, ExcelTableEditorWorkflowState } from "./ExcelTableEditorItemModel";
import "./ExcelTableEditorItem.scss";

interface CanvasItem {
  id: string;
  type: 'lakehouse-table' | 'uploaded-file' | 'external-source';
  name: string;
  displayName: string;
  source: {
    lakehouse?: { id: string; name: string; workspaceId: string; };
    table?: { name: string; displayName: string; schema: Array<{ name: string; dataType: string }>; rowCount: number; };
    file?: { name: string; size: number; lastModified: string; };
  };
  lastEdited?: string;
  hasUnsavedChanges?: boolean;
  isCreatingExcel?: boolean;
}

interface ExcelTableEditorItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelTableEditorItemDefinition>;
  onNavigateToDetailView?: (canvasItem: CanvasItem) => void;
  onAddTableCallbackChange?: (callback: (() => Promise<void>) | undefined) => void;
  onItemUpdate?: (updatedItem: ItemWithDefinition<ExcelTableEditorItemDefinition>) => void;
  sparkSessionId?: string | null;
  onSparkSessionCreated?: (sessionId: string) => void;
  onSparkSessionStarting?: (isStarting: boolean) => void;
}

export function ExcelTableEditorItemDefaultView({
  workloadClient,
  item,
  onNavigateToDetailView,
  onAddTableCallbackChange,
  onItemUpdate,
  sparkSessionId,
  onSparkSessionCreated,
  onSparkSessionStarting
}: ExcelTableEditorItemDefaultViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize canvas items from item state
  const initializeCanvasItems = () => {
    if (item?.definition?.state) {
      const state = item.definition.state as ExcelTableEditorWorkflowState;
      return state.canvasItems || [];
    }
    return [];
  };

  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(initializeCanvasItems);
  
  // Update canvas items when item state changes
  useEffect(() => {
    if (item?.definition?.state) {
      const state = item.definition.state as ExcelTableEditorWorkflowState;
      if (state.canvasItems) {
        setCanvasItems(state.canvasItems);
      }
    }
  }, [item?.definition?.state]);
  useEffect(() => {
    console.log('📥 Syncing canvas items from parent');
    setCanvasItems(canvasItems);
  }, [canvasItems.length]); // Only sync when array length changes to avoid infinite loops
  
  // Use useCallback to memoize the handleAddTable function
  const handleAddTable = useCallback(async () => {
    console.log('🎯 Add Table button clicked!');
    setIsLoading(true);
    try {
      console.log('🔍 Opening OneLake catalog experience for table selection...');
      
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
      console.log('📊 Full result object:', JSON.stringify(result, null, 2));
      console.log('📊 Selected path:', result?.selectedPath);
      console.log('📊 Workspace ID:', result?.workspaceId);
      console.log('📊 Lakehouse ID:', result?.id);
      console.log('📊 Display Name:', result?.displayName);
      
      if (result && result.selectedPath) {
        console.log('✅ Selected path from OneLake:', result.selectedPath);
        
        // Extract critical IDs for Lakehouse data fetching
        const workspaceId = result.workspaceId; // Workspace containing the Lakehouse
        const lakehouseId = result.id; // Lakehouse item ID
        
        // Fetch lakehouse name using the Fabric Platform API since displayName is empty
        let lakehouseName = 'Unknown Lakehouse';
        try {
          console.log('🔍 Fetching lakehouse details from Fabric API - Workspace:', workspaceId, 'Item:', lakehouseId);
          const { ItemClient } = await import('../../clients/ItemClient');
          const itemClient = new ItemClient(workloadClient);
          const lakehouseItem = await itemClient.getItem(workspaceId, lakehouseId);
          lakehouseName = lakehouseItem.displayName || 'Unknown Lakehouse';
          console.log('✅ Fetched lakehouse name from Fabric API:', lakehouseName);
        } catch (error) {
          console.warn('⚠️ Could not fetch lakehouse name from Fabric API, using default:', error);
        }
        
        console.log('🔑 Captured data for Spark fetching:');
        console.log('   Workspace ID:', workspaceId);
        console.log('   Lakehouse ID:', lakehouseId);
        console.log('   Lakehouse Name:', lakehouseName);
        
        try {
          const pathSegments = result.selectedPath.split('/');
          console.log('🧩 Path segments:', pathSegments);
          
          // Handle different path formats:
          // Format 1: "Tables/table_name" (2 segments)
          // Format 2: "workspace/lakehouse/Tables/table_name" (4+ segments)
          
          const isTablePath = pathSegments.includes('Tables');
          
          if (isTablePath) {
            const tablesIndex = pathSegments.findIndex(segment => segment === 'Tables');
            const tableIndex = tablesIndex + 1;
            
            if (tableIndex < pathSegments.length) {
              // Extract table name
              const table = pathSegments[tableIndex];
              
              console.log('📊 Extracted table:', table);
              console.log('🏠 Using lakehouse name:', lakehouseName);
            
              const newCanvasItem: CanvasItem = {
                id: `${lakehouseId}-${table}`, // Use lakehouse ID for uniqueness
                type: 'lakehouse-table',
                name: table,
                displayName: table,
                source: {
                  lakehouse: { 
                    id: lakehouseId,           // ✅ REAL Lakehouse ID
                    name: lakehouseName,       // ✅ From result.displayName
                    workspaceId: workspaceId   // ✅ REAL Workspace ID
                  },
                  table: { name: table, displayName: table, schema: [], rowCount: 0 }
                },
                lastEdited: new Date().toISOString()
              };
              
              // 🔧 REFACTORED: Use functional setState to add new item
              setCanvasItems(currentItems => {
                const updated = [...currentItems, newCanvasItem];
                
                // Update parent and persist
                setCanvasItems(updated);
                
                const currentState = item?.definition?.state as ExcelTableEditorWorkflowState || {};
                const updatedState: ExcelTableEditorWorkflowState = {
                  ...currentState,
                  canvasItems: updated
                };
                
                if (workloadClient && item) {
                  saveItemDefinition(workloadClient, item.id, { state: updatedState } as ExcelTableEditorItemDefinition)
                    .then(() => {
                      console.log('✅ Table added to canvas and saved to item definition!');
                      
                      // Update parent's item state
                      if (onItemUpdate) {
                        const updatedItem: ItemWithDefinition<ExcelTableEditorItemDefinition> = {
                          ...item,
                          definition: {
                            ...item.definition,
                            state: updatedState
                          }
                        };
                        onItemUpdate(updatedItem);
                        console.log('✅ Parent item state updated with new canvas items');
                      }
                    })
                    .catch(saveError => {
                      console.error('❌ Error saving canvas state:', saveError);
                      console.error('❌ Save error details:', {
                        message: saveError.message,
                        stack: saveError.stack,
                        name: saveError.name
                      });
                    });
                }
                
                return updated;
              });
            } else {
              console.error('❌ No table name found after Tables segment');
            }
          } else {
            console.error('❌ Selected path does not contain Tables segment:', result.selectedPath);
          }
        } catch (error) {
          console.error('❌ Error processing table selection:', error);
        }
      } else {
        console.log('🔴 No table selected from OneLake');
      }
    } catch (error) {
      console.error('❌ Error opening OneLake dialog:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workloadClient, canvasItems, setCanvasItems, item, onItemUpdate]);

  // 🔧 REFACTORED: Handle Excel creation with proper state management
  const handleCreateExcel = React.useCallback(async (canvasItem: CanvasItem) => {
    console.log('📝 Creating Excel for canvas item:', canvasItem);
    
    // Check if any Excel creation is already in progress
    const anyCreating = canvasItems.some(ci => ci.isCreatingExcel);
    if (anyCreating) {
      const { callDialogOpenMsgBox } = await import('../../controller/DialogController');
      await callDialogOpenMsgBox(
        workloadClient,
        'Excel Creation in Progress',
        'An Excel file is currently being created. Please wait until the current creation is finished before creating another.',
        ['Ok']
      );
      return;
    }
    
    // 🔧 REFACTORED: Use functional setState to avoid stale closure
    setCanvasItems(currentItems => {
      const updated = currentItems.map(ci => 
        ci.id === canvasItem.id ? { ...ci, isCreatingExcel: true } : ci
      );
      
      // Also update parent and persist immediately
      setCanvasItems(updated);
      
      const workflowState = item?.definition?.state as ExcelTableEditorWorkflowState;
      const tempState: ExcelTableEditorWorkflowState = {
        ...workflowState,
        canvasItems: updated
      };
      
      console.log('💾 Saving item definition with isCreatingExcel=true for:', canvasItem.id);
      saveItemDefinition(workloadClient, item?.id || '', { state: tempState } as ExcelTableEditorItemDefinition)
        .then(() => console.log('✅ Item definition saved with isCreatingExcel=true'));
      
      return updated;
    });
    
    try {
      // Import required services
      const { fetchLakehouseTableData } = await import('./utils/ExcelClientSide');
      const { OneDriveService } = await import('./services/OneDriveService');
      const ExcelJS = await import('exceljs');
      
      if (!canvasItem.source?.lakehouse?.id) {
        throw new Error('No lakehouse metadata found');
      }
      
      // Step 1: Fetch data from Spark (auto-creates session if needed)
      console.log('📊 Fetching data from Spark...');
      
      // If no existing Spark session, notify parent that we're starting one
      if (!sparkSessionId && onSparkSessionStarting) {
        console.log('🚀 Will auto-create Spark session - updating button state to "Connecting"');
        onSparkSessionStarting(true);
      } else {
        console.log(`♻️ Using existing Spark session: ${sparkSessionId}`);
      }
      
      const { data, schema, sessionId } = await fetchLakehouseTableData(
        workloadClient,
        canvasItem.source.lakehouse.workspaceId,
        canvasItem.source.lakehouse.id,
        canvasItem.name,
        sparkSessionId
      );
      
      console.log(`✅ Data fetched using Spark session: ${sessionId}`);
      
      // Update parent with the session ID (if newly created)
      if (sessionId && sessionId !== sparkSessionId && onSparkSessionCreated) {
        console.log('✅ Spark session created - updating parent state');
        onSparkSessionCreated(sessionId);
      }
      
      // Stop the "starting" state
      if (onSparkSessionStarting) {
        onSparkSessionStarting(false);
      }
      
      // Step 2: Create Excel blob
      console.log('📝 Creating Excel workbook...');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(canvasItem.displayName);
      
      // Add headers
      const headers = schema.map(col => col.name);
      worksheet.addRow(headers);
      
      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '0078D4' }
      };
      
      // Add data rows
      data.forEach(row => worksheet.addRow(row));
      
      // Auto-size columns
      worksheet.columns.forEach((column: any) => {
        column.width = 15;
      });
      
      // Generate blob
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      // Step 3: Upload to OneDrive
      console.log('☁️ Uploading to OneDrive...');
      const oneDriveService = new OneDriveService(workloadClient);
      const fileName = `${canvasItem.displayName}_${Date.now()}.xlsx`;
      const uploadResult = await oneDriveService.uploadExcelFile(blob, fileName);
      
      console.log('✅ Upload successful:', uploadResult);
      
      // 🔧 REFACTORED: Update canvas items with functional setState (no stale closures!)
      setCanvasItems(currentItems => {
        const updated = currentItems.map(ci => 
          ci.id === canvasItem.id
            ? {
                ...ci,
                excelWebUrl: uploadResult.webUrl,
                excelDownloadUrl: uploadResult.downloadUrl, // 🔧 ADD: Store download URL for direct file access
                excelEmbedUrl: uploadResult.embedUrl || uploadResult.webUrl,
                excelFileId: uploadResult.fileId,
                isCreatingExcel: false
              }
            : ci
        );
        
        console.log('💾 Updated canvas items after Excel creation:', updated.map(ci => ({ 
          id: ci.id, 
          name: ci.name, 
          hasExcel: !!(ci as any).excelWebUrl 
        })));
        
        // Update parent and persist
        setCanvasItems(updated);
        
        const workflowState = item?.definition?.state as ExcelTableEditorWorkflowState;
        const updatedState: ExcelTableEditorWorkflowState = {
          ...workflowState,
          workflowStep: 'canvas-overview',
          canvasItems: updated
        };
        
        saveItemDefinition(workloadClient, item?.id || '', { state: updatedState } as ExcelTableEditorItemDefinition)
          .then(() => console.log('✅ Excel URLs saved to canvas item'));
        
        return updated;
      });
      
      // Show success notification
      await callNotificationOpen(
        workloadClient,
        'Excel file created!',
        `${fileName} created and linked successfully. Click "Open" to view or "Open in Excel Online" for full editing.`,
        NotificationType.Success,
        NotificationToastDuration.Long
      );
      
    } catch (error) {
      console.error('❌ Failed to create Excel:', error);
      
      // 🔧 REFACTORED: Clear creating flag with functional setState
      setCanvasItems(currentItems => {
        const updated = currentItems.map(ci => 
          ci.id === canvasItem.id ? { ...ci, isCreatingExcel: false } : ci
        );
        
        // Update parent and persist
        setCanvasItems(updated);
        
        const workflowState = item?.definition?.state as ExcelTableEditorWorkflowState;
        const errorState: ExcelTableEditorWorkflowState = {
          ...workflowState,
          canvasItems: updated
        };
        
        saveItemDefinition(workloadClient, item?.id || '', { state: errorState } as ExcelTableEditorItemDefinition)
          .then(() => console.log('🧹 Error handler: cleared isCreatingExcel flag for:', canvasItem.id))
          .catch(saveError => console.error('❌ Failed to save state in error handler:', saveError));
        
        return updated;
      });
      
      await callNotificationOpen(
        workloadClient,
        'Excel creation failed',
        error instanceof Error ? error.message : 'Unknown error',
        NotificationType.Error,
        NotificationToastDuration.Long
      );
    } finally {
      // 🔧 REFACTORED: No finally block cleanup needed - state is handled in try/catch
      console.log('🧹 Finally block: Excel creation completed for:', canvasItem.id);
    }
  }, [canvasItems, workloadClient, item, setCanvasItems, setCanvasItems, sparkSessionId, onSparkSessionCreated, onSparkSessionStarting]);

  // Register the Add Table callback with parent so it can be used in the ribbon
  useEffect(() => {
    if (onAddTableCallbackChange) {
      onAddTableCallbackChange(handleAddTable);
    }
    // Cleanup: unregister callback when component unmounts
    return () => {
      if (onAddTableCallbackChange) {
        onAddTableCallbackChange(undefined);
      }
    };
  }, [onAddTableCallbackChange, handleAddTable]);

  const handleDeleteTable = useCallback(async (canvasItemId: string) => {
    console.log('🗑️ Delete table clicked for:', canvasItemId);
    
    // Remove the item from canvas
    const updatedCanvasItems = canvasItems.filter(item => item.id !== canvasItemId);
    setCanvasItems(updatedCanvasItems);
    
    // Save the updated state
    const currentState = item?.definition?.state as ExcelTableEditorWorkflowState || {};
    const updatedState: ExcelTableEditorWorkflowState = {
      ...currentState,
      canvasItems: updatedCanvasItems
    };
    
    if (workloadClient && item) {
      try {
        await saveItemDefinition(workloadClient, item.id, { state: updatedState } as ExcelTableEditorItemDefinition);
        console.log('✅ Table removed from canvas successfully!');
        
        // If all tables are removed, notify parent to return to empty view
        if (updatedCanvasItems.length === 0) {
          console.log('📍 All tables removed, updating parent item to trigger empty state');
          if (onItemUpdate) {
            const updatedItem: ItemWithDefinition<ExcelTableEditorItemDefinition> = {
              ...item,
              definition: {
                ...item.definition,
                state: updatedState
              }
            };
            onItemUpdate(updatedItem);
          }
        }
      } catch (error) {
        console.error('❌ Error saving canvas state after delete:', error);
      }
    }
  }, [canvasItems, setCanvasItems, item, workloadClient, onItemUpdate]);

  const handleEditTable = async (canvasItem: CanvasItem) => {
    console.log('Opening table editor for:', canvasItem.name);
    
    // Prevent navigation if Excel is being created for this item
    if (canvasItem.isCreatingExcel) {
      const { callDialogOpenMsgBox } = await import('../../controller/DialogController');
      await callDialogOpenMsgBox(
        workloadClient,
        'Excel Creation in Progress',
        'This Excel file is currently being created. Please wait until creation is finished before opening.',
        ['Ok']
      );
      return;
    }
    
    console.log('📋 Full canvas item data:', canvasItem);
    console.log('🔍 Canvas item Excel URLs and fileId:', {
      hasWebUrl: !!(canvasItem as any).excelWebUrl,
      hasEmbedUrl: !!(canvasItem as any).excelEmbedUrl,
      hasFileId: !!(canvasItem as any).excelFileId,
      webUrl: (canvasItem as any).excelWebUrl,
      embedUrl: (canvasItem as any).excelEmbedUrl,
      fileId: (canvasItem as any).excelFileId
    });
    
    // Use the callback to navigate to detail view
    if (onNavigateToDetailView) {
      onNavigateToDetailView(canvasItem);
    }
  };

  useEffect(() => {
    const workflowState = item?.definition?.state as ExcelTableEditorWorkflowState;
    if (workflowState?.canvasItems) {
      console.log('📥 Loading canvas items from state:', workflowState.canvasItems);
      workflowState.canvasItems.forEach((ci, index) => {
        console.log(`   Item ${index}: ${ci.name}, isCreatingExcel: ${ci.isCreatingExcel}, Excel URLs:`, {
          hasWebUrl: !!(ci as any).excelWebUrl,
          hasEmbedUrl: !!(ci as any).excelEmbedUrl,
          webUrl: (ci as any).excelWebUrl,
          embedUrl: (ci as any).excelEmbedUrl
        });
      });
      console.log('📥 Setting canvasItems from item definition state...');
      setCanvasItems(workflowState.canvasItems);
    }
  }, [item]);

  console.log('🎨 Rendering canvas with canvasItems:', canvasItems);
  
  if (canvasItems.length > 0) {
    console.log('🎨 About to render', canvasItems.length, 'canvas items:', canvasItems);
  }
  
  return (
    <div className="excel-canvas">
      {canvasItems.length > 0 && (
        <div className="canvas-header">
          <Text size={600} weight="bold">Excel Linked Tables</Text>
          <Text size={400}>Select tables and files to edit with Excel</Text>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-overlay-content">
            <Spinner size="huge" />
            <Text size={500} weight="semibold">Loading...</Text>
          </div>
        </div>
      )}

      {canvasItems.length === 0 && !isLoading && (
        <div className="empty-state-overlay">
          <div className="empty-state-content">
            <div className="empty-state-image-container">
              <img
                src="/assets/items/HelloWorldItem/EditorEmpty.svg"
                alt="Empty state illustration"
                className="empty-state-image"
              />
            </div>
            <div className="empty-state-text-container">
              <div className="empty-state-header">
                <h2>No tables selected</h2>
                <Text className="empty-state-description">
                  Select tables from your lakehouse to edit with Excel Online
                </Text>
              </div>
            </div>
            <div className="empty-state-action">
              <Button appearance="primary" onClick={handleAddTable}>
                Add Table
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="canvas-items-container">
          {canvasItems.map((canvasItem, index) => {
            console.log(`🔷 Rendering canvas item ${index}:`, canvasItem);
            const hasExcel = !!(canvasItem as any).excelWebUrl;
            const isCreating = !!canvasItem.isCreatingExcel; // 🔧 REFACTORED: Single source of truth
            console.log(`🔷 Item ${canvasItem.id} state:`, {
              isCreatingExcel: canvasItem.isCreatingExcel,
              isCreating,
              hasExcel
            });
            
            const lakehouseName = canvasItem.source.lakehouse?.name === 'Selected Lakehouse'
              ? 'Unknown (old data - please delete and re-add)'
              : canvasItem.source.lakehouse?.name || 'Unknown Lakehouse';
            
            return (
              <div key={canvasItem.id} className="canvas-item-card compact">
                <div className="canvas-item-header">
                  <div className="canvas-item-info-row">
                    <TableSimple20Regular className="table-icon" />
                    <div className="canvas-item-text">
                      <Text weight="semibold" size={500}>{canvasItem.displayName}</Text>
                      <Text size={300} className="canvas-item-source">
                        {`Lakehouse: ${lakehouseName}`}
                      </Text>
                    </div>
                  </div>
                  <div className="canvas-item-actions-row">
                    {!hasExcel ? (
                      <Button
                        appearance="primary"
                        size="small"
                        icon={isCreating ? <Spinner size="tiny" /> : <TableAdd20Regular />}
                        onClick={() => handleCreateExcel(canvasItem)}
                        disabled={isCreating}
                      >
                        {isCreating ? 'Creating Excel...' : 'Create Excel'}
                      </Button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Button
                          appearance="primary"
                          size="small"
                          onClick={() => handleEditTable(canvasItem)}
                          disabled={isCreating}
                          style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        >
                          {isCreating ? 'Creating...' : 'Open'}
                        </Button>
                        <Menu>
                          <MenuTrigger disableButtonEnhancement>
                            <Button
                              appearance="primary"
                              size="small"
                              icon={<ChevronDown20Regular />}
                              disabled={isCreating}
                              style={{ 
                                borderTopLeftRadius: 0, 
                                borderBottomLeftRadius: 0,
                                borderLeft: '1px solid rgba(255,255,255,0.3)',
                                minWidth: '32px',
                                paddingLeft: '8px',
                                paddingRight: '8px'
                              }}
                            />
                          </MenuTrigger>
                          <MenuPopover>
                            <MenuList>
                              <MenuItem onClick={() => handleEditTable(canvasItem)}>
                                Open
                              </MenuItem>
                              <MenuItem 
                                icon={<WindowNew24Regular />}
                                onClick={() => window.open((canvasItem as any).excelWebUrl, '_blank')}
                              >
                                Open in Excel Online
                              </MenuItem>
                            </MenuList>
                          </MenuPopover>
                        </Menu>
                      </div>
                    )}
                    <Tooltip content="Remove table" relationship="label">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<Delete20Regular />}
                        onClick={() => handleDeleteTable(canvasItem.id)}
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
