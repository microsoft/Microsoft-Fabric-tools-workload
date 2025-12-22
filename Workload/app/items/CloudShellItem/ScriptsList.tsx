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
} from "@fluentui/react-icons";
import { PythonScriptMetadata } from "./CloudShellItemModel";
import "./CloudShellItem.scss";

export interface ScriptsListProps {
  scripts: PythonScriptMetadata[];
  selectedScriptName?: string;
  onScriptSelect: (scriptName: string) => void;
  onScriptCreate: () => void;
  onScriptDelete: (scriptName: string) => void;
}

/**
 * ScriptsList component
 * Displays a list of Python scripts with create/delete actions
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


  const handleDeleteScript = (scriptName: string) => {
    onScriptDelete(scriptName);
    setDeleteConfirmScriptName(null);
  };

  return (
    <div className="scripts-list-container">
      <div className="scripts-list-items">
        {scripts.length === 0 ? (
          <div className="scripts-list-empty">
            <Caption1 className="scripts-list-description">
                {t('CloudShellItem_Scripts_Description', 'Python scripts for execution')}
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
          scripts.map((script) => (
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
          ))
        )}
      </div>
    </div>
  );
};
