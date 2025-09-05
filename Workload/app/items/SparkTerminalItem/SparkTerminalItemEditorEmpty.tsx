import React from "react";
import { useTranslation } from "react-i18next";
import { Stack } from "@fluentui/react";
import { Button, Text } from "@fluentui/react-components";
import { Play24Regular, Settings24Regular } from "@fluentui/react-icons";

import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { callOpenSettings } from "../../controller/SettingsController";
import { callGetItem } from "../../controller/ItemCRUDController";

import { SparkTerminalItemDefinition } from "./SparkTerminalItemModel";
import "../../styles.scss";

interface SparkTerminalItemEditorEmptyProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<SparkTerminalItemDefinition>;
  onStartTerminal: () => void;
}

/**
 * Empty state component for SparkTerminal item
 * Shown when the item is first created or when no terminal session is active
 */
export function SparkTerminalItemEditorEmpty({
  workloadClient,
  item,
  onStartTerminal
}: SparkTerminalItemEditorEmptyProps) {
  const { t } = useTranslation();

  const handleOpenSettings = async () => {
    if (item) {
      try {
        const item_res = await callGetItem(workloadClient, item.id);
        await callOpenSettings(workloadClient, item_res.item, 'About');
      } catch (error) {
        console.error('Failed to open settings:', error);
      }
    }
  };

  return (
    <Stack className="empty-state-container" horizontalAlign="center" verticalAlign="center"
      style={{ height: '100%', width: '100%' }}>
        <Stack className="empty-state-content" tokens={{ childrenGap: 24 }} horizontalAlign="center">
          <Stack.Item>
            <img
              src="/assets/items/SparkTerminal/EditorEmpty.png"
              alt="Spark Terminal empty state"
              width="200"
              height="200"
            />
          </Stack.Item>
          
          <Stack.Item>
            <Text size={600} weight="semibold">
              {t("SparkTerminalItem_EmptyState_Title", "Welcome to Spark Terminal")}
            </Text>
          </Stack.Item>
          
          <Stack.Item>
            <Text align="center">
              {t("SparkTerminalItem_EmptyState_Description", 
                "Execute Spark commands and SQL queries interactively against your lakehouse data.")}
            </Text>
          </Stack.Item>
          
          <Stack.Item>
            <Text align="center" style={{ color: 'var(--colorNeutralForeground2)' }}>
              {t("SparkTerminalItem_EmptyState_Instructions", 
                "Click 'Start Terminal' to begin your Spark session and start executing commands.")}
            </Text>
          </Stack.Item>

          <Stack.Item>
            <Stack horizontal tokens={{ childrenGap: 16 }}>
              <Button
                appearance="primary"
                icon={<Play24Regular />}
                onClick={onStartTerminal}
                size="large"
              >
                {t("SparkTerminalItem_StartTerminal", "Start Terminal")}
              </Button>
              
              <Button
                icon={<Settings24Regular />}
                onClick={handleOpenSettings}
                size="large"
              >
                {t("SparkTerminalItem_Settings", "Settings")}
              </Button>
            </Stack>
          </Stack.Item>

          <Stack.Item style={{ marginTop: 32 }}>
            <Stack tokens={{ childrenGap: 8 }}>
              <Text size={300} weight="semibold">
                {t("SparkTerminalItem_Features_Title", "Features:")}
              </Text>
              <Text size={200}>• Execute PySpark and SQL commands</Text>
              <Text size={200}>• Connect to any lakehouse in your workspace</Text>
              <Text size={200}>• Real-time command execution and results</Text>
              <Text size={200}>• Session management and configuration</Text>
              <Text size={200}>• Command history and auto-completion</Text>
            </Stack>
          </Stack.Item>
        </Stack>
    </Stack>
  );
}
