export interface FileEditorItemDefinition {
  /** Current file content being edited */
  fileContent?: string;
  /** Current file language/type */
  language?: string;
  /** Current file name */
  fileName?: string;
  /** Editor theme (dark, light, etc.) */
  theme?: string;
  //   { key: "vs-dark", text: "Dark" },
  //   { key: "vs", text: "Light" },
  //   { key: "hc-black", text: "High Contrast" }
  /** Current cursor position */
  cursorPosition?: {
    lineNumber: number;
    column: number;
  };
  /** Open files/tabs */
  openFiles?: {
    onelakeLink: string,
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
