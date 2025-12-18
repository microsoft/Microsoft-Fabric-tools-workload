import React from "react";
import { useTranslation } from "react-i18next";
import { ItemEditorEmptyView, EmptyStateTask } from "../../components/ItemEditor";

interface SparkTerminalItemEmptyViewProps {
  onSelectLakehouse: () => void;
}

/**
 * Empty state component for SparkTerminal item
 * Shown when the item is first created or when no terminal session is active
 */
export function SparkTerminalItemEmptyView({
  onSelectLakehouse
}: SparkTerminalItemEmptyViewProps) {
  const { t } = useTranslation();

  const tasks: EmptyStateTask[] = [
    {
      id: 'select-lakehouse',
      label: t('SparkTerminalItem_SelectLakehouse', 'Select Lakehouse'),
      description: t('SparkTerminalItem_SelectLakehouse_Description', 'Select a Lakehouse to connect to.'),
      onClick: onSelectLakehouse,
    }
  ]

  return (
    <ItemEditorEmptyView
      title={t('SparkTerminalItem_Title', 'Spark Terminal')}
      description={t('SparkTerminalItem_Description', 'Connect to a Lakehouse and run Spark commands interactively.')}
      tasks={tasks}
    />
  );
}
