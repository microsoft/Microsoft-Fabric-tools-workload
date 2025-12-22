import React from "react";
import { useTranslation } from "react-i18next";
import { ItemEditorEmptyView, EmptyStateTask } from "../../components/ItemEditor";

interface CloudShellItemEmptyViewProps {
  onSelectLakehouse: () => void;
}

/**
 * Empty state component for CloudShell item
 * Shown when the item is first created or when no terminal session is active
 */
export function CloudShellItemEmptyView({
  onSelectLakehouse
}: CloudShellItemEmptyViewProps) {
  const { t } = useTranslation();

  const tasks: EmptyStateTask[] = [
    {
      id: 'select-lakehouse',
      label: t('CloudShellItem_SelectLakehouse', 'Select Lakehouse'),
      description: t('CloudShellItem_SelectLakehouse_Description', 'Select a Lakehouse to connect to.'),
      onClick: onSelectLakehouse,
    }
  ]

  return (
    <ItemEditorEmptyView
      title={t('CloudShellItem_Title', 'Cloud Shell')}
      description={t('CloudShellItem_Description', 'Connect to a Lakehouse and run Cloud Shell commands interactively.')}
      tasks={tasks}
    />
  );
}
