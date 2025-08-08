import React from "react";
import { Tab, TabList } from '@fluentui/react-tabs';
import { Toolbar } from '@fluentui/react-toolbar';
import {
    ToolbarButton, Tooltip
} from '@fluentui/react-components';
import {
    Save24Regular,
    Settings24Regular,
} from "@fluentui/react-icons";
import { PageProps } from '../../App';
import '../../styles.scss';
import { t } from "i18next";
import { DataSharingItemDefinition } from "./DataSharingItemModel";

interface DataSharingItemEditorRibbonProps extends PageProps {
    isRibbonDisabled?: boolean;
    isSaveButtonEnabled?: boolean;
    saveItemCallback: (definition?: DataSharingItemDefinition) => Promise<void>;
    openSettingsCallback: () => Promise<void>;   
}

const DataSharingItemEditorRibbonHomeTabToolbar = (props: DataSharingItemEditorRibbonProps) => {

    async function onSaveClicked() {
        await props.saveItemCallback();
        return;
    }

    async function onSettingsClicked() {
        await props.openSettingsCallback();
        return;
    }    

    return (
        <Toolbar>            
            <Tooltip
                content={t("ItemEditor_Ribbon_Save_Label")}
                relationship="label">
                <ToolbarButton
                    disabled={!props.isSaveButtonEnabled}
                    aria-label={t("ItemEditor_Ribbon_Save_Label")}
                    data-testid="item-editor-save-btn"
                    icon={<Save24Regular />}
                    onClick={onSaveClicked} />
            </Tooltip>            
            <Tooltip
                content={t("ItemEditor_Ribbon_Settings_Label")}
                relationship="label">
                <ToolbarButton
                    aria-label={t("ItemEditor_Ribbon_Settings_Label")}
                    data-testid="item-editor-settings-btn"
                    icon={<Settings24Regular />}
                    onClick={onSettingsClicked} />
            </Tooltip>
        </Toolbar>
    );
};

export function DataSharingItemEditorRibbon(props: DataSharingItemEditorRibbonProps) {
    const { isRibbonDisabled } = props;
    return (
        <div className="ribbon">
            <TabList disabled={isRibbonDisabled}>
                <Tab value="home" data-testid="home-tab-btn">
                    {t("ItemEditor_Ribbon_Home_Label")}</Tab>
            </TabList>
            <div className="toolbarContainer">
                <DataSharingItemEditorRibbonHomeTabToolbar {...props} />
            </div>
        </div>
    );
}
