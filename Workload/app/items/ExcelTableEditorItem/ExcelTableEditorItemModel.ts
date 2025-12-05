export interface ExcelTableEditorItemDefinition {
  state?: ExcelTableEditorWorkflowState;
}

export interface ExcelTableEditorWorkflowState {
  // Canvas overview state - collection of all selected tables/sources
  canvasItems?: Array<{
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
  }>;
  
  // Current editing context (for detail view)
  currentEditingItem?: {
    id: string;
    type: 'lakehouse-table' | 'uploaded-file' | 'external-source';
    name: string;
    displayName: string;
    source?: any;
    excelWebUrl?: string;
    excelEmbedUrl?: string;
    excelFileId?: string;
    excelDownloadUrl?: string;
  };
  
  // Lakehouse selection state
  selectedLakehouse?: {
    id: string;
    name: string;
    workspaceId: string;
  };
  
  // Table selection state
  selectedTable?: {
    name: string;
    displayName: string;
    schema: Array<{ name: string; dataType: string }>;
    rowCount: number;
  };
  
  // Workflow progress tracking
  workflowStep?: 'canvas-overview' | 'table-editing' | 'completed';
  
  // Excel editing state
  excelEditingState?: {
    lastSavedPath?: string;
    lastEditedDate?: string;
    hasUnsavedChanges?: boolean;
  };
  
  // User preferences
  preferences?: {
    defaultSaveLocation?: 'lakehouse' | 'item-onelake';
    autoSave?: boolean;
  };
}

export const EDITOR_VIEW_TYPES = {
  EMPTY: 'empty',
  DEFAULT: 'default',
  DETAIL: 'detail'
} as const;

export type EditorView = typeof EDITOR_VIEW_TYPES[keyof typeof EDITOR_VIEW_TYPES];

// Helper functions for state management
export function createEmptyWorkflowState(): ExcelTableEditorWorkflowState {
  return {
    workflowStep: 'canvas-overview',
    canvasItems: [],
    preferences: {
      defaultSaveLocation: 'lakehouse',
      autoSave: false
    }
  };
}

export function isWorkflowStateValid(state?: ExcelTableEditorWorkflowState): boolean {
  if (!state) return false;
  
  return !!(
    state.canvasItems?.length || 
    state.selectedLakehouse?.id ||
    state.selectedTable?.name
  );
}
