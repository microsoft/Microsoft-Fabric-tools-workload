import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { PageProps } from "../../App";
import { callDialogClose } from "../../controller/DialogController";
import { CloseMode } from "@ms-fabric/workload-client";
import { DialogControl } from "../../components";
import { Input, Label, Text } from "@fluentui/react-components";
import { ScriptParameter, ScriptParameterType } from "./CloudShellItemModel";
import "./CloudShellItem.scss";

export interface RunScriptDialogResult {
  state: 'run' | 'cancel';
  parameters?: Record<string, string>;
}

export function RunScriptDialog(props: PageProps) {
  const { workloadClient } = props;
  const { t } = useTranslation();
  const location = useLocation();
  
  // Parse script parameters from URL query params
  const [parameters, setParameters] = useState<ScriptParameter[]>([]);
  const [parameterValues, setParameterValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paramsData = params.get('parameters');
    if (paramsData) {
      try {
        const parsedParams = JSON.parse(decodeURIComponent(paramsData)) as ScriptParameter[];
        setParameters(parsedParams.filter(p => !p.isSystemParameter)); // Only show user-defined parameters
        
        // Initialize with default values
        const initialValues: Record<string, string> = {};
        parsedParams.forEach(param => {
          if (!param.isSystemParameter && param.defaultValue) {
            initialValues[param.name] = param.defaultValue;
          }
        });
        setParameterValues(initialValues);
      } catch (error) {
        console.error('Failed to parse parameters:', error);
      }
    }
  }, [location.search]);

  const handleRun = () => {
    const result: RunScriptDialogResult = { 
      state: 'run',
      parameters: parameterValues
    };
    callDialogClose(workloadClient, CloseMode.PopOne, result);
  };

  const handleCancel = () => {
    const result: RunScriptDialogResult = { state: 'cancel' };
    callDialogClose(workloadClient, CloseMode.PopOne, result);
  };

  const handleParameterChange = (paramName: string, value: string) => {
    setParameterValues(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRun();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <DialogControl
      title={t("CloudShellItem_RunScriptDialog_Title", "Run Script")}
      onConfirm={handleRun}
      onCancel={handleCancel}
      confirmLabel={t('CloudShellItem_RunScriptDialog_Run', 'Run')}
      cancelLabel={t('CloudShellItem_RunScriptDialog_Cancel', 'Cancel')}
      minWidth={450}
    >
      <div className="run-script-dialog-content">
        {parameters.length === 0 ? (
          <Text>
            {t("CloudShellItem_RunScriptDialog_NoParameters", "This script has no user-defined parameters. It will run with default values.")}
          </Text>
        ) : (
          <>
            <Text>
              {t("CloudShellItem_RunScriptDialog_Description", "Set runtime parameter values for this execution:")}
            </Text>
            {parameters.map((param, index) => (
              <div key={index} className="run-script-dialog-parameter">
                <Label htmlFor={`param-${param.name}`} className="run-script-dialog-parameter-label">
                  {param.name}
                  {param.description && (
                    <Text size={200} className="run-script-dialog-parameter-description">
                      {param.description}
                    </Text>
                  )}
                </Label>
                <Input
                  id={`param-${param.name}`}
                  className="run-script-dialog-parameter-input"
                  value={parameterValues[param.name] || ''}
                  onChange={(e, data) => handleParameterChange(param.name, data.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={param.defaultValue || t('CloudShellItem_RunScriptDialog_ParameterPlaceholder', 'Enter value...')}
                  type={param.type === ScriptParameterType.INT || param.type === ScriptParameterType.FLOAT ? 'number' : 'text'}
                />
                {param.defaultValue && (
                  <Text size={100} className="run-script-dialog-default-value">
                    {t('CloudShellItem_RunScriptDialog_DefaultValue', 'Default: {{value}}', { value: param.defaultValue })}
                  </Text>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </DialogControl>
  );
}
