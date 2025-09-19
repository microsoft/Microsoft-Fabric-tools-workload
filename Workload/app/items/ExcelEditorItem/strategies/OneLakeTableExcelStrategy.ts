import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ContentReference, ExcelApiRequestBody, TableSchema} from "../ExcelEditorItemModel";
import { ExcelData, IOneLakeExcelStrategy, LoadingOptions, OneLakeSaveResult, SaveOptions } from "./IOneLakeExcelStrategy";

export class OneLakeTableExcelStrategy implements IOneLakeExcelStrategy {
    canHandle(dataSource: ContentReference): boolean {
        return dataSource.contentType === "table";
    }

    async loadData(workloadClient: WorkloadClientAPI, dataSource: ContentReference, options?: LoadingOptions): Promise<ExcelData> {
        console.log(`Loading table data from OneLake: ${dataSource.displayName}`);
        
        try {
            // For now, create sample data for tables since we don't have the actual OneLake table implementation
            // In a real implementation, this would query the Lakehouse table
            const sampleData = this.generateSampleTableData(dataSource);
            const schema = this.inferSchemaFromSampleData(sampleData);
            
            // Apply row limit if specified
            let finalData = sampleData.data;
            if (options?.maxRows && options.maxRows > 0) {
                finalData = sampleData.data.slice(0, options.maxRows);
            }

            console.log(`Successfully loaded table data: ${finalData.length} rows, ${sampleData.headers.length} columns`);

            return {
                contentReference: dataSource,
                success: true,
                data: [sampleData.headers, ...finalData], // Include headers as first row
                schema: schema,
                rowCount: finalData.length,
                columnCount: sampleData.headers.length,
                warnings: options?.preview ? ["This is sample data for demonstration"] : undefined
            };
        } catch (error) {
            console.error('Failed to load table data:', error);
            return {
                contentReference: dataSource,
                success: false,
                data: [],
                schema: [],
                rowCount: 0,
                columnCount: 0,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    async buildExcelApiRequestBody(workloadClient: WorkloadClientAPI, content: ContentReference): Promise<ExcelApiRequestBody> {
        console.log('🏗️ Building Excel API request body for table:', content.displayName);
        
        // Load the actual data using the loadData function
        const excelData = await this.loadData(workloadClient, content, {
            includeHeaders: true,
            inferSchema: true,
            maxRows: 1000 // Limit to prevent Excel from becoming too large
        });

        if (!excelData.success) {
            console.warn('Failed to load table data for Excel API request:', excelData.error);
            throw Error(excelData.error || 'Failed to load table data');
        }

        console.log(`✅ Successfully loaded table data: ${excelData.rowCount} rows, ${excelData.columnCount} columns`);

        return {
            tableName: content.displayName,
            tableData: excelData.data,
            schema: excelData.schema,
            metadata: {
                lakehouseId: content.id,
                tableName: content.displayName,
                workspaceId: content.workspaceId,
                sourceType: 'table',
                rowCount: excelData.rowCount,
                columnCount: excelData.columnCount
            }
        };
    }

    supportsSaving(dataSource: ContentReference): boolean {
        // Tables can support saving back to OneLake
        return this.canHandle(dataSource);
    }

    async saveData(workloadClient: WorkloadClientAPI, data: ExcelData, options?: SaveOptions): Promise<OneLakeSaveResult> {
        console.log(`Saving Excel data back to table in OneLake: ${data.contentReference.displayName}`);
        
        // In a real implementation, this would update the Lakehouse table
        // For now, return a successful mock response
        console.log(`Mock save: would save ${data.rowCount} rows to table ${data.contentReference.displayName}`);

        return {
            success: true,
            rowsAffected: data.rowCount,
            newVersion: new Date().toISOString(),
            metadata: {
                tableName: data.contentReference.displayName,
                rowCount: data.rowCount,
                columnCount: data.columnCount,
                savedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Generate sample data for table demonstration
     * In a real implementation, this would query the actual Lakehouse table
     */
    private generateSampleTableData(dataSource: ContentReference): { headers: string[], data: any[][] } {
        const headers = ['ID', 'Name', 'Category', 'Value', 'Date', 'Active'];
        const data: any[][] = [];
        
        // Generate sample rows based on the table name for variety
        const rowCount = Math.max(5, Math.min(50, dataSource.displayName.length * 3));
        
        for (let i = 1; i <= rowCount; i++) {
            data.push([
                i,
                `${dataSource.displayName} Item ${i}`,
                ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'][i % 5],
                Math.round((Math.random() * 1000 + 100) * 100) / 100,
                new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
                Math.random() > 0.3
            ]);
        }
        
        return { headers, data };
    }

    /**
     * Infer schema from sample data
     */
    private inferSchemaFromSampleData(sampleData: { headers: string[], data: any[][] }): TableSchema[] {
        const schema: TableSchema[] = [];
        
        for (let i = 0; i < sampleData.headers.length; i++) {
            const header = sampleData.headers[i];
            let dataType: 'string' | 'number' | 'date' | 'boolean' = 'string';
            
            // Look at the first few rows to infer type
            const sampleValues = sampleData.data.slice(0, 5).map(row => row[i]);
            
            if (sampleValues.every(val => typeof val === 'number')) {
                dataType = 'number';
            } else if (sampleValues.every(val => typeof val === 'boolean')) {
                dataType = 'boolean';
            } else if (sampleValues.some(val => val instanceof Date || (typeof val === 'string' && !isNaN(Date.parse(val))))) {
                dataType = 'date';
            }
            
            schema.push({ name: header, dataType });
        }
        
        return schema;
    }
}