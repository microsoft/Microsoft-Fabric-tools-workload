/**
 * OneLakeItemExplorer Control - Main Export Module
 * 
 * This module provides a reusable OneLake Item Explorer control that can be
 * integrated into any component that needs tree-based OneLake browsing functionality.
 * 
 * Core Components:
 * - OneLakeItemExplorer: Main control with tree functionality
 * - FileTree: File system tree component
 * - TableTreeWithSchema: Table tree with schema grouping
 * - TableTreeWithoutSchema: Flat table tree
 * 
 * Data Models:
 * - OneLakeItemExplorerProps: Main control props interface
 * - OneLakeItemExplorerConfig: Configuration options
 * - OneLakeItemExplorerCallbacks: Event callback functions
 * - TableMetadata, FileMetadata: Data structures
 * 
 * Usage:
 * ```tsx
 * import { OneLakeItemExplorer } from '../controls/OneLakeItemExplorer';
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
 * <OneLakeItemExplorer 
 *   workloadClient={workloadClient}
 *   config={config}
 *   callbacks={callbacks}
 * />
 * ```
 */

// Main control
export { OneLakeItemExplorer } from './OneLakeItemExplorer';

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
} from './OneLakeItemExplorerController';

// Types and interfaces
export type {
  OneLakeItemExplorerProps,
  OneLakeItemExplorerConfig,
  OneLakeItemExplorerCallbacks,
  OneLakeItemExplorerItem,
  TableMetadata,
  FileMetadata,
  OneLakeObjectMetadata,
  OneLakeItemExplorerTablesTreeProps,
  OneLakeItemExplorerFilesTreeProps,
  LoadingStatus,
  ContextMenuState
} from './OneLakeItemExplorerModel';