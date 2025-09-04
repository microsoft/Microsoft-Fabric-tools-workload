import React, { useState } from "react";
import { Document20Regular, FolderRegular, Delete20Regular, FolderAdd20Regular, Link20Regular, FolderLink20Regular } from "@fluentui/react-icons";
import { Tree, TreeItem, TreeItemLayout, Tooltip, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from "@fluentui/react-components";
import { FileMetadata, OneLakeItemExplorerFilesTreeProps } from "./SampleOneLakeItemExplorerModel";

interface TreeNode {
    metadata: FileMetadata;
    children: TreeNode[];
}

type FolderMap = Map<string, TreeNode>;

export function FileTree(props: OneLakeItemExplorerFilesTreeProps) {
    const {allFilesInItem: allFilesInOneLake, selectedFilePath, onSelectFileCallback, onDeleteFileCallback, onDeleteFolderCallback, onCreateFolderCallback, onCreateShortcutCallback} = props;
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const buildFileTree = (files: FileMetadata[]) => {
        const root: TreeNode[] = [];
        const folders: FolderMap = new Map();

        // Helper function to add a node (file or folder) to the tree
        const addNode = (metadata: FileMetadata): TreeNode => {
            const node: TreeNode = {
                metadata: metadata,
                children: []
            };
            
            // If it's a directory, store it in our folders map for later reference
            if (metadata.isDirectory) {
                folders.set(metadata.path, node);
            }

            // Add to parent folder or root
            const segments = metadata.path.split('/').filter(s => s);
            if (segments.length > 1) {
                const parentPath = segments.slice(0, -1).join('/');
                const parent = folders.get(parentPath);
                if (parent) {
                    parent.children.push(node);
                } else {
                    root.push(node);
                }
            } else {
                root.push(node);
            }

            return node;
        };

        // First pass: create folder nodes
        files.filter(f => f.isDirectory).forEach(folder => {
            addNode(folder);
        });

        // Second pass: add files to their folders
        files.filter(f => !f.isDirectory).forEach(file => {
            addNode(file);
        });

        // Sort tree alphabetically and by type (folders first)
        const sortNodes = (nodes: TreeNode[]) => {
            nodes.sort((a, b) => {
                if (a.metadata.isDirectory !== b.metadata.isDirectory) {
                    return a.metadata.isDirectory ? -1 : 1;
                }
                return a.metadata.name.localeCompare(b.metadata.name);
            });
            nodes.forEach(node => {
                if (node.children.length > 0) {
                    sortNodes(node.children);
                }
            });
        };

        sortNodes(root);
        return root;
    };

<<<<<<< HEAD
    const handleCreateFolder = async (parentPath: string) => {
        if (onCreateFolderCallback) {
            // Ensure the path includes the Files prefix since FileTree is within the Files directory
            const fullPath = parentPath ? `Files/${parentPath}` : "Files";
=======
    const handleCreateFolder = async (metadata: FileMetadata) => {
        if (onCreateFolderCallback) {
            // Ensure the path includes the Files prefix since FileTree is within the Files directory
            const fullPath = metadata ? `${metadata.prefix}/${metadata.path}` : "Files";
>>>>>>> starterkit/dev/gesaur/fabcon
            await onCreateFolderCallback(fullPath);
        }
    };

<<<<<<< HEAD
    const handleCreateShortcut = async (parentPath: string) => {
        if (onCreateShortcutCallback) {
            // Ensure the path includes the Files prefix since FileTree is within the Files directory
            const fullPath = parentPath ? `Files/${parentPath}` : "Files";
=======
    const handleCreateShortcut = async (metadata: FileMetadata) => {
        if (onCreateShortcutCallback) {
            // Ensure the path includes the Files prefix since FileTree is within the Files directory
            const fullPath = metadata ? `${metadata.prefix}/${metadata.path}` : "Files";
>>>>>>> starterkit/dev/gesaur/fabcon
            await onCreateShortcutCallback(fullPath);
        }
    };

<<<<<<< HEAD
    const handleDeleteFile = async (filePath: string) => {
        if (onDeleteFileCallback) {
            const fullPath = filePath ? `Files/${filePath}` : "Files";
=======
    const handleDeleteFile = async (metadata: FileMetadata) => {
        if (onDeleteFileCallback) {
            const fullPath = metadata ? `${metadata.prefix}/${metadata.path}` : "Files";
>>>>>>> starterkit/dev/gesaur/fabcon
            await onDeleteFileCallback(fullPath);
        }
    };

<<<<<<< HEAD
    const handleDeleteFolder = async (folderPath: string) => {
        if (onDeleteFolderCallback) {
            // Ensure the path includes the Files prefix since FileTree is within the Files directory
            const fullPath = folderPath ? `Files/${folderPath}` : "Files";
=======
    const handleDeleteFolder = async (metadata: FileMetadata) => {
        if (onDeleteFolderCallback) {
            // Ensure the path includes the Files prefix since FileTree is within the Files directory
            const fullPath = metadata ? `${metadata.prefix}/${metadata.path}` : "Files";
>>>>>>> starterkit/dev/gesaur/fabcon
            await onDeleteFolderCallback(fullPath);
        }
    };

    const renderTreeNode = (node: TreeNode): JSX.Element => {
        const { metadata, children } = node;

        if (metadata.isDirectory) {
            // Use different icon for shortcut folders vs regular folders
            const folderIcon = metadata.isShortcut ? <FolderLink20Regular /> : <FolderRegular />;
            
            return (
                <TreeItem key={metadata.path} itemType="branch">
                    <Menu 
                        open={openMenu === metadata.path}
                        onOpenChange={(e, data) => setOpenMenu(data.open ? metadata.path : null)}
                    >
                        <MenuTrigger disableButtonEnhancement>
                            <Tooltip relationship="label" content={metadata.name}>
                                <TreeItemLayout 
                                    iconBefore={folderIcon}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setOpenMenu(metadata.path);
                                    }}
                                >
                                    {metadata.name}
                                </TreeItemLayout>
                            </Tooltip>
                        </MenuTrigger>
                        <MenuPopover>
                            <MenuList>
                                {/* Only show create options for regular folders (not shortcuts) */}
                                {onCreateFolderCallback && !metadata.isShortcut && (
                                    <MenuItem 
                                        icon={<FolderAdd20Regular />}
                                        onClick={() => {
<<<<<<< HEAD
                                            handleCreateFolder(metadata.path);
=======
                                            handleCreateFolder(metadata);
>>>>>>> starterkit/dev/gesaur/fabcon
                                            setOpenMenu(null);
                                        }}
                                    >
                                        Create Folder
                                    </MenuItem>
                                )}
                                {onCreateShortcutCallback && !metadata.isShortcut && (
                                    <MenuItem 
                                        icon={<Link20Regular />}
                                        onClick={() => {
<<<<<<< HEAD
                                            handleCreateShortcut(metadata.path);
=======
                                            handleCreateShortcut(metadata);
>>>>>>> starterkit/dev/gesaur/fabcon
                                            setOpenMenu(null);
                                        }}
                                    >
                                        Create Shortcut
                                    </MenuItem>
                                )}
                                {/* Only show delete option for shortcut folders */}
                                {onDeleteFolderCallback && metadata.isShortcut && (
                                    <MenuItem 
                                        icon={<Delete20Regular />}
                                        onClick={() => {
<<<<<<< HEAD
                                            handleDeleteFolder(metadata.path);
=======
                                            handleDeleteFolder(metadata);
>>>>>>> starterkit/dev/gesaur/fabcon
                                            setOpenMenu(null);
                                        }}
                                    >
                                        Delete Shortcut
                                    </MenuItem>
                                )}
                            </MenuList>
                        </MenuPopover>
                    </Menu>
                    <Tree>
                        {children.map(child => renderTreeNode(child))}
                    </Tree>
                </TreeItem>
            );
        } else {
            return (
                <TreeItem
                    key={metadata.path}
                    itemType="leaf"
                >
                    <Menu 
                        open={openMenu === metadata.path}
                        onOpenChange={(e, data) => {
                            // Only allow opening on right-click context menu
                            if (data.open && e.type !== 'contextmenu') {
                                return;
                            }
                            setOpenMenu(data.open ? metadata.path : null);
                        }}
                    >
                        <MenuTrigger disableButtonEnhancement>
                            <Tooltip relationship="label" content={metadata.name}>
                                <TreeItemLayout
                                    className={selectedFilePath === metadata.path ? "selected" : ""}
                                    iconBefore={<Document20Regular />}
                                    onClick={(e) => {
                                        // Left click - select file
                                        e.stopPropagation();
                                        onSelectFileCallback(metadata);
                                    }}
                                    onContextMenu={(e) => {
                                        // Right click - show context menu
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setOpenMenu(metadata.path);
                                    }}
                                >
                                    {metadata.name}
                                </TreeItemLayout>
                            </Tooltip>
                        </MenuTrigger>
                        <MenuPopover>
                            <MenuList>
                                {onDeleteFileCallback && (
                                    <MenuItem 
                                        icon={<Delete20Regular />}
                                        onClick={() => {
<<<<<<< HEAD
                                            handleDeleteFile(metadata.path);
=======
                                            handleDeleteFile(metadata);
>>>>>>> starterkit/dev/gesaur/fabcon
                                            setOpenMenu(null);
                                        }}
                                    >
                                        Delete File
                                    </MenuItem>
                                )}
                            </MenuList>
                        </MenuPopover>
                    </Menu>
                </TreeItem>
            );
        }
    };

    const fileTree = buildFileTree(allFilesInOneLake || []);

    // Close menu when clicking outside
    const handleGlobalClick = () => {
        setOpenMenu(null);
    };

    React.useEffect(() => {
        document.addEventListener('click', handleGlobalClick);
        return () => {
            document.removeEventListener('click', handleGlobalClick);
        };
    }, []);

    return (
        <>
            {fileTree.length > 0 ? (
                fileTree.map(node => renderTreeNode(node))
            ) : (
                // Show context menu option when Files folder is empty
                (onCreateFolderCallback || onCreateShortcutCallback) && (
                    <div 
                        style={{ padding: "8px", color: "#666", fontStyle: "italic" }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            if (onCreateFolderCallback) {
<<<<<<< HEAD
                                handleCreateFolder("");
=======
                                handleCreateFolder(undefined);
>>>>>>> starterkit/dev/gesaur/fabcon
                            }
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onCreateFolderCallback) {
<<<<<<< HEAD
                                handleCreateFolder("");
=======
                                handleCreateFolder(undefined);
>>>>>>> starterkit/dev/gesaur/fabcon
                            }
                        }}
                    >
                        Right-click or click here to create a folder or shortcut
                    </div>
                )
            )}
        </>
    );
}
