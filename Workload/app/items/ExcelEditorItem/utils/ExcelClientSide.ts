/**
 * Client-side Excel creation utility
 * Creates Excel files entirely in the browser using ExcelJS
 * Uses Spark Livy API for querying real lakehouse data
 * NO BACKEND REQUIRED!
 */

import ExcelJS from 'exceljs';
import { WorkloadClientAPI } from '@ms-fabric/workload-client';
import { SparkLivyClient } from '../../../clients/SparkLivyClient';
import { getOrCreateSparkSession, executeSparkQuery } from './SparkQueryHelper';

export interface TableSchema {
  name: string;
  dataType: string;
}

export interface ExcelCreationOptions {
  tableName: string;
  schema: TableSchema[];
  data: any[][];
  sqlConnectionString?: string; // Optional SQL endpoint connection string
  workspaceId?: string; // Optional workspace ID
  lakehouseId?: string; // Optional lakehouse ID
}

/**
 * Create an Excel file client-side and download it
 * @param options Excel creation options
 * @returns Promise<void>
 */
export async function createAndDownloadExcel(options: ExcelCreationOptions): Promise<void> {
  console.log('📊 Creating Excel file client-side...');
  console.log('   Table:', options.tableName);
  console.log('   Columns:', options.schema.length);
  console.log('   Rows:', options.data.length);

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.tableName);

  // Add header row
  const headers = options.schema.map(col => col.name);
  worksheet.addRow(headers);

  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' } // Microsoft blue
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
  headerRow.height = 25;

  // Add data rows
  options.data.forEach(row => {
    worksheet.addRow(row);
  });

  // Auto-fit columns
  worksheet.columns.forEach((column, index) => {
    let maxLength = headers[index].length;
    options.data.forEach(row => {
      const cellValue = String(row[index] || '');
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.min(maxLength + 2, 50); // Max 50 chars wide
  });

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Add connection instructions worksheet if SQL connection string is provided
  if (options.sqlConnectionString) {
    const instructionsSheet = workbook.addWorksheet('📖 How to Get Real Data');
    
    // Add title
    instructionsSheet.getCell('A1').value = '🔗 Connect to Lakehouse SQL Endpoint';
    instructionsSheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF0078D4' } };
    
    // Add instructions
    const instructions = [
      '',
      'This Excel file contains the TABLE SCHEMA only.',
      'To get REAL DATA from the Lakehouse, follow these steps:',
      '',
      '📌 Method 1: Power Query (Recommended)',
      '1. In Excel, go to: Data → Get Data → From Database → From SQL Server',
      `2. Server: ${options.sqlConnectionString}`,
      `3. Database: Leave empty or use workspace name`,
      '4. Data Connectivity mode: DirectQuery or Import',
      '5. Authentication: Microsoft Account (use your Fabric account)',
      `6. Select table: ${options.tableName}`,
      '7. Click "Load" to import the real data',
      '',
      '📌 Method 2: SQL Server Management Studio (SSMS)',
      `1. Connect to: ${options.sqlConnectionString}`,
      '2. Authentication: Microsoft Entra (Azure Active Directory)',
      `3. Query: SELECT * FROM [${options.tableName}]`,
      '',
      '📌 Connection Details:',
      `   SQL Endpoint: ${options.sqlConnectionString}`,
      `   Table Name: ${options.tableName}`,
      '   Authentication: Microsoft Entra ID',
      '   Port: 1433 (default SQL Server port)',
      '',
      '💡 Tip: Power Query allows live refresh - your Excel stays connected to Lakehouse!',
      '',
      '📚 Documentation:',
      '   https://learn.microsoft.com/en-us/fabric/data-warehouse/connectivity',
    ];

    instructions.forEach((line, index) => {
      instructionsSheet.getCell(`A${index + 2}`).value = line;
      if (line.startsWith('📌') || line.startsWith('💡') || line.startsWith('📚')) {
        instructionsSheet.getCell(`A${index + 2}`).font = { bold: true, size: 11 };
      }
    });

    // Auto-fit column width
    instructionsSheet.getColumn('A').width = 100;
  }

  // Generate Excel file as blob
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // Download the file
  const fileName = `${options.tableName}_${new Date().getTime()}.xlsx`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  console.log('✅ Excel file created and downloaded!');
  console.log('   File name:', fileName);
  console.log('   File size:', Math.round(buffer.byteLength / 1024), 'KB');
}

/**
 * Fetch table data from Fabric Lakehouse using Spark Livy and create Excel
 * @param workloadClient Workload client for authentication (SparkLivyClient will get tokens internally)
 * @param workspaceId Workspace ID
 * @param lakehouseId Lakehouse ID
 * @param tableName Table name
 * @returns Promise<void>
 */
export async function fetchAndDownloadLakehouseTable(
  workloadClient: WorkloadClientAPI,
  workspaceId: string,
  lakehouseId: string,
  tableName: string,
  existingSessionId?: string | null
): Promise<void> {
  console.log('📊 Fetching table data from Lakehouse using Spark Livy...');
  console.log('   Workspace:', workspaceId);
  console.log('   Lakehouse:', lakehouseId);
  console.log('   Table:', tableName);
  if (existingSessionId) {
    console.log('   Using existing Spark session:', existingSessionId);
  }

  try {
    // Create Spark Livy client (it will handle token acquisition internally with proper scopes)
    const sparkClient = new SparkLivyClient(workloadClient);
    
    // Step 1: Get or create Spark session (reuse if provided)
    let session: any;
    if (existingSessionId) {
      console.log('♻️ Reusing existing Spark session:', existingSessionId);
      session = { id: existingSessionId };
    } else {
      console.log('⏳ Getting or creating Spark session (this may take 30-60 seconds on first use)...');
      session = await getOrCreateSparkSession(sparkClient, workspaceId, lakehouseId);
      console.log('✅ Spark session ready:', session.id);
    }
    
    // Step 2: Execute SQL query to get table data
    console.log('🔍 Executing query via Spark Livy...');
    const queryResult = await executeSparkQuery(sparkClient, workspaceId, lakehouseId, session.id, tableName, 1000);
    console.log('✅ Query executed successfully');
    console.log('   Rows fetched:', queryResult.rows?.length || 0);
    console.log('   Execution time:', queryResult.executionTimeMs, 'ms');
    
    // Step 3: Parse results and create Excel
    if (!queryResult.rows || queryResult.rows.length === 0) {
      throw new Error('No data returned from query');
    }
    
    // Extract schema from first row
    const firstRow = queryResult.rows[0];
    const schema: TableSchema[] = Object.keys(firstRow).map(key => ({
      name: key,
      dataType: typeof firstRow[key]
    }));
    
    // Convert data to 2D array
    const data = queryResult.rows.map(row => 
      Object.values(row).map(val => val === null ? '' : String(val))
    );
    
    console.log('💡 Creating Excel with REAL DATA from Lakehouse!');
    console.log(`   Schema: ${schema.length} columns`);
    console.log(`   Data: ${data.length} rows`);
    
    // Step 4: Create and download Excel with real data
    await createAndDownloadExcel({
      tableName,
      schema,
      data
    });
    
    console.log('✅ Excel file created with REAL DATA from Spark Livy!');
  } catch (error: any) {
    console.error('❌ Error fetching table data:', error);
    throw error;
  }
}

/**
 * Fetch table data from Fabric Lakehouse using Spark Livy (returns data instead of downloading)
 * Useful for OneDrive upload flow where we need the blob for upload, not download
 * @param workloadClient Workload client for authentication
 * @param workspaceId Workspace ID
 * @param lakehouseId Lakehouse ID
 * @param tableName Table name
 * @param existingSessionId Optional existing Spark session ID to reuse
 * @returns Promise with data and schema
 */
export async function fetchLakehouseTableData(
  workloadClient: WorkloadClientAPI,
  workspaceId: string,
  lakehouseId: string,
  tableName: string,
  existingSessionId?: string | null
): Promise<{ data: any[][]; schema: TableSchema[]; sessionId: string }> {
  console.log('📊 Fetching table data from Lakehouse using Spark Livy...');
  
  try {
    const sparkClient = new SparkLivyClient(workloadClient);
    
    // Get or create Spark session (reuse if provided)
    let session: any;
    if (existingSessionId) {
      console.log('♻️ Reusing existing Spark session:', existingSessionId);
      session = { id: existingSessionId };
    } else {
      console.log('⏳ Getting or creating Spark session...');
      session = await getOrCreateSparkSession(sparkClient, workspaceId, lakehouseId);
      console.log('✅ Spark session ready:', session.id);
    }
    
    // Execute SQL query to get table data
    console.log('🔍 Executing query via Spark Livy...');
    const queryResult = await executeSparkQuery(sparkClient, workspaceId, lakehouseId, session.id, tableName, 1000);
    console.log('✅ Query executed successfully');
    
    // Handle both new format (with schema) and legacy format (without schema)
    let rows: any[];
    let sparkSchema: any[] | undefined;
    
    // Check if we have the new format with schema in queryResult directly
    if (queryResult.schema && Array.isArray(queryResult.schema)) {
      // New format: queryResult has rows array and schema array
      rows = queryResult.rows || [];
      sparkSchema = queryResult.schema;
    } else if (queryResult.rows && Array.isArray(queryResult.rows)) {
      // Legacy format: rows is an array, no schema
      rows = queryResult.rows;
    } else {
      console.error('Unexpected queryResult structure:', queryResult);
      throw new Error('Unexpected query result format');
    }
    
    console.log('   Rows fetched:', rows.length);
    
    if (!rows || rows.length === 0) {
      throw new Error('No data returned from query');
    }
    
    // Extract schema - prefer Spark schema if available, otherwise infer from data
    let schema: TableSchema[];
    if (sparkSchema && sparkSchema.length > 0) {
      console.log('   Using Spark schema information');
      schema = sparkSchema.map((field: any) => ({
        name: field.name,
        dataType: field.dataType // Keep the Spark type string (e.g., "BooleanType", "LongType")
      }));
    } else {
      console.log('   Inferring schema from data');
      const firstRow = rows[0];
      schema = Object.keys(firstRow).map(key => ({
        name: key,
        dataType: typeof firstRow[key]
      }));
    }
    
    // Convert data to 2D array (still convert to strings for Excel compatibility)
    const data = rows.map(row => 
      Object.values(row).map(val => val === null ? '' : String(val))
    );
    
    console.log(`✅ Data fetched: ${schema.length} columns, ${data.length} rows`);
    
    return { data, schema, sessionId: session.id };
  } catch (error: any) {
    console.error('❌ Error fetching table data:', error);
    throw error;
  }
}

/**
 * Extract data from an Excel file stored in OneDrive
 * @param excelUrl OneDrive URL to the Excel file
 * @returns Promise with extracted headers and rows
 */
export async function extractExcelData(excelUrl: string): Promise<{
  headers: string[];
  rows: any[][];
  rowCount: number;
  columnCount: number;
}> {
  console.log('📊 Extracting data from Excel file...');
  console.log('   URL:', excelUrl);

  try {
    // Fetch the Excel file from OneDrive using the download URL
    // The download URL is provided by Microsoft Graph API (@microsoft.graph.downloadUrl)
    // and allows direct access to the file content without CORS restrictions
    
    const response = await fetch(excelUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Excel file: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    
    // Parse Excel with ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    // Get the first worksheet
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('Excel file has no worksheets');
    }

    // Extract headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers.push(String(cell.value || `Column${colNumber}`));
    });

    if (headers.length === 0) {
      throw new Error('Excel file has no headers');
    }

    // Extract data rows (skip header row)
    const rows: any[][] = [];
    const maxRows = 10000; // Limit to 10K rows as per requirements
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      if (rows.length >= maxRows) return; // Enforce limit

      const rowData: any[] = [];
      for (let i = 1; i <= headers.length; i++) {
        const cell = row.getCell(i);
        rowData.push(cell.value || null);
      }
      rows.push(rowData);
    });

    console.log(`✅ Excel data extracted: ${headers.length} columns, ${rows.length} rows`);

    if (rows.length >= maxRows) {
      console.warn(`⚠️ Row limit reached. Only first ${maxRows} rows will be saved.`);
    }

    return {
      headers,
      rows,
      rowCount: rows.length,
      columnCount: headers.length
    };
  } catch (error: any) {
    console.error('❌ Error extracting Excel data:', error);
    throw error;
  }
}

/**
 * Validate that Excel schema matches the original lakehouse table schema
 * @param excelHeaders Headers from Excel file
 * @param originalSchema Original table schema from lakehouse
 * @returns Validation result with error message if invalid
 */
export function validateSchemaMatch(
  excelHeaders: string[],
  originalSchema: TableSchema[]
): { isValid: boolean; error?: string } {
  console.log('🔍 Validating schema match...');
  console.log('   Excel headers:', excelHeaders);
  console.log('   Original schema:', originalSchema.map(s => s.name));

  // Check column count
  if (excelHeaders.length !== originalSchema.length) {
    return {
      isValid: false,
      error: `Column count mismatch: Excel has ${excelHeaders.length} columns, but table has ${originalSchema.length} columns`
    };
  }

  // Check column names (strict matching, case-sensitive)
  for (let i = 0; i < excelHeaders.length; i++) {
    const excelHeader = excelHeaders[i].trim();
    const originalHeader = originalSchema[i].name.trim();
    
    if (excelHeader !== originalHeader) {
      return {
        isValid: false,
        error: `Column name mismatch at position ${i + 1}: Excel has "${excelHeader}", but table expects "${originalHeader}"`
      };
    }
  }

  console.log('✅ Schema validation passed');
  return { isValid: true };
}

/**
 * Write Excel data back to Fabric Lakehouse using Spark Livy (INSERT OVERWRITE)
 * @param workloadClient Workload client for authentication
 * @param workspaceId Workspace ID
 * @param lakehouseId Lakehouse ID
 * @param tableName Table name
 * @param headers Column headers
 * @param rows Data rows
 * @param originalSchema Original schema from lakehouse (optional, for type preservation)
 * @param existingSessionId Optional existing Spark session ID to reuse
 * @returns Promise with success status and session ID
 */
export async function writeExcelToLakehouse(
  workloadClient: WorkloadClientAPI,
  workspaceId: string,
  lakehouseId: string,
  tableName: string,
  headers: string[],
  rows: any[][],
  originalSchema?: TableSchema[],
  existingSessionId?: string | null
): Promise<{ success: boolean; sessionId: string; rowsWritten: number }> {
  console.log('💾 Writing Excel data to Lakehouse using Spark Livy...');
  console.log('   Workspace:', workspaceId);
  console.log('   Lakehouse:', lakehouseId);
  console.log('   Table:', tableName);
  console.log('   Rows:', rows.length);
  console.log('   Columns:', headers.length);

  try {
    // Create Spark Livy client
    const sparkClient = new SparkLivyClient(workloadClient);
    
    // Step 1: Get or create Spark session (reuse if provided)
    let session: any;
    if (existingSessionId) {
      console.log('♻️ Reusing existing Spark session:', existingSessionId);
      session = { id: existingSessionId };
    } else {
      console.log('⏳ Getting or creating Spark session...');
      session = await getOrCreateSparkSession(sparkClient, workspaceId, lakehouseId);
      console.log('✅ Spark session ready:', session.id);
    }

    // Step 2: Build INSERT OVERWRITE statement
    // We'll use PySpark DataFrame API for better handling of large datasets
    console.log('🔨 Building PySpark INSERT OVERWRITE statement...');
    
    // Create PySpark code to insert data
    // Split into batches if needed (max 1000 rows per statement for safety)
    const batchSize = 1000;
    const batches = Math.ceil(rows.length / batchSize);
    
    console.log(`📦 Splitting into ${batches} batch(es) of ${batchSize} rows each`);
    
    // First, create a temporary view with all data
    let pysparkCode = `
# Import required libraries
from pyspark.sql import Row
from pyspark.sql.types import *

# Define schema
schema = StructType([
`;
    
    // Track timestamp columns for later conversion
    const timestampColumns: string[] = [];
    
    // Add schema fields (use original schema if available, otherwise infer from data)
    headers.forEach((header, index) => {
      let sparkType = 'StringType()';
      
      // If we have the original schema, use it to preserve data types
      if (originalSchema) {
        const originalColumn = originalSchema.find(col => col.name === header);
        if (originalColumn) {
          const dataType = originalColumn.dataType.toLowerCase();
          
          // Map JavaScript/SQL/Spark types to Spark types
          if (dataType.includes('bigint') || dataType.includes('long') || 
              dataType.includes('integer') || dataType.includes('int')) {
            sparkType = 'LongType()';
          } else if (dataType.includes('double') || dataType.includes('float') || 
                     dataType.includes('decimal') || dataType.includes('numeric')) {
            sparkType = 'DoubleType()';
          } else if (dataType.includes('boolean') || dataType.includes('bool')) {
            sparkType = 'BooleanType()';
          } else if (dataType.includes('date') && !dataType.includes('time')) {
            sparkType = 'DateType()';
          } else if (dataType.includes('timestamp') || dataType.includes('datetime')) {
            // Keep TimestampType in schema, convert data to datetime objects
            sparkType = 'TimestampType()';
            timestampColumns.push(header);
          } else {
            sparkType = 'StringType()';
          }
        }
      } else {
        // Fallback: Try to infer type from first non-null value
        for (const row of rows) {
          if (row[index] !== null && row[index] !== undefined) {
            const value = row[index];
            if (typeof value === 'number') {
              sparkType = Number.isInteger(value) ? 'LongType()' : 'DoubleType()';
            } else if (typeof value === 'boolean') {
              sparkType = 'BooleanType()';
            }
            break;
          }
        }
      }
      pysparkCode += `    StructField("${header}", ${sparkType}, True),\n`;
    });
    
    pysparkCode += `])

# Create data rows
data = [
`;
    
    // Add data in batches
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, rows.length);
      const batchRows = rows.slice(batchStart, batchEnd);
      
      console.log(`📝 Processing batch ${batchIndex + 1}/${batches} (rows ${batchStart}-${batchEnd})`);
      
      batchRows.forEach((row, rowIndex) => {
        pysparkCode += '    (';
        row.forEach((cell, cellIndex) => {
          if (cell === null || cell === undefined || cell === '') {
            pysparkCode += 'None';
          } else {
            // Determine the target type from schema
            const header = headers[cellIndex];
            let targetType = 'string';
            
            if (originalSchema) {
              const originalColumn = originalSchema.find(col => col.name === header);
              if (originalColumn) {
                targetType = originalColumn.dataType.toLowerCase();
              }
            }
            
            // Convert value based on target type
            if (targetType.includes('bool')) {
              // Convert string boolean to Python boolean
              const boolValue = String(cell).toLowerCase() === 'true';
              pysparkCode += boolValue ? 'True' : 'False';
            } else if (targetType.includes('timestamp') || targetType.includes('date')) {
              // Convert ISO timestamp string to Python datetime object
              const cellStr = String(cell);
              if (cellStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                // Parse ISO format and create datetime object
                // We import datetime module at the top, so use datetime.fromisoformat()
                const escaped = cellStr.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                pysparkCode += `datetime.fromisoformat("${escaped}")`;
              } else {
                pysparkCode += 'None';
              }
            } else if (targetType.includes('int') || targetType.includes('long') || targetType.includes('bigint')) {
              // Convert to integer
              const numValue = parseInt(String(cell));
              pysparkCode += isNaN(numValue) ? 'None' : String(numValue);
            } else if (targetType.includes('double') || targetType.includes('float') || targetType.includes('decimal') || targetType.includes('numeric')) {
              // Convert to float
              const numValue = parseFloat(String(cell));
              pysparkCode += isNaN(numValue) ? 'None' : String(numValue);
            } else if (typeof cell === 'number') {
              // Already a number
              pysparkCode += String(cell);
            } else if (typeof cell === 'boolean') {
              // Already a boolean
              pysparkCode += cell ? 'True' : 'False';
            } else {
              // String type - escape quotes and special characters
              const escaped = String(cell).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
              pysparkCode += `"${escaped}"`;
            }
          }
          
          if (cellIndex < row.length - 1) {
            pysparkCode += ', ';
          }
        });
        pysparkCode += ')';
        
        if (batchStart + rowIndex < rows.length - 1) {
          pysparkCode += ',\n';
        } else {
          pysparkCode += '\n';
        }
      });
    }
    
    pysparkCode += `]

# Create DataFrame
from datetime import datetime

df = spark.createDataFrame(data, schema)

# Create a temporary view
df.createOrReplaceTempView("temp_insert_view")

# Use SQL INSERT OVERWRITE for better compatibility with existing table
spark.sql("INSERT OVERWRITE TABLE ${tableName} SELECT * FROM temp_insert_view")

print(f"✅ Successfully wrote {df.count()} rows to table ${tableName}")
`;

    console.log('📤 Executing PySpark INSERT OVERWRITE statement...');
    console.log('   Code length:', pysparkCode.length, 'bytes');
    
    // Step 3: Execute the statement
    const statementRequest = {
      code: pysparkCode,
      kind: 'pyspark'
    };
    
    const statementResponse = await sparkClient.submitStatement(
      workspaceId,
      lakehouseId,
      session.id,
      statementRequest
    );
    
    console.log('   Statement ID:', statementResponse.id);
    
    // Step 4: Poll for completion
    const maxWaitMs = 120000; // 2 minutes
    const pollIntervalMs = 2000; // 2 seconds
    const startTime = Date.now();
    
    let statement = statementResponse;
    while (statement.state !== 'available' && statement.state !== 'error') {
      if (Date.now() - startTime > maxWaitMs) {
        throw new Error('Statement execution timeout');
      }
      
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      statement = await sparkClient.getStatement(workspaceId, lakehouseId, session.id, String(statementResponse.id));
      console.log(`   Statement state: ${statement.state}`);
    }
    
    // Check for errors in both state and output status
    const outputStatus = (statement.output as any)?.status;
    if (statement.state === 'error' || outputStatus === 'error') {
      const errorMessage = (statement.output as any)?.evalue || 'Unknown error';
      const traceback = (statement.output as any)?.traceback;
      console.error('❌ Statement execution failed:', errorMessage);
      if (traceback) {
        console.error('   Traceback:', traceback.join('\n'));
      }
      throw new Error(`Spark execution failed: ${errorMessage}`);
    }
    
    // Log the actual output from Spark to verify success
    console.log('✅ Statement executed successfully');
    console.log('   Execution time:', Date.now() - startTime, 'ms');
    console.log('   Statement output:', JSON.stringify(statement.output, null, 2));
    console.log(`✅ Successfully wrote ${rows.length} rows to table ${tableName}`);
    
    return {
      success: true,
      sessionId: session.id,
      rowsWritten: rows.length
    };
    
  } catch (error: any) {
    console.error('❌ Error writing to lakehouse:', error);
    throw error;
  }
}
