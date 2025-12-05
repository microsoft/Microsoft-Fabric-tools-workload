import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@fluentui/react-components";
import { callDatahubWizardOpen } from "../../controller/DataHubController";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ExcelTableEditorItemDefinition, ExcelTableEditorWorkflowState, createEmptyWorkflowState } from "./ExcelTableEditorItemModel";
import { ItemEditorEmptyView } from "../../components/ItemEditor";

interface ExcelTableEditorItemEmptyViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelTableEditorItemDefinition>;
  onAddTableCallbackChange?: (callback: (() => Promise<void>) | undefined) => void;
  onItemUpdate?: (updatedItem: ItemWithDefinition<ExcelTableEditorItemDefinition>) => void;
}

/**
 * Empty state component - the first screen users see
 * This shows the lakehouse selection interface to start the Excel editing workflow
 */
export function ExcelTableEditorItemEmptyView({
  workloadClient,
  item,
  onAddTableCallbackChange,
  onItemUpdate
}: ExcelTableEditorItemEmptyViewProps) {
  const [isLoading, setIsLoading] = useState(false);

  const loadLakehouses = useCallback(async () => {
    setIsLoading(true);
    
    try {
      console.log('🔍 Opening OneLake catalog experience for table selection...');
      
      // Use the wizard version which should allow deeper navigation into tables
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
      console.log('📊 Selected path:', result?.selectedPath);
      
      if (result) {
        // Check if we have table-level selection in selectedPath
        if (result.selectedPath && result.selectedPath.includes('/')) {
          console.log('✅ Table selected via OneLake catalog:', result.selectedPath);
          
          // Parse the path to get lakehouse and table info
          const pathParts = result.selectedPath.split('/');
          const tableName = pathParts[pathParts.length - 1];
          
          // Create lakehouse and table info
          const lakehouseInfo = {
            id: result.id,
            name: result.displayName || 'Selected Lakehouse',
            workspaceId: result.workspaceId
          };
          
          const tableInfo = {
            name: tableName,
            displayName: tableName,
            schema: [] as Array<{ name: string; dataType: string }>, // Will be populated later
            rowCount: 0 // Will be populated later
          };

          // Create canvas item for the selected table
          const canvasItem = {
            id: `${lakehouseInfo.name}-${tableName}`,
            type: 'lakehouse-table' as const,
            name: tableName,
            displayName: tableName,
            source: {
              lakehouse: lakehouseInfo,
              table: tableInfo
            },
            lastEdited: new Date().toISOString()
          };
          
          // Save complete selection to state with canvas items
          const updatedState: ExcelTableEditorWorkflowState = {
            ...createEmptyWorkflowState(),
            canvasItems: [canvasItem], // Add the table to canvas items!
            selectedLakehouse: lakehouseInfo,
            selectedTable: tableInfo,
            workflowStep: 'canvas-overview',
          };
          
          console.log('🎨 Creating canvas item:', canvasItem);
          console.log('📋 Saving state with canvas items:', updatedState);
          
          // Save state to Fabric SDK
          try {
            const saveResult = await saveItemDefinition<ExcelTableEditorItemDefinition>(
              workloadClient,
              item!.id,
              { state: updatedState }
            );
            
            if (saveResult) {
              console.log('✅ Table selection saved to Fabric SDK successfully');
              
              // ✅ Update parent item state
              if (onItemUpdate && item) {
                const updatedItem: ItemWithDefinition<ExcelTableEditorItemDefinition> = {
                  ...item,
                  definition: {
                    ...item.definition,
                    state: updatedState
                  }
                };
                onItemUpdate(updatedItem);
              }
              
              console.log('✅ Table selection saved successfully');
            } else {
              console.error('❌ Save result was undefined - check console for errors');
              console.error('❌ Attempted to save state:', updatedState);
            }
          } catch (saveError) {
            console.error('❌ Error saving table selection to Fabric SDK:', saveError);
            console.error('❌ Save error details:', {
              message: saveError.message,
              stack: saveError.stack,
              name: saveError.name
            });
            console.error('❌ Failed to save state:', updatedState);
          }
          
        } else {
          // Only lakehouse selected, no table
          console.log('⚠️ Only lakehouse selected, no table path found');
          console.log('📊 Full result for debugging:', JSON.stringify(result, null, 2));
          
          // Save the lakehouse selection and navigate to canvas overview
          const lakehouseInfo = {
            id: result.id,
            name: result.displayName,
            workspaceId: result.workspaceId
          };
          
          console.log('💾 Saving lakehouse info:', lakehouseInfo);
          
          const updatedState: ExcelTableEditorWorkflowState = {
            ...createEmptyWorkflowState(),
            selectedLakehouse: lakehouseInfo,
            workflowStep: 'canvas-overview',
          };
          
          console.log('💾 Saving state:', updatedState);
          
          await saveItemDefinition<ExcelTableEditorItemDefinition>(
            workloadClient,
            item!.id,
            { state: updatedState }
          );
          
          console.log('✅ Lakehouse selection saved');
        }
      } else {
        console.log('❌ No selection made (user cancelled)');
      }
    } catch (err) {
      console.error('❌ OneLake catalog error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workloadClient, item, onItemUpdate]);

  // Register the Add Table callback with parent so it can be used in the ribbon
  useEffect(() => {
    if (onAddTableCallbackChange) {
      onAddTableCallbackChange(loadLakehouses);
    }
    // Cleanup: unregister callback when component unmounts
    return () => {
      if (onAddTableCallbackChange) {
        onAddTableCallbackChange(undefined);
      }
    };
  }, [onAddTableCallbackChange, loadLakehouses]);

  const customContent = (
    <Button 
      appearance="primary"
      onClick={loadLakehouses}
      disabled={isLoading}
      size="large"
    >
      {isLoading ? 'Opening OneLake Catalog...' : 'Add Table'}
    </Button>
  );

  return (
    <ItemEditorEmptyView
      title="Excel Table Editor"
      description="Select a table from your lakehouse to edit with Excel Online"
      customContent={customContent}
    />
  );
}
