import React, { useEffect, useState } from "react";
import { Body1, Text } from "@fluentui/react-components";
import { navigateToWorkspace } from "../controller/NavigationController";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { FabricPlatformAPIClient } from "../clients/FabricPlatformAPIClient";

// Component to fetch and display workspace name
export function WorkspaceDisplayNameLabel({workloadClient , workspaceId }: { workloadClient: WorkloadClientAPI, workspaceId: string }) {
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchWorkspaceName() {
      if (!workspaceId) {
        setWorkspaceName("N/A");
        setIsLoading(false);
        return;
      }

      try {
        const fabricAPI = new FabricPlatformAPIClient(workloadClient);
        const workspace = await fabricAPI.workspaces.getWorkspace(workspaceId);
        setWorkspaceName(workspace.displayName || workspaceId);
      } catch (error) {
        console.warn(`Failed to fetch workspace name for ${workspaceId}:`, error);
        setWorkspaceName(workspaceId); // Fallback to ID if name fetch fails
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspaceName();
  }, [workspaceId, workloadClient]);

  if (isLoading) {
    return React.createElement(Body1, null, "Loading...");
  }

  return React.createElement(Body1, {
    style: { 
      cursor: "pointer", 
      color: "#0078d4",
      textDecoration: "underline"
    },
    onClick: () => navigateToWorkspace(workloadClient, workspaceId),
    title: `Click to open workspace ${workspaceId}`
  }, workspaceName);
}

// Component to fetch and display workspace name in table cell format
export function WorkspaceDisplayNameCell({workloadClient, workspaceId }: { workspaceId: string, workloadClient: WorkloadClientAPI }) {
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchWorkspaceName() {
      if (!workspaceId) {
        setWorkspaceName("N/A");
        setIsLoading(false);
        return;
      }

      try {
        const fabricAPI = new FabricPlatformAPIClient(workloadClient);
        const workspace = await fabricAPI.workspaces.getWorkspace(workspaceId);
        setWorkspaceName(workspace.displayName || workspaceId);
      } catch (error) {
        console.warn(`Failed to fetch workspace name for ${workspaceId}:`, error);
        setWorkspaceName(workspaceId); // Fallback to ID if name fetch fails
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspaceName();
  }, [workspaceId, workloadClient]);

  if (isLoading) {
    return React.createElement(Text, null, "Loading...");
  }

  return React.createElement(Text, {
    style: { 
      cursor: "pointer", 
      color: "#0078d4",
      textDecoration: "underline"
    },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      navigateToWorkspace(workloadClient, workspaceId);
    },
    title: `Click to open workspace ${workspaceId}`
  }, workspaceName);
}

