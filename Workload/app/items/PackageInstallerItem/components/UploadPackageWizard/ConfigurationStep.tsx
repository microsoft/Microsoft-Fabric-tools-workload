/**
 * @fileoverview Configuration Step - Package configuration step for UploadPackageWizard
 */

import React from 'react';
import { Text, Input, Textarea, Field } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { WizardStepProps } from '../../../../components';

interface ConfigurationStepProps extends WizardStepProps {
  // Additional props specific to configuration step
}

export function ConfigurationStep(props: ConfigurationStepProps) {
  const { wizardContext, updateContext } = props;
  const { t } = useTranslation();

  // Extract context data
  const {
    displayName,
    description,
    originalFileName,
    packageJson
  } = wizardContext;

  // Parse package data for preview
  let packageData = null;
  try {
    packageData = JSON.parse(packageJson);
  } catch (error) {
    console.error('Failed to parse package JSON:', error);
  }

  const handleDisplayNameChange = (ev: any, data: any) => {
    updateContext('displayName', data.value);
  };

  const handleDescriptionChange = (ev: any, data: any) => {
    updateContext('description', data.value);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Text weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
          {t('Configure Package Details', 'Configure Package Details')}
        </Text>
        <Text style={{ display: 'block', marginBottom: '16px', color: '#616161' }}>
          {t('Review and customize the package information before uploading.', 'Review and customize the package information before uploading.')}
        </Text>
      </div>

      {/* Package preview section */}
      {packageData && (
        <div style={{
          border: '1px solid #e1dfdd',
          borderRadius: '4px',
          padding: '16px',
          marginBottom: '24px',
          backgroundColor: '#f9f9f9'
        }}>
          <Text weight="semibold" style={{ display: 'block', marginBottom: '12px' }}>
            {t('Package Information', 'Package Information')}
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <Text size={200} style={{ color: '#616161', display: 'block' }}>
                {t('Package ID', 'Package ID')}
              </Text>
              <Text weight="semibold">
                {packageData.id}
              </Text>
            </div>
            <div>
              <Text size={200} style={{ color: '#616161', display: 'block' }}>
                {t('Version', 'Version')}
              </Text>
              <Text weight="semibold">
                {packageData.version || '1.0.0'}
              </Text>
            </div>
            {packageData.items && (
              <div>
                <Text size={200} style={{ color: '#616161', display: 'block' }}>
                  {t('Items Count', 'Items Count')}
                </Text>
                <Text weight="semibold">
                  {packageData.items.length} {t('items', 'items')}
                </Text>
              </div>
            )}
            <div>
              <Text size={200} style={{ color: '#616161', display: 'block' }}>
                {t('File Name', 'File Name')}
              </Text>
              <Text weight="semibold">
                {originalFileName}.json
              </Text>
            </div>
          </div>
        </div>
      )}

      {/* Editable configuration */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Field
          label={t('Display Name', 'Display Name')}
          required
        >
          <Input
            value={displayName}
            onChange={handleDisplayNameChange}
            placeholder={t('Enter package display name...', 'Enter package display name...')}
          />
        </Field>

        <Field
          label={t('Description', 'Description')}
        >
          <Textarea
            value={description}
            onChange={handleDescriptionChange}
            placeholder={t('Enter package description (optional)...', 'Enter package description (optional)...')}
            rows={3}
          />
        </Field>
      </div>

      {/* Validation info */}
      <div style={{ marginTop: '20px' }}>
        <Text size={200} style={{ color: '#616161' }}>
          {t('The package will be uploaded to OneLake and made available for deployment.', 'The package will be uploaded to OneLake and made available for deployment.')}
        </Text>
      </div>
    </div>
  );
}