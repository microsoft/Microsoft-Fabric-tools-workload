import React from "react";
import { useTranslation } from "react-i18next";

import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { DevOpsItemDefinition } from "./DevOpsItemDefinition";
import { ItemEditorEmptyView, EmptyStateTask } from "../../components/ItemEditor";
import "./DevOpsItem.scss";

interface DevOpsItemEmptyViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<DevOpsItemDefinition>;
  onStartScan: () => void;
}

/**
 * Empty state component - the first screen users see
 * Guides users to scan their workspaces for Git connections
 */
export function DevOpsItemEmptyView({
  workloadClient,
  item,
  onStartScan
}: DevOpsItemEmptyViewProps) {
  const { t } = useTranslation();

  // Define onboarding tasks
  const tasks: EmptyStateTask[] = [
    {
      id: 'scan',
      label: t('DevOpsItemEmptyView_ScanButton', 'Scan Workspaces'),
      onClick: onStartScan
    }
  ];

  return (
    <ItemEditorEmptyView
      title={t('DevOpsItemEmptyView_Title', 'Welcome to DevOps Item!')}
      description={t('DevOpsItemEmptyView_Description', 'View all your workspaces connected to Azure DevOps or GitHub. Start by scanning your accessible workspaces.')}
      imageSrc="/assets/items/DevOpsItem/EditorEmpty.svg"
      imageAlt="Empty state illustration"
      tasks={tasks}
    />
  );
}
