import React from "react";
import { useTranslation } from "react-i18next";
import { ItemEditorEmptyView, EmptyStateTask } from "../../components/ItemEditor";

interface FabricCLIItemEmptyViewProps {
  onSelectLakehouse: () => void;
}

/**
 * Empty state component for FabricCLI item
 * Shown when the item is first created or when no terminal session is active
 */
export function FabricCLIItemEmptyView({
  onSelectLakehouse
}: FabricCLIItemEmptyViewProps) {
  const { t } = useTranslation();

  const tasks: EmptyStateTask[] = [
    {
      id: 'select-lakehouse',
      label: t('FabricCLIItem_SelectLakehouse', 'Select Lakehouse'),
      description: t('FabricCLIItem_SelectLakehouse_Description', 'Select a Lakehouse to connect to.'),
      onClick: onSelectLakehouse,
    }
  ]

  return (
    <ItemEditorEmptyView
      title={t('FabricCLIItem_Title', 'Fabric CLI')}
      description={t('FabricCLIItem_Description', 'Connect to a Lakehouse and run Fabric CLI commands interactively.')}
      tasks={tasks}
    />
  );
}
