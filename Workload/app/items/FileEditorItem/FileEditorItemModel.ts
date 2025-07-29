import { Item } from "../../clients/FabricPlatformTypes";
import { ItemReference } from "../../controller/ItemCRUDController";

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
  /** Open files/tabs - Only OneLake files are allowed */
  openFiles?: OneLakeFileReference[];
  /** Current active file index */
  activeFileIndex?: number;

  /** Editor settings */
  editorSettings?: {
    fontSize: number;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
  };

  /** Reference to the selected OneLake item in the explorer */
  itemReference?: Item;
}

/** Represents a file reference that must be stored in OneLake */
export interface OneLakeFileReference extends ItemReference {
  /** OneLake path - required for all files */
  onelakeLink: string;
  /** Display name of the file */
  fileName: string;
  /** File content cached locally */
  content: string;
  /** Programming language for syntax highlighting */
  language: string;
  /** Whether the file has unsaved changes */
  isDirty: boolean;
}
