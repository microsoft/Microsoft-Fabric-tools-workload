import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { PageProps } from "../../App";
import { callDialogClose } from "../../controller/DialogController";
import { CloseMode } from "@ms-fabric/workload-client";
import { DialogControl } from "../../components";
import { Input, Label, Text, Dropdown, Option } from "@fluentui/react-components";
import { SCRIPT_TYPE_CONFIGS, getAllScriptTypes, ensureCorrectExtension } from "./engine/scripts/ScriptTypeConfig";
import { ScriptType } from "./CloudShellItemModel";

export interface CreateScriptDialogResult {
  state: 'created' | 'cancel';
  scriptName?: string;
}
export function CreateScriptDialog(props: PageProps) {
  const { workloadClient } = props;
  const { t } = useTranslation();
  const location = useLocation();
  const [scriptName, setScriptName] = useState("");
  const [scriptType, setScriptType] = useState<ScriptType>(ScriptType.FABCLI);

  // Parse existing script names from URL query params
  const existingScriptNames = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const existing = params.get('existing');
    return existing ? existing.split(',').filter(n => n) : [];
  }, [location.search]);

  // Sanitize script name to remove special characters, spaces, and dots
  const sanitizeScriptName = (name: string): string => {
    // Allow only alphanumeric characters, hyphens, and underscores (no dots)
    return name.replace(/[^a-zA-Z0-9_-]/g, '');
  };

  // Use centralized extension handling
  const getFinalName = () => ensureCorrectExtension(scriptName, scriptType);

  const isDuplicate = useMemo(() => {
    if (!scriptName.trim()) return false;
    const name = getFinalName();
    return existingScriptNames.some(n => n.toLowerCase() === name.toLowerCase());
  }, [scriptName, scriptType, existingScriptNames]);

  const handleCreate = () => {
    if (scriptName.trim() && !isDuplicate) {
      const name = getFinalName();
      const result: CreateScriptDialogResult & { scriptType: ScriptType } = { 
        state: 'created',
        scriptName: name,
        scriptType: scriptType
      };
      callDialogClose(workloadClient, CloseMode.PopOne, result);
    }
  };

  const handleCancel = () => {
    const result: CreateScriptDialogResult = { state: 'cancel' };
    callDialogClose(workloadClient, CloseMode.PopOne, result);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && scriptName.trim() && !isDuplicate) {
      handleCreate();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <DialogControl
      title={t("CloudShellItem_Scripts_CreateDialog_Title", "Create New Script")}
      onConfirm={handleCreate}
      onCancel={handleCancel}
      confirmLabel={t('CloudShellItem_Scripts_CreateDialog_Create', 'Create')}
      cancelLabel={t('CloudShellItem_Scripts_CreateDialog_Cancel', 'Cancel')}
      isConfirmDisabled={!scriptName.trim() || isDuplicate}
      minWidth={400}
    >
      <div className="create-script-dialog-content">
        <Label htmlFor="script-type-selector">
          {t("CloudShellItem_Scripts_CreateDialog_TypeLabel", "Script Type")}
        </Label>
        <Dropdown
          id="script-type-selector"
          value={SCRIPT_TYPE_CONFIGS[scriptType].defaultLabel}
          selectedOptions={[scriptType]}
          onOptionSelect={(_, data) => setScriptType(data.optionValue as ScriptType)}
        >
          {getAllScriptTypes().map(type => {
            const config = SCRIPT_TYPE_CONFIGS[type];
            return (
              <Option 
                key={type} 
                value={type}
                text={t(config.labelKey, config.defaultLabel)}
              >
                {t(config.labelKey, config.defaultLabel)}
              </Option>
            );
          })}
        </Dropdown>
        <Label htmlFor="script-name-input" style={{ marginTop: 12 }}>
          {t("CloudShellItem_Scripts_CreateDialog_Label", "Script Name")}
        </Label>
        <Input
          id="script-name-input"
          placeholder={SCRIPT_TYPE_CONFIGS[scriptType].defaultScriptName}
          value={scriptName}
          onChange={(e, data) => setScriptName(sanitizeScriptName(data.value))}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {isDuplicate && (
          <Text className="create-script-dialog-error">
            {t('CloudShellItem_Scripts_CreateDialog_DuplicateError', 'A script with this name already exists')}
          </Text>
        )}
      </div>
    </DialogControl>
  );
}

export default CreateScriptDialog;
