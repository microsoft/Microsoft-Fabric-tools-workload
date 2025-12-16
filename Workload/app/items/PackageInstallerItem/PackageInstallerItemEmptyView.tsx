import React from "react";
import { useTranslation } from "react-i18next";
import "./PackageInstallerItem.scss";
import { PackageSelectionView } from "./PackageSelectionView";
import { PackageInstallerContext } from "./package/PackageInstallerContext";
import { ItemEditorEmptyView } from "../../components/ItemEditor";

interface PackageInstallerItemEmptyViewProps {
  context: PackageInstallerContext,
  onPackageSelected: (packageId: string) => void;
  refreshKey?: number; // Optional key to force re-renders when packages change
}

export function PackageInstallerItemEmptyView({
  context,
  onPackageSelected: onPackageSelected,
  refreshKey
}: PackageInstallerItemEmptyViewProps) {
  const { t } = useTranslation();

  // Handle deployment selection
  const handlePackageSelected = (packageId: string) => {
    onPackageSelected(packageId);
  };

  // Custom content for package selection
  const packageSelectionContent = (
    <PackageSelectionView 
      context={context}
      onPackageSelected={handlePackageSelected} 
      refreshKey={refreshKey}
    />
  );
  
  return (
    <ItemEditorEmptyView
      title={t('PackageInstallerItemEmptyView_Title', 'What do you want to create?')}
      description={t('PackageInstallerItemEmptyView_Description', 'Select a package type to get started')}
      customContent={packageSelectionContent}
      maxWidth={1000}
    />
  );
}
