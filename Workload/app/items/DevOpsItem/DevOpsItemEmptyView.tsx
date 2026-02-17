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
  onNavigateToConfiguration: () => void;
}

/**
 * Empty state component - the first screen users see
 * Guides users to configure their GitHub repository connection
 */
export function DevOpsItemEmptyView({
  workloadClient,
  item,
  onNavigateToConfiguration
}: DevOpsItemEmptyViewProps) {
  const { t } = useTranslation();

  // Define onboarding tasks
  const tasks: EmptyStateTask[] = [
    {
      id: 'configure',
      label: t('DevOpsItemEmptyView_ConfigureButton', 'Configure Repository'),
      onClick: onNavigateToConfiguration,
      appearance: 'primary'
    }
  ];

  return (
    <ItemEditorEmptyView
      title={t('DevOpsItemEmptyView_Title', 'Welcome to DevOps Item!')}
      description={t('DevOpsItemEmptyView_Description', 'Track GitHub branches and their latest commits. Start by configuring your repository connection.')}
      imageSrc="/assets/items/DevOpsItem/EditorEmpty.svg"
      imageAlt="Empty state illustration"
      tasks={tasks}
    />
  );
}
