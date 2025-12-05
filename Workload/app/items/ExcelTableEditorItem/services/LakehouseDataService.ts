import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { SparkLivyClient } from "../../../clients/SparkLivyClient";

/**
 * Lakehouse Data Service
 * Handles data retrieval from Microsoft Fabric Lakehouse using Spark Livy API
 */

export interface LakehouseTable {
  name: string;
  displayName: string;
  description?: string;
  schema: LakehouseColumn[];
  rowCount?: number;
  lastModified?: Date;
}

export interface LakehouseColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  description?: string;
}

export interface LakehouseDataQuery {
  tableName: string;
  columns?: string[];
  filter?: string;
  limit?: number;
  orderBy?: string;
}

export interface LakehouseDataResult {
  columns: LakehouseColumn[];
  data: any[][];
  totalRows: number;
  executionTime: number;
  query: LakehouseDataQuery;
}

/**
 * Real Lakehouse table data with schema and rows
 */
export interface RealLakehouseTableData {
  schema: Array<{ name: string; dataType: string }>;
  rows: any[][];
  rowCount: number;
  tableName: string;
}

export class LakehouseDataService {
  private static instance: LakehouseDataService;
  private sparkLivyClient?: SparkLivyClient;

  public static getInstance(): LakehouseDataService {
    if (!LakehouseDataService.instance) {
      LakehouseDataService.instance = new LakehouseDataService();
    }
    return LakehouseDataService.instance;
  }

  /**
   * Initialize the service with Fabric workload client
   */
  public initialize(workloadClient: WorkloadClientAPI): void {
    this.sparkLivyClient = new SparkLivyClient(workloadClient);
    console.log('✅ LakehouseDataService initialized with Spark Livy client');
  }

  /**
   * Fetch REAL data from a Lakehouse table using SQL Analytics Endpoint (simpler alternative to Spark)
   * This uses the Lakehouse's built-in SQL endpoint which doesn't require Spark session management
   * @param workspaceId The workspace ID containing the Lakehouse
   * @param lakehouseId The Lakehouse ID
   * @param tableName The table name to query
   * @param limit Maximum number of rows to fetch (default: 10000)
   * @returns Promise<RealLakehouseTableData> Real table data with schema and rows
   */
  public async fetchRealTableDataViaSql(
    workspaceId: string,
    lakehouseId: string,
    tableName: string,
    limit: number = 10000
  ): Promise<RealLakehouseTableData> {
    console.log(`🔍 Fetching REAL data using SQL Analytics Endpoint: ${tableName}`);
    console.log(`   Workspace: ${workspaceId}, Lakehouse: ${lakehouseId}, Limit: ${limit}`);

    // TODO: Implement SQL Analytics Endpoint query
    // This requires:
    // 1. Get the SQL connection string from Get Lakehouse API
    // 2. Use SQL client library to query the table
    // 3. Map the results to our schema format
    
    throw new Error('SQL Analytics Endpoint method not yet implemented. Use backend API approach instead.');
  }

  /**
   * Fetch REAL data from a Lakehouse table using Spark SQL
   * @param workspaceId The workspace ID containing the Lakehouse
   * @param lakehouseId The Lakehouse ID
   * @param tableName The table name to query
   * @param limit Maximum number of rows to fetch (default: 10000)
   * @returns Promise<RealLakehouseTableData> Real table data with schema and rows
   */
  public async fetchRealTableData(
    workspaceId: string,
    lakehouseId: string,
    tableName: string,
    limit: number = 10000
  ): Promise<RealLakehouseTableData> {
    if (!this.sparkLivyClient) {
      throw new Error('LakehouseDataService not initialized. Call initialize() first.');
    }

    console.log(`🔍 Fetching REAL data from Lakehouse table: ${tableName}`);
    console.log(`   Workspace: ${workspaceId}, Lakehouse: ${lakehouseId}, Limit: ${limit}`);

    try {
      // Create Spark session
      const sessionRequest = {
        name: `ExcelEdit_${tableName}_${Date.now()}`,
        executorCores: 4,
        executorMemory: "28g",
        driverCores: 4,
        driverMemory: "28g"
      };

      console.log('📡 Creating Spark Livy session with request:', sessionRequest);
      
      let session: any;
      try {
        session = await this.sparkLivyClient.createSession(
          workspaceId,
          lakehouseId,
          sessionRequest
        );
      } catch (sessionError: any) {
        console.error('❌ Spark session creation API call failed');
        console.error('   Error message:', sessionError.message);
        console.error('   Error details:', sessionError);
        
        if (sessionError.statusCode === 404) {
          throw new Error('Spark Livy API endpoint not found (404). Spark may not be enabled in this Fabric workspace.');
        } else if (sessionError.statusCode === 401 || sessionError.statusCode === 403) {
          throw new Error('Permission denied to create Spark session. Check workload authentication and Spark permissions.');
        } else if (sessionError.statusCode === 400) {
          throw new Error(`Bad request creating Spark session: ${sessionError.message}. The session parameters may be invalid.`);
        }
        
        throw new Error(`Failed to create Spark session: ${sessionError.message}`);
      }

      console.log('📊 Full session response:', JSON.stringify(session, null, 2));
      console.log('🔍 Session type:', typeof session);
      console.log('🔍 Session keys:', session ? Object.keys(session) : 'null/undefined');
      
      // Check if this is an async operation (202 Accepted response)
      if (session && session.operationId && !session.id) {
        console.log('⏳ Session creation returned async operation (202 Accepted)');
        console.log('   Operation ID:', session.operationId);
        console.log('🔄 Polling for session creation completion...');
        
        // Poll for the session to be ready (max 5 minutes)
        const maxPolls = 60; // 60 polls * 5 seconds = 5 minutes
        let pollCount = 0;
        let operationCompleted = false;
        
        while (pollCount < maxPolls && !operationCompleted) {
          pollCount++;
          console.log(`   Poll attempt ${pollCount}/${maxPolls}...`);
          
          // Wait 5 seconds before polling
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          try {
            // Poll the operation status endpoint
            const operationStatus = await this.sparkLivyClient!.getOperationStatus(
              workspaceId,
              lakehouseId,
              session.operationId
            );
            
            console.log(`   Operation status:`, operationStatus);
            
            // Check if operation completed successfully
            if (operationStatus.status === 'Succeeded' && operationStatus.result) {
              console.log('✅ Operation completed successfully!');
              console.log('   Result:', operationStatus.result);
              
              // Extract session info from result
              if (operationStatus.result.id) {
                session = operationStatus.result; // Use the completed session
                operationCompleted = true;
                console.log('✅ Session created!');
                console.log('   Session ID:', session.id);
                console.log('   Session state:', session.state);
              } else {
                console.error('⚠️  Operation succeeded but no session ID in result:', operationStatus.result);
              }
            } else if (operationStatus.status === 'Failed') {
              console.error('❌ Operation failed:', operationStatus);
              throw new Error(`Session creation operation failed: ${JSON.stringify(operationStatus)}`);
            } else {
              console.log(`   Operation still in progress (status: ${operationStatus.status || 'Unknown'}), continuing to poll...`);
            }
          } catch (pollError) {
            console.warn('⚠️  Poll attempt failed:', pollError);
            // Continue polling even if one attempt fails
          }
        }
        
        if (!operationCompleted || !session.id) {
          throw new Error(`Session creation timed out after ${maxPolls * 5} seconds. The session may still be starting.`);
        }
      }
      
      console.log('🔍 Session.id value:', session?.id);
      console.log('🔍 Session.id type:', typeof session?.id);

      if (!session || !session.id) {
        console.error('❌ Session creation failed - no session ID returned');
        console.error('   Session response:', session);
        console.error('   This usually means:');
        console.error('   1. Spark Livy API is not available/enabled in this workspace');
        console.error('   2. The API returned an unexpected response format');
        console.error('   3. Authentication scope is insufficient');
        throw new Error('Failed to create Spark session - no session ID returned. The Spark Livy API may not be available in this environment.');
      }

      console.log(`✅ Spark session created: ${session.id}`);

      // Wait for session ready
      await this.waitForSessionReady(workspaceId, lakehouseId, session.id);
      
      // Execute Spark code
      const sparkCode = `
import json

df = spark.table("${tableName}").limit(${limit})
schema = [{"name": field.name, "dataType": str(field.dataType)} for field in df.schema.fields]
rows = [list(row) for row in df.collect()]

print("LAKEHOUSE_DATA_START")
print(json.dumps({"schema": schema, "rows": rows, "rowCount": len(rows), "tableName": "${tableName}"}))
print("LAKEHOUSE_DATA_END")
`;

      const statement = await this.sparkLivyClient.submitStatement(
        workspaceId,
        lakehouseId,
        session.id,
        { code: sparkCode }
      );

      const result = await this.waitForStatementCompletion(
        workspaceId,
        lakehouseId,
        session.id,
        statement.id.toString()
      );

      const lakehouseData = this.parseSparkOutput(result.output.data['text/plain']);
      
      console.log(`✅ Fetched ${lakehouseData.rowCount} real rows from Lakehouse`);

      // Cleanup
      try {
        await this.sparkLivyClient.deleteSession(workspaceId, lakehouseId, session.id);
      } catch (e) {
        console.warn('⚠️ Session cleanup warning:', e);
      }

      return lakehouseData;

    } catch (error) {
      console.error('❌ Error fetching real Lakehouse data:', error);
      throw error;
    }
  }

  /**
   * Wait for Spark session to reach idle state
   */
  private async waitForSessionReady(
    workspaceId: string,
    lakehouseId: string,
    sessionId: string,
    maxWaitSeconds: number = 120
  ): Promise<void> {
    if (!this.sparkLivyClient) throw new Error('Spark client not initialized');

    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      const session = await this.sparkLivyClient.getSession(workspaceId, lakehouseId, sessionId);
      if (session.state === 'idle') return;
      if (session.state === 'error' || session.state === 'dead') {
        throw new Error(`Session failed: ${session.state}`);
      }
      await this.sleep(2000);
    }
    throw new Error('Session timeout');
  }

  /**
   * Wait for statement completion
   */
  private async waitForStatementCompletion(
    workspaceId: string,
    lakehouseId: string,
    sessionId: string,
    statementId: string,
    maxWaitSeconds: number = 300
  ): Promise<any> {
    if (!this.sparkLivyClient) throw new Error('Spark client not initialized');

    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      const statement = await this.sparkLivyClient.getStatement(
        workspaceId,
        lakehouseId,
        sessionId,
        statementId
      );
      if (statement.state === 'available') return statement;
      if (statement.state === 'error') {
        throw new Error(`Statement error: ${JSON.stringify(statement.output)}`);
      }
      await this.sleep(1000);
    }
    throw new Error('Statement timeout');
  }

  /**
   * Parse Spark output
   */
  private parseSparkOutput(output: string): RealLakehouseTableData {
    const startMarker = 'LAKEHOUSE_DATA_START';
    const endMarker = 'LAKEHOUSE_DATA_END';
    const start = output.indexOf(startMarker) + startMarker.length;
    const end = output.indexOf(endMarker);
    const jsonString = output.substring(start, end).trim();
    return JSON.parse(jsonString);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get available tables from the current lakehouse
   */
  public async getTables(): Promise<LakehouseTable[]> {
    try {
      // In a real implementation, this would call the Fabric Lakehouse API
      // For demo purposes, we'll return sample table metadata
      
      const sampleTables: LakehouseTable[] = [
        {
          name: "sales_data",
          displayName: "Sales Data",
          description: "Monthly sales performance data across regions",
          rowCount: 15420,
          lastModified: new Date('2024-10-25'),
          schema: [
            { name: "SaleID", dataType: "string", nullable: false, description: "Unique sale identifier" },
            { name: "Date", dataType: "datetime", nullable: false, description: "Sale date" },
            { name: "Region", dataType: "string", nullable: false, description: "Sales region" },
            { name: "Product", dataType: "string", nullable: false, description: "Product name" },
            { name: "Revenue", dataType: "decimal", nullable: false, description: "Sale amount in USD" },
            { name: "Units", dataType: "int", nullable: false, description: "Number of units sold" },
            { name: "Customer", dataType: "string", nullable: true, description: "Customer name" },
            { name: "SalesRep", dataType: "string", nullable: true, description: "Sales representative" }
          ]
        },
        {
          name: "customer_analytics",
          displayName: "Customer Analytics",
          description: "Customer behavior and demographic analysis",
          rowCount: 8930,
          lastModified: new Date('2024-10-24'),
          schema: [
            { name: "CustomerID", dataType: "string", nullable: false, description: "Unique customer ID" },
            { name: "Age", dataType: "int", nullable: true, description: "Customer age" },
            { name: "Location", dataType: "string", nullable: false, description: "Customer location" },
            { name: "Segment", dataType: "string", nullable: false, description: "Customer segment" },
            { name: "LifetimeValue", dataType: "decimal", nullable: false, description: "Customer lifetime value" },
            { name: "LastPurchase", dataType: "datetime", nullable: true, description: "Last purchase date" },
            { name: "PreferredChannel", dataType: "string", nullable: true, description: "Preferred shopping channel" }
          ]
        },
        {
          name: "inventory_tracking",
          displayName: "Inventory Tracking",
          description: "Real-time inventory levels and movement",
          rowCount: 5670,
          lastModified: new Date('2024-10-26'),
          schema: [
            { name: "ProductID", dataType: "string", nullable: false, description: "Product identifier" },
            { name: "ProductName", dataType: "string", nullable: false, description: "Product name" },
            { name: "Category", dataType: "string", nullable: false, description: "Product category" },
            { name: "CurrentStock", dataType: "int", nullable: false, description: "Current stock level" },
            { name: "ReorderPoint", dataType: "int", nullable: false, description: "Reorder threshold" },
            { name: "LastRestocked", dataType: "datetime", nullable: true, description: "Last restock date" },
            { name: "Warehouse", dataType: "string", nullable: false, description: "Warehouse location" },
            { name: "UnitCost", dataType: "decimal", nullable: false, description: "Unit cost" }
          ]
        }
      ];

      return sampleTables;
    } catch (error) {
      console.error('Failed to fetch tables from lakehouse:', error);
      throw new Error('Unable to retrieve lakehouse tables');
    }
  }

  /**
   * Execute a query against the lakehouse and return data
   */
  public async queryData(query: LakehouseDataQuery): Promise<LakehouseDataResult> {
    const startTime = Date.now();
    
    try {
      // In a real implementation, this would execute SQL/KQL against the lakehouse
      // For demo purposes, we'll generate realistic sample data based on the table
      
      const sampleData = await this.generateSampleData(query);
      const executionTime = Date.now() - startTime;

      return {
        columns: sampleData.columns,
        data: sampleData.rows,
        totalRows: sampleData.rows.length,
        executionTime,
        query
      };
    } catch (error) {
      console.error('Failed to query lakehouse data:', error);
      throw new Error('Data query execution failed');
    }
  }

  /**
   * Generate realistic sample data based on table schema
   */
  private async generateSampleData(query: LakehouseDataQuery): Promise<{ columns: LakehouseColumn[], rows: any[][] }> {
    const tables = await this.getTables();
    const table = tables.find(t => t.name === query.tableName);
    
    if (!table) {
      throw new Error(`Table ${query.tableName} not found`);
    }

    const limit = query.limit || 50;
    const columns = query.columns ? 
      table.schema.filter(col => query.columns!.includes(col.name)) : 
      table.schema;

    // Generate realistic sample data based on table type
    const rows: any[][] = [];
    
    for (let i = 0; i < limit; i++) {
      const row: any[] = [];
      
      for (const column of columns) {
        row.push(this.generateColumnValue(column, i, query.tableName));
      }
      
      rows.push(row);
    }

    return { columns, rows };
  }

  /**
   * Generate realistic values for different column types
   */
  private generateColumnValue(column: LakehouseColumn, rowIndex: number, tableName: string): any {
    const { name, dataType } = column;

    // Generate values based on table and column context
    if (tableName === 'sales_data') {
      switch (name) {
        case 'SaleID': return `SALE-${String(rowIndex + 1).padStart(6, '0')}`;
        case 'Date': return new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
        case 'Region': return ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East'][Math.floor(Math.random() * 5)];
        case 'Product': return ['Surface Laptop', 'Office 365', 'Azure Services', 'Teams Premium', 'Power BI Pro'][Math.floor(Math.random() * 5)];
        case 'Revenue': return (Math.random() * 5000 + 100).toFixed(2);
        case 'Units': return Math.floor(Math.random() * 20) + 1;
        case 'Customer': return ['Contoso Corp', 'Fabrikam Inc', 'Adventure Works', 'Northwind Traders', 'Tailspin Toys'][Math.floor(Math.random() * 5)];
        case 'SalesRep': return ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Lisa Rodriguez', 'David Kim'][Math.floor(Math.random() * 5)];
      }
    } else if (tableName === 'customer_analytics') {
      switch (name) {
        case 'CustomerID': return `CUST-${String(rowIndex + 1).padStart(5, '0')}`;
        case 'Age': return Math.floor(Math.random() * 50) + 25;
        case 'Location': return ['New York', 'London', 'Tokyo', 'Sydney', 'Toronto'][Math.floor(Math.random() * 5)];
        case 'Segment': return ['Enterprise', 'SMB', 'Consumer', 'Education', 'Government'][Math.floor(Math.random() * 5)];
        case 'LifetimeValue': return (Math.random() * 50000 + 1000).toFixed(2);
        case 'LastPurchase': return new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
        case 'PreferredChannel': return ['Online', 'Retail', 'Partner', 'Direct Sales'][Math.floor(Math.random() * 4)];
      }
    } else if (tableName === 'inventory_tracking') {
      switch (name) {
        case 'ProductID': return `PRD-${String(rowIndex + 1).padStart(4, '0')}`;
        case 'ProductName': return ['Wireless Mouse', 'Bluetooth Keyboard', 'USB Drive', 'Monitor Stand', 'Webcam'][Math.floor(Math.random() * 5)];
        case 'Category': return ['Electronics', 'Accessories', 'Storage', 'Peripherals'][Math.floor(Math.random() * 4)];
        case 'CurrentStock': return Math.floor(Math.random() * 1000) + 50;
        case 'ReorderPoint': return Math.floor(Math.random() * 100) + 25;
        case 'LastRestocked': return new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
        case 'Warehouse': return ['Seattle', 'Dallas', 'Atlanta', 'Phoenix'][Math.floor(Math.random() * 4)];
        case 'UnitCost': return (Math.random() * 200 + 10).toFixed(2);
      }
    }

    // Default value generation based on data type
    switch (dataType) {
      case 'string': return `Value_${rowIndex + 1}`;
      case 'int': return Math.floor(Math.random() * 1000);
      case 'decimal': return (Math.random() * 1000).toFixed(2);
      case 'datetime': return new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
      default: return `Data_${rowIndex + 1}`;
    }
  }

  /**
   * Format data for Excel consumption
   */
  public formatForExcel(result: LakehouseDataResult): { config: any, data: any[][] } {
    // Create header row
    const headers = result.columns.map(col => col.name);
    
    // Combine headers with data
    const excelData = [headers, ...result.data];

    return {
      config: {
        promoteHeaders: true,
        adjustColumnNames: true,
        tableStyle: 'TableStyleMedium9', // Professional blue style
        autoFitColumns: true
      },
      data: excelData
    };
  }
}