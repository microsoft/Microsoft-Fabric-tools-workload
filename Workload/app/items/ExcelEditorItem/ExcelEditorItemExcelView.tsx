import React, { useEffect, useState } from "react";
import { Text, Button, Spinner } from "@fluentui/react-components";
import { ContentReference } from "./ExcelEditorItemModel";
import { wopiExcelService } from "./services/WOPIExcelService";

interface ExcelEditorItemExcelViewProps {
  selectedContent: ContentReference;
  excelData: any[][];
  excelOnlineUrl?: string;
  isLoadingExcel: boolean;
  onRetryLoading: () => void;
}

export function ExcelEditorItemExcelView({
  selectedContent,
  excelData,
  excelOnlineUrl,
  isLoadingExcel,
  onRetryLoading
}: ExcelEditorItemExcelViewProps) {
  const [showFallback, setShowFallback] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // Debug logging
  console.log('🎯 ExcelEditorItemExcelView render state:', {
    selectedContent: selectedContent?.displayName,
    excelDataRows: excelData.length,
    excelOnlineUrl,
    isLoadingExcel,
    showFallback
  });

  // Handle iframe error - show fallback
  const handleIframeError = () => {
    console.warn('⚠️ Excel Online iframe failed to load, showing fallback');
    setIframeError(true);
    setShowFallback(true);
  };

  // Initialize WOPI service
  useEffect(() => {
    wopiExcelService.initialize();
  }, []);

  const dataForFallback = excelData.length > 0 ? {
    headers: excelData[0]?.map(h => String(h)) || [],
    rows: excelData.slice(1).map(row => row.map(cell => String(cell || '')))
  } : { headers: [], rows: [] };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Excel Content */}
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
              <Text>Loading Excel data...</Text>
            </div>
          )}

          {!isLoadingExcel && (excelOnlineUrl || excelData.length > 0) && (
            <div style={{ flex: 1, margin: "16px", border: "1px solid #e1dfdd", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ 
                padding: "8px", 
                backgroundColor: "#f9f9f9", 
                borderBottom: "1px solid #e1dfdd", 
                fontSize: "12px", 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center" 
              }}>
                <span>📊 {selectedContent.displayName} - {excelData.length > 0 ? excelData.length - 1 : 0} rows</span>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {!showFallback && excelOnlineUrl && (
                    <span style={{ fontSize: "11px", color: "#0078d4" }}>
                      📈 Excel Online (WOPI)
                    </span>
                  )}
                  {(showFallback || !excelOnlineUrl) && excelData.length > 0 && (
                    <span style={{ fontSize: "11px", color: "#666" }}>
                      📋 Table View
                    </span>
                  )}
                  {!excelOnlineUrl && excelData.length > 0 && (
                    <span style={{ fontSize: "10px", color: "#888", marginLeft: "8px" }}>
                      (Excel Online unavailable)
                    </span>
                  )}
                  {excelOnlineUrl && (
                    <Button 
                      size="small" 
                      appearance="subtle"
                      onClick={() => setShowFallback(!showFallback)}
                    >
                      {showFallback ? "Show Excel" : "Show Table"}
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Excel Online iframe or fallback table */}
              <div 
                style={{ 
                  width: "100%", 
                  height: "calc(100% - 32px)", 
                  border: "none",
                  borderRadius: "0 0 4px 4px",
                  overflow: "hidden"
                }}
              >
                {!showFallback && excelOnlineUrl && !iframeError ? (
                  <iframe
                    {...wopiExcelService.generateEmbedIframeProps(excelOnlineUrl, {
                      width: '100%',
                      height: '100%'
                    })}
                    onError={handleIframeError}
                    onLoad={() => {
                      console.log('✅ Excel Online iframe loaded successfully');
                      setIframeError(false);
                    }}
                    title={`Excel Online - ${selectedContent.displayName}`}
                  />
                ) : (
                  <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
                    {excelData.length > 0 ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: wopiExcelService.generateFallbackTable(dataForFallback) 
                        }}
                      />
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%', 
                        flexDirection: 'column', 
                        gap: '16px',
                        color: '#666'
                      }}>
                        <Text>📋 Table view ready</Text>
                        <Text style={{ fontSize: '12px' }}>
                          {!excelOnlineUrl && 'Excel Online requires a valid SharePoint/OneDrive file URL'}
                        </Text>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLoadingExcel && !excelOnlineUrl && excelData.length === 0 && (
            <div style={{ 
              flex: 1, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              flexDirection: "column", 
              gap: "16px",
              padding: "40px"
            }}>
              <Text style={{ fontSize: "18px", fontWeight: "600" }}>
                No data available
              </Text>
              <Text style={{ color: "#666", textAlign: "center" }}>
                The selected content doesn't contain any data to display in Excel.
              </Text>
              <Button 
                appearance="primary" 
                onClick={onRetryLoading}
              >
                Retry Loading
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}