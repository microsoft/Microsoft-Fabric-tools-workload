import React from "react";
import { useTranslation } from "react-i18next";

import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { HelloWorldItemDefinition } from "./HelloWorldItemModel";
import { BaseItemEditorEmpty, EmptyStateTask } from "../../controls";

interface HelloWorldItemEditorEmptyProps {
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
 * This component now uses the BaseItemEditorEmpty control for consistency
 * across all item types.
 */
export function HelloWorldItemEditorEmpty({
  workloadClient,
  item,
  onNavigateToGettingStarted
}: HelloWorldItemEditorEmptyProps) {
  const { t } = useTranslation();

  // Define onboarding tasks
  const tasks: EmptyStateTask[] = [
    {
      id: 'getting-started',
      label: t('HelloWorldItemEditorEmpty_StartButton', 'Getting Started'),
      description: t('HelloWorldItemEditorEmpty_StartDescription', 'Learn how to use this item'),
      onClick: onNavigateToGettingStarted,
      appearance: 'primary'
    }
  ];

  return (
    <BaseItemEditorEmpty
      title={t('HelloWorldItemEditorEmpty_Title', 'Welcome to HelloWorld!')}
      description={t('HelloWorldItemEditorEmpty_Description', 'This is the first screen people will see after an item is created. Include some basic information to help them continue.')}
      imageSrc="/assets/items/HelloWorldItem/EditorEmpty.svg"
      imageAlt="Empty state illustration"
      tasks={tasks}
    />
  );
}