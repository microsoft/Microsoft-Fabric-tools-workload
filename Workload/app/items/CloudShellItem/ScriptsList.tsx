import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Body1,
  Caption1,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
} from "@fluentui/react-components";
import {
  Delete20Regular,
  Document20Regular,
  DocumentAdd20Regular,
  Folder20Regular,
} from "@fluentui/react-icons";
import type { ScriptMetadata } from "./CloudShellItemModel";

export interface ScriptsListProps {
  scripts: ScriptMetadata[];
  selectedScriptName?: string;
  onScriptSelect: (scriptName: string) => void;
  onScriptCreate: () => void;
  onScriptDelete: (scriptName: string) => void;
}

import "./CloudShellItem.scss";

/**
 * ScriptsList component
 * Displays a list of scripts (Python or Shell) with create/delete actions
 * Used in the left panel of the CloudShell item editor
 */
export const ScriptsList: React.FC<ScriptsListProps> = ({
  scripts,
  selectedScriptName,
  onScriptSelect,
  onScriptCreate,
  onScriptDelete,
}) => {
  const { t } = useTranslation();
  const [deleteConfirmScriptName, setDeleteConfirmScriptName] = useState<string | null>(null);

  // Group scripts by type (default to 'python' if type not specified)
  const pythonScripts = scripts.filter(script => (script.type ?? 'python') === 'python');
  //const shellScripts = scripts.filter(script => (script.type ?? 'python') === 'shell');
  const fabcliScripts = scripts.filter(script => (script.type ?? 'python') === 'fabcli');

  const handleDeleteScript = (scriptName: string) => {
    onScriptDelete(scriptName);
    setDeleteConfirmScriptName(null);
  };

  const renderScriptItem = (script: ScriptMetadata) => (
    <div
      key={script.name}
      className={`script-list-item ${selectedScriptName === script.name ? 'selected' : ''}`}
      onClick={() => onScriptSelect(script.name)}
    >
      <div className="script-list-item-icon">
        <Document20Regular />
      </div>
      <div className="script-list-item-content">
        <Body1 className="script-list-item-name">{script.name}</Body1>
      </div>
      <Dialog
        open={deleteConfirmScriptName === script.name}
        onOpenChange={(_, data) => {
          if (!data.open) setDeleteConfirmScriptName(null);
        }}
      >
        <DialogTrigger disableButtonEnhancement>
          <Button
            icon={<Delete20Regular />}
            appearance="subtle"
            size="small"
            className="script-list-item-delete"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setDeleteConfirmScriptName(script.name);
            }}
            title={t('CloudShellItem_Scripts_Delete', 'Delete script')}
          />
        </DialogTrigger>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {t('CloudShellItem_Scripts_DeleteDialog_Title', 'Delete Script?')}
            </DialogTitle>
            <DialogContent>
              {t('CloudShellItem_Scripts_DeleteDialog_Message', 
                'Are you sure you want to delete "{{scriptName}}"? This action cannot be undone.',
                { scriptName: script.name }
              )}
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">
                  {t('CloudShellItem_Scripts_DeleteDialog_Cancel', 'Cancel')}
                </Button>
              </DialogTrigger>
              <Button
                appearance="primary"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleDeleteScript(script.name);
                }}
              >
                {t('CloudShellItem_Scripts_DeleteDialog_Delete', 'Delete')}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );

  return (
    <div className="scripts-list-container">
      <div className="scripts-list-items">
        {scripts.length === 0 ? (
          <div className="scripts-list-empty">
            <Caption1 className="scripts-list-description">
              {t('CloudShellItem_Scripts_Description', 'Scripts for execution (.py, .sh, .fab)')}
            </Caption1>
            <Button
              appearance="primary"
              icon={<DocumentAdd20Regular />}
              onClick={onScriptCreate}
            >
              {t('CloudShellItem_Scripts_CreateFirst', 'Create Script')}
            </Button>
          </div>
        ) : (
          <>
            {fabcliScripts.length > 0 && (
              <div className="scripts-list-category">
                <div className="scripts-list-category-title">
                  <Folder20Regular />
                  <Caption1>
                    {t('CloudShellItem_Scripts_FabCLI', 'Fabric CLI Scripts')}
                  </Caption1>
                </div>
                {fabcliScripts.map(renderScriptItem)}
              </div>
            )}
            {pythonScripts.length > 0 && (
              <div className="scripts-list-category">
                <div className="scripts-list-category-title">
                  <Folder20Regular />
                  <Caption1>
                    {t('CloudShellItem_Scripts_Python', 'Python Scripts')}
                  </Caption1>
                </div>
                {pythonScripts.map(renderScriptItem)}
              </div>
            )}
            {/*shellScripts.length > 0 && (
              <div className="scripts-list-category">
                <Caption1 className="scripts-list-category-title">
                  {t('CloudShellItem_Scripts_Shell', 'Shell Scripts')}
                </Caption1>
                {shellScripts.map(renderScriptItem)}
              </div>
            )*/}
          </>
        )}
      </div>
    </div>
  );
};
