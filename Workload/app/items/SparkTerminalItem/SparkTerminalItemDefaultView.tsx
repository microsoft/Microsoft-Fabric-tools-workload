import React from "react";
import { useTranslation } from "react-i18next";
import { Stack } from "@fluentui/react";
import { Text } from "@fluentui/react-components";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { SparkTerminalItemDefinition } from "./SparkTerminalItemModel";
import { SampleSparkTerminal } from "../../samples/views/SampleSparkTerminal/SampleSparkTerminal";
import { Item } from "../../clients/FabricPlatformTypes";
import { ItemEditorDefaultView } from "../../components/ItemEditor";

interface SparkTerminalItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<SparkTerminalItemDefinition>;
  selectedLakehouse?: Item | null;
  isUnsaved?: boolean;
}

export function SparkTerminalItemDefaultView({
  workloadClient,
  item,
  selectedLakehouse,
  isUnsaved
}: SparkTerminalItemDefaultViewProps) {
  const { t } = useTranslation();

  return (
    <ItemEditorDefaultView>
      <Stack className="editor" data-testid="spark-terminal-editor-active" style={{ height: '100%' }}>
        {/* Terminal Interface */}
        <Stack className="terminal-content" style={{ flex: 1, padding: '16px' }}>
          <SampleSparkTerminal
            workloadClient={workloadClient}
            workspaceId={item?.definition?.selectedLakehouse?.workspaceId || selectedLakehouse?.workspaceId}
            lakehouseId={item?.definition?.selectedLakehouse?.id || selectedLakehouse?.id}
          />
        </Stack>

        {/* Status indicator */}
        {isUnsaved && (
          <Stack horizontal style={{ padding: '8px 16px', backgroundColor: 'var(--colorWarningBackground1)' }}>
            <Text size={200}>
              {t("SparkTerminalItem_UnsavedChanges", "Configuration changes will be saved automatically...")}
            </Text>
          </Stack>
        )}
      </Stack>
    </ItemEditorDefaultView>
  );
}
