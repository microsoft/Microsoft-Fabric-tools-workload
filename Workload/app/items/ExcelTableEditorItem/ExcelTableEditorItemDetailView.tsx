import React, { useState, useEffect, useCallback } from "react";
import { Button, Text, Spinner } from "@fluentui/react-components";
import { TableSimple20Regular } from "@fluentui/react-icons";
import { WorkloadClientAPI, NotificationType, NotificationToastDuration } from "@ms-fabric/workload-client";
import { ItemWithDefinition, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { ExcelTableEditorItemDefinition, ExcelTableEditorWorkflowState } from "./ExcelTableEditorItemModel";
import { ItemEditorDetailView } from "../../components/ItemEditor";
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
  excelWebUrl?: string;
  excelDownloadUrl?: string;
  excelEmbedUrl?: string;
  excelFileId?: string;
}

interface ExcelTableEditorItemDetailViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelTableEditorItemDefinition>;
  sparkSessionId?: string | null;
  onExcelWebUrlChange?: (url: string) => void;
  onCanvasItemsUpdate?: (items: CanvasItem[]) => void;
  onRefreshExcelCallbackChange?: (callback: (() => Promise<void>) | undefined) => void;
  onCurrentEditingItemChange?: (item: any) => void;
}

export function ExcelTableEditorItemDetailView({
  workloadClient,
  item,
  sparkSessionId,
  onExcelWebUrlChange,
  onCanvasItemsUpdate,
  onRefreshExcelCallbackChange,
  onCurrentEditingItemChange
}: ExcelTableEditorItemDetailViewProps) {
  const [currentEditingItem, setCurrentEditingItem] = useState<CanvasItem | null>(null);
  const [excelOnlineUrl, setExcelOnlineUrl] = useState<string>('');
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);
  const [excelFileInfo] = useState<{fileId: string, fileName: string, tableName: string} | null>(null);
  const [showLocalViewer] = useState(false);

  useEffect(() => {
    const workflowState = item?.definition?.state as ExcelTableEditorWorkflowState;
    console.log('🔍 DetailView: Checking for currentEditingItem in state:', workflowState);
    if (workflowState?.currentEditingItem) {
      console.log('✅ DetailView: Found currentEditingItem:', workflowState.currentEditingItem);
      console.log('🔍 Excel URLs and fileId check:', {
        hasWebUrl: !!workflowState.currentEditingItem.excelWebUrl,
        hasEmbedUrl: !!workflowState.currentEditingItem.excelEmbedUrl,
        hasFileId: !!workflowState.currentEditingItem.excelFileId,
        webUrl: workflowState.currentEditingItem.excelWebUrl,
        embedUrl: workflowState.currentEditingItem.excelEmbedUrl,
        fileId: workflowState.currentEditingItem.excelFileId
      });
      setCurrentEditingItem(workflowState.currentEditingItem as CanvasItem);
      
      // Notify parent about the current editing item
      if (onCurrentEditingItemChange) {
        onCurrentEditingItemChange(workflowState.currentEditingItem);
      }
      
      // Check if we already have a saved Excel URL
      if (workflowState.currentEditingItem.excelWebUrl && workflowState.currentEditingItem.excelEmbedUrl) {
        console.log('📋 Found existing Excel URLs in state, loading preview...');
        setExcelOnlineUrl(workflowState.currentEditingItem.excelEmbedUrl);
        
        // Notify parent about the URL
        if (onExcelWebUrlChange) {
          onExcelWebUrlChange(workflowState.currentEditingItem.excelWebUrl);
        }
      } else {
        console.log('📝 No Excel file created yet - showing empty state');
      }
    } else {
      console.log('❌ DetailView: No currentEditingItem found in state');
    }
  }, [item, onCurrentEditingItemChange, onExcelWebUrlChange]);

  const loadExcelOnline = async (editingItem: CanvasItem) => {
    console.log('📤 Loading Excel Online with OneDrive upload...');
    setIsLoadingExcel(true);
    
    try {
      // Import required services
      const { fetchLakehouseTableData } = await import('./utils/ExcelClientSide');
      const { OneDriveService } = await import('./services/OneDriveService');
      const ExcelJS = await import('exceljs');
      
      if (!editingItem.source?.lakehouse?.id) {
        throw new Error('No lakehouse metadata found');
      }
      
      // Step 1: Fetch data from Spark
      console.log('📊 Fetching data from Spark...');
      const { data, schema } = await fetchLakehouseTableData(
        workloadClient,
        editingItem.source.lakehouse.workspaceId,
        editingItem.source.lakehouse.id,
        editingItem.name,
        sparkSessionId
      );
      
      // Step 2: Create Excel blob
      console.log('📝 Creating Excel workbook...');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(editingItem.displayName);
      
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
      const fileName = `${editingItem.displayName}_${Date.now()}.xlsx`;
      const uploadResult = await oneDriveService.uploadExcelFile(blob, fileName);
      
      console.log('✅ Upload successful:', uploadResult);
      
      // Step 4: Save URLs to item definition
      console.log('💾 Saving Excel URLs to item definition...');
      const workflowState = item?.definition?.state as ExcelTableEditorWorkflowState;
      if (workflowState && workflowState.currentEditingItem) {
        // Update the currentEditingItem with Excel URLs AND fileId for future refresh
        const updatedCurrentEditingItem = {
          ...workflowState.currentEditingItem,
          excelWebUrl: uploadResult.webUrl,
          excelEmbedUrl: uploadResult.embedUrl || uploadResult.webUrl,
          excelFileId: uploadResult.fileId
        };
        
        // Also update the canvas item to persist URLs for next time
        const updatedCanvasItems = (workflowState.canvasItems || []).map(canvasItem => {
          if (canvasItem.id === editingItem.id) {
            return {
              ...canvasItem,
              excelWebUrl: uploadResult.webUrl,
              excelEmbedUrl: uploadResult.embedUrl || uploadResult.webUrl,
              excelFileId: uploadResult.fileId
            };
          }
          return canvasItem;
        });
        
        // Update parent state
        if (onCanvasItemsUpdate) {
          onCanvasItemsUpdate(updatedCanvasItems);
        }
        
        const updatedState: ExcelTableEditorWorkflowState = {
          ...workflowState,
          currentEditingItem: updatedCurrentEditingItem,
          canvasItems: updatedCanvasItems
        };
        
        await saveItemDefinition(workloadClient, item?.id || '', { state: updatedState } as ExcelTableEditorItemDefinition);
        console.log('✅ Excel URLs saved to both currentEditingItem and canvasItems');
      }
      
      // Notify parent component about the URL change
      if (onExcelWebUrlChange) {
        onExcelWebUrlChange(uploadResult.webUrl);
      }
      
      // Step 5: Show embedded Excel preview
      if (uploadResult.embedUrl) {
        console.log('📊 Setting embedded Excel viewer URL...');
        setExcelOnlineUrl(uploadResult.embedUrl);
      } else {
        console.log('⚠️ No embed URL, falling back to web URL...');
        setExcelOnlineUrl(uploadResult.webUrl);
      }
      
      // Show success notification
      await callNotificationOpen(
        workloadClient,
        'Excel file created and linked!',
        `${fileName} uploaded to OneDrive and automatically saved to this item. Use "Open in Excel Online" button for full editing.`,
        NotificationType.Success,
        NotificationToastDuration.Long
      );
      
    } catch (error) {
      console.error('❌ Failed to upload to OneDrive:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a licensing issue
      if (errorMessage.includes('SPO license') || errorMessage.includes('SharePoint Online')) {
        await callNotificationOpen(
          workloadClient,
          'OneDrive not available',
          'Your tenant does not have SharePoint Online/OneDrive for Business. Please use the "Download Excel" button to save the file locally.',
          NotificationType.Warning,
          NotificationToastDuration.Long
        );
      } else {
        await callNotificationOpen(
          workloadClient,
          'OneDrive upload failed',
          `${errorMessage}. Please use the Download button instead.`,
          NotificationType.Error,
          NotificationToastDuration.Long
        );
      }
    } finally {
      setIsLoadingExcel(false);
    }
  };

  // Refresh Excel embed URL to get fresh access token
  const handleRefreshExcel = useCallback(async () => {
    if (!currentEditingItem?.excelFileId) {
      console.warn('⚠️ Cannot refresh Excel: No fileId found');
      await callNotificationOpen(
        workloadClient,
        'Cannot refresh',
        'Excel file ID not found. Please reload the table.',
        NotificationType.Warning,
        NotificationToastDuration.Short
      );
      return;
    }

    console.log('🔄 Refreshing Excel embed URL with fresh token...');
    setIsLoadingExcel(true);

    try {
      const { OneDriveService } = await import('./services/OneDriveService');
      const oneDriveService = new OneDriveService(workloadClient);
      
      // Get fresh embed URL with new access token
      const freshEmbedUrl = await oneDriveService.refreshEmbedUrl(currentEditingItem.excelFileId);
      
      if (!freshEmbedUrl) {
        throw new Error('Failed to get fresh embed URL');
      }

      console.log('✅ Got fresh embed URL');
      
      // Update local state
      setExcelOnlineUrl(freshEmbedUrl);
      
      // Update item definition with new URL
      const workflowState = item?.definition?.state as ExcelTableEditorWorkflowState;
      if (workflowState && workflowState.currentEditingItem) {
        const updatedCurrentEditingItem = {
          ...workflowState.currentEditingItem,
          excelEmbedUrl: freshEmbedUrl
        };
        
        // Also update the canvas item
        const updatedCanvasItems = (workflowState.canvasItems || []).map(canvasItem => {
          if (canvasItem.id === currentEditingItem.id) {
            return {
              ...canvasItem,
              excelEmbedUrl: freshEmbedUrl
            };
          }
          return canvasItem;
        });
        
        // Update parent state
        if (onCanvasItemsUpdate) {
          onCanvasItemsUpdate(updatedCanvasItems);
        }
        
        const updatedState: ExcelTableEditorWorkflowState = {
          ...workflowState,
          currentEditingItem: updatedCurrentEditingItem,
          canvasItems: updatedCanvasItems
        };
        
        await saveItemDefinition(workloadClient, item?.id || '', { state: updatedState } as ExcelTableEditorItemDefinition);
        console.log('✅ Fresh Excel URL saved');
      }
      
      await callNotificationOpen(
        workloadClient,
        'Excel refreshed',
        'Access token renewed successfully',
        NotificationType.Success,
        NotificationToastDuration.Short
      );
      
    } catch (error) {
      console.error('❌ Failed to refresh Excel:', error);
      await callNotificationOpen(
        workloadClient,
        'Refresh failed',
        error instanceof Error ? error.message : 'Unknown error',
        NotificationType.Error,
        NotificationToastDuration.Short
      );
    } finally {
      setIsLoadingExcel(false);
    }
  }, [currentEditingItem, workloadClient, item, onCanvasItemsUpdate]);

  // Register refresh callback with parent (for ribbon button)
  useEffect(() => {
    if (onRefreshExcelCallbackChange) {
      onRefreshExcelCallbackChange(handleRefreshExcel);
    }
    return () => {
      if (onRefreshExcelCallbackChange) {
        onRefreshExcelCallbackChange(undefined);
      }
    };
  }, [onRefreshExcelCallbackChange, handleRefreshExcel]);

  if (!currentEditingItem) {
    return (
      <ItemEditorDetailView
        center={{
          content: (
            <div className="excel-canvas">
              <div className="error-state">
                <Text size={500} weight="semibold">No table selected for editing</Text>
                <Text size={400}>Please return to the canvas and select a table.</Text>
              </div>
            </div>
          )
        }}
      />
    );
  }

  return (
    <ItemEditorDetailView
      center={{
        content: (
          <div className="excel-canvas">
            {isLoadingExcel && (
              <div className="loading-section">
                <Spinner size="medium" />
                <Text>Creating Excel file...</Text>
              </div>
            )}

            {!isLoadingExcel && showLocalViewer && excelFileInfo && (
              <>
                <div className="excel-info-banner">
                  <Text size={400} weight="semibold">
                    💡 For the REAL Excel experience:
                  </Text>
                  <Text size={300} style={{ marginTop: '4px', display: 'block' }}>
                    Click <strong>"Download Excel File"</strong> button above to open this data in Microsoft Excel desktop app
                  </Text>
                </div>
                {/* LocalExcelViewer component would be imported and used here if it exists */}
                <Text>Local Excel Viewer (component to be implemented)</Text>
              </>
            )}

            {!isLoadingExcel && !showLocalViewer && excelOnlineUrl && (
              <div className="table-editor-iframe-container-clean">
                <iframe
                  src={excelOnlineUrl}
                  className="table-editor-iframe"
                  title={`Excel Online - ${currentEditingItem.name}`}
                  onLoad={(e) => {
                    console.log('✅ Excel Online iframe loaded');
                    console.log('📍 Loaded URL:', excelOnlineUrl);
                  }}
                  onError={(e) => {
                    console.error('❌ Excel Online iframe failed to load');
                    console.error('   URL:', excelOnlineUrl);
                  }}
                />
              </div>
            )}

            {!isLoadingExcel && !showLocalViewer && !excelOnlineUrl && (
              <div className="empty-canvas">
                <div className="error-state">
                  <Button
                    appearance="primary"
                    onClick={() => loadExcelOnline(currentEditingItem)}
                    className="error-retry"
                    icon={<TableSimple20Regular />}
                  >
                    Create Excel Online File
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      }}
    />
  );
}
