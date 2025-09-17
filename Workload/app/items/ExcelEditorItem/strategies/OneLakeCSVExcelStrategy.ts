import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ContentReference, TableSchema, ExcelApiRequestBody } from "../ExcelEditorItemModel";
import { ExcelData, IOneLakeExcelStrategy, LoadingOptions, OneLakeSaveResult, SaveOptions } from "./IOneLakeExcelStrategy";
import { OneLakeStorageClient } from "../../../clients/OneLakeStorageClient";

/**
 * CSV Parser utility for parsing CSV content into structured data
 */
class CSVParser {
    /**
     * Parse CSV text content into array of arrays
     * @param content The CSV text content
     * @param delimiter The delimiter character (default: comma)
     * @param hasHeader Whether the first row contains headers
     * @returns Parsed data as array of arrays
     */
    static parseCSV(content: string, delimiter: string = ',', hasHeader: boolean = true): { data: any[][], headers: string[] } {
        if (!content || content.trim().length === 0) {
            return { data: [], headers: [] };
        }

        const lines = content.trim().split('\n');
        const result: any[][] = [];
        let headers: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length === 0) continue;

            const row = this.parseCSVLine(line, delimiter);
            
            if (i === 0 && hasHeader) {
                headers = row;
            } else {
                result.push(row);
            }
        }

        // If no headers were specified, create default column headers
        if (!hasHeader && result.length > 0) {
            headers = result[0].map((_, index) => `Column${index + 1}`);
        }

        return { data: result, headers };
    }

    /**
     * Parse a single CSV line handling quoted values
     * @param line The CSV line to parse
     * @param delimiter The delimiter character
     * @returns Array of values
     */
    private static parseCSVLine(line: string, delimiter: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i += 2;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === delimiter && !inQuotes) {
                // End of field
                result.push(current.trim());
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }

        // Add the last field
        result.push(current.trim());
        return result;
    }

    /**
     * Infer schema from data rows
     * @param data The data rows
     * @param headers The column headers
     * @returns Inferred schema
     */
    static inferSchema(data: any[][], headers: string[]): TableSchema[] {
        if (!data || data.length === 0) {
            return headers.map(header => ({ name: header, dataType: 'string' as const }));
        }

        const schema: TableSchema[] = [];
        
        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
            const columnName = headers[colIndex];
            let dataType: 'string' | 'number' | 'date' | 'boolean' = 'string';

            // Sample a few rows to infer type
            const sampleSize = Math.min(10, data.length);
            let numberCount = 0;
            let dateCount = 0;
            let booleanCount = 0;

            for (let rowIndex = 0; rowIndex < sampleSize; rowIndex++) {
                const value = data[rowIndex][colIndex];
                if (value && typeof value === 'string') {
                    const trimmedValue = value.trim();
                    
                    // Check for boolean
                    if (['true', 'false', 'yes', 'no', '1', '0'].includes(trimmedValue.toLowerCase())) {
                        booleanCount++;
                    }
                    // Check for number
                    else if (!isNaN(Number(trimmedValue)) && trimmedValue !== '') {
                        numberCount++;
                    }
                    // Check for date
                    else if (!isNaN(Date.parse(trimmedValue))) {
                        dateCount++;
                    }
                }
            }

            // Determine most likely type based on samples
            const totalSamples = sampleSize;
            if (numberCount / totalSamples > 0.8) {
                dataType = 'number';
            } else if (dateCount / totalSamples > 0.6) {
                dataType = 'date';
            } else if (booleanCount / totalSamples > 0.8) {
                dataType = 'boolean';
            }

            schema.push({ name: columnName, dataType });
        }

        return schema;
    }
}

export class OneLakeCSVExcelStrategy implements IOneLakeExcelStrategy {

    canHandle(dataSource: ContentReference): boolean {
        // Handle CSV files based on file extension or content type
        if (dataSource.contentType === "file") {
            const path = dataSource.path.toLowerCase();
            return path.endsWith('.csv');
        }
        return false;
    }

    async loadData(workloadClient: WorkloadClientAPI, dataSource: ContentReference, options?: LoadingOptions): Promise<ExcelData> {
        try {
            console.log(`Loading CSV data from OneLake: ${dataSource.path}`);
            
            // Initialize OneLake storage client
            const oneLakeClient = new OneLakeStorageClient(workloadClient);
            
            // Construct the full OneLake path
            const oneLakePath = OneLakeStorageClient.getPath(
                dataSource.workspaceId, 
                dataSource.id, 
                dataSource.path
            );
            
            // Read the CSV file content from OneLake
            const csvContent = await oneLakeClient.readFileAsText(oneLakePath);
            
            if (!csvContent || csvContent.trim().length === 0) {
                return {
                    contentReference: dataSource,
                    success: false,
                    data: [],
                    schema: [],
                    rowCount: 0,
                    columnCount: 0,
                    error: "CSV file is empty or could not be read"
                };
            }

            // Parse CSV options
            const delimiter = options?.delimiter || ',';
            const includeHeaders = options?.includeHeaders !== false; // Default to true
            const maxRows = options?.maxRows;
            const inferSchemaOption = options?.inferSchema !== false; // Default to true

            // Parse the CSV content
            const { data: parsedData, headers } = CSVParser.parseCSV(csvContent, delimiter, includeHeaders);
            
            // Apply row limit if specified
            let finalData = parsedData;
            if (maxRows && maxRows > 0) {
                finalData = parsedData.slice(0, maxRows);
            }

            // Infer schema if requested
            let schema: TableSchema[] = [];
            if (inferSchemaOption) {
                schema = CSVParser.inferSchema(finalData, headers);
            } else {
                // Create basic string schema
                schema = headers.map(header => ({ name: header, dataType: 'string' as const }));
            }

            console.log(`Successfully loaded CSV data: ${finalData.length} rows, ${headers.length} columns`);

            return {
                contentReference: dataSource,
                success: true,
                data: finalData,
                schema: schema,
                rowCount: finalData.length,
                columnCount: headers.length,
                warnings: options?.preview ? ["This is a preview of the data"] : undefined
            };

        } catch (error) {
            console.error(`Error loading CSV data from OneLake:`, error);
            return {
                contentReference: dataSource,
                success: false,
                data: [],
                schema: [],
                rowCount: 0,
                columnCount: 0,
                error: error instanceof Error ? error.message : "Unknown error occurred while loading CSV data"
            };
        }
    }

    buildExcelApiRequestBody(workloadClient: WorkloadClientAPI, content: ContentReference): ExcelApiRequestBody {
        // Extract table name from file path
        const pathParts = content.path.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const tableName = fileName.replace(/\.[^/.]+$/, ""); // Remove file extension

        return {
            tableName: tableName,
            tableData: [], // Will be populated when data is loaded
            schema: [], // Will be populated when data is loaded
            metadata: {
                lakehouseId: content.id,
                tableName: tableName,
                workspaceId: content.workspaceId,
                sourceType: 'csv',
                filePath: content.path,
                fileSize: 0, // Could be populated if needed
                rowCount: 0, // Will be updated after loading
                columnCount: 0 // Will be updated after loading
            }
        };
    }

    supportsSaving(dataSource: ContentReference): boolean {
        // CSV files can support saving back to OneLake
        return this.canHandle(dataSource);
    }

    async saveData(workloadClient: WorkloadClientAPI, data: ExcelData, options?: SaveOptions): Promise<OneLakeSaveResult> {
        try {
            console.log(`Saving Excel data back to CSV in OneLake: ${data.contentReference.path}`);
            
            // Initialize OneLake storage client
            const oneLakeClient = new OneLakeStorageClient(workloadClient);
            
            // Convert data back to CSV format
            const csvContent = this.convertDataToCSV(data.data, data.schema);
            
            // Construct the full OneLake path
            const oneLakePath = OneLakeStorageClient.getPath(
                data.contentReference.workspaceId, 
                data.contentReference.id, 
                data.contentReference.path
            );
            
            // Write the CSV content back to OneLake
            await oneLakeClient.writeFileAsText(oneLakePath, csvContent);
            
            console.log(`Successfully saved CSV data to OneLake: ${data.rowCount} rows`);

            return {
                success: true,
                rowsAffected: data.rowCount,
                newVersion: new Date().toISOString(),
                metadata: {
                    filePath: data.contentReference.path,
                    rowCount: data.rowCount,
                    columnCount: data.columnCount,
                    savedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            console.error(`Error saving CSV data to OneLake:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred while saving CSV data"
            };
        }
    }

    /**
     * Convert data array and schema back to CSV format
     * @param data The data rows
     * @param schema The column schema
     * @returns CSV formatted string
     */
    private convertDataToCSV(data: any[][], schema: TableSchema[]): string {
        const lines: string[] = [];
        
        // Add header row
        const headerRow = schema.map(col => this.escapeCSVValue(col.name)).join(',');
        lines.push(headerRow);
        
        // Add data rows
        for (const row of data) {
            const csvRow = row.map(value => this.escapeCSVValue(value?.toString() || '')).join(',');
            lines.push(csvRow);
        }
        
        return lines.join('\n');
    }

    /**
     * Escape CSV value by adding quotes if necessary
     * @param value The value to escape
     * @returns Escaped CSV value
     */
    private escapeCSVValue(value: string): string {
        if (!value) return '';
        
        // If value contains comma, quotes, or newlines, wrap in quotes and escape internal quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
    }
}