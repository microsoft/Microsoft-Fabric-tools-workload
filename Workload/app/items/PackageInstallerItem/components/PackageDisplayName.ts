import React, { useEffect, useState } from "react";
import { Body1, Text } from "@fluentui/react-components";
import { PackageInstallerContext } from "../package/PackageInstallerContext";

// Component to fetch and display package name (with optional icon)
export function PackageDisplayNameLabel({
  context, 
  packageId, 
  showIcon = false
}: { 
  packageId: string, 
  context: PackageInstallerContext,
  showIcon?: boolean 
}) {
  const [packageName, setPackageName] = useState<string | null>(null);
  const [packageIcon, setPackageIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchPackageInfo() {
      if (!packageId) {
        setPackageName("N/A");
        setIsLoading(false);
        return;
      }

      try {
        const packageData = context.packageRegistry.getPackage(packageId);
        if (packageData) {
          setPackageName(packageData.displayName || packageId);
          setPackageIcon(packageData.icon || null);
        } else {
          console.warn(`Package not found for ID: ${packageId}`);
          setPackageName(packageId); // Fallback to ID if package not found
        }
      } catch (error) {
        console.warn(`Failed to fetch package info for ${packageId}:`, error);
        setPackageName(packageId); // Fallback to ID if fetch fails
      } finally {
        setIsLoading(false);
      }
    }

    fetchPackageInfo();
  }, [packageId, context.packageRegistry]);

  if (isLoading) {
    return React.createElement(Body1, null, "Loading...");
  }

  // Create content with optional icon
  const content = React.createElement(
    "div",
    { 
      style: { 
        display: "flex", 
        alignItems: "center", 
        gap: "8px" 
      } 
    },
    // Optional icon
    showIcon && React.createElement("img", {
      src: packageIcon || "/assets/items/PackageInstallerItem/PackageDefault-icon.png",
      alt: packageName || "Package icon",
      style: { 
        width: "16px", 
        height: "16px", 
        objectFit: "contain" 
      },
      onError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        console.warn(`Failed to load package icon: ${packageIcon || "/assets/items/PackageInstallerItem/PackageDefault-icon.png"}`);
        // Hide the image on error
        (e.target as HTMLImageElement).style.display = 'none';
      }
    }),
    // Package name
    React.createElement(Body1, {
      title: `Package ID: ${packageId}`
    }, packageName)
  );

  return content;
}

export function PackageDisplayNameCell({
  context, 
  packageId, 
  showIcon = false
}: { 
  packageId: string, 
  context: PackageInstallerContext,
  showIcon?: boolean 
}) {
  const [packageName, setPackageName] = useState<string | null>(null);
  const [packageIcon, setPackageIcon] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchPackageInfo() {
      if (!packageId) {
        setPackageName("N/A");
        setIsLoading(false);
        return;
      }

      try {
        const packageData = context.packageRegistry.getPackage(packageId);
        if (packageData) {
          setPackageName(packageData.displayName || packageId);
          setPackageIcon(packageData.icon || null);
        } else {
          console.warn(`Package not found for ID: ${packageId}`);
          setPackageName(packageId); // Fallback to ID if package not found
        }
      } catch (error) {
        console.warn(`Failed to fetch package info for ${packageId}:`, error);
        setPackageName(packageId); // Fallback to ID if fetch fails
      } finally {
        setIsLoading(false);
      }
    }

    fetchPackageInfo();
  }, [packageId, context.packageRegistry]);

  if (isLoading) {
    return React.createElement(Text, null, "Loading...");
  }

  // Create content with optional icon
  const content = React.createElement(
    "div",
    { 
      style: { 
        display: "flex", 
        alignItems: "center", 
        gap: "6px" 
      } 
    },
    // Optional icon
    showIcon && React.createElement("img", {
      src: packageIcon || "/assets/items/PackageInstallerItem/PackageDefault-icon.png",
      alt: packageName || "Package icon",
      style: { 
        width: "14px", 
        height: "14px", 
        objectFit: "contain" 
      },
      onError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        console.warn(`Failed to load package icon: ${packageIcon || "/assets/items/PackageInstallerItem/PackageDefault-icon.png"}`);
        // Hide the image on error
        (e.target as HTMLImageElement).style.display = 'none';
      }
    }),
    // Package name
    React.createElement(Text, {
      title: `Package ID: ${packageId}`
    }, packageName)
  );

  return content;
}
