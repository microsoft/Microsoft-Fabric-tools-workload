import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Editor } from "@monaco-editor/react";
import { Script, ScriptParameter, ScriptType, ScriptParameterType } from "./CloudShellItemModel";
import { getScriptTypeConfig } from "./engine/scripts/ScriptTypeConfig";
import { registerFabricCLILanguage } from "./engine/scripts/MonacoFabricCLILanguage";
import { ItemEditorDetailView, DetailViewAction } from "../../components/ItemEditor";
import { Save20Regular, Play20Regular, Add20Regular, Delete20Regular, Search20Regular } from "@fluentui/react-icons";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { CloudShellItemDefinition } from "./CloudShellItemModel";
import { callDatahubOpen } from "../../controller/DataHubController";
import { callDialogOpen } from "../../controller/DialogController";
import { getConfiguredWorkloadItemTypes } from "../../controller/ConfigurationController";
import { FABRIC_CORE_ITEM_TYPES } from "../../components/FabricCoreItemTypes";
import { WorkspaceDropdown } from "../../components/WorkspaceDropdown";
import { 
  Button, 
  Input, 
  Label,
  Dropdown,
  Option,
  Tooltip,
  Card,
  CardHeader,
  Textarea
} from "@fluentui/react-components";
import "./CloudShellItem.scss";
import { itemReferenceToParameterValue } from "./engine/scripts/ScriptParameters";

export interface ScriptDetailViewProps {
  script: Script;
  currentTheme: string;
  onSave: (script: Script) => void;
  onRun?: (script: Script, runtimeParameters?: Record<string, string>) => void;
  isRunning?: boolean;
  item?: ItemWithDefinition<CloudShellItemDefinition>;
  workloadClient?: any;
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
  isRunning = false,
  item,
  workloadClient
}) => {
  const { t } = useTranslation();
  const [content, setContent] = useState(script.content || "");
  const [parameters, setParameters] = useState<ScriptParameter[]>(script.parameters || []);
  const [isDirty, setIsDirty] = useState(false);
  const [expandedParams, setExpandedParams] = useState<Set<number>>(new Set());

  // Get editor language from centralized configuration
  const scriptType = script.type ?? ScriptType.FAB_CLI;
  const language = getScriptTypeConfig(scriptType).editorLanguage;

  // Handle Monaco editor before mount to register custom language
  const handleEditorWillMount = (monaco: any) => {
    if (language === 'fabriccli') {
      try {
        // Check if language is already registered
        const languages = monaco.languages.getLanguages();
        const isRegistered = languages.some((lang: any) => lang.id === 'fabriccli');
        
        if (!isRegistered) {
          // Pass parameter names for autocomplete
          const parameterNames = parameters.map(p => p.name);
          registerFabricCLILanguage(monaco, parameterNames);
        }
      } catch (error) {
        console.error('Failed to register Fabric CLI language:', error);
      }
    }
  };

  // Handle editor mount to verify language is set
  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Language configuration verified during mount
  };

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
      name: `myParameter`,
      type: ScriptParameterType.STRING,
      defaultValue: ""
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
    
    // Convert empty string to undefined for optional defaultValue
    if (field === 'defaultValue' && typeof value === 'string' && value === '') {
      updated[index] = { ...updated[index], [field]: undefined };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    
    setParameters(updated);
    setIsDirty(true);
  };

  const handleDeleteParameter = (index: number) => {
    const param = parameters[index];
    // Prevent deletion of system parameters
    if (param.isSystemParameter) {
      return;
    }
    
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

  const handleSelectItemReference = async (index: number) => {
    if (!workloadClient) {
      return;
    }

    try {
      const allowedItemTypes = [...FABRIC_CORE_ITEM_TYPES, ...getConfiguredWorkloadItemTypes()];
      const result = await callDatahubOpen(
        workloadClient,
        allowedItemTypes, // All Fabric core items + workload items
        t('CloudShellItem_Script_SelectItem_Title', 'Select an Item'),
        false
      );

      if (result) {
        // Store the item reference as a formatted string: workspaceId/ItemId
        const itemReference = itemReferenceToParameterValue(result);
        handleUpdateParameter(index, 'defaultValue', itemReference);
      }
    } catch (error) {
      console.error('Failed to select item:', error);
    }
  };

  const handleRun = async () => {
    if (!onRun) return;
    
    // Save before running
    if (isDirty) {
      handleSave();
    }
    
    // Filter user-defined parameters only
    const userParameters = parameters.filter(p => !p.isSystemParameter);
    
    // If there are user-defined parameters, show dialog
    if (userParameters.length > 0 && workloadClient && item) {
      try {
        const path = `/CloudShellItem-run-script/${item.id}?parameters=${encodeURIComponent(JSON.stringify(parameters))}`;
        const dialogResult = await callDialogOpen(
          workloadClient,
          process.env.WORKLOAD_NAME,
          path,
          550,
          Math.min(700, 200 + userParameters.length * 140),
          true
        );
        
        const result = dialogResult?.value as { state: 'run' | 'cancel'; parameters?: Record<string, string> };
        if (result?.state === 'run') {
          onRun({ ...script, content, parameters }, result.parameters);
        }
      } catch (error) {
        console.error('Failed to open run dialog:', error);
        // Fallback to running without dialog
        onRun({ ...script, content, parameters });
      }
    } else {
      // No user parameters, run directly
      onRun({ ...script, content, parameters });
    }
  };

  // Left panel with parameter configuration
  const parametersPanel = (
    <div className="parameters-panel">
      {/* System Parameters Section */}
      {parameters.some(p => p.isSystemParameter) && (
        <>
          <div className="parameters-section-header">
            <strong>{t('CloudShellItem_Script_SystemParameters', 'System Parameters')}</strong>
          </div>
          {parameters.filter(p => p.isSystemParameter).map((param, originalIndex) => {
            const index = parameters.indexOf(param);
            const isExpanded = expandedParams.has(index);
            const isSystemParam = true;
            return (
              <Card key={index} className="parameter-card system-parameter">
            <CardHeader
              header={
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <strong>{param.name || t('CloudShellItem_Script_NewParameter', 'New Parameter')}</strong>
                </div>
              }
              description={param.description && !isExpanded ? param.description : undefined}
              action={
                !isSystemParam && (
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
                )
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
                    disabled={isSystemParam}
                  />
                </div>

                <div className="field-row">
                  <Label size="small">{t('CloudShellItem_Script_ParameterDescription', 'Description')}</Label>
                  <Textarea
                    size="small"
                    value={param.description || ''}
                    onChange={(e) => handleUpdateParameter(index, 'description', e.target.value)}
                    placeholder={t('CloudShellItem_Script_ParameterDescriptionPlaceholder', 'Describe this parameter')}
                    disabled={isSystemParam}
                    rows={2}
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
                    disabled={isSystemParam}
                  >
                    <Option value={ScriptParameterType.STRING}>String</Option>
                    <Option value={ScriptParameterType.INT}>Integer</Option>
                    <Option value={ScriptParameterType.FLOAT}>Float</Option>
                    <Option value={ScriptParameterType.BOOL}>Boolean</Option>
                    <Option value={ScriptParameterType.DATE}>Date</Option>
                    <Option value={ScriptParameterType.GUID}>GUID</Option>
                    <Option value={ScriptParameterType.ITEM_REFERENCE}>Item Reference</Option>
                    <Option value={ScriptParameterType.WORKSPACE_REFERENCE}>Workspace Reference</Option>
                  </Dropdown>
                </div>
                
                
                <div className="field-row">
                  <Label size="small">{t('CloudShellItem_Script_ParameterDefaultValue', 'Default Value')}</Label>
                  {param.type === ScriptParameterType.ITEM_REFERENCE ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Input
                        size="small"
                        value={(param.defaultValue || '')}
                        placeholder={t('CloudShellItem_Script_ItemReferencePlaceholder', 'Select an item...')}
                        disabled={true}
                        style={{ flex: 1 }}
                      />
                      <Tooltip content={t('CloudShellItem_Script_SelectItem', 'Select')} relationship="label">
                        <Button
                          icon={<Search20Regular />}
                          size="small"
                          appearance="secondary"
                          onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelectItemReference(index);
                          }}
                          disabled={isSystemParam}
                          aria-label={t('CloudShellItem_Script_SelectItem', 'Select')}
                        />
                      </Tooltip>
                    </div>
                  ) : param.type === ScriptParameterType.WORKSPACE_REFERENCE ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {workloadClient ? (
                        <WorkspaceDropdown
                          key={`workspace-dropdown-${index}`}
                          workloadClient={workloadClient}
                          selectedWorkspaceId={param.defaultValue || ''}
                          onWorkspaceSelect={(workspaceId) => handleUpdateParameter(index, 'defaultValue', workspaceId)}
                          placeholder={t('CloudShellItem_Script_WorkspaceReferencePlaceholder', 'Select a workspace...')}
                          disabled={isSystemParam}
                        />
                      ) : (
                        <Input
                          size="small"
                          value={(param.defaultValue || '')}
                          placeholder={t('CloudShellItem_Script_WorkspaceReferencePlaceholder', 'Select a workspace...')}
                          disabled={true}
                        />
                      )}
                    </div>
                  ) : (
                    <Input
                      size="small"
                      value={(param.defaultValue || '')}
                      onChange={(e) => handleUpdateParameter(index, 'defaultValue', e.target.value)}
                      placeholder={t('CloudShellItem_Script_ParameterValuePlaceholder', 'Parameter value')}
                      disabled={isSystemParam}
                    />
                  )}
                </div>
            
              </div>
            )}
          </Card>
        );
      })}
        </>
      )}

      {/* User-Defined Parameters Section */}
      {parameters.some(p => !p.isSystemParameter) && (
        <>
          <div className="parameters-section-header">
            <strong>{t('CloudShellItem_Script_UserParameters', 'User-Defined Parameters')}</strong>
          </div>
          {parameters.filter(p => !p.isSystemParameter).map((param, originalIndex) => {
            const index = parameters.indexOf(param);
            const isExpanded = expandedParams.has(index);
            return (
              <Card key={index} className="parameter-card user-parameter">
            <CardHeader
              header={
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <strong>{param.name || t('CloudShellItem_Script_NewParameter', 'New Parameter')}</strong>
                </div>
              }
              description={param.description && !isExpanded ? param.description : undefined}
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
                  <Label size="small">{t('CloudShellItem_Script_ParameterDescription', 'Description')}</Label>
                  <Textarea
                    size="small"
                    value={param.description || ''}
                    onChange={(e) => handleUpdateParameter(index, 'description', e.target.value)}
                    placeholder={t('CloudShellItem_Script_ParameterDescriptionPlaceholder', 'Describe this parameter')}
                    rows={2}
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
                    <Option value={ScriptParameterType.STRING}>String</Option>
                    <Option value={ScriptParameterType.INT}>Integer</Option>
                    <Option value={ScriptParameterType.FLOAT}>Float</Option>
                    <Option value={ScriptParameterType.BOOL}>Boolean</Option>
                    <Option value={ScriptParameterType.GUID}>GUID</Option>
                    <Option value={ScriptParameterType.WORKSPACE_REFERENCE}>Workspace Reference</Option>
                    <Option value={ScriptParameterType.ITEM_REFERENCE}>Item Reference</Option>
                  </Dropdown>
                </div>

                <div className="field-row">
                  <Label size="small">{t('CloudShellItem_Script_ParameterDefaultValue', 'Default Value')}</Label>
                  {param.type === ScriptParameterType.WORKSPACE_REFERENCE ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <WorkspaceDropdown
                        workloadClient={workloadClient}
                        selectedWorkspaceId={param.defaultValue}
                        onWorkspaceSelect={(workspaceId: string) => handleUpdateParameter(index, 'defaultValue', workspaceId)}
                        placeholder={t('CloudShellItem_Script_WorkspaceReferencePlaceholder', 'Select a workspace...')}
                      />
                    </div>
                  ) : param.type === ScriptParameterType.ITEM_REFERENCE ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Button
                        size="small"
                        icon={<Search20Regular />}
                        onClick={() => handleSelectItemReference(index)}
                        disabled={!workloadClient}
                      >
                        {t('CloudShellItem_Script_SelectItem', 'Select Item')}
                      </Button>
                      {param.defaultValue && (
                        <Input
                          size="small"
                          value={(param.defaultValue || '')}
                          placeholder={t('CloudShellItem_Script_WorkspaceReferencePlaceholder', 'Select a workspace...')}
                          disabled={true}
                        />
                      )}
                    </div>
                  ) : (
                    <Input
                      size="small"
                      value={(param.defaultValue || '')}
                      onChange={(e) => handleUpdateParameter(index, 'defaultValue', e.target.value)}
                      placeholder={t('CloudShellItem_Script_ParameterValuePlaceholder', 'Parameter value')}
                    />
                  )}
                </div>
            
              </div>
            )}
          </Card>
        );
      })}
        </>
      )}
      
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
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
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
