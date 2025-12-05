import React, { useState, useEffect, useCallback } from "react";
import { Button, Text, Spinner } from "@fluentui/react-components";
import { 
  TableSimple20Regular,
  ArrowClockwise20Regular,
  DatabaseArrowUp20Regular
} from "@fluentui/react-icons";
import { WorkloadClientAPI, NotificationType, NotificationToastDuration } from "@ms-fabric/workload-client";
import { ItemWithDefinition, saveItemDefinition } from "../../controller/ItemCRUDController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { ExcelEditorItemDefinition, CanvasItem } from "./ExcelEditorItemDefinition";
import { ItemEditorDetailView, DetailViewAction } from "../../components/ItemEditor";
import { useTranslation } from "react-i18next";
import "./ExcelEditorItem.scss";

interface ExcelEditorItemDetailViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditorItemDefinition>;
  currentEditingItem?: CanvasItem;
  sparkSessionId?: string | null;
  onRefreshExcel?: () => Promise<void>;
  onSaveToLakehouse?: () => Promise<void>;
}

export function ExcelEditorItemDetailView({
  workloadClient,
  item,
  currentEditingItem,
  sparkSessionId,
  onRefreshExcel,
  onSaveToLakehouse
}: ExcelEditorItemDetailViewProps) {
  const { t } = useTranslation();
  const [excelOnlineUrl, setExcelOnlineUrl] = useState<string>('');
  const [isLoadingExcel, setIsLoadingExcel] = useState(false);

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
      if (item?.definition) {
        const updatedCanvasItems = (item.definition.canvasItems || []).map((canvasItem: CanvasItem) => {
          if (canvasItem.id === currentEditingItem.id) {
            return {
              ...canvasItem,
              excelEmbedUrl: freshEmbedUrl
            };
          }
          return canvasItem;
        });
        
        const updatedDefinition: ExcelEditorItemDefinition = {
          ...item.definition,
          canvasItems: updatedCanvasItems
        };
        
        await saveItemDefinition(workloadClient, item?.id || '', updatedDefinition);
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
  }, [currentEditingItem, workloadClient, item]);
  
  // Define detail view actions (specific to this view)
  const toolbarActions: DetailViewAction[] = [
    {
      key: 'refresh-excel',
      label: t("Refresh", "Refresh"),
      icon: ArrowClockwise20Regular,
      onClick: handleRefreshExcel,
      appearance: 'subtle',
      disabled: !currentEditingItem?.excelWebUrl,
      tooltip: t("Reload the Excel preview", "Reload the Excel preview")
    },
    {
      key: 'save-to-lakehouse',
      label: t("Save to Lakehouse", "Save to Lakehouse"),
      icon: DatabaseArrowUp20Regular,
      onClick: onSaveToLakehouse || (async () => {}),
      appearance: 'subtle',
      disabled: !onSaveToLakehouse,
      tooltip: t("Save changes back to the lakehouse table", "Save changes back to the lakehouse table")
    }
  ];

  useEffect(() => {
    console.log('🔍 DetailView: currentEditingItem from props:', currentEditingItem);
    if (currentEditingItem) {
      console.log('✅ DetailView: Using currentEditingItem:', currentEditingItem);
      
      // Check if we already have a saved Excel URL
      if (currentEditingItem.excelWebUrl && currentEditingItem.excelEmbedUrl) {
        console.log('📋 Found existing Excel URLs, loading preview automatically...');
        setExcelOnlineUrl(currentEditingItem.excelEmbedUrl);
      } else {
        // Auto-create Excel file if it doesn't exist yet
        console.log('📝 No Excel file created yet - creating automatically...');
        loadExcelOnline(currentEditingItem);
      }
    } else {
      console.log('❌ DetailView: No currentEditingItem provided');
    }
  }, [currentEditingItem]);

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
      if (item?.definition) {
        // Update the canvas item to persist URLs for next time
        const updatedCanvasItems = (item.definition.canvasItems || []).map((canvasItem: CanvasItem) => {
          if (canvasItem.id === editingItem.id) {
            return {
              ...canvasItem,
              excelWebUrl: uploadResult.webUrl,
              excelEmbedUrl: uploadResult.embedUrl || uploadResult.webUrl,
              excelFileId: uploadResult.fileId,
              lastEdited: new Date().toISOString()
            };
          }
          return canvasItem;
        });
        
        const updatedDefinition: ExcelEditorItemDefinition = {
          ...item.definition,
          canvasItems: updatedCanvasItems
        };
        
        await saveItemDefinition(workloadClient, item?.id || '', updatedDefinition);
        console.log('✅ Excel URLs saved to canvasItems');
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
      toolbarActions={toolbarActions}
      center={{
        content: (
          <div className="excel-canvas">
            {isLoadingExcel && (
              <div className="loading-section" style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                gap: '12px'
              }}>
                <Spinner size="medium" />
                <Text>Creating Excel file...</Text>
              </div>
            )}

            {!isLoadingExcel && excelOnlineUrl && (
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

            {!isLoadingExcel && !excelOnlineUrl && (
              <div className="empty-canvas">
                <div className="error-state">
                  <Button
                    appearance="primary"
                    onClick={() => loadExcelOnline(currentEditingItem)}
                    className="error-retry"
                    icon={<TableSimple20Regular />}
                  >
                    Edit in Excel
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
