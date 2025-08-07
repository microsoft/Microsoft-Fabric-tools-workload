import React from "react";
import { Stack } from "@fluentui/react";
import { Button, Spinner, Text } from "@fluentui/react-components";
import { Save24Regular, Settings24Regular, ShareAndroid24Regular } from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { DataSharingItemDefinition } from "./DataSharingItemModel";

interface DataSharingItemEditorRibbonProps {
    workloadClient: WorkloadClientAPI;
    isRibbonDisabled: boolean;
    isSaveButtonEnabled: boolean;
    saveItemCallback: (definition?: DataSharingItemDefinition) => Promise<void>;
    openSettingsCallback: () => Promise<void>;
    syncSharesCallback: (definition?: DataSharingItemDefinition) => Promise<void>;
    isLoading: boolean;
}

export const DataSharingItemEditorRibbon: React.FC<DataSharingItemEditorRibbonProps> = ({
    workloadClient,
    isRibbonDisabled,
    isSaveButtonEnabled,
    saveItemCallback,
    openSettingsCallback,
    syncSharesCallback,
    isLoading
}) => {
    return (
        <div className="ribbon-container">
            <Stack horizontal tokens={{ childrenGap: 16 }} verticalAlign="center" style={{ padding: '8px 16px' }}>
                {/* Save Section */}
                <Stack.Item>
                    <Button
                        appearance="primary"
                        icon={<Save24Regular />}
                        disabled={!isSaveButtonEnabled || isRibbonDisabled}
                        onClick={() => saveItemCallback()}
                    >
                        Save
                    </Button>
                </Stack.Item>

                {/* Separator */}
                <Stack.Item>
                    <div style={{ width: '1px', height: '24px', backgroundColor: '#ccc', margin: '0 8px' }} />
                </Stack.Item>

                {/* Sync Section */}
                <Stack.Item>
                    <Button
                        appearance="secondary"
                        icon={isLoading ? <Spinner size="tiny" /> : <ShareAndroid24Regular />}
                        disabled={isRibbonDisabled || isLoading}
                        onClick={() => syncSharesCallback()}
                    >
                        {isLoading ? "Syncing..." : "Sync Shares"}
                    </Button>
                </Stack.Item>

                {/* Settings Section */}
                <Stack.Item>
                    <Button
                        appearance="subtle"
                        icon={<Settings24Regular />}
                        disabled={isRibbonDisabled}
                        onClick={openSettingsCallback}
                    >
                        Settings
                    </Button>
                </Stack.Item>

                {/* Title */}
                <Stack.Item grow>
                    <Text size={400} weight="semibold" style={{ marginLeft: '16px' }}>
                        Data Sharing Management
                    </Text>
                </Stack.Item>
            </Stack>
        </div>
    );
};
