import React from "react";
import { DocumentAdd24Regular, Open24Regular, ArrowUpload24Regular } from "@fluentui/react-icons";
import { ItemEditorEmptyView, EmptyStateTask } from "../../components/ItemEditor/ItemEditorEmptyView";
import "./OneLakeExplorerItem.scss";

interface OneLakeExplorerItemEmptyViewProps {
  onCreateNewFile: () => Promise<void>;
  onUploadFile: () => Promise<void>;
  onOpenItem: () => Promise<void>;
}

export function OneLakeExplorerItemEmptyView({ onCreateNewFile, onUploadFile, onOpenItem }: OneLakeExplorerItemEmptyViewProps) {
  const tasks: EmptyStateTask[] = [
    {
      id: 'open-item',
      label: 'Open Item',
      description: 'Browse and select another data item to explore its files and content',
      onClick: onOpenItem,
      icon: <Open24Regular />
    },
    {
      id: 'create-file',
      label: 'Create New File',
      description: 'Start editing a new file in OneLake with syntax highlighting and IntelliSense',
      onClick: onCreateNewFile,
      icon: <DocumentAdd24Regular />
    },
    {
      id: 'upload-file',
      label: 'Upload File',
      description: 'Upload an existing file from your computer to the current item',
      onClick: onUploadFile,
      icon: <ArrowUpload24Regular />
    }
  ];

  return (
    <ItemEditorEmptyView
      title="Welcome to OneLake Explorer"
      description="Start exploring and editing files in OneLake by selecting a Data Item with files, creating a new file, or uploading an existing one to the current item. Experience editing with syntax highlighting, IntelliSense, and more."
      tasks={tasks}
    />
  );
}
