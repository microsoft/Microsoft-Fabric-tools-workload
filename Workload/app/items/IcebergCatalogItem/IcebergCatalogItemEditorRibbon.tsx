import React from "react";
import { Toolbar } from '@fluentui/react-toolbar';
import { ToolbarButton, Tooltip, Spinner, Tab, TabList, TabValue, SelectTabEvent, SelectTabData } from "@fluentui/react-components";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { Save24Regular, Settings24Regular, ArrowClockwise24Regular } from "@fluentui/react-icons";
import { IcebergCatalogItemDefinition } from "./IcebergCatalogItemModel";
import { useTranslation } from "react-i18next";

interface IcebergCatalogItemEditorRibbonProps {
    workloadClient: WorkloadClientAPI;
    isRibbonDisabled: boolean;
    isSaveButtonEnabled: boolean;
    saveItemCallback: (definition?: IcebergCatalogItemDefinition) => void;
    openSettingsCallback: () => void;
    syncShortcutsCallback: (definition?: IcebergCatalogItemDefinition) => void;
    isLoading: boolean;
    onTabChange?: (tabValue: TabValue) => void;
    selectedTab?: TabValue;
}

export const IcebergCatalogItemEditorRibbon: React.FC<IcebergCatalogItemEditorRibbonProps> = ({
    workloadClient,
    isRibbonDisabled,
    isSaveButtonEnabled,
    saveItemCallback,
    openSettingsCallback,
    syncShortcutsCallback,
    isLoading,
    onTabChange,
    selectedTab = "home"
}) => {
    const { t } = useTranslation();
    
    const onTabSelect = (_: SelectTabEvent, data: SelectTabData) => {
        if (onTabChange) {
            onTabChange(data.value);
        }
    };
    
    return (
        <div className="ribbon">
            <TabList
                disabled={selectedTab === "empty"}
                selectedValue={selectedTab}
                onTabSelect={onTabSelect}>
                <Tab value="home" data-testid="home-tab-btn">
                    {t("ItemEditor_Ribbon_Home_Label")}
                </Tab>
            </TabList>
            <div className="toolbarContainer">
                <Toolbar>
                    {/* Save Button */}
                    <Tooltip content={t("ItemEditor_Ribbon_Save_Label")} relationship="label">
                        <ToolbarButton
                            disabled={!isSaveButtonEnabled || isRibbonDisabled}
                            aria-label={t("ItemEditor_Ribbon_Save_Label")}
                            data-testid="item-editor-save-btn"
                            icon={<Save24Regular />}
                            onClick={() => saveItemCallback()}
                        />
                    </Tooltip>

                    {/* Sync Shortcuts Button */}
                    <Tooltip content={isLoading ? "Syncing..." : "Sync Shortcuts"} relationship="label">
                        <ToolbarButton
                            disabled={isRibbonDisabled || isLoading}
                            aria-label={isLoading ? "Syncing..." : "Sync Shortcuts"}
                            data-testid="item-editor-sync-btn"
                            icon={isLoading ? <Spinner size="tiny" /> : <ArrowClockwise24Regular />}
                            onClick={() => syncShortcutsCallback()}
                        />
                    </Tooltip>

                    {/* Settings Button */}
                    <Tooltip content={t("ItemEditor_Ribbon_Settings_Label")} relationship="label">
                        <ToolbarButton
                            disabled={isRibbonDisabled}
                            aria-label={t("ItemEditor_Ribbon_Settings_Label")}
                            data-testid="item-editor-settings-btn"
                            icon={<Settings24Regular />}
                            onClick={openSettingsCallback}
                        />
                    </Tooltip>
                </Toolbar>
            </div>
        </div>
    );
};
