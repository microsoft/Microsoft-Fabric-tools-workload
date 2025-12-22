import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { PageProps } from "../../App";
import { callDialogClose } from "../../controller/DialogController";
import { CloseMode } from "@ms-fabric/workload-client";
import { DialogControl } from "../../components";
import { Input, Label, Text } from "@fluentui/react-components";

export interface CreateScriptDialogResult {
  state: 'created' | 'cancel';
  scriptName?: string;
}

export function CreateScriptDialog(props: PageProps) {
  const { workloadClient } = props;
  const { t } = useTranslation();
  const location = useLocation();
  const [scriptName, setScriptName] = useState("");
  
  // Parse existing script names from URL query params
  const existingScriptNames = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const existing = params.get('existing');
    return existing ? existing.split(',').filter(n => n) : [];
  }, [location.search]);

  // Check if current name would be a duplicate
  const isDuplicate = useMemo(() => {
    if (!scriptName.trim()) return false;
    const finalName = scriptName.trim().endsWith('.py') 
      ? scriptName.trim() 
      : `${scriptName.trim()}.py`;
    return existingScriptNames.some(name => name.toLowerCase() === finalName.toLowerCase());
  }, [scriptName, existingScriptNames]);

  const handleCreate = () => {
    if (scriptName.trim() && !isDuplicate) {
      // Ensure .py extension
      const finalName = scriptName.trim().endsWith('.py') 
        ? scriptName.trim() 
        : `${scriptName.trim()}.py`;
      
      const result: CreateScriptDialogResult = { 
        state: 'created',
        scriptName: finalName
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
      title={t("CloudShellItem_Scripts_CreateDialog_Title", "Create New Python Script")}
      onConfirm={handleCreate}
      onCancel={handleCancel}
      confirmLabel={t('CloudShellItem_Scripts_CreateDialog_Create', 'Create')}
      cancelLabel={t('CloudShellItem_Scripts_CreateDialog_Cancel', 'Cancel')}
      isConfirmDisabled={!scriptName.trim() || isDuplicate}
      minWidth={400}
    >
      <div className="create-script-dialog-content">
        <Label htmlFor="script-name-input">
          {t("CloudShellItem_Scripts_CreateDialog_Label", "Script Name")}
        </Label>
        <Input
          id="script-name-input"
          placeholder={t('CloudShellItem_Scripts_CreateDialog_Placeholder', 'script_name.py')}
          value={scriptName}
          onChange={(e, data) => setScriptName(data.value)}
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
