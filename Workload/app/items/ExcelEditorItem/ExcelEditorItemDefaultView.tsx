import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Text,
  Tooltip,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Card,
  CardHeader,
  CardPreview,
  CardFooter,
  Badge,
} from "@fluentui/react-components";
import {
  TableSimple20Regular,
  Delete20Regular,
  WindowNew24Regular,
  DocumentRegular,
  CalendarLtrRegular,
  EditRegular,
} from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ExcelEditorItemDefinition, CanvasItem } from "./ExcelEditorItemDefinition";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import "./ExcelEditorItem.scss";

interface ExcelEditorItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditorItemDefinition>;
  onNavigateToDetailView?: (canvasItem: CanvasItem) => void;
  onItemUpdate?: (updatedItem: ItemWithDefinition<ExcelEditorItemDefinition>) => void;
  sparkSessionId?: string | null;
  onSparkSessionCreated?: (sessionId: string) => void;
  onSparkSessionStarting?: (isStarting: boolean) => void;
}

export function ExcelEditorItemDefaultView({
  workloadClient,
  item,
  onNavigateToDetailView,
  onItemUpdate,
  sparkSessionId,
  onSparkSessionCreated,
  onSparkSessionStarting
}: ExcelEditorItemDefaultViewProps) {
  
  // Initialize canvas items from item definition
  const initializeCanvasItems = () => {
    return item?.definition?.canvasItems || [];
  };

  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>(initializeCanvasItems);
  
  // Update canvas items when item definition changes
  useEffect(() => {
    if (item?.definition?.canvasItems) {
      setCanvasItems(item.definition.canvasItems);
    }
  }, [item?.definition?.canvasItems]);

  const handleDeleteTable = useCallback(async (canvasItemId: string) => {
    console.log('🗑️ Delete table clicked for:', canvasItemId);
    
    // Remove the item from canvas
    const updatedCanvasItems = canvasItems.filter(item => item.id !== canvasItemId);
    setCanvasItems(updatedCanvasItems);
    
    // Save the updated definition
    const updatedDefinition: ExcelEditorItemDefinition = {
      ...item?.definition,
      canvasItems: updatedCanvasItems
    };
    
    if (workloadClient && item) {
      try {
        await saveItemDefinition(workloadClient, item.id, updatedDefinition);
        console.log('✅ Table removed from canvas successfully!');
        
        // If all tables are removed, notify parent to return to empty view
        if (updatedCanvasItems.length === 0) {
          console.log('📍 All tables removed, updating parent item to trigger empty state');
          if (onItemUpdate) {
            const updatedItem: ItemWithDefinition<ExcelEditorItemDefinition> = {
              ...item,
              definition: updatedDefinition
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
    const canvasItems = item?.definition?.canvasItems;
    if (canvasItems) {
      console.log('📥 Loading canvas items from definition:', canvasItems);
      canvasItems.forEach((ci: CanvasItem, index: number) => {
        console.log(`   Item ${index}: ${ci.name}, isCreatingExcel: ${ci.isCreatingExcel}, Excel URLs:`, {
          hasWebUrl: !!(ci as any).excelWebUrl,
          hasEmbedUrl: !!(ci as any).excelEmbedUrl,
          webUrl: (ci as any).excelWebUrl,
          embedUrl: (ci as any).excelEmbedUrl
        });
      });
      console.log('📥 Setting canvasItems from item definition...');
      setCanvasItems(canvasItems);
    }
  }, [item]);

  console.log('🎨 Rendering canvas with canvasItems:', canvasItems);
  
  if (canvasItems.length > 0) {
    console.log('🎨 About to render', canvasItems.length, 'canvas items:', canvasItems);
  }
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <ItemEditorDefaultView
      center={{
        content: (
          <div className="excel-canvas">
            {canvasItems.length > 0 && (
              <div className="canvas-header">
                <Text size={600} weight="bold">Excel Linked Tables</Text>
                <Text size={400}>Manage your tables and edit them with Excel Online</Text>
              </div>
            )}

            <div className="canvas-cards-grid">
              {canvasItems.map((canvasItem) => {
                const hasExcel = !!canvasItem.excelFileId || !!canvasItem.excelWebUrl;
                const isCreating = !!canvasItem.isCreatingExcel;
                const lakehouseName = canvasItem.source.lakehouse?.name || 'Unknown Lakehouse';
                
                return (
                  <Card key={canvasItem.id} className="table-card">
                    <CardHeader
                      image={
                        <TableSimple20Regular 
                          style={{ 
                            fontSize: '32px',
                            color: 'var(--colorBrandForeground1)'
                          }} 
                        />
                      }
                      header={
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <Text weight="semibold" size={500}>{canvasItem.displayName}</Text>
                          <Text size={300} style={{ color: 'var(--colorNeutralForeground3)' }}>
                            {lakehouseName}
                          </Text>
                        </div>
                      }
                      action={
                        <Tooltip content="Remove table" relationship="label">
                          <Button
                            appearance="subtle"
                            size="small"
                            icon={<Delete20Regular />}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              handleDeleteTable(canvasItem.id);
                            }}
                          />
                        </Tooltip>
                      }
                    />

                    <CardPreview style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <DocumentRegular style={{ fontSize: '16px', color: 'var(--colorNeutralForeground3)' }} />
                          <Text size={300}>
                            {hasExcel ? (
                              <Badge appearance="filled" color="success">Excel File Created</Badge>
                            ) : (
                              <Badge appearance="outline" color="warning">No Excel File</Badge>
                            )}
                          </Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CalendarLtrRegular style={{ fontSize: '16px', color: 'var(--colorNeutralForeground3)' }} />
                          <Text size={300} style={{ color: 'var(--colorNeutralForeground3)' }}>
                            Last edited: {formatDate(canvasItem.lastEdited)}
                          </Text>
                        </div>
                      </div>
                    </CardPreview>

                    <CardFooter style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {!hasExcel ? (
                        <Button
                          appearance="primary"
                          icon={<EditRegular />}
                          onClick={() => handleEditTable(canvasItem)}
                          disabled={isCreating}
                        >
                          Edit in Excel
                        </Button>
                      ) : (
                        <>
                          <Button
                            appearance="primary"
                            icon={<EditRegular />}
                            onClick={() => handleEditTable(canvasItem)}
                            disabled={isCreating}
                          >
                            Edit
                          </Button>
                          <Menu>
                            <MenuTrigger disableButtonEnhancement>
                              <Button
                                appearance="subtle"
                                icon={<WindowNew24Regular />}
                              />
                            </MenuTrigger>
                            <MenuPopover>
                              <MenuList>
                                <MenuItem 
                                  icon={<WindowNew24Regular />}
                                  onClick={() => window.open(canvasItem.excelWebUrl, '_blank')}
                                >
                                  Open in Excel Online
                                </MenuItem>
                              </MenuList>
                            </MenuPopover>
                          </Menu>
                        </>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )
      }}
    />
  );
}
