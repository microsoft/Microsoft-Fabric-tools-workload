import React from "react";
import { useTranslation } from "react-i18next";
import { Rocket24Regular, Box24Regular, ArrowUpload24Regular } from "@fluentui/react-icons";
import "./PackageInstallerItem.scss";
import { ItemEditorEmptyView, EmptyStateTask } from "../../components/ItemEditor";

interface PackageInstallerItemEmptyViewProps {
  onDeployPackage: () => void;
  onCreatePackage: () => void;
  onUploadPackage: () => void;
  isDeploymentInProgress?: boolean;
}

export function PackageInstallerItemEmptyView({
  onDeployPackage,
  onCreatePackage,
  onUploadPackage,
}: PackageInstallerItemEmptyViewProps) {
  const { t } = useTranslation();

  const tasks: EmptyStateTask[] = [
    {
      id: 'deploy-package',
      label: t('Deploy Package', 'Deploy Package'),
      description: t('Deploy an existing package to a workspace.', 'Deploy an existing package to a workspace.'),
      onClick: () => onDeployPackage(),
      icon: <Rocket24Regular />
    },
    {
      id: 'create-package',
      label: t('Create Package', 'Create Package'),
      description: t('Create a new package from selected items.', 'Create a new package from selected items.'),
      onClick: () => onCreatePackage(),
      icon: <Box24Regular />
    },
    {
      id: 'upload-package',
      label: t('Upload JSON Package', 'Upload JSON Package'),
      description: t('Upload a package from a file.', 'Upload a package from a file.'),
      onClick: () => onUploadPackage(),
      icon: <ArrowUpload24Regular />
    }
  ];
  
  return (
    <ItemEditorEmptyView
      title={t('PackageInstallerItemEmptyView_Title', 'What would you like to do?')}
      description={t('PackageInstallerItemEmptyView_Description', 'Choose an action to get started with package management')}
      tasks={tasks}
    />
  );
}
