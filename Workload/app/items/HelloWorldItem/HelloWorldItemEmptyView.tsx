import React from "react";
import { useTranslation } from "react-i18next";

import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { HelloWorldItemDefinition } from "./HelloWorldItemModel";
import { BaseItemEditorEmptyView, EmptyStateTask } from "../../controls";

interface HelloWorldItemEmptyViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<HelloWorldItemDefinition>;
  onNavigateToGettingStarted: () => void;
}

/**
 * Empty state component - the first screen users see
 * This is a static page that can be easily removed or replaced by developers
 * 
 * To skip this page, modify HelloWorldItemEditor.tsx line 25,55
 * to always set currentView to 'getting-started'
 * 
 * This component now uses the BaseItemEditorEmptyView control for consistency
 * across all item types.
 */
export function HelloWorldItemEmptyView({
  workloadClient,
  item,
  onNavigateToGettingStarted
}: HelloWorldItemEmptyViewProps) {
  const { t } = useTranslation();

  // Define onboarding tasks
  const tasks: EmptyStateTask[] = [
    {
      id: 'getting-started',
      label: t('HelloWorldItemEmptyView_StartButton', 'Getting Started'),
      description: t('HelloWorldItemEmptyView_StartDescription', 'Learn how to use this item'),
      onClick: onNavigateToGettingStarted,
      appearance: 'primary'
    }
  ];

  return (
    <BaseItemEditorEmptyView
      title={t('HelloWorldItemEmptyView_Title', 'Welcome to HelloWorld!')}
      description={t('HelloWorldItemEmptyView_Description', 'This is the first screen people will see after an item is created. Include some basic information to help them continue.')}
      imageSrc="/assets/items/HelloWorldItem/EditorEmpty.svg"
      imageAlt="Empty state illustration"
      tasks={tasks}
    />
  );
}