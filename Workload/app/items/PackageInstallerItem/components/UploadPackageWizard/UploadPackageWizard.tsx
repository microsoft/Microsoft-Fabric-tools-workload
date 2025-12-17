/**
 * @fileoverview UploadPackageWizard - Complete package upload wizard
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageProps } from '../../../../App';
import { WizardControl, WizardStep } from '../../../../components';
import { callDialogClose } from '../../../../controller/DialogController';
import { CloseMode } from '@ms-fabric/workload-client';
import { UploadStep } from './UploadStep';
import { ConfigurationStep } from './ConfigurationStep';

export interface UploadPackageWizardProps extends PageProps {
  // No additional props needed for basic wizard
}

export interface UploadPackageWizardResult {
  state: 'upload' | 'cancel';
  packageJson?: string; // The JSON content of the uploaded package
  packageData?: {
    displayName: string;
    description?: string;
    originalFileName: string;
  };
}

export function UploadPackageWizard(props: UploadPackageWizardProps) {
  const { t } = useTranslation();
  const { workloadClient } = props;

  // Initial context state
  const initialContext = {
    workloadClient,
    // Upload step data
    selectedFile: null as File | null,
    packageJson: '',
    isValidJson: false,
    uploadError: '',
    // Configuration step data
    displayName: '',
    description: '',
    originalFileName: ''
  };

  // Step definitions
  const steps: WizardStep[] = [
    {
      id: 'upload',
      title: t('Upload Package File', 'Upload Package File'),
      description: t('Choose a JSON file containing the package definition to upload', 'Choose a JSON file containing the package definition to upload'),
      component: UploadStep,
      validate: (context) => context.isValidJson && context.selectedFile !== null
    },
    {
      id: 'configuration',
      title: t('Package Configuration', 'Package Configuration'),
      description: t('Configure package details and metadata before uploading', 'Configure package details and metadata before uploading'),
      component: ConfigurationStep,
      validate: (context) => context.displayName?.trim() !== ''
    }
  ];

  const handleComplete = (context: Record<string, any>) => {
    console.log('UploadPackageWizard: Starting package upload with context:', {
      fileName: context.originalFileName,
      displayName: context.displayName,
      description: context.description,
      hasValidJson: context.isValidJson
    });

    // Close the dialog with success result
    const result: UploadPackageWizardResult = {
      state: 'upload',
      packageJson: context.packageJson,
      packageData: {
        displayName: context.displayName,
        description: context.description,
        originalFileName: context.originalFileName
      }
    };

    console.log('UploadPackageWizard: Returning result:', result);
    callDialogClose(workloadClient, CloseMode.PopOne, result);
  };

  const handleCancel = () => {
    // Close the dialog with cancelled result
    const result: UploadPackageWizardResult = { state: 'cancel' };
    callDialogClose(workloadClient, CloseMode.PopOne, result);
  };

  return (
    <WizardControl
      title={t('Upload Package', 'Upload Package')}
      steps={steps}
      initialStepId="upload"
      onComplete={handleComplete}
      onCancel={handleCancel}
      initialContext={initialContext}
      showNavigation={true}
      navigationLabels={{
        complete: t('Upload Package', 'Upload Package'),
        cancel: t('Cancel', 'Cancel')
      }}
    />
  );
}

export default UploadPackageWizard;

/**
 * Wrapper component for routing system integration
 */
export function UploadPackageWizardWrapper(props: PageProps) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <UploadPackageWizard
        {...props}
      />
    </div>
  );
}