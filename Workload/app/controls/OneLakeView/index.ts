/**
 * OneLakeView Control - Main Export Module
 * 
 * This module provides a reusable OneLake Item Explorer control that can be
 * integrated into any component that needs tree-based OneLake browsing functionality.
 * 
 * Core Components:
 * - OneLakeView: Main control with tree functionality
 * - FileTree: File system tree component
 * - TableTreeWithSchema: Table tree with schema grouping
 * - TableTreeWithoutSchema: Flat table tree
 * 
 * Data Models:
 * - OneLakeViewProps: Main control props interface
 * - OneLakeViewConfig: Configuration options
 * - OneLakeViewCallbacks: Event callback functions
 * - TableMetadata, FileMetadata: Data structures
 * 
 * Usage:
 * ```tsx
 * import { OneLakeView } from '../controls/OneLakeView';
 * 
 * const config = {
 *   mode: "edit",
 *   initialItem: { id: "item-id", workspaceId: "workspace-id", displayName: "My Item" },
 *   allowItemSelection: true
 * };
 * 
 * const callbacks = {
 *   onFileSelected: async (fileName, oneLakeLink) => { ... },
 *   onTableSelected: async (tableName, oneLakeLink) => { ... },
 *   onItemChanged: async (item) => { ... }
 * };
 * 
 * <OneLakeView 
 *   workloadClient={workloadClient}
 *   config={config}
 *   callbacks={callbacks}
 * />
 * ```
 */

// Main control
export { OneLakeView } from './OneLakeView';

// Sub-components
export { FileTree } from './FileTree';
export { TableTreeWithSchema } from './TableTreeWithSchema';
export { TableTreeWithoutSchema } from './TableTreeWithoutSchema';

// Controller functions
export {
  getTables,
  getFiles,
  getShortcutContents,
  getFilesInPath,
  getItem
} from './OneLakeViewController';

// Types and interfaces
export type {
  OneLakeViewProps,
  OneLakeViewConfig,
  OneLakeViewCallbacks,
  OneLakeViewItem,
  TableMetadata,
  FileMetadata,
  OneLakeObjectMetadata,
  OneLakeViewTablesTreeProps,
  OneLakeViewFilesTreeProps,
  LoadingStatus,
  ContextMenuState
} from './OneLakeViewModel';