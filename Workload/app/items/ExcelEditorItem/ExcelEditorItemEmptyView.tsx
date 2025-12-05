import React from "react";
import { useTranslation } from "react-i18next";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { ExcelEditorItemDefinition } from "./ExcelEditorItemDefinition";
import { ItemEditorEmptyView, EmptyStateTask } from "../../components/ItemEditor";

interface ExcelEditorItemEmptyViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<ExcelEditorItemDefinition>;
  onItemUpdate?: (updatedItem: ItemWithDefinition<ExcelEditorItemDefinition>) => void;
  onAddTable: () => Promise<void>;
}

/**
 * Empty state component - the first screen users see
 * This shows the lakehouse selection interface to start the Excel editing workflow
 */
export function ExcelEditorItemEmptyView({
  onAddTable
}: ExcelEditorItemEmptyViewProps) {
  const { t } = useTranslation();

  // Define onboarding tasks
  const tasks: EmptyStateTask[] = [
    {
      id: 'add-table',
      label: t('Add Table', 'Add Table'),
      onClick: onAddTable,
      appearance: 'primary'
    }
  ];

  return (
    <ItemEditorEmptyView
      title={t('Excel Editor', 'Excel Editor')}
      description={t('Select a table from your lakehouse to edit with Excel Online', 'Select a table from your lakehouse to edit with Excel Online')}
      tasks={tasks}
    />
  );
}
