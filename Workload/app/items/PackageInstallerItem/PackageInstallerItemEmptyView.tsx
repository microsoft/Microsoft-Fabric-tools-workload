import React from "react";
import { useTranslation } from "react-i18next";
import "../../styles.scss";
import "./PackageInstallerItem.scss";
import { PackageSelectionView } from "./PackageSelectionView";
import { PackageInstallerContext } from "./package/PackageInstallerContext";
import { BaseItemEditorEmptyView } from "../../controls/ItemEditor";

interface PackageInstallerItemEmptyViewProps {
  context: PackageInstallerContext,
  onPackageSelected: (packageId: string) => void;
}

export function PackageInstallerItemEmptyView({
  context,
  onPackageSelected: onPackageSelected
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
    />
  );
  
  return (
    <BaseItemEditorEmptyView
      title={t('PackageInstallerItemEmptyView_Title', 'What do you want to create?')}
      description={t('PackageInstallerItemEmptyView_Description', 'Select a package type to get started')}
      customContent={packageSelectionContent}
      maxWidth={1000}
    />
  );
}
