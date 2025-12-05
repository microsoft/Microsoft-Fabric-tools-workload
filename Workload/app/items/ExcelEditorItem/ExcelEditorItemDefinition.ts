

/**
 * Interface representing the definition of an Excel Editor item.
 * This information is stored in Fabric as Item definition.
 * It will be returned once the item definition is loaded.
 */
export interface ExcelEditorItemDefinition {
  canvasItems?: CanvasItem[];
}


/**
 * Canvas item representing a table or file that can be edited with Excel
 */
export interface CanvasItem {
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
  excelWebUrl?: string; // OneDrive/SharePoint URL for Excel Online editing
  excelEmbedUrl?: string; // Office Online embed URL for preview
  excelFileId?: string; // OneDrive file ID for token refresh
  excelDownloadUrl?: string; // Direct download URL to avoid CORS
  isCreatingExcel?: boolean; // Flag to indicate Excel creation in progress
}

