import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Editor } from "@monaco-editor/react";
import { Script, ScriptParameter, ScriptType } from "./CloudShellItemModel";
import { getScriptTypeConfig } from "./engine/scripts/ScriptTypeConfig";
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
  CardHeader
} from "@fluentui/react-components";
import "./CloudShellItem.scss";

export interface ScriptDetailViewProps {
  script: Script;
  currentTheme: string;
  onSave: (script: Script) => void;
  onRun?: (script: Script) => void;
  isRunning?: boolean;
}

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
  const [content, setContent] = useState(script.content || "");
  const [parameters, setParameters] = useState<ScriptParameter[]>(script.parameters || []);
  const [isDirty, setIsDirty] = useState(false);
  const [expandedParams, setExpandedParams] = useState<Set<number>>(new Set());

  // Get editor language from centralized configuration
  const scriptType = script.type ?? ScriptType.PYTHON;
  const language = getScriptTypeConfig(scriptType).editorLanguage;

  // Update content and parameters when script changes
  useEffect(() => {
    setContent(script.content || "");
    setParameters(script.parameters || []);
    setIsDirty(false);
    // Collapse all parameters when script changes
    setExpandedParams(new Set());
  }, [script.name, script.content, script.parameters]);

  const handleEditorChange = (value: string | undefined) => {
    setContent(value || "");
    setIsDirty(true);
  };

  const handleSave = () => {
    const updatedScript: Script = {
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
    const newIndex = parameters.length;
    setParameters([...parameters, newParameter]);
    // Expand the newly added parameter
    setExpandedParams(new Set([...expandedParams, newIndex]));
    setIsDirty(true);
  };

  const toggleParameterExpansion = (index: number) => {
    const newExpanded = new Set(expandedParams);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedParams(newExpanded);
  };

  const handleUpdateParameter = (index: number, field: keyof ScriptParameter, value: string | boolean) => {
    const updated = [...parameters];
    
    // Validate parameter name: only alphanumeric and underscores allowed
    if (field === 'name' && typeof value === 'string') {
      // Remove any characters that are not alphanumeric or underscore
      value = value.replace(/[^a-zA-Z0-9_]/g, '');
    }
    
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
    setIsDirty(true);
  };

  const handleDeleteParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
    // Update expanded indices after deletion
    const newExpanded = new Set<number>();
    expandedParams.forEach(idx => {
      if (idx < index) {
        newExpanded.add(idx);
      } else if (idx > index) {
        newExpanded.add(idx - 1);
      }
    });
    setExpandedParams(newExpanded);
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
    <div className="parameters-panel">
      
      {parameters.map((param, index) => {
        const isExpanded = expandedParams.has(index);
        return (
          <Card key={index} className="parameter-card">
            <CardHeader
              header={<strong>{param.name || t('CloudShellItem_Script_NewParameter', 'New Parameter')}</strong>}
              action={
                <Tooltip content={t('CloudShellItem_Script_DeleteParameter', 'Delete parameter')} relationship="label">
                  <Button
                    icon={<Delete20Regular />}
                    appearance="subtle"
                    size="small"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleDeleteParameter(index);
                    }}
                    aria-label={t('CloudShellItem_Script_DeleteParameter', 'Delete parameter')}
                  />
                </Tooltip>
              }
              onClick={() => toggleParameterExpansion(index)}
              style={{ cursor: 'pointer' }}
            />
            {isExpanded && (
              <div className="parameter-fields">
                <div className="field-row">
                  <Label size="small">{t('CloudShellItem_Script_ParameterName', 'Name')}</Label>
                  <Input
                    size="small"
                    value={param.name}
                    onChange={(e) => handleUpdateParameter(index, 'name', e.target.value)}
                    placeholder="parameter_name"
                  />
                </div>
                
                <div className="field-row">
                  <Label size="small">{t('CloudShellItem_Script_ParameterType', 'Type')}</Label>
                  <Dropdown
                    className="type-dropdown"
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
                
                <div className="field-row">
                  <Label size="small">{t('CloudShellItem_Script_ParameterValue', 'Value')}</Label>
                  <Input
                    size="small"
                    value={param.value}
                    onChange={(e) => handleUpdateParameter(index, 'value', e.target.value)}
                    placeholder={t('CloudShellItem_Script_ParameterValuePlaceholder', 'Parameter value')}
                  />
                </div>
              </div>
            )}
          </Card>
        );
      })}
      
      <Button
        className="add-button"
        icon={<Add20Regular />}
        appearance="secondary"
        onClick={handleAddParameter}
      >
        {t('CloudShellItem_Script_AddParameter', 'Add Parameter')}
      </Button>
    </div>
  );

  // Define toolbar actions
  const toolbarActions: DetailViewAction[] = [
    {
      key: 'save',
      label: t('CloudShellItem_Script_Save', 'Save'),
      icon: Save20Regular,
      onClick: handleSave,
      appearance: 'primary',
      disabled: !isDirty,
      tooltip: isDirty 
        ? t('CloudShellItem_Script_SaveTooltip', 'Save script changes')
        : t('CloudShellItem_Script_NoChanges', 'No changes to save')
    },
    {
      key: 'run',
      label: isRunning 
        ? t('CloudShellItem_Script_Running', 'Running...') 
        : t('CloudShellItem_Script_Run', 'Run'),
      icon: Play20Regular,
      onClick: handleRun,
      appearance: 'subtle',
      disabled: !onRun || isRunning,
      tooltip: t('CloudShellItem_Script_RunTooltip', 'Run this script in the terminal')
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
          language={language}
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
        title: t('CloudShellItem_Script_ParametersPanel', 'Parameters'),
        minWidth: 250,
        maxWidth: 500,
        collapsible: true
      }}
      center={{
        content: editorContent,
        className: "script-detail-view-center",
        ariaLabel: `${language.charAt(0).toUpperCase() + language.slice(1)} script editor for ${script.name}`
      }}
    />
  );
};
