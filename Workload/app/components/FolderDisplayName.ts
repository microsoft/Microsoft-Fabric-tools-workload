import React, { useEffect, useState } from "react";
import { Body1, Text } from "@fluentui/react-components";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { FabricPlatformAPIClient } from "../clients/FabricPlatformAPIClient";

// Component to fetch and display folder name
export function FolderDisplayNameLabel({workloadClient, workspaceId, folderId}: { workspaceId: string, folderId: string, workloadClient: WorkloadClientAPI }) {
  const [folderName, setFolderName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchFolderName() {
      if (!folderId || !workspaceId) {
        setFolderName("N/A");
        setIsLoading(false);
        return;
      }

      try {
        const fabricAPI = new FabricPlatformAPIClient(workloadClient);
        const folder = await fabricAPI.folders.getFolder(workspaceId, folderId);
        setFolderName(folder.displayName || folderId);
      } catch (error) {
        console.warn(`Failed to fetch folder name for ${folderId}:`, error);
        setFolderName(folderId); // Fallback to ID if name fetch fails
      } finally {
        setIsLoading(false);
      }
    }

    fetchFolderName();
  }, [workspaceId, folderId, workloadClient]);

  if (isLoading) {
    return React.createElement(Body1, null, "Loading...");
  }

  return React.createElement(Body1, {
    title: `Folder ID: ${folderId}`
  }, folderName);
}

export function FolderDisplayNameCell({ workloadClient, workspaceId, folderId}: { workspaceId: string, folderId: string, workloadClient: WorkloadClientAPI }) {
  const [folderName, setFolderName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchFolderName() {
      if (!folderId || !workspaceId) {
        setFolderName("N/A");
        setIsLoading(false);
        return;
      }

      try {
        const fabricAPI = new FabricPlatformAPIClient(workloadClient);
        const folder = await fabricAPI.folders.getFolder(workspaceId, folderId);
        setFolderName(folder.displayName || folderId);
      } catch (error) {
        console.warn(`Failed to fetch folder name for ${folderId}:`, error);
        setFolderName(folderId); // Fallback to ID if name fetch fails
      } finally {
        setIsLoading(false);
      }
    }

    fetchFolderName();
  }, [workspaceId, folderId, workloadClient]);

  if (isLoading) {
    return React.createElement(Text, null, "Loading...");
  }

  return React.createElement(Text, {
    title: `Folder ID: ${folderId}`
  }, folderName);
}
