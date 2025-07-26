export interface VSCodeEditorItemDefinition {
  /** Current file content being edited */
  fileContent?: string;
  /** Current file language/type */
  language?: string;
  /** Current file name */
  fileName?: string;
  /** Editor theme (dark, light, etc.) */
  theme?: string;
  /** Current cursor position */
  cursorPosition?: {
    lineNumber: number;
    column: number;
  };
  /** Open files/tabs */
  openFiles?: {
    fileName: string;
    content: string;
    language: string;
    isDirty: boolean;
  }[];
  /** Current active file index */
  activeFileIndex?: number;
  /** Editor settings */
  editorSettings?: {
    fontSize: number;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
  };
}
