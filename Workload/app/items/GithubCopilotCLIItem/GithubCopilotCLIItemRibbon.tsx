import React from "react";
import { useTranslation } from "react-i18next";
import { PageProps } from "../../App";
import { ViewContext } from "../../components/ItemEditor";
import { 
  Ribbon, 
  RibbonAction,
  createSaveAction,
  createSettingsAction,
} from "../../components/ItemEditor";
import { Delete24Regular } from "@fluentui/react-icons";
import { EDITOR_VIEW_TYPES } from "./GithubCopilotCLIItemEditor";

export interface GithubCopilotCLIItemRibbonProps extends PageProps {
  viewContext: ViewContext;
  isSaveButtonEnabled?: boolean;
  saveItemCallback: () => Promise<void>;
  openSettingsCallback: () => void;
  onClearTerminal?: () => void;
}

export function GithubCopilotCLIItemRibbon({
  viewContext,
  isSaveButtonEnabled = false,
  saveItemCallback,
  openSettingsCallback,
  onClearTerminal
}: GithubCopilotCLIItemRibbonProps) {
  const { t } = useTranslation();
  const { currentView } = viewContext;

  const homeToolbarActions: RibbonAction[] = [
    createSaveAction(
      saveItemCallback, 
      !isSaveButtonEnabled, 
    ),
    createSettingsAction(
      openSettingsCallback, 
    ),
  ];

  // Add clear terminal action only in default view
  if (currentView === EDITOR_VIEW_TYPES.DEFAULT && onClearTerminal) {
    homeToolbarActions.push({
      key: 'clear',
      icon: Delete24Regular,
      label: t("GithubCopilotCLIItem_Ribbon_Clear", "Clear"),
      onClick: onClearTerminal,
      testId: 'github-copilot-cli-clear-btn'
    });
  }

  return (
    <Ribbon
      viewContext={viewContext}
      homeToolbarActions={homeToolbarActions}
    />
  );
}
