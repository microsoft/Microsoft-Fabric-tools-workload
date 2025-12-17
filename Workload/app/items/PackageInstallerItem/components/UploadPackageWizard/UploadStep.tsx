/**
 * @fileoverview Upload Step - File upload step for UploadPackageWizard
 */

import React, { useRef } from 'react';
import { Text, Button, MessageBar } from '@fluentui/react-components';
import { DocumentAdd24Regular, Checkmark24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import { WizardStepProps } from '../../../../components';

interface UploadStepProps extends WizardStepProps {
  // Additional props specific to upload step
}

export function UploadStep(props: UploadStepProps) {
  const { wizardContext, updateContext } = props;
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract context data
  const {
    selectedFile,
    isValidJson,
    uploadError
  } = wizardContext;

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      updateContext('selectedFile', file);
      updateContext('originalFileName', file.name.replace('.json', ''));
      updateContext('uploadError', '');

      // Read and validate JSON content
      const content = await file.text();
      updateContext('packageJson', content);

      try {
        const parsedJson = JSON.parse(content);
        
        // Basic validation - ensure it has required package properties
        if (!parsedJson.id || !parsedJson.displayName) {
          throw new Error('Package JSON must contain "id" and "displayName" properties');
        }

        updateContext('isValidJson', true);
        updateContext('uploadError', '');
      } catch (parseError) {
        updateContext('isValidJson', false);
        updateContext('uploadError', `Invalid JSON format: ${parseError.message}`);
      }
    } catch (error) {
      updateContext('uploadError', `Failed to read file: ${error.message}`);
      updateContext('isValidJson', false);
    }
  };

  const removeFile = () => {
    updateContext('selectedFile', null);
    updateContext('packageJson', '');
    updateContext('isValidJson', false);
    updateContext('uploadError', '');
    updateContext('originalFileName', '');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
          {t('Select Package File', 'Select Package File')}
        </Text>
        <Text style={{ display: 'block', marginBottom: '16px', color: '#616161' }}>
          {t('Choose a JSON file containing the package definition to upload.', 'Choose a JSON file containing the package definition to upload.')}
        </Text>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* File selection area */}
      {!selectedFile ? (
        <div style={{
          border: '2px dashed #e1dfdd',
          borderRadius: '4px',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: '#fafafa'
        }}
        onClick={handleFileSelect}
        >
          <DocumentAdd24Regular style={{ fontSize: '48px', color: '#616161', marginBottom: '16px' }} />
          <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
            {t('Click to select a JSON file', 'Click to select a JSON file')}
          </Text>
          <Text style={{ color: '#616161', marginBottom: '16px' }}>
            {t('or drag and drop your package.json file here', 'or drag and drop your package.json file here')}
          </Text>
          <Button
            appearance="primary"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleFileSelect();
            }}
          >
            {t('Browse Files', 'Browse Files')}
          </Button>
        </div>
      ) : (
        <div style={{
          border: '1px solid #e1dfdd',
          borderRadius: '4px',
          padding: '16px',
          backgroundColor: '#f9f9f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isValidJson ? (
                <Checkmark24Regular style={{ color: '#107c10' }} />
              ) : (
                <Dismiss24Regular style={{ color: '#d13438' }} />
              )}
              <div>
                <Text weight="semibold" style={{ display: 'block' }}>
                  {selectedFile.name}
                </Text>
                <Text size={200} style={{ color: '#616161' }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </Text>
              </div>
            </div>
            <Button appearance="secondary" onClick={removeFile}>
              {t('Remove', 'Remove')}
            </Button>
          </div>
        </div>
      )}

      {/* Error message */}
      {uploadError && (
        <div style={{ marginTop: '16px' }}>
          <MessageBar intent="error">
            <Text>{uploadError}</Text>
          </MessageBar>
        </div>
      )}

      {/* Success message */}
      {isValidJson && selectedFile && (
        <div style={{ marginTop: '16px' }}>
          <MessageBar intent="success">
            <Text>{t('Package file validated successfully!', 'Package file validated successfully!')}</Text>
          </MessageBar>
        </div>
      )}
    </div>
  );
}