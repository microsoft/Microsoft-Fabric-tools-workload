import React, { useState, useEffect } from "react";
import { 
  Text, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableHeader, 
  TableHeaderCell, 
  TableRow,
  Spinner,
  Card,
  CardHeader,
  Body1,
} from "@fluentui/react-components";
import { DatabaseRegular, DocumentRegular, FolderRegular } from "@fluentui/react-icons";
import { OneLakeExplorerItemDefinition } from "./OneLakeExplorerItemModel";
import { OneLakeExplorerItemEmptyView } from "./OneLakeExplorerItemEmptyView";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import "./OneLakeExplorerItem.scss";

interface TableEditorViewProps {
  item: ItemWithDefinition<OneLakeExplorerItemDefinition>;
  tableName: string | undefined;
  oneLakeLink: string | undefined;
  currentTheme: string;
  onCreateNewFile: () => Promise<void>;
  onUploadFile: () => Promise<void>;
  onOpenItem: () => Promise<void>;
}

interface DeltaFile {
  path: string;
  fileName: string;
  fileType: 'parquet' | 'json' | 'checkpoint' | 'log' | 'other';
  size: number;
  lastModified: Date;
  partitionInfo?: string;
}

interface TableMetadata {
  deltaFiles: DeltaFile[];
  totalFiles: number;
  totalSizeBytes: number;
}

/**
 * TableEditorView
 * 
 * A dedicated component for viewing Delta Lake table files within the OneLake Explorer.
 * This component manages:
 * - Delta files listing with metadata
 * - File type categorization (parquet, json, logs, checkpoints)
 * - File filtering and pagination
 * - Table storage information
 */
export function TableEditorView({
  item,
  tableName,
  oneLakeLink,
  currentTheme,
  onCreateNewFile,
  onUploadFile,
  onOpenItem
}: TableEditorViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tableMetadata, setTableMetadata] = useState<TableMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(50); // Files per page
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all'); // Filter by file type

  // Load table metadata when table is selected
  useEffect(() => {
    if (tableName && oneLakeLink) {
      loadTableMetadata();
    }
  }, [tableName, oneLakeLink]);

  const loadTableMetadata = async () => {
    if (!tableName || !oneLakeLink) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Implement actual delta table metadata loading from OneLake
      // For now, simulate loading with mock delta files
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock delta files structure
      const mockDeltaFiles: DeltaFile[] = [
        {
          path: "_delta_log/00000000000000000000.json",
          fileName: "00000000000000000000.json",
          fileType: 'log',
          size: 2048,
          lastModified: new Date(Date.now() - 86400000),
          partitionInfo: undefined
        },
        {
          path: "_delta_log/00000000000000000001.json", 
          fileName: "00000000000000000001.json",
          fileType: 'log',
          size: 1987,
          lastModified: new Date(Date.now() - 43200000),
          partitionInfo: undefined
        },
        {
          path: "_delta_log/00000000000000000002.checkpoint.parquet",
          fileName: "00000000000000000002.checkpoint.parquet", 
          fileType: 'checkpoint',
          size: 15360,
          lastModified: new Date(Date.now() - 21600000),
          partitionInfo: undefined
        },
        ...Array.from({ length: 25 }, (_, i) => ({
          path: `part-${i.toString().padStart(5, '0')}-${Math.random().toString(36).substr(2, 8)}.snappy.parquet`,
          fileName: `part-${i.toString().padStart(5, '0')}-${Math.random().toString(36).substr(2, 8)}.snappy.parquet`,
          fileType: 'parquet' as const,
          size: Math.floor(Math.random() * 50000000) + 1000000, // 1MB to 50MB
          lastModified: new Date(Date.now() - Math.random() * 7 * 86400000), // Within last week
          partitionInfo: Math.random() > 0.7 ? `year=2024/month=${Math.floor(Math.random() * 12) + 1}` : undefined
        })),
        {
          path: "_delta_log/_last_checkpoint",
          fileName: "_last_checkpoint",
          fileType: 'checkpoint',
          size: 256,
          lastModified: new Date(Date.now() - 21600000),
          partitionInfo: undefined
        }
      ];
      
      const totalSizeBytes = mockDeltaFiles.reduce((sum, file) => sum + file.size, 0);
      
      setTableMetadata({
        deltaFiles: mockDeltaFiles,
        totalFiles: mockDeltaFiles.length,
        totalSizeBytes: totalSizeBytes
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load table metadata');
    } finally {
      setIsLoading(false);
    }
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'parquet':
        return <DocumentRegular className="file-icon parquet" />;
      case 'json':
      case 'log':
        return <DocumentRegular className="file-icon json" />;
      case 'checkpoint':
        return <FolderRegular className="file-icon checkpoint" />;
      default:
        return <DocumentRegular className="file-icon default" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFilteredFiles = () => {
    if (!tableMetadata) return [];
    if (fileTypeFilter === 'all') return tableMetadata.deltaFiles;
    return tableMetadata.deltaFiles.filter(file => file.fileType === fileTypeFilter);
  };

  const filteredFiles = getFilteredFiles();
  const paginatedFiles = filteredFiles.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleNextPage = () => {
    if ((currentPage + 1) * pageSize < filteredFiles.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Show empty state when no table is selected
  if (!tableName || !oneLakeLink) {
    return (
      <OneLakeExplorerItemEmptyView
        onCreateNewFile={onCreateNewFile}
        onUploadFile={onUploadFile}
        onOpenItem={onOpenItem}
      />
    );
  }

  const startFile = currentPage * pageSize + 1;
  const endFile = Math.min((currentPage + 1) * pageSize, filteredFiles.length);

  return (
    <div className="table-editor-view">
      {/* Table Header */}
      <div className="table-editor-header">
        <div className="header-content">
          <DatabaseRegular className="table-icon" />
          <Text size={600} weight="semibold">{tableName}</Text>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="table-editor-loading">
          <Spinner size="medium" />
          <Text>Loading table metadata...</Text>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="table-editor-error">
          <CardHeader
            header={<Text weight="semibold" className="error-header">Error Loading Table Metadata</Text>}
          />
          <Body1 className="error-message">{error}</Body1>
          <div className="error-actions">
            <Button appearance="primary" onClick={loadTableMetadata}>
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Table Metadata */}
      {tableMetadata && !isLoading && !error && (
        <>
          {/* Storage Info */}
          <div className={`storage-info ${currentTheme === "vs-dark" ? 'theme-dark' : 'theme-light'}`}>
            <div className="storage-stats">
              <Text size={300}>
                <strong>{tableMetadata.totalFiles.toLocaleString()}</strong> total files
              </Text>
              <Text size={300}>
                <strong>{formatFileSize(tableMetadata.totalSizeBytes)}</strong> total size
              </Text>
            </div>
            <Text size={300}>
              Showing {startFile}-{endFile} of {filteredFiles.length.toLocaleString()} files
            </Text>
          </div>

          {/* File Type Filter */}
          <div className="file-type-filters">
            <Text weight="semibold">Filter by file type:</Text>
            <Button 
              size="small" 
              appearance={fileTypeFilter === 'all' ? 'primary' : 'subtle'}
              onClick={() => {setFileTypeFilter('all'); setCurrentPage(0);}}
            >
              All ({tableMetadata.deltaFiles.length})
            </Button>
            <Button 
              size="small" 
              appearance={fileTypeFilter === 'parquet' ? 'primary' : 'subtle'}
              onClick={() => {setFileTypeFilter('parquet'); setCurrentPage(0);}}
            >
              Parquet ({tableMetadata.deltaFiles.filter(f => f.fileType === 'parquet').length})
            </Button>
            <Button 
              size="small" 
              appearance={fileTypeFilter === 'log' ? 'primary' : 'subtle'}
              onClick={() => {setFileTypeFilter('log'); setCurrentPage(0);}}
            >
              Logs ({tableMetadata.deltaFiles.filter(f => f.fileType === 'log').length})
            </Button>
            <Button 
              size="small" 
              appearance={fileTypeFilter === 'checkpoint' ? 'primary' : 'subtle'}
              onClick={() => {setFileTypeFilter('checkpoint'); setCurrentPage(0);}}
            >
              Checkpoints ({tableMetadata.deltaFiles.filter(f => f.fileType === 'checkpoint').length})
            </Button>
          </div>

          {/* Delta Files Section */}
          <div className="delta-files-section">
            <div className="section-header">
              <div className="pagination-controls">
                <Button 
                  size="small" 
                  appearance="subtle"
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <Button 
                  size="small" 
                  appearance="subtle"
                  onClick={handleNextPage}
                  disabled={(currentPage + 1) * pageSize >= filteredFiles.length}
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="files-table-container">
              <Table size="small">
                <TableHeader className={`files-table-header ${currentTheme === "vs-dark" ? 'theme-dark' : 'theme-light'}`}>
                  <TableRow>
                    <TableHeaderCell className="file-type-cell">Type</TableHeaderCell>
                    <TableHeaderCell>File Name</TableHeaderCell>
                    <TableHeaderCell className="file-size-cell">Size</TableHeaderCell>
                    <TableHeaderCell className="file-date-cell">Last Modified</TableHeaderCell>
                    <TableHeaderCell>Partition</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedFiles.map((file, index) => (
                    <TableRow key={index}>
                      <TableCell className="file-type-cell">
                        <div className="file-icon">
                          {getFileTypeIcon(file.fileType)}
                        </div>
                      </TableCell>
                      <TableCell className="file-name-cell">
                        <Text className="file-name">
                          {file.fileName}
                        </Text>
                      </TableCell>
                      <TableCell className="file-size-cell">
                        <Text className="file-size">
                          {formatFileSize(file.size)}
                        </Text>
                      </TableCell>
                      <TableCell className="file-date-cell">
                        <Text className="file-date">
                          {file.lastModified.toLocaleString()}
                        </Text>
                      </TableCell>
                      <TableCell className="file-partition-cell">
                        <Text className="partition-info">
                          {file.partitionInfo || '-'}
                        </Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TableEditorView;