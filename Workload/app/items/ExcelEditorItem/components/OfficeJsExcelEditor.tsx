import React, { useEffect, useRef, useState } from 'react';
import { Button, Text, Spinner } from '@fluentui/react-components';
import { ArrowDownload20Regular, Save20Regular } from '@fluentui/react-icons';

interface OfficeJsExcelEditorProps {
  excelFileUrl: string; // The OneDrive web URL with action=edit
  onClose?: () => void;
}

/**
 * Office.js Excel Editor Component
 * 
 * This component attempts to load Excel for the web with Office.js APIs
 * to enable in-place editing capabilities.
 * 
 * Note: This requires the file to be opened in a proper Office context,
 * which may not work in all iframe scenarios due to security restrictions.
 */
export function OfficeJsExcelEditor({ excelFileUrl, onClose }: OfficeJsExcelEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to load the Excel file in an iframe with Office.js
    const loadExcel = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // For development, we'll use a different approach:
        // Open Excel in a new window/tab since iframe embedding with edit is restricted
        console.log('📊 Office.js: Excel file URL:', excelFileUrl);
        
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Failed to load Excel with Office.js:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsLoading(false);
      }
    };

    loadExcel();
  }, [excelFileUrl]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      padding: '16px'
    }}>
      <div style={{ 
        marginBottom: '16px',
        padding: '16px',
        backgroundColor: '#FFF4CE',
        border: '1px solid #FFB900',
        borderRadius: '4px'
      }}>
        <Text size={400} weight="semibold" block>
          💡 Excel Editing Limitation
        </Text>
        <Text size={300} block style={{ marginTop: '8px' }}>
          Due to security restrictions in embedded iframes, Excel Online cannot be edited in-place.
          Click the button below to open the file in a new tab for full editing capabilities.
        </Text>
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <Button
            appearance="primary"
            icon={<Save20Regular />}
            onClick={() => {
              // Open in new window with edit mode
              const editUrl = excelFileUrl.includes('action=') 
                ? excelFileUrl.replace(/action=[^&]+/, 'action=edit')
                : `${excelFileUrl}${excelFileUrl.includes('?') ? '&' : '?'}action=edit`;
              
              window.open(editUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            Open in Excel Online (New Tab)
          </Button>
          <Button
            appearance="secondary"
            icon={<ArrowDownload20Regular />}
            onClick={() => {
              // Trigger download
              window.location.href = excelFileUrl.replace(/action=[^&]+/, 'action=download');
            }}
          >
            Download to Edit Locally
          </Button>
          {onClose && (
            <Button appearance="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Spinner size="small" />
          <Text>Loading Excel...</Text>
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#FDE7E9',
          border: '1px solid #C50F1F',
          borderRadius: '4px'
        }}>
          <Text weight="semibold">Error loading Excel:</Text>
          <Text block style={{ marginTop: '4px' }}>{error}</Text>
        </div>
      )}

      {!isLoading && !error && (
        <div style={{ 
          flex: 1,
          border: '1px solid #d1d1d1',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <iframe
            ref={iframeRef}
            src={excelFileUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            title="Excel Online Viewer"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          />
        </div>
      )}
    </div>
  );
}
