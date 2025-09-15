import React, { useState } from "react";
import { Stack } from "@fluentui/react";
import { Button, Text, Spinner } from "@fluentui/react-components";
import { Table24Regular, Cloud24Regular } from "@fluentui/react-icons";
import { callDatahubWizardOpen } from "../../controller/DataHubController";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { OneLakeTable } from "./ExcelTableEditorItemModel";

interface ExcelTableEditorItemEmptyProps {
  workloadClient: WorkloadClientAPI;
  onTablesSelected: (selectedItem: any, selectedTables: any[]) => void;
}

export function ExcelTableEditorItemEmpty({ workloadClient, onTablesSelected }: ExcelTableEditorItemEmptyProps) {
  const [isSelecting, setIsSelecting] = useState(false);

  const handleConnectToTables = async () => {
    setIsSelecting(true);
    try {
      // Open DataHub wizard to select Lakehouse tables
      const result = await callDatahubWizardOpen(
        workloadClient,
        ["Lakehouse"], // Support only Lakehouse items for table selection
        "Select Tables", // Submit button text
        "Select tables from your lakehouse to edit in Excel", // Dialog description
        false, // Single selection for now
        true, // Show files folder to access tables
        true // Workspace navigation enabled
      );

      if (result) {
        console.log('✅ Selected lakehouse item:', result);
        
        const tables: OneLakeTable[] = [];
        
        if (result.selectedPath) {
          // If a specific path was selected, create a table based on that
          const pathParts = result.selectedPath.split('/');
          const tableName = pathParts[pathParts.length - 1] || `Table_${Date.now()}`;
          

          tables.push({
            name: tableName,
            description: `Table from ${result.displayName} - ${result.selectedPath}`,
            item: {
              ...result,
              type: "Lakehouse"
            },
            lastModified: new Date()
          });
          // Pass the selected item and tables back to the parent
          onTablesSelected(result, tables);
        }
      }
    } catch (error) {
      console.error('❌ Error selecting tables:', error);
      // Handle error silently for now - user might have cancelled
    } finally {
      setIsSelecting(false);
    }
  };
  return (
    <Stack
      horizontalAlign="center"
      verticalAlign="center"
      style={{
        height: "100%",
        padding: "40px",
        textAlign: "center"
      }}
      tokens={{ childrenGap: 24 }}
    >
      <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
        <div style={{ fontSize: "64px", color: "#0078d4" }}>
          <Cloud24Regular />
        </div>
        <Text
          style={{ fontWeight: "600", color: "#323130", fontSize: "32px" }}
        >
          Excel Table Editor
        </Text>
        <Text
          style={{ 
            color: "#605e5c", 
            maxWidth: "500px",
            lineHeight: "1.4",
            fontSize: "18px"
          }}
        >
          Connect to your OneLake tables and edit them directly in Excel. 
          Browse tables from your lakehouse and open them in an embedded Excel experience.
        </Text>
      </Stack>

      <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
        <Button
          appearance="primary"
          size="large"
          icon={isSelecting ? <Spinner size="small" /> : <Table24Regular />}
          onClick={handleConnectToTables}
          disabled={isSelecting}
        >
          {isSelecting ? "Selecting Tables..." : "Connect to OneLake Tables"}
        </Button>
        
        <Stack horizontal tokens={{ childrenGap: 24 }} style={{ marginTop: "20px" }}>
          <div style={{ textAlign: "left" }}>
            <Text style={{ fontWeight: "600", color: "#323130", fontSize: "16px" }}>
              📊 Browse Tables
            </Text>
            <Text style={{ color: "#605e5c", display: "block", fontSize: "14px" }}>
              Explore tables from your lakehouses
            </Text>
          </div>
          <div style={{ textAlign: "left" }}>
            <Text style={{ fontWeight: "600", color: "#323130", fontSize: "16px" }}>
              📝 Edit in Excel
            </Text>
            <Text style={{ color: "#605e5c", display: "block", fontSize: "14px" }}>
              Seamless Excel editing experience
            </Text>
          </div>
          <div style={{ textAlign: "left" }}>
            <Text style={{ fontWeight: "600", color: "#323130", fontSize: "16px" }}>
              ☁️ OneLake Integration
            </Text>
            <Text style={{ color: "#605e5c", display: "block", fontSize: "14px" }}>
              Direct connection to your data lake
            </Text>
          </div>
        </Stack>
      </Stack>
    </Stack>
  );
}