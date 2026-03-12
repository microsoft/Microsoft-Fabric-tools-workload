import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Stack } from "@fluentui/react";
import {
  Button,
  Field,
  Input,
  Textarea,
  Divider,
  Spinner,
  Text,
  Combobox,
  Option,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Link,
} from "@fluentui/react-components";
import { DatabaseSearch20Regular, Search24Regular, Dismiss12Regular } from "@fluentui/react-icons";
import { RootState } from "./Store/Store";
import {
  setSelectedVariableReference,
  setResolvedVariableValue,
  setIsResolving,
  setSelectedItem,
  setSelectedFilterTypes,
  setError,
  clearError,
} from "./Store/variableLibrarySlice";
import "../Playground.scss";
import { callDatahubOpen } from "../../controller/DataHubController";
import { getConfiguredWorkloadItemTypes } from "../../controller/ConfigurationController";
import { TabContentProps } from "./ClientSDKPlaygroundModel";

export function ApiVariableLibrary(props: TabContentProps) {
  const { workloadClient } = props;
  const dispatch = useDispatch();

  const {
    selectedVariableReference,
    resolvedVariableValue,
    isResolving,
    selectedItem,
    selectedFilterTypes,
    errorMessage,
    showError,
  } = useSelector((state: RootState) => state.variableLibrary);

  // Available variable types for filtering
  const availableFilterTypes: string[] = [
    "Integer",
    "String", 
    "Number",
    "Boolean",
    "Guid",
    "DateTime",
    "ItemReference"
  ];

  const handleSelectItem = async () => {
      dispatch(clearError());
      
      const item = await callDatahubOpen(
        workloadClient,
        getConfiguredWorkloadItemTypes(),
        "Select an item from your workload to use for variable resolution",
        false, // single selection
        true // workspace navigation enabled
      );

      if (item) {
        dispatch(setSelectedItem(item));
        dispatch(setSelectedVariableReference("")); // Clear previous selection
        dispatch(setResolvedVariableValue("")); // Clear previous resolved value
      }
  };

  const handleOpenVariablePicker = async () => {
    if (!selectedItem) {
      dispatch(setError("Please select an item first."));
      return;
    }

    try {
      dispatch(clearError());
      
      const filters = selectedFilterTypes.length > 0 ? {
        includedVariableTypes: selectedFilterTypes.map(type => ({ type }))
      } : undefined;

      const result = await workloadClient.variableLibrary.openVariablePickerDialog({
        workspaceObjectId: selectedItem.workspaceId,
        ...(filters && { filters })
      });

      if (result?.selectedVariables?.length > 0) {
        const variableReference = result.selectedVariables[0]?.variableReference ?? "";
        dispatch(setSelectedVariableReference(variableReference));
        dispatch(setResolvedVariableValue("")); // Clear previous resolved value
      }
    } catch (error) {
      const internalMessage = error?.error?.message || "Unknown error occurred.";
      const errorMessage = `Failed to open variable picker. ${internalMessage}`;
      dispatch(setError(errorMessage));
      dispatch(setSelectedVariableReference("")); // Clear previous selection
      dispatch(setResolvedVariableValue("")); // Clear previous resolved value
    }
  };

  const handleResolveVariable = async () => {
    if (!selectedVariableReference) {
      dispatch(setError("No variable reference to resolve."));
      return;
    }

    if (!selectedItem) {
      dispatch(setError("Please select an item first."));
      return;
    }

    dispatch(setIsResolving(true));
    dispatch(clearError());
    
    try {
      const response = await workloadClient.variableLibrary.resolveVariableReferences({
        consumingItemObjectId: selectedItem.id,
        variableReferences: [selectedVariableReference],
      });
      
      // Format the response as JSON for display
      const resolvedValue = JSON.stringify(response, null, 2);
      dispatch(setResolvedVariableValue(resolvedValue));

    } catch (error) {
      const internalMessage = error?.error?.message || "Unknown error occurred.";
      const errorMessage = `Failed to resolve variable reference. ${internalMessage}`;
      dispatch(setError(errorMessage));
      dispatch(setResolvedVariableValue("")); // Clear previous resolved value
    } finally {
      dispatch(setIsResolving(false));
    }
  };

  return (
    <span>
      {showError && (
        <MessageBar intent="error" style={{ marginBottom: '16px' }}>
          <MessageBarBody>
            <Text>{errorMessage}</Text>
          </MessageBarBody>
          <MessageBarActions>
            <Link onClick={() => dispatch(clearError())}>Dismiss</Link>
          </MessageBarActions>
        </MessageBar>
      )}
      
      <Divider alignContent="start">Item Selection</Divider>
      <div className="section">
        <Stack horizontal tokens={{ childrenGap: 10 }}>
          <Button
            icon={<DatabaseSearch20Regular />}
            appearance="primary"
            onClick={handleSelectItem}
            data-testid="api-playground-select-item-btn"
          >
            Select Item
          </Button>
        </Stack>
        
        {selectedItem && (
          <>
            <Field 
              label="Workspace ID" 
              orientation="horizontal"
              className="field"
            >
              <Input
                size="small"
                value={selectedItem.workspaceId}
                disabled
                data-testid="api-playground-variable-workspace-id"
              />
            </Field>
            <Field 
              label="Item ID" 
              orientation="horizontal"
              className="field"
            >
              <Input
                size="small"
                value={selectedItem.id}
                disabled
                data-testid="api-playground-variable-item-id"
              />
            </Field>
          </>
        )}
      </div>

      <Divider alignContent="start">Variable Selection</Divider>
      <div className="section">
        <Field 
          label="Filter by Variable Types" 
          orientation="horizontal" 
          className="field"
        >
          <Combobox
            multiselect={true}
            size="small"
            placeholder="Select variable types to filter (optional)"
            selectedOptions={selectedFilterTypes}
            value={selectedFilterTypes.join(", ")}
            onOptionSelect={(_, data) => {
              if (data.selectedOptions) {
                dispatch(setSelectedFilterTypes(data.selectedOptions));
              }
            }}
            data-testid="api-playground-variable-filter-types"
          >
            {availableFilterTypes.map((type) => (
              <Option key={type} value={type}>
                {type}
              </Option>
            ))}
          </Combobox>
        </Field>

        {selectedFilterTypes.length > 0 && (
          <Field label="Selected Filters" orientation="horizontal" className="field">
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {selectedFilterTypes.map((type) => (
                <div
                  key={type}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 8px',
                    backgroundColor: 'var(--colorBrandBackground2)',
                    color: 'var(--colorBrandForeground2)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    gap: '4px'
                  }}
                >
                  {type}
                  <Button
                    appearance="transparent"
                    size="small"
                    icon={<Dismiss12Regular />}
                    onClick={() => {
                      const newTypes = selectedFilterTypes.filter(t => t !== type);
                      dispatch(setSelectedFilterTypes(newTypes));
                    }}
                    style={{ minWidth: 'auto', padding: '2px' }}
                    aria-label={`Remove ${type} filter`}
                  />
                </div>
              ))}
            </div>
          </Field>
        )}

        <Stack horizontal tokens={{ childrenGap: 10 }}>
          <Button
            icon={<DatabaseSearch20Regular />}
            appearance="primary"
            onClick={handleOpenVariablePicker}
            disabled={!selectedItem}
            data-testid="api-playground-open-variable-picker-btn"
          >
            Open Variable Picker
          </Button>
        </Stack>
        
        <Field 
          label="Selected Variable Reference" 
          orientation="horizontal" 
          className="field"
        >
          <Textarea
            value={selectedVariableReference}
            size="small"
            onChange={(e) => dispatch(setSelectedVariableReference(e.target.value))}
            placeholder="Variable reference will appear here after selection, or you can enter it manually..."
            rows={3}
            resize="vertical"
            data-testid="api-playground-variable-reference"
          />
        </Field>
      </div>

      <Divider alignContent="start">Variable Resolution</Divider>
      <div className="section">
        <Stack horizontal tokens={{ childrenGap: 10 }} style={{ marginBottom: '12px' }}>
          <Button
            icon={<Search24Regular />}
            appearance="primary"
            onClick={handleResolveVariable}
            disabled={isResolving || !selectedVariableReference || !selectedItem}
            data-testid="api-playground-resolve-variable-btn"
          >
            {isResolving ? (
              <>
                <Spinner size="tiny" style={{ marginRight: '8px' }} />
                Resolving...
              </>
            ) : (
              "Resolve Variable"
            )}
          </Button>
          {(!selectedVariableReference || !selectedItem) && (
            <Text size={200} style={{ color: 'var(--colorPaletteRedForeground1)' }}>
              {!selectedVariableReference ? 'Variable reference required' : 'Item selection required'}
            </Text>
          )}
        </Stack>

        <Field 
          label="Resolved Value" 
          orientation="horizontal" 
          className="field"
        >
          <Textarea
            value={resolvedVariableValue}
            size="small"
            readOnly
            placeholder="Resolved variable value will appear here..."
            rows={8}
            resize="vertical"
            data-testid="api-playground-resolved-variable-value"
          />
        </Field>
      </div>
    </span>
  );
}
