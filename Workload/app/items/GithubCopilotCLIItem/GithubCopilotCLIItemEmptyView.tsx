import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@fluentui/react-components";
import { Sparkle24Regular } from "@fluentui/react-icons";
import "./GithubCopilotCLIItem.scss";

interface GithubCopilotCLIItemEmptyViewProps {
  onStartCopilot: () => void;
}

export function GithubCopilotCLIItemEmptyView({ 
  onStartCopilot 
}: GithubCopilotCLIItemEmptyViewProps) {
  const { t } = useTranslation();

  return (
    <div className="github-copilot-cli-empty-view">
      <Sparkle24Regular className="empty-icon" />
      <h1 className="empty-title">
        {t("GithubCopilotCLIItem_Empty_Title", "GitHub Copilot CLI")}
      </h1>
      <p className="empty-description">
        {t("GithubCopilotCLIItem_Empty_Description", 
          "Start a conversation with GitHub Copilot to get help with code suggestions, explanations, and more. Select a model and begin chatting."
        )}
      </p>
      <Button 
        appearance="primary" 
        size="large"
        icon={<Sparkle24Regular />}
        onClick={onStartCopilot}
      >
        {t("GithubCopilotCLIItem_Empty_StartButton", "Start Copilot")}
      </Button>
    </div>
  );
}
