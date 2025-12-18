import React from "react";
import { useTranslation } from "react-i18next";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { SparkTerminalItemDefinition } from "./SparkTerminalItemModel";
import { ItemEditorEmptyView, EmptyStateTask } from "../../components/ItemEditor";

interface SparkTerminalItemEmptyViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<SparkTerminalItemDefinition>;
  onStartTerminal: () => void;
}

/**
 * Empty state component for SparkTerminal item
 * Shown when the item is first created or when no terminal session is active
 */
export function SparkTerminalItemEmptyView({
  workloadClient,
  item,
  onStartTerminal
}: SparkTerminalItemEmptyViewProps) {
  const { t } = useTranslation();

  const tasks: EmptyStateTask[] = [
    {
      id: 'start-terminal',
      label: t('SparkTerminalItem_StartTerminal', 'Start Terminal'),
      onClick: onStartTerminal,
      appearance: 'primary'
    }
  ];

  return (
    <ItemEditorEmptyView
      title={t('SparkTerminalItem_Title', 'Spark Terminal')}
      description={t('SparkTerminalItem_Description', 'Connect to a Lakehouse and run Spark commands interactively.')}
      tasks={tasks}
      imageSrc="/assets/items/SparkTerminal/EditorEmpty.png"
    />
  );
}
