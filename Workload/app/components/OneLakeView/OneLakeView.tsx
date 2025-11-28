import React, { useEffect, useState } from "react";
import { Stack } from "@fluentui/react";
import {
  Tree,
  TreeItem,
  TreeItemLayout,
  Spinner,
  Subtitle2,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Button,
  Image,
  Tooltip
} from "@fluentui/react-components";
import { FolderAdd20Regular, Link20Regular } from "@fluentui/react-icons";
import { 
  OneLakeViewProps,
  TableMetadata, 
  FileMetadata, 
  OneLakeViewItem,
  LoadingStatus 
} from "./OneLakeViewModel";
import "./OneLakeView.scss";
import { getTables, getFiles } from "./OneLakeViewController";
import { TableTreeWithSchema } from "./TableTreeWithSchema";
import { TableTreeWithoutSchema } from "./TableTreeWithoutSchema";
import { FileTree } from "./FileTree";
import { callDatahubOpen, callDatahubWizardOpen } from "../../controller/DataHubController";
import { OneLakeShortcutClient } from "../../clients/OneLakeShortcutClient";
import { NotificationType } from "@ms-fabric/workload-client";
import { OneLakeStorageClient } from "../../clients/OneLakeStorageClient";
import { callNotificationOpen } from "../../controller/NotificationController";
import { callDialogOpenMsgBox } from "../../controller/DialogController";

/**
 * OneLakeView - Core tree functionality for exploring OneLake items
 * 
 * This component provides the essential tree view functionality for browsing OneLake items,
 * including tables and files, with support for context menus, loading states, and CRUD operations.
 * 
 * Core Features:
 * - Tree view for Tables and Files
 * - Context menus for create/delete operations
 * - Loading states and error handling
 * - File and table selection callbacks
 * - Shortcut support
 * - Schema detection for tables
 * 
 * This component focuses on the tree functionality only. Header, collapse logic,
 * and layout should be handled by the consuming component.
 * 
 * @see {@link ../../docs/components/OneLakeView.md} - Complete OneLakeView documentation
 * @see {@link https://react.fluentui.dev/} - Fluent UI v9 Documentation
 * @see {@link ./OneLakeViewController.ts} - OneLake data operations controller
 */
export function OneLakeView(props: OneLakeViewProps) {
  const [selectedItem, setSelectedItem] = useState<OneLakeViewItem>(null);
  const [tablesInItem, setTablesInItem] = useState<TableMetadata[]>(null);
  const [filesInItem, setFilesInItem] = useState<FileMetadata[]>(null);
  const [selectedTablePath, setSelectedTablePath] = useState<string>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>("idle");
  const [hasSchema, setHasSchema] = useState<boolean>(false);
  const [openFilesMenu, setOpenFilesMenu] = useState<boolean>(false);
  const [openTablesMenu, setOpenTablesMenu] = useState<boolean>(false);

  // Initialize selectedItem from props.config.initialItem
  useEffect(() => {
    if (props.config.initialItem && 
        props.config.initialItem.id && 
        props.config.initialItem.workspaceId) {
        setSelectedItem(props.config.initialItem);
    } else {
      // No initial item provided, show empty state
      setLoadingStatus("idle");
    }
  }, [props.config.initialItem]);

  useEffect(() => {
    const fetchData = async () => {
      if (selectedItem && selectedItem.id && selectedItem.workspaceId) {
        setLoadingStatus("loading");
        let success = false;
        try {
          success = await setTablesAndFiles(null);
        } catch (exception) {
          try {
            success = await setTablesAndFiles(".default");
          } catch (secondException) {
            console.error("OneLakeView: Failed to load data for item:", selectedItem, secondException);
            success = false;
          }
        }
        setLoadingStatus(success ? "idle" : "error");
      } else if (selectedItem) {
        // selectedItem exists but is missing required properties
        console.error("OneLakeView: selectedItem is missing required properties:", selectedItem);
        setLoadingStatus("error");
      }
    };
    fetchData();
  }, [selectedItem]);

  // Watch for refresh trigger changes to re-fetch data
  useEffect(() => {
    if (props.config.refreshTrigger && selectedItem && selectedItem.id && selectedItem.workspaceId) {
      const fetchData = async () => {
        setLoadingStatus("loading");
        let success = false;
        try {
          success = await setTablesAndFiles(null);
        } catch (exception) {
          try {
            success = await setTablesAndFiles(".default");
          } catch (secondException) {
            console.error("OneLakeView: Failed to refresh data for item:", selectedItem, secondException);
            success = false;
          }
        }
        setLoadingStatus(success ? "idle" : "error");
      };
      fetchData();
    }
  }, [props.config.refreshTrigger, selectedItem]);

  async function setTablesAndFiles(additionalScopesToConsent: string): Promise<boolean> {
    try {
      if (!selectedItem || !selectedItem.workspaceId || !selectedItem.id) {
        console.error("OneLakeView: Cannot fetch data - selectedItem is invalid:", selectedItem);
        return false;
      }

      console.log(`Fetching tables and files for item: ${selectedItem.id} in workspace: ${selectedItem.workspaceId}`);
      let tables = await getTables(props.workloadClient, selectedItem.workspaceId, selectedItem.id);
      let files = await getFiles(props.workloadClient, selectedItem.workspaceId, selectedItem.id);

      if (tables && files) {
        console.log(`Loaded ${tables.length} tables and ${files.length} files`);
        setTablesInItem(tables);
        setFilesInItem(files);
        setHasSchema(tables[0]?.schema != null);
        // Clear selections when new data is loaded
        setSelectedTablePath(null);
        setSelectedFilePath(null);
        return true;
      }
    } catch (error) {
      console.error("OneLakeView: Error fetching tables and files:", error);
    }
    return false;
  }

  function getFullObjectPath(oneLakeObject: { prefix: string; path: string }): string {
    return `${oneLakeObject.prefix}/${oneLakeObject.path}`;
  }

  function tableSelectedCallback(tableSelected: TableMetadata) {
    const tableFilePath = OneLakeStorageClient.getPath(selectedItem.workspaceId, selectedItem.id, getFullObjectPath(tableSelected));
    // Update selection state without modifying the tables array
    setSelectedTablePath(tableSelected.path); // Keep original path for selection comparison
    setSelectedFilePath(null); // Clear file selection when table is selected
    if (props.callbacks.onTableSelected && tableSelected.name) {
      props.callbacks.onTableSelected(tableSelected.name, tableFilePath);
    }
  }

  async function fileSelectedCallback(fileSelected: FileMetadata) {
    const fullFilePath = OneLakeStorageClient.getPath(selectedItem.workspaceId, selectedItem.id, getFullObjectPath(fileSelected));
    // Update selection state without modifying the files array
    setSelectedFilePath(fileSelected.path);
    setSelectedTablePath(null); // Clear table selection when file is selected
    if (props.callbacks.onFileSelected && fileSelected.name) {
      await props.callbacks.onFileSelected(fileSelected.name, fullFilePath);
    }
  }

  async function deleteFileCallback(filePath: string) {
    // Show confirmation dialog
    const fileName = filePath.split('/').pop() || filePath; // Get just the filename
    const clickedButton = await callDialogOpenMsgBox(
      props.workloadClient,
      "Delete File",
      `Are you sure you want to delete the file "${fileName}"?\n\nThis action cannot be undone.`,
      ["Yes", "No"]
    );
    
    if (clickedButton !== "Yes") {
      return; // User cancelled, don't delete
    }

    try {
      const fullFilePath = OneLakeStorageClient.getPath(selectedItem.workspaceId, selectedItem.id, filePath);
      const oneLakeClient = new OneLakeStorageClient(props.workloadClient);
      await oneLakeClient.deleteFile(fullFilePath);

      // Refresh the file list after deletion
      await setTablesAndFiles(null);
    } catch (error) {
      console.error("Failed to delete file:", error);
      await callNotificationOpen(
        props.workloadClient,
        "Delete Failed",
        "Failed to delete file. Please try again.",
        NotificationType.Error
      );
    }
  }

  async function deleteFolderCallback(folderPath: string) {
    // Show confirmation dialog for folder deletion
    const folderName = folderPath.split('/').pop() || folderPath; // Get just the folder name
    const clickedButton = await callDialogOpenMsgBox(
      props.workloadClient,
      "Delete Shortcut Folder",
      `Are you sure you want to delete the shortcut folder "${folderName}"?\n\nThis will remove the shortcut but not the original data.\nThis action cannot be undone.`,
      ["Yes", "No"]
    );
    
    if (clickedButton !== "Yes") {
      return; // User cancelled, don't delete
    }

    try {
      const fullFolderPath = OneLakeStorageClient.getPath(selectedItem.workspaceId, selectedItem.id, folderPath);
      const oneLakeClient = new OneLakeStorageClient(props.workloadClient);
      await oneLakeClient.deleteFile(fullFolderPath);
      
      // Refresh the file list after deletion
      await setTablesAndFiles(null);
    } catch (error) {
      console.error("Failed to delete folder:", error);
      await callNotificationOpen(
        props.workloadClient,
        "Delete Failed",
        "Failed to delete folder. Please try again.",
        NotificationType.Error
      );
    }
  }

  async function createFolderCallback(parentPath: string) {
    // Get folder name from user - using prompt as placeholder until custom dialog is implemented
    const folderName = "New Folder"
    
    if (!folderName || !folderName.trim()) {
      return; // User cancelled or entered empty name
    }

    try {
      const folderPath = parentPath ? `${parentPath}/${folderName.trim()}` : folderName.trim();
      const fullFolderPath = OneLakeStorageClient.getPath(selectedItem.workspaceId, selectedItem.id, folderPath);
      console.log(`Creating folder at path: ${fullFolderPath}`);
      
      const oneLakeClient = new OneLakeStorageClient(props.workloadClient);
      await oneLakeClient.createFolder(fullFolderPath);
      console.log(`Folder created successfully, refreshing tree...`);
      
      // Show success notification
      await callNotificationOpen(
        props.workloadClient,
        "Folder Created",
        `Folder "${folderName.trim()}" created successfully.`,
        NotificationType.Success
      );
      
      // Refresh the file list after folder creation
      await setTablesAndFiles(null);
      console.log(`Tree refresh completed`);
    } catch (error) {
      console.error("Failed to create folder:", error);
      await callNotificationOpen(
        props.workloadClient,
        "Create Folder Failed",
        "Failed to create folder. Please try again.",
        NotificationType.Error
      );
    }
  }

  async function createShortcutCallback(parentPath: string) {
    try {
      // Open data hub wizard to select target item and path for the shortcut
      const targetItemAndPath = await callDatahubWizardOpen(
        props.workloadClient,
        props.config.allowedItemTypes || ["Lakehouse"],
        "Create Shortcut",
        "Select a target location to create a shortcut to",
        false, // Single selection
        true,  // Show files folder
        true   // Workspace navigation enabled
      );

      if (!targetItemAndPath) {
        return; // User cancelled
      }

      // Create shortcut name based on the last element of the selected path
      const shortcutName = targetItemAndPath.selectedPath 
        ? targetItemAndPath.selectedPath.split('/').pop() || targetItemAndPath.displayName
        : targetItemAndPath.displayName;

      // Create the OneLake shortcut using the client
      const shortcutClient = new OneLakeShortcutClient(props.workloadClient);
      await shortcutClient.createOneLakeShortcut(
        selectedItem.workspaceId,
        selectedItem.id,
        shortcutName,
        parentPath,
        targetItemAndPath.workspaceId,
        targetItemAndPath.id,
        targetItemAndPath.selectedPath
      );

      console.log(`Created shortcut "${shortcutName}" to item: ${targetItemAndPath.displayName}, path: ${targetItemAndPath.selectedPath}`);
      
      // Show success notification
      await callNotificationOpen(
        props.workloadClient,
        "Shortcut Created",
        `Shortcut "${shortcutName}" created successfully.`,
        NotificationType.Success
      );
      
      // Refresh the file list after shortcut creation
      await setTablesAndFiles(null);
    } catch (error) {
      console.error("Failed to create shortcut:", error);
      await callNotificationOpen(
        props.workloadClient,
        "Create Shortcut Failed",
        "Failed to create shortcut. Please try again.",
        NotificationType.Error
      );
    }
  }

  // Handler for creating folder from Files node
  const handleCreateFolderFromFilesNode = async () => {
    await createFolderCallback("Files");
    setOpenFilesMenu(false);
  };

  // Handler for creating shortcut from Files node
  const handleCreateShortcutFromFilesNode = async () => {
    await createShortcutCallback("Files");
    setOpenFilesMenu(false);
  };

  // Handler for creating shortcut from Tables node
  const handleCreateShortcutFromTablesNode = async () => {
    await createShortcutCallback("Tables");
    setOpenTablesMenu(false);
  };

  // Helper functions for empty state
  function getDefaultItemTypes() {
    const workloadName = process.env.WORKLOAD_NAME;
    const itemTypes = process.env.ITEM_NAMES
      ?.split(",")
      .map(item => `${workloadName}.${item.trim()}`) || [];
    return ["Lakehouse", ...itemTypes];
  }

  async function onDatahubClicked() {
    if (!props.callbacks?.onItemChanged) {
      console.warn("OneLakeView: onItemChanged callback is required for item selection");
      return;
    }

    const result = await callDatahubOpen(
      props.workloadClient,
      [...props.config.allowedItemTypes || getDefaultItemTypes()],
      "Select an item to use for OneLake Explorer",
      false
    );

    if (result) {
      await props.callbacks.onItemChanged(result);
    }
  }

  // If no item is selected, show empty state
  if (!selectedItem) {
    return (
      <div className="onelake-view__container">
        <Stack className="onelake-view__empty" verticalAlign="center" horizontalAlign="center" tokens={{ childrenGap: 5 }} style={{ flex: 1 }}>
          <Image src="/assets/components/OneLakeView/EmptyIcon.svg" />
          <span className="add">Add an item</span>
          {props.config?.allowItemSelection && (
            <Tooltip content={"Open Datahub Explorer"} relationship="label">
              <Button className="add-button" size="small" onClick={() => onDatahubClicked()} appearance="primary">
                Add
              </Button>
            </Tooltip>
          )}
        </Stack>
      </div>
    );
  }

  // Show loading spinner
  if (loadingStatus === "loading") {
    return (
      <div className="onelake-view__container">
        <div className="onelake-view__loading">
          <Spinner label="Loading Data" />
        </div>
      </div>
    );
  }

  // Show error state
  if (loadingStatus === "error") {
    return (
      <div className="onelake-view__container">
        <div className="onelake-view__error">
          <Subtitle2>Error loading data</Subtitle2>
          <p>Do you have permission to view this Item?</p>
        </div>
      </div>
    );
  }

  // Render the main tree
  return (
    <Tree
      aria-label="OneLake Item Explorer"
      className="onelake-view__tree"
      size="medium"
      defaultOpenItems={["Tables", "Files"]}
    >
      <div className="onelake-view__tree-container">
        <TreeItem itemType="branch" value="Tables">
          <Menu
            open={openTablesMenu}
            onOpenChange={(e, data) => {
              // Only allow opening on right-click context menu and in edit mode
              if (props.config.mode !== "edit" || (data.open && e.type !== 'contextmenu')) {
                return;
              }
              setOpenTablesMenu(data.open);
            }}
          >
            <MenuTrigger disableButtonEnhancement>
              <div
                onClick={() => {
                  // When Tables folder is clicked, select the first table if available
                  if (tablesInItem && tablesInItem.length > 0) {
                    tableSelectedCallback(tablesInItem[0]);
                  }
                }}
                onContextMenu={(e) => {
                  if (props.config.mode === "edit") {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenTablesMenu(true);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <TreeItemLayout>
                  Tables
                </TreeItemLayout>
              </div>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem 
                  icon={<Link20Regular />}
                  onClick={handleCreateShortcutFromTablesNode}
                >
                  Create Shortcut
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Tree className="onelake-view__subtree" selectionMode="single">
            {hasSchema &&
              <TableTreeWithSchema
                allTablesInItem={tablesInItem}
                selectedTablePath={selectedTablePath}
                onSelectTableCallback={tableSelectedCallback} />
            }
            {!hasSchema &&
              <TableTreeWithoutSchema
                allTablesInItem={tablesInItem}
                selectedTablePath={selectedTablePath}
                onSelectTableCallback={tableSelectedCallback} />
            }
          </Tree>
        </TreeItem>
        
        <TreeItem itemType="branch" value="Files">
          <Menu
            open={openFilesMenu}
            onOpenChange={(e, data) => {
              // Only allow opening on right-click context menu and in edit mode
              if (props.config.mode !== "edit" || (data.open && e.type !== 'contextmenu')) {
                return;
              }
              setOpenFilesMenu(data.open);
            }}
          >
            <MenuTrigger disableButtonEnhancement>
              <div
                onClick={() => {
                  // When Files folder is clicked, select the first file if available
                  if (filesInItem && filesInItem.length > 0) {
                    fileSelectedCallback(filesInItem[0]);
                  }
                }}
                onContextMenu={(e) => {
                  if (props.config.mode === "edit") {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenFilesMenu(true);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <TreeItemLayout>
                  Files
                </TreeItemLayout>
              </div>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem 
                  icon={<FolderAdd20Regular />}
                  onClick={handleCreateFolderFromFilesNode}
                >
                  Create Folder
                </MenuItem>
                <MenuItem 
                  icon={<Link20Regular />}
                  onClick={handleCreateShortcutFromFilesNode}
                >
                  Create Shortcut
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Tree className="onelake-view__subtree" selectionMode="single">
            <FileTree
              allFilesInItem={filesInItem}
              selectedFilePath={selectedFilePath}
              onSelectFileCallback={fileSelectedCallback}
              onDeleteFileCallback={deleteFileCallback}
              onDeleteFolderCallback={deleteFolderCallback}
              onCreateFolderCallback={createFolderCallback}
              onCreateShortcutCallback={createShortcutCallback}
              workloadClient={props.workloadClient}
              workspaceId={selectedItem?.workspaceId}
              itemId={selectedItem?.id}
              mode={props.config.mode} />
          </Tree>
        </TreeItem>
      </div>
    </Tree>
  );
}