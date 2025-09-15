import React from "react";
import { Text, Button, Spinner } from "@fluentui/react-components";
import { OneLakeTable } from "./ExcelTableEditorItemModel";

interface ExcelTableEditorItemExcelViewProps {
  selectedTable: OneLakeTable;
  excelOnlineUrl: string;
  isLoadingExcel: boolean;
  onRetryLoading: () => void;
}

export function ExcelTableEditorItemExcelView({
  selectedTable,
  excelOnlineUrl,
  isLoadingExcel,
  onRetryLoading
}: ExcelTableEditorItemExcelViewProps) {

  // Debug logging
  console.log('🎯 ExcelTableEditorItemExcelView render state:', {
    selectedTable: selectedTable?.name,
    excelOnlineUrl,
    isLoadingExcel
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Excel Online Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {isLoadingExcel && (
            <div style={{ 
              flex: 1, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              flexDirection: "column", 
              gap: "16px" 
            }}>
              <Spinner size="large" />
              <Text>Loading Excel Online...</Text>
            </div>
          )}

          {!isLoadingExcel && excelOnlineUrl && (
            <div style={{ flex: 1, margin: "16px", border: "1px solid #e1dfdd", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "8px", backgroundColor: "#f9f9f9", borderBottom: "1px solid #e1dfdd", fontSize: "12px" }}>
                📍 Excel URL: {excelOnlineUrl}
              </div>
              {/* Test with a simple URL first */}
              <iframe
                src={excelOnlineUrl.includes('localhost') ? excelOnlineUrl : "https://www.microsoft.com"}
                style={{ 
                  width: "100%", 
                  height: "calc(100% - 32px)", 
                  border: "none",
                  borderRadius: "0 0 4px 4px"
                }}
                allow="clipboard-read; clipboard-write; fullscreen"
                title={`Excel Interface - ${selectedTable.name}`}
                onLoad={(e) => {
                  console.log('✅ Excel interface loaded successfully for table:', selectedTable.name);
                }}
                onError={(e) => {
                  console.error('❌ Excel interface failed to load for table:', selectedTable.name, e);
                }}
              />
            </div>
          )}

          {!isLoadingExcel && !excelOnlineUrl && (
            <div style={{ 
              flex: 1, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              flexDirection: "column", 
              gap: "16px",
              padding: "40px"
            }}>
              <Text style={{ fontSize: "18px", fontWeight: "600" }}>Unable to load Excel Online</Text>
              <Text style={{ fontSize: "14px", color: "#605e5c" }}>Please try refreshing or contact support</Text>
              <Button
                appearance="primary"
                onClick={onRetryLoading}
              >
                Retry Loading Excel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}