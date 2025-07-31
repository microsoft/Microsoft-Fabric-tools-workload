import React from "react";
import { Document20Regular, FolderRegular, Delete20Regular, FolderAdd20Regular } from "@fluentui/react-icons";
import { Tree, TreeItem, TreeItemLayout, Tooltip, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem } from "@fluentui/react-components";
import { FileMetadata, OneLakeItemExplorerFilesTreeProps } from "./SampleOneLakeItemExplorerModel";

interface TreeNode {
    metadata: FileMetadata;
    children: TreeNode[];
}

type FolderMap = Map<string, TreeNode>;

export function FileTree(props: OneLakeItemExplorerFilesTreeProps) {
    const {allFilesInItem: allFilesInOneLake, onSelectFileCallback, onDeleteFileCallback, onCreateFolderCallback} = props;

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

    const handleCreateFolder = async (parentPath: string) => {
        const folderName = prompt("Enter folder name:");
        if (folderName && folderName.trim() && onCreateFolderCallback) {
            await onCreateFolderCallback(parentPath, folderName.trim());
        }
    };

    const handleDeleteFile = async (filePath: string) => {
        if (window.confirm("Are you sure you want to delete this file?") && onDeleteFileCallback) {
            await onDeleteFileCallback(filePath);
        }
    };

    const renderTreeNode = (node: TreeNode): JSX.Element => {
        const { metadata, children } = node;

        if (metadata.isDirectory) {
            return (
                <TreeItem key={metadata.path} itemType="branch">
                    <Menu>
                        <MenuTrigger disableButtonEnhancement>
                            <Tooltip relationship="label" content={metadata.name}>
                                <TreeItemLayout iconBefore={<FolderRegular />}>
                                    {metadata.name}
                                </TreeItemLayout>
                            </Tooltip>
                        </MenuTrigger>
                        <MenuPopover>
                            <MenuList>
                                {onCreateFolderCallback && (
                                    <MenuItem 
                                        icon={<FolderAdd20Regular />}
                                        onClick={() => handleCreateFolder(metadata.path)}
                                    >
                                        Create Folder
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
                    onClick={() => onSelectFileCallback(metadata)}
                >
                    <Menu>
                        <MenuTrigger disableButtonEnhancement>
                            <Tooltip relationship="label" content={metadata.name}>
                                <TreeItemLayout
                                    className={metadata.isSelected ? "selected" : ""}
                                    iconBefore={<Document20Regular />}
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
                                        onClick={() => handleDeleteFile(metadata.path)}
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

    return (
        <>
            {fileTree.map(node => renderTreeNode(node))}
        </>
    );
}
