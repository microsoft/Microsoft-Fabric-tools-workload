/**
 * SparkQueryHelper.ts
 * 
 * Utility functions for querying Fabric Lakehouse tables using Spark Livy API
 * Handles session management, statement execution, and result polling
 */

import { SparkLivyClient } from '../../../clients/SparkLivyClient';
import { SessionResponse } from '../../../clients/FabricPlatformTypes';

/**
 * Configuration for query execution
 */
export interface SparkQueryConfig {
  maxWaitTimeMs?: number;  // Maximum time to wait for results (default: 120000 = 2 minutes)
  pollIntervalMs?: number;  // Interval between status checks (default: 2000 = 2 seconds)
}

/**
 * Result from executing a Spark query
 */
export interface SparkQueryResult {
  rows: any[];
  schema?: {
    name: string;
    type: string;
  }[];
  executionTimeMs: number;
}

/**
 * Get or create a Spark session for a lakehouse
 * Reuses existing idle sessions if available
 */
export async function getOrCreateSparkSession(
  sparkClient: SparkLivyClient,
  workspaceId: string,
  lakehouseId: string
): Promise<SessionResponse> {
  console.log('[SparkQueryHelper] Getting or creating Spark session...');
  
  try {
    // Check for existing idle sessions
    const sessionsResponse = await sparkClient.listSessions(workspaceId, lakehouseId);
    console.log('[SparkQueryHelper] Sessions response:', sessionsResponse);
    console.log('[SparkQueryHelper] Sessions response type:', typeof sessionsResponse);
    console.log('[SparkQueryHelper] Sessions response keys:', sessionsResponse ? Object.keys(sessionsResponse) : 'null');
    
    // Handle both array response and object with sessions/value property
    const sessionsList = Array.isArray(sessionsResponse) 
      ? sessionsResponse 
      : (sessionsResponse as any).sessions || (sessionsResponse as any).value || [];
    
    console.log('[SparkQueryHelper] Parsed sessions list length:', sessionsList.length);
    if (sessionsList.length > 0) {
      console.log('[SparkQueryHelper] First session:', sessionsList[0]);
    }
    
    const idleSession = sessionsList.find((s: SessionResponse) => s.state === 'idle');
    
    if (idleSession) {
      console.log(`[SparkQueryHelper] Reusing existing session: ${idleSession.id}`);
      return idleSession;
    }
    
    // No idle session found, create a new one
    console.log('[SparkQueryHelper] Creating new Spark session...');
    const sessionRequest = {
      name: `ExcelExport_${Date.now()}`,
      kind: 'pyspark',
      conf: {
        'spark.sql.legacy.timeParserPolicy': 'LEGACY'
      }
    };
    
    const createResponse = await sparkClient.createSession(workspaceId, lakehouseId, sessionRequest);
    console.log(`[SparkQueryHelper] Create session response:`, createResponse);
    
    // The create API returns an operationId for async operation
    // We need to poll for the session to appear in the sessions list
    if ((createResponse as any).operationId) {
      console.log(`[SparkQueryHelper] Session creation is async, polling for completion...`);
      
      // Poll for the session to appear (max 60 seconds, 20 attempts)
      const startTime = Date.now();
      const maxWaitMs = 60000; // 1 minute
      const pollIntervalMs = 3000; // 3 seconds
      const maxAttempts = 20;
      let attemptCount = 0;
      
      while (Date.now() - startTime < maxWaitMs && attemptCount < maxAttempts) {
        attemptCount++;
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        
        console.log(`[SparkQueryHelper] Polling attempt ${attemptCount}/${maxAttempts}...`);
        
        const sessionsResponse = await sparkClient.listSessions(workspaceId, lakehouseId);
        const sessionsList = Array.isArray(sessionsResponse) 
          ? sessionsResponse 
          : (sessionsResponse as any).sessions || (sessionsResponse as any).value || [];
        
        console.log(`[SparkQueryHelper] Polling: Found ${sessionsList.length} sessions`);
        console.log(`[SparkQueryHelper] Looking for session named: ${sessionRequest.name}`);
        
        // Log first few session names to debug (not all 82!)
        if (sessionsList.length > 0) {
          const firstFew = sessionsList.slice(0, 5);
          const sessionNames = firstFew.map((s: any) => `${s.name || 'unnamed'} (${s.id}, ${s.state})`);
          console.log(`[SparkQueryHelper] First ${firstFew.length} sessions:`, sessionNames);
          if (sessionsList.length > 5) {
            console.log(`[SparkQueryHelper] ...and ${sessionsList.length - 5} more`);
          }
        }
        
        // Find our newly created session by name
        const newSession = sessionsList.find((s: any) => s.name === sessionRequest.name);
        if (newSession) {
          console.log(`[SparkQueryHelper] ✅ Session found after ${attemptCount} attempts: ${newSession.id}, state: ${newSession.state}`);
          
          // Wait for it to be ready if not already
          if (newSession.state !== 'idle') {
            await waitForSessionReady(sparkClient, workspaceId, lakehouseId, newSession.id);
          }
          
          return newSession;
        }
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[SparkQueryHelper] Session not yet available after ${elapsed}s, attempt ${attemptCount}/${maxAttempts}...`);
      }
      
      const finalElapsed = Math.round((Date.now() - startTime) / 1000);
      throw new Error(`Timeout waiting for session to be created (waited ${finalElapsed}s, ${attemptCount} attempts). The Spark cluster may be busy or the session creation failed.`);
    }
    
    // If we got a direct session response (synchronous)
    console.log(`[SparkQueryHelper] Session created: ${createResponse.id}, state: ${createResponse.state}`);
    
    // Wait for session to be ready
    await waitForSessionReady(sparkClient, workspaceId, lakehouseId, createResponse.id as string);
    
    return createResponse;
  } catch (error: any) {
    console.error('[SparkQueryHelper] Error getting/creating session:', error);
    
    // Provide helpful error message for permission issues
    if (error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('Unauthorized')) {
      throw new Error(
        `Failed to create Spark session: Unauthorized. ` +
        `The application may be missing the "Fabric.Extend" API permission. ` +
        `Please ensure the Entra app has "Power BI Service → Fabric.Extend" permission granted. ` +
        `Original error: ${error.message}`
      );
    }
    
    throw new Error(`Failed to create Spark session: ${error.message}`);
  }
}

/**
 * Wait for a session to reach 'idle' state
 */
async function waitForSessionReady(
  sparkClient: SparkLivyClient,
  workspaceId: string,
  lakehouseId: string,
  sessionId: string,
  maxWaitTimeMs: number = 120000, // 2 minutes
  pollIntervalMs: number = 3000    // 3 seconds
): Promise<void> {
  console.log(`[SparkQueryHelper] Waiting for session ${sessionId} to be ready...`);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTimeMs) {
    const session = await sparkClient.getSession(workspaceId, lakehouseId, sessionId);
    console.log(`[SparkQueryHelper] Session state: ${session.state}`);
    
    if (session.state === 'idle') {
      console.log('[SparkQueryHelper] Session is ready!');
      return;
    }
    
    if (session.state === 'error' || session.state === 'dead' || session.state === 'killed') {
      throw new Error(`Session failed with state: ${session.state}`);
    }
    
    // Wait before next poll
    await sleep(pollIntervalMs);
  }
  
  throw new Error(`Session did not become ready within ${maxWaitTimeMs}ms`);
}

/**
 * Execute a SQL query using Spark Livy
 */
export async function executeSparkQuery(
  sparkClient: SparkLivyClient,
  workspaceId: string,
  lakehouseId: string,
  sessionId: string,
  tableName: string,
  limit: number = 1000,
  config?: SparkQueryConfig
): Promise<SparkQueryResult> {
  const maxWaitTimeMs = config?.maxWaitTimeMs || 120000;
  const pollIntervalMs = config?.pollIntervalMs || 2000;
  const startTime = Date.now();
  
  console.log(`[SparkQueryHelper] Executing query for table: ${tableName} (limit: ${limit})`);
  
  try {
    // Prepare Python code to query the table and return JSON with schema
    const code = `
import json
import math
from pyspark.sql import functions as F
from datetime import date, datetime
from decimal import Decimal
import pandas as pd

# Custom JSON encoder to handle dates, timestamps, and decimals
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DateTimeEncoder, self).default(obj)

# Query the table with limit
df = spark.sql("SELECT * FROM ${tableName} LIMIT ${limit}")

# Extract schema information
schema_info = []
for field in df.schema.fields:
    schema_info.append({
        'name': field.name,
        'dataType': str(field.dataType)
    })

# Convert to Pandas and replace NaN with None
pdf = df.toPandas()
pdf = pdf.where(pd.notnull(pdf), None)
result = pdf.to_dict('records')

# Print schema and data as JSON
output = {
    'schema': schema_info,
    'data': result
}
print(json.dumps(output, cls=DateTimeEncoder))
`.trim();
    
    // Submit the statement
    const statement = await sparkClient.submitStatement(
      workspaceId,
      lakehouseId,
      sessionId,
      { code, kind: 'pyspark' }
    );
    
    console.log(`[SparkQueryHelper] Statement submitted: ${statement.id}`);
    
    // Poll for result
    const result = await pollStatementResult(
      sparkClient,
      workspaceId,
      lakehouseId,
      sessionId,
      statement.id.toString(),
      maxWaitTimeMs,
      pollIntervalMs
    );
    
    const executionTimeMs = Date.now() - startTime;
    console.log(`[SparkQueryHelper] Query completed in ${executionTimeMs}ms`);
    
    // Handle both new format (with schema) and legacy format (array only)
    const resultAny = result as any;
    if (resultAny && typeof resultAny === 'object' && !Array.isArray(resultAny) && 
        resultAny.data && resultAny.schema) {
      // New format: result has schema and data properties
      return {
        rows: resultAny.data,
        schema: resultAny.schema,
        executionTimeMs
      };
    } else {
      // Legacy format: result is just an array
      return {
        rows: result,
        executionTimeMs
      };
    }
  } catch (error: any) {
    console.error('[SparkQueryHelper] Error executing query:', error);
    throw new Error(`Failed to execute query: ${error.message}`);
  }
}

/**
 * Poll for statement result until it's available or times out
 */
async function pollStatementResult(
  sparkClient: SparkLivyClient,
  workspaceId: string,
  lakehouseId: string,
  sessionId: string,
  statementId: string,
  maxWaitTimeMs: number,
  pollIntervalMs: number
): Promise<any[]> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTimeMs) {
    const statement = await sparkClient.getStatement(
      workspaceId,
      lakehouseId,
      sessionId,
      statementId
    );
    
    console.log(`[SparkQueryHelper] Statement state: ${statement.state}`);
    
    if (statement.state === 'available') {
      // Debug: Log the entire statement response
      console.log('[SparkQueryHelper] Full statement response:', statement);
      console.log('[SparkQueryHelper] Statement output:', statement.output);
      console.log('[SparkQueryHelper] Statement output keys:', statement.output ? Object.keys(statement.output) : 'no output');
      if (statement.output?.data) {
        console.log('[SparkQueryHelper] Output data keys:', Object.keys(statement.output.data));
      }
      
      // Parse the output
      if (statement.output?.data?.['text/plain']) {
        try {
          const outputText = statement.output.data['text/plain'];
          // Try to parse as JSON object (new format with schema)
          const jsonObjectMatch = outputText.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            const result = JSON.parse(jsonObjectMatch[0]);
            if (result.schema && result.data) {
              console.log(`[SparkQueryHelper] Parsed ${result.data.length} rows with schema information`);
              return result; // Return both schema and data
            }
          }
          
          // Fallback: Try to parse as JSON array (legacy format without schema)
          const jsonArrayMatch = outputText.match(/\[[\s\S]*\]/);
          if (jsonArrayMatch) {
            const data = JSON.parse(jsonArrayMatch[0]);
            console.log(`[SparkQueryHelper] Parsed ${data.length} rows (legacy format)`);
            return data;
          } else {
            console.warn('[SparkQueryHelper] No JSON found in output:', outputText);
            return [];
          }
        } catch (parseError: any) {
          console.error('[SparkQueryHelper] Error parsing statement output:', parseError);
          console.error('[SparkQueryHelper] Raw output:', statement.output.data['text/plain']);
          throw new Error(`Failed to parse query results: ${parseError.message}`);
        }
      } else {
        console.warn('[SparkQueryHelper] Statement completed but no output data found');
        return [];
      }
    }
    
    if (statement.state === 'error') {
      // Extract error details from output (cast to any since error properties aren't in type definition)
      const output = statement.output as any;
      const ename = output?.ename || 'Unknown error';
      const evalue = output?.evalue || '';
      const traceback = output?.traceback?.join('\n') || '';
      
      console.error('[SparkQueryHelper] Spark query error:');
      console.error('  Error name:', ename);
      console.error('  Error value:', evalue);
      if (traceback) {
        console.error('  Traceback:', traceback);
      }
      
      throw new Error(`Spark query failed: ${ename}: ${evalue}`);
    }
    
    if (statement.state === 'cancelled') {
      throw new Error('Query was cancelled');
    }
    
    // Wait before next poll
    await sleep(pollIntervalMs);
  }
  
  throw new Error(`Query did not complete within ${maxWaitTimeMs}ms`);
}

/**
 * Simple sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cleanup: delete a Spark session
 */
export async function cleanupSparkSession(
  sparkClient: SparkLivyClient,
  workspaceId: string,
  lakehouseId: string,
  sessionId: string
): Promise<void> {
  try {
    console.log(`[SparkQueryHelper] Cleaning up session: ${sessionId}`);
    await sparkClient.deleteSession(workspaceId, lakehouseId, sessionId);
    console.log('[SparkQueryHelper] Session deleted successfully');
  } catch (error: any) {
    console.error('[SparkQueryHelper] Error deleting session:', error);
    // Don't throw - cleanup errors are non-critical
  }
}
