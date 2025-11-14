import React from "react";
import { Card, CardHeader, CardPreview, Text, Body1, Button } from "@fluentui/react-components";
import { Stack } from "@fluentui/react";
import { PackageInstallerContext } from "./package/PackageInstallerContext";
import { Package } from "./PackageInstallerItemModel";
import "./PackageInstallerItem.scss";

export interface PackageInstallerSelectionViewProps {
  context: PackageInstallerContext,
  onPackageSelected: (packageId: string) => void;
}
export const PackageSelectionView: React.FC<PackageInstallerSelectionViewProps> = (
  { 
    context,
    onPackageSelected: onPackageSelected }) => {

  return (
    <Stack>
      <div className="package-selection-grid">
        {context.packageRegistry.getPackagesArray().map((pack: Package) => (
          <Card
            key={pack.id}
            className="package-selection-card"
            onClick={() => onPackageSelected(pack.id)}
          >
            <CardPreview>
              <div className="package-icon-container">
                <img
                  src={pack.icon ? pack.icon : "/assets/items/PackageInstallerItem/PackageDefault-icon.png"}
                  alt={pack.displayName}
                  className="package-icon"
                />
              </div>
            </CardPreview>
            <CardHeader
              header={
                <Text weight="semibold" size={500}>
                  {pack.displayName}
                </Text>
              }
              description={
                <Body1>{pack.description}</Body1>
              }
            />
            <div className="package-select-button-container">
              <Button appearance="primary" onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onPackageSelected(pack.id);
              }}>
                Select
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </Stack>
  );
};