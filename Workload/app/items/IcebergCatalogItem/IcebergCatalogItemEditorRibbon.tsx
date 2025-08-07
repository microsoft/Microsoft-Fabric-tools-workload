import React from "react";
import { Stack } from "@fluentui/react";
import { Button, Spinner } from "@fluentui/react-components";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { Save24Regular, Settings24Regular, ArrowClockwise24Regular } from "@fluentui/react-icons";
import { IcebergCatalogItemDefinition } from "./IcebergCatalogItemModel";

interface IcebergCatalogItemEditorRibbonProps {
    workloadClient: WorkloadClientAPI;
    isRibbonDisabled: boolean;
    isSaveButtonEnabled: boolean;
    saveItemCallback: (definition?: IcebergCatalogItemDefinition) => void;
    openSettingsCallback: () => void;
    syncShortcutsCallback: (definition?: IcebergCatalogItemDefinition) => void;
    isLoading: boolean;
}

export const IcebergCatalogItemEditorRibbon: React.FC<IcebergCatalogItemEditorRibbonProps> = ({
    workloadClient,
    isRibbonDisabled,
    isSaveButtonEnabled,
    saveItemCallback,
    openSettingsCallback,
    syncShortcutsCallback,
    isLoading
}) => {
    return (
        <div className="ribbon-container">
            <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="center">
                {/* Save Button */}
                <Button
                    appearance="primary"
                    icon={<Save24Regular />}
                    disabled={!isSaveButtonEnabled || isRibbonDisabled}
                    onClick={() => saveItemCallback()}
                >
                    Save
                </Button>

                {/* Sync Shortcuts Button */}
                <Button
                    appearance="secondary"
                    icon={isLoading ? <Spinner size="tiny" /> : <ArrowClockwise24Regular />}
                    disabled={isRibbonDisabled || isLoading}
                    onClick={() => syncShortcutsCallback()}
                >
                    {isLoading ? "Syncing..." : "Sync Shortcuts"}
                </Button>

                {/* Settings Button */}
                <Button
                    appearance="subtle"
                    icon={<Settings24Regular />}
                    disabled={isRibbonDisabled}
                    onClick={openSettingsCallback}
                >
                    Settings
                </Button>
            </Stack>
        </div>
    );
};
