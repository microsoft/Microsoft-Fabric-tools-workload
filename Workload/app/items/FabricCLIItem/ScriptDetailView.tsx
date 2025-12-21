import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Editor } from "@monaco-editor/react";
import { PythonScript, ScriptParameter } from "./FabricCLIItemModel";
import { ItemEditorDetailView, DetailViewAction } from "../../components/ItemEditor";
import { Save20Regular, Play20Regular, Add20Regular, Delete20Regular } from "@fluentui/react-icons";
import { 
  Button, 
  Input, 
  Label,
  Dropdown,
  Option,
  Tooltip,
  Card,
  CardHeader,
  makeStyles,
  tokens
} from "@fluentui/react-components";
import "./FabricCLIItem.scss";

export interface ScriptDetailViewProps {
  script: PythonScript;
  currentTheme: string;
  onSave: (script: PythonScript) => void;
  onRun?: (script: PythonScript) => void;
  isRunning?: boolean;
}

const useStyles = makeStyles({
  parametersPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingVerticalM
  },
  parameterCard: {
    marginBottom: tokens.spacingVerticalS
  },
  parameterFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    paddingTop: tokens.spacingVerticalS
  },
  fieldRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS
  },
  typeDropdown: {
    minWidth: 'auto',
    width: '100%'
  },
  deleteButton: {
    alignSelf: 'flex-end'
  },
  addButton: {
    marginTop: tokens.spacingVerticalM
  }
});

/**
 * ScriptDetailView component
 * Displays a Python script editor using Monaco editor
 * Similar to FileEditorView in OneLakeExplorerItem but optimized for single script editing
 */
export const ScriptDetailView: React.FC<ScriptDetailViewProps> = ({
  script,
  currentTheme,
  onSave,
  onRun,
  isRunning = false
}) => {
  const { t } = useTranslation();
  const styles = useStyles();
  const [content, setContent] = useState(script.content || "");
  const [parameters, setParameters] = useState<ScriptParameter[]>(script.parameters || []);
  const [isDirty, setIsDirty] = useState(false);

  // Update content and parameters when script changes
  useEffect(() => {
    setContent(script.content || "");
    setParameters(script.parameters || []);
    setIsDirty(false);
  }, [script.name, script.content, script.parameters]);

  const handleEditorChange = (value: string | undefined) => {
    setContent(value || "");
    setIsDirty(true);
  };

  const handleSave = () => {
    const updatedScript: PythonScript = {
      ...script,
      content,
      parameters,
      modifiedAt: new Date().toISOString()
    };
    onSave(updatedScript);
    setIsDirty(false);
  };

  const handleAddParameter = () => {
    const newParameter: ScriptParameter = {
      name: `param${parameters.length + 1}`,
      type: 'string',
      value: ""
    };
    setParameters([...parameters, newParameter]);
    setIsDirty(true);
  };

  const handleUpdateParameter = (index: number, field: keyof ScriptParameter, value: string | boolean) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
    setIsDirty(true);
  };

  const handleDeleteParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleRun = () => {
    if (onRun) {
      // Save before running
      if (isDirty) {
        handleSave();
      }
      onRun({ ...script, content, parameters });
    }
  };

  // Left panel with parameter configuration
  const parametersPanel = (
    <div className={styles.parametersPanel}>
      
      {parameters.map((param, index) => (
        <Card key={index} className={styles.parameterCard}>
          <CardHeader
            header={<strong>{param.name || t('FabricCLIItem_Script_NewParameter', 'New Parameter')}</strong>}
            action={
              <Tooltip content={t('FabricCLIItem_Script_DeleteParameter', 'Delete parameter')} relationship="label">
                <Button
                  icon={<Delete20Regular />}
                  appearance="subtle"
                  size="small"
                  onClick={() => handleDeleteParameter(index)}
                  aria-label={t('FabricCLIItem_Script_DeleteParameter', 'Delete parameter')}
                />
              </Tooltip>
            }
          />
          <div className={styles.parameterFields}>
            <div className={styles.fieldRow}>
              <Label size="small">{t('FabricCLIItem_Script_ParameterName', 'Name')}</Label>
              <Input
                size="small"
                value={param.name}
                onChange={(e) => handleUpdateParameter(index, 'name', e.target.value)}
                placeholder="parameter_name"
              />
            </div>
            
            <div className={styles.fieldRow}>
              <Label size="small">{t('FabricCLIItem_Script_ParameterType', 'Type')}</Label>
              <Dropdown
                className={styles.typeDropdown}
                size="small"
                value={param.type}
                selectedOptions={[param.type]}
                onOptionSelect={(e, data) => handleUpdateParameter(index, 'type', data.optionValue as string)}
              >
                <Option value="string">String</Option>
                <Option value="int">Integer</Option>
                <Option value="float">Float</Option>
                <Option value="bool">Boolean</Option>
                <Option value="date">Date</Option>
              </Dropdown>
            </div>
            
            <div className={styles.fieldRow}>
              <Label size="small">{t('FabricCLIItem_Script_ParameterValue', 'Value')}</Label>
              <Input
                size="small"
                value={param.value}
                onChange={(e) => handleUpdateParameter(index, 'value', e.target.value)}
                placeholder={t('FabricCLIItem_Script_ParameterValuePlaceholder', 'Parameter value')}
              />
            </div>
          </div>
        </Card>
      ))}
      
      <Button
        className={styles.addButton}
        icon={<Add20Regular />}
        appearance="secondary"
        onClick={handleAddParameter}
      >
        {t('FabricCLIItem_Script_AddParameter', 'Add Parameter')}
      </Button>
    </div>
  );

  // Define toolbar actions
  const toolbarActions: DetailViewAction[] = [
    {
      key: 'save',
      label: t('FabricCLIItem_Script_Save', 'Save'),
      icon: Save20Regular,
      onClick: handleSave,
      appearance: 'primary',
      disabled: !isDirty,
      tooltip: isDirty 
        ? t('FabricCLIItem_Script_SaveTooltip', 'Save script changes')
        : t('FabricCLIItem_Script_NoChanges', 'No changes to save')
    },
    {
      key: 'run',
      label: isRunning 
        ? t('FabricCLIItem_Script_Running', 'Running...') 
        : t('FabricCLIItem_Script_Run', 'Run'),
      icon: Play20Regular,
      onClick: handleRun,
      appearance: 'subtle',
      disabled: !onRun || isRunning,
      tooltip: t('FabricCLIItem_Script_RunTooltip', 'Run this script in the terminal')
    }
  ];

  const editorContent = (
    <div className="script-detail-view">
      <div className="script-detail-header">
        <h2 className="script-title">{script.name}</h2>
        {isDirty && <span className="script-dirty-indicator">•</span>}
      </div>
      <div className="script-editor-container">
        <Editor
          height="100%"
          language="python"
          value={content}
          theme={currentTheme}
          onChange={handleEditorChange}
          options={{
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on',
            minimap: { enabled: true },
            lineNumbers: 'on',
            fontSize: 14,
            fontFamily: "'Consolas', 'Courier New', monospace"
          }}
        />
      </div>
    </div>
  );

  return (
    <ItemEditorDetailView
      toolbarActions={toolbarActions}
      left={{
        content: parametersPanel,
        title: t('FabricCLIItem_Script_ParametersPanel', 'Parameters'),
        minWidth: 250,
        maxWidth: 500,
        collapsible: true
      }}
      center={{
        content: editorContent,
        className: "script-detail-view-center",
        ariaLabel: `Python script editor for ${script.name}`
      }}
    />
  );
};
