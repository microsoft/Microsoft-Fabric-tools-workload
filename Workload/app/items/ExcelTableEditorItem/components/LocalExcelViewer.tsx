import React, { useState, useEffect } from 'react';
import {
  Button,
  Text,
  Spinner,
  MessageBar,
  makeStyles,
  tokens,
  shorthands
} from '@fluentui/react-components';
import {
  ArrowDownload24Regular,
  Open24Regular,
  DocumentData24Regular
} from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    ...shorthands.padding('20px'),
    maxWidth: '100%',
    height: 'calc(100vh - 100px)',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px')
  },
  
  toolbar: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding('8px'),
    ...shorthands.borderRadius('4px'),
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    flexWrap: 'wrap'
  },
  
  excelViewer: {
    flex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('4px'),
    ...shorthands.overflow('hidden'),
    display: 'flex',
    flexDirection: 'column'
  },
  
  tableContainer: {
    flex: 1,
    ...shorthands.overflow('auto'),
    ...shorthands.padding('16px')
  },
  
  dataTable: {
    width: '100%',
    '& th': {
      backgroundColor: tokens.colorNeutralBackground3,
      fontWeight: tokens.fontWeightSemibold,
      ...shorthands.padding('8px', '12px'),
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
      textAlign: 'left'
    },
    '& td': {
      ...shorthands.padding('8px', '12px'),
      ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
      verticalAlign: 'top'
    },
    '& tr:nth-child(even)': {
      backgroundColor: tokens.colorNeutralBackground2
    }
  },
  
  statusBar: {
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding('8px', '16px'),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: tokens.fontSizeBase200
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    ...shorthands.gap('16px')
  },
  
  errorContainer: {
    ...shorthands.padding('20px'),
    textAlign: 'center'
  }
});

interface LocalExcelViewerProps {
  fileId: string;
  fileName: string;
  tableName: string;
  onClose?: () => void;
}

interface ExcelData {
  headers: string[];
  rows: (string | number)[][];
  metadata: {
    rowCount: number;
    columnCount: number;
    fileSize: number;
    lastModified: string;
  };
}

export const LocalExcelViewer: React.FC<LocalExcelViewerProps> = ({
  fileId,
  fileName,
  tableName,
  onClose
}) => {
  const styles = useStyles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    loadExcelData();
  }, [fileId]);

  const loadExcelData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the Excel data from our WOPI host
      const response = await fetch(`http://127.0.0.1:60006/api/excel/view/${fileId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load Excel data: ${response.statusText}`);
      }

      const data = await response.json();
      setExcelData(data);
      
      // Set download URL
      setDownloadUrl(`http://127.0.0.1:60006/wopi/files/${fileId}/contents`);
      
    } catch (err) {
      console.error('Failed to load Excel data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Excel file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenInExcel = () => {
    if (downloadUrl) {
      // Download and then open with default Excel application
      handleDownload();
      // Show message about opening in Excel
      alert('File downloaded! Open it with Microsoft Excel for full editing capabilities.');
    }
  };

  const handleRefresh = () => {
    loadExcelData();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="large" />
          <Text size={500}>Loading Excel file...</Text>
          <Text size={300}>Reading data from {fileName}</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <MessageBar intent="error">
            <Text weight="semibold">Failed to load Excel file</Text>
            <br />
            <Text>{error}</Text>
          </MessageBar>
          <div style={{ marginTop: '16px' }}>
            <Button appearance="primary" onClick={handleRefresh}>
              Try Again
            </Button>
            {onClose && (
              <Button appearance="secondary" onClick={onClose} style={{ marginLeft: '8px' }}>
                Close
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!excelData) {
    return (
      <div className={styles.container}>
        <MessageBar intent="warning">
          No data available for this Excel file.
        </MessageBar>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <DocumentData24Regular />
          <Text weight="semibold">{fileName}</Text>
          <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
            ({tableName} data)
          </Text>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            appearance="secondary"
            icon={<ArrowDownload24Regular />}
            onClick={handleDownload}
          >
            Download Excel
          </Button>
          
          <Button
            appearance="primary"
            icon={<Open24Regular />}
            onClick={handleOpenInExcel}
          >
            Open in Excel
          </Button>
          
          {onClose && (
            <Button
              appearance="subtle"
              onClick={onClose}
            >
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Excel Viewer */}
      <div className={styles.excelViewer}>
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                {excelData.headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {excelData.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Status Bar */}
        <div className={styles.statusBar}>
          <div>
            <Text size={200}>
              {excelData.metadata.rowCount} rows × {excelData.metadata.columnCount} columns
            </Text>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Text size={200}>
              File size: {Math.round(excelData.metadata.fileSize / 1024)} KB
            </Text>
            <Text size={200}>
              Modified: {new Date(excelData.metadata.lastModified).toLocaleDateString()}
            </Text>
          </div>
        </div>
      </div>

      {/* Info Message */}
      <MessageBar intent="info">
        <Text size={300}>
          📊 <strong>Local Excel Viewer</strong> - This displays your Excel data in a table format. 
          Click "Open in Excel" to download and edit with full Excel functionality.
        </Text>
      </MessageBar>
    </div>
  );
};