import { CanvasItem, ExcelEditorItemDefinition } from "./ExcelEditorItemDefinition";

/**
 * Runtime state for editor (not stored in definition)
 */
export interface EditorRuntimeState {
  // Current editing context (for detail view navigation)
  currentEditingItem?: CanvasItem;
  
  // Lakehouse selection state (temporary during selection)
  selectedLakehouse?: {
    id: string;
    name: string;
    workspaceId: string;
  };
  
  // Table selection state (temporary during selection)
  selectedTable?: {
    name: string;
    displayName: string;
    schema: Array<{ name: string; dataType: string }>;
    rowCount: number;
  };
}

/**
 * Helper functions for state management
 */
export function isWorkflowStateValid(definition?: ExcelEditorItemDefinition): boolean {
  if (!definition) return false;
  
  // Only show DEFAULT view if there are actual canvas items to display
  return !!(definition.canvasItems?.length);
}
