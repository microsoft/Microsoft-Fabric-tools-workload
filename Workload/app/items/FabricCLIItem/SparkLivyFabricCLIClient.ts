import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { SparkLivyClient } from "../../clients/SparkLivyClient";
import { SessionRequest, SessionResponse, StatementRequest, StatementResponse, BatchRequest, BatchResponse } from "../../clients/FabricPlatformTypes";
import { OneLakeStorageClient } from "../../clients/OneLakeStorageClient";
import { EnvironmentConstants } from "../../constants";
import { ScriptParameter } from "./FabricCLIItemModel";

/**
 * Execution mode for Fabric CLI commands
 */
export enum ExecutionMode {
  /** Execute native Python code without any wrapper */
  NATIVE = 'NATIVE',
  /** Execute shell commands via subprocess */
  SUBPROCESS = 'SUBPROCESS',
  /** Execute commands with 'fab' prefix via subprocess */
  FAB_CLI = 'FAB_CLI'
}

/**
 * Session kinds supported by Spark Livy for Fabric CLI
 */
export enum SessionKind {
  PYTHON = 'python',
}

/**
 * Configuration for initializing a Fabric CLI session
 */
export interface FabricCLISessionConfig {
    workspaceId: string;
    lakehouseId: string;
    environmentId: string;
    sessionKind: SessionKind;
}

/**
 * Result of executing a Fabric CLI command
 */
export interface FabricCLICommandResult {
    success: boolean;
    output: string;
    isError: boolean;
}

/**
 * Client for managing Fabric CLI commands through Spark Livy sessions
 */
export class SparkLivyFabricCLIClient {
    private sparkClient: SparkLivyClient;
    private oneLakeClient: OneLakeStorageClient;

    constructor(workloadClient: WorkloadClientAPI) {
        this.sparkClient = new SparkLivyClient(workloadClient);
        this.oneLakeClient = new OneLakeStorageClient(workloadClient);
    }

    /**
     * Initialize a new Spark session for Fabric CLI execution
     */
    async initializeSession(
        config: FabricCLISessionConfig,
        onProgress: (message: string) => void
    ): Promise<SessionResponse> {
        const { workspaceId, lakehouseId, environmentId, sessionKind } = config;

        const sessionRequest: SessionRequest = {
            name: `Fabric CLI Session ${new Date().toISOString()}`,
            kind: sessionKind,
            conf: {
                "spark.targetLakehouse": lakehouseId,
                "spark.fabric.environmentDetails": `{"id" : "${environmentId}"}`
            },
            tags: {
                source: "Fabric CLI Item",
            }
        };

        // Create session
        const asyncIndicator = await this.sparkClient.createSession(workspaceId, lakehouseId, sessionRequest);
        console.log(`[FabricCLI] Session creation operation ID: ${asyncIndicator.operationId}`);
        onProgress(`Session creation started. Operation ID: ${asyncIndicator.operationId}`);
        onProgress('Waiting for session to be created...');

        // Poll for session to reach ready state
        let sessionReady = false;
        let foundSession: SessionResponse | null = null;
        let attempts = 0;
        const maxAttempts = 150; // 5 minutes with 2 second intervals

        while (!sessionReady && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            try {
                const sessions = await this.sparkClient.listSessions(workspaceId, lakehouseId);
                const targetSession = sessions.find(s => s.name === sessionRequest.name);

                if (targetSession && targetSession.id) {
                    const sid = String(targetSession.id);

                    // Set session object only once when first found
                    if (!foundSession) {
                        foundSession = targetSession;
                        onProgress(`Session created with ID: ${sid}`);
                        onProgress('Waiting for session to be started...');
                    } else {
                        // Update the session object with latest state
                        foundSession = targetSession;
                    }

                    // Update session state
                    const currentSchedulerState = targetSession.schedulerState;
                    const currentLivyState = targetSession.livyState;

                    // Check if session is ready (schedulerState === 'Scheduled' AND livyState === 'idle')
                    const isScheduled = currentSchedulerState?.toLowerCase() === 'scheduled';
                    const isIdle = currentLivyState?.toLowerCase() === 'idle';

                    if (isScheduled && isIdle) {
                        onProgress('Session is ready!');
                        sessionReady = true;
                    } else {
                        // Log state changes periodically
                        if (attempts % 5 === 0) {
                            const stateMessage = `Session state - Scheduler: ${currentSchedulerState}, Livy: ${currentLivyState}, Plugin: ${targetSession.pluginState}`;
                            onProgress(stateMessage);
                        }
                    }
                }
            } catch (listError: any) {
                console.warn('Error listing sessions:', listError);
            }
        }

        if (!sessionReady || !foundSession) {
            throw new Error('Session creation timed out - session did not reach ready state');
        }

        // Verify Fabric CLI is available in the environment (only in fab mode)
        onProgress('Verifying Fabric CLI installation...');
        try {
            const response = await this.executeCommand(workspaceId, 
                lakehouseId, foundSession.id!.toString(), "--version");

            if (response.isError) {
                throw new Error(
                    'Fabric CLI is not available in this environment.\n\n' +
                    'Please add the "ms-fabric-cli" package to the Spark environment being used.\n' +
                    'You can do this by:\n' +
                    '1. Opening your Spark environment settings\n' +
                    '2. Adding "ms-fabric-cli" to the Python packages list\n' +
                    '3. Saving the environment and waiting for it to be ready' +
                    '4. Publishing the environment and retrying\n\n'
                );
            }

            onProgress(`Fabric CLI verified: ${response.output}`);
        } catch (error: any) {
            // Cancel the session since it's not usable
            try {
                await this.sparkClient.cancelSession(workspaceId, lakehouseId, foundSession.id!.toString());
            } catch (cancelError) {
                console.warn('Failed to cancel session after CLI verification failure:', cancelError);
            }

            throw new Error(
                'Fabric CLI is not available in this environment.\n\n' +
                'Please add the "ms-fabric-cli" package to the Spark environment being used.\n' +
                'You can do this by:\n' +
                '1. Opening your Spark environment settings\n' +
                '2. Adding "ms-fabric-cli" to the Python packages list\n' +
                '3. Saving the environment and waiting for it to be ready\n\n' +
                `Original error: ${error.message}`
            );
        }

        return foundSession;
    }

    /**
     * Check if an existing session is still valid and can be reused
     */
    async validateSession(
        workspaceId: string,
        lakehouseId: string,
        sessionId: string
    ): Promise<SessionResponse | null> {
        try {
            const sessions = await this.sparkClient.listSessions(workspaceId, lakehouseId);
            const existingSession = sessions.find(s => s.id === sessionId);

            if (!existingSession) {
                return null;
            }

            // Check if session is in a usable state
            const isScheduled = existingSession.schedulerState?.toLowerCase() === 'scheduled';
            const isIdle = existingSession.livyState?.toLowerCase() === 'idle';

            if (isScheduled && isIdle) {
                return existingSession;
            }

            return null;
        } catch (error) {
            console.warn('Error validating session:', error);
            return null;
        }
    }

    /**
     * Reuse an existing session or create a new one
     */
    async reuseOrCreateSession(
        config: FabricCLISessionConfig,
        existingSessionId: string | null | undefined,
        onProgress: (message: string) => void
    ): Promise<SessionResponse> {
        const { workspaceId, lakehouseId } = config;

        // Try to reuse existing session
        if (existingSessionId) {
            onProgress(`Checking existing session ${existingSessionId}...`);
            const validSession = await this.validateSession(workspaceId, lakehouseId, existingSessionId);

            if (validSession) {
                onProgress(`Reusing existing session ${existingSessionId}`);

                // Verify CLI is still available (only in fab mode)

                try {
                    onProgress('Verifying Fabric CLI installation...');
                    const response = await this.executeCommand(workspaceId, 
                        lakehouseId, 
                        existingSessionId,  
                        "--version");

                    if (!response.isError) {
                        onProgress(`Fabric CLI verified: ${response.output}`);
                        onProgress('Session is ready! You can now execute Fabric CLI commands.');
                        return validSession;
                    }
                } catch (error) {
                    console.warn('Failed to verify CLI in existing session:', error);
                }

            }

            onProgress('Existing session is not available, creating new session...');
        }

        // Create new session if reuse failed or no existing session
        return await this.initializeSession(config, onProgress);
    }

    /**
     * Cancel an active session
     */
    async cancelSession(workspaceId: string, lakehouseId: string, sessionId: string): Promise<void> {
        await this.sparkClient.cancelSession(workspaceId, lakehouseId, sessionId);
    }

    /**
     * Execute a Fabric CLI command through the Spark session
     */
    async executeCommand(
        workspaceId: string,
        lakehouseId: string,
        sessionId: string,
        command: string,
        executionMode: ExecutionMode = ExecutionMode.FAB_CLI
    ): Promise<FabricCLICommandResult> {
        let code: string;
        let statementRequest: StatementRequest;

        if (executionMode === ExecutionMode.NATIVE) {
            // Execute native Python code directly
            statementRequest = { code: command, kind: SessionKind.PYTHON };
        } else {
            // Wrap command in Python subprocess format with shell=True to support pipes, redirections, etc.
            const escapedCommand = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            
            // Build command based on execution mode
            const fullCommand = executionMode === ExecutionMode.FAB_CLI 
                ? `fab ${escapedCommand}` 
                : escapedCommand;
            
            code = `import subprocess;
import json;
result = subprocess.run("${fullCommand}", shell=True, capture_output=True, text=True);
jsonResult = {"returncode": result.returncode, "stdout": result.stdout.strip(), "stderr": result.stderr.strip()};
print(json.dumps(jsonResult));`;
            
            statementRequest = { code: code, kind: SessionKind.PYTHON };
        }

        const response = await this.sparkClient.submitStatement(workspaceId, lakehouseId, sessionId, statementRequest);

        // Wait for statement to complete
        return await this.waitForStatementResult(workspaceId, lakehouseId, sessionId, response, executionMode);
    }

    /**
     * Poll for statement result and parse JSON response
     */
    private async waitForStatementResult(
        workspaceId: string,
        lakehouseId: string,
        sessionId: string,
        statement: StatementResponse,
        executionMode: ExecutionMode = ExecutionMode.FAB_CLI
    ): Promise<FabricCLICommandResult> {
        let attempts = 0;
        const maxAttempts = 60; // 60 seconds timeout

        while (attempts < maxAttempts) {
            try {
                const statementInfo = await this.sparkClient.getStatement(
                    workspaceId,
                    lakehouseId,
                    sessionId,
                    statement.id.toString()
                );

                if (statementInfo.state === 'available') {
                    // Check if output indicates an error at the Python level
                    if (statementInfo.output?.status === 'error') {
                        const errorName = statementInfo.output.ename || 'Error';
                        const errorValue = statementInfo.output.evalue || 'Statement execution failed';
                        const traceback = statementInfo.output.traceback?.join('\n') || '';
                        return {
                            success: false,
                            output: `${errorName}: ${errorValue}\n${traceback}`,
                            isError: true
                        };
                    }
                    
                    const rawOutput = statementInfo.output?.data?.['text/plain'] || '';
                    
                    // In NATIVE mode, return output directly without JSON parsing
                    if (executionMode === ExecutionMode.NATIVE) {
                        return {
                            success: true,
                            output: rawOutput,
                            isError: false
                        };
                    }
                    
                    // Parse JSON response from Fabric CLI
                    
                    try {
                        // Extract JSON from output
                        const jsonMatch = rawOutput.match(/\{"returncode":.+\}/);
                        if (jsonMatch) {
                            const jsonResult = JSON.parse(jsonMatch[0]);

                            if (jsonResult.returncode === 0) {
                                // Success - return stdout
                                return {
                                    success: true,
                                    output: jsonResult.stdout || 'Command executed successfully',
                                    isError: false
                                };
                            } else {
                                // Command failed - return stderr
                                return {
                                    success: false,
                                    output: jsonResult.stderr || jsonResult.stdout || `Command failed with exit code ${jsonResult.returncode}`,
                                    isError: true
                                };
                            }
                        } else {
                            // Fallback to raw output
                            return {
                                success: true,
                                output: rawOutput || 'Command executed successfully',
                                isError: false
                            };
                        }
                    } catch (parseError) {
                        // If JSON parsing fails, return raw output
                        return {
                            success: true,
                            output: rawOutput || 'Command executed successfully',
                            isError: false
                        };
                    }
                } else if (statementInfo.state === 'error') {
                    const errorMessage = statementInfo.output?.data?.['text/plain'] || 'Statement execution failed';
                    return {
                        success: false,
                        output: errorMessage,
                        isError: true
                    };
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            } catch (error: any) {
                throw new Error(`Error checking statement status: ${error.message}`);
            }
        }

        throw new Error('Statement execution timed out after 60 seconds');
    }

    /**
     * Run a Python script as a batch job
     * @param workspaceId The workspace ID
     * @param lakehouseId The lakehouse ID
     * @param environmentId The Spark environment ID
     * @param scriptName The name of the script
     * @param scriptContent The Python script content
     * @param parameters Optional parameter definitions with name, type, and value
     * @param onProgress Optional callback for progress updates
     * @returns Promise resolving to the batch response with job details
     */
    async runScriptAsBatch(
        workspaceId: string,
        lakehouseId: string,
        environmentId: string,
        scriptName: string,
        scriptContent: string,
        parameters?: ScriptParameter[],
        onProgress?: (message: string) => void
    ): Promise<BatchResponse> {
        // Upload the script to OneLake first
        // Use a timestamp to ensure uniqueness
        const timestamp = new Date().getTime();
        const sanitizedScriptName = scriptName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const destinationSubPath = `Scripts/${timestamp}_${sanitizedScriptName}`;
        const destinationPath = OneLakeStorageClient.getFilePath(workspaceId, lakehouseId, destinationSubPath);
        
        if (onProgress) {
            onProgress(`Uploading script to OneLake: ${destinationSubPath}`);
        }
        
        // Write the script content to OneLake (unchanged, no parameter injection)
        await this.oneLakeClient.writeFileAsText(destinationPath, scriptContent);
        
        // Convert OneLake path to ABFSS URL format for Spark
        const oneLakeUrl = `${EnvironmentConstants.OneLakeDFSBaseUrl}/${destinationPath}`;
        const abfssUrl = this.convertOneLakeLinkToABFSSLink(oneLakeUrl, workspaceId);
        
        // Convert parameters to Spark configuration entries
        // Each parameter becomes spark.script.param.<name> and spark.script.param.<name>.type
        // The script can access these via spark.conf.get("spark.script.param.<name>")
        const parameterConf: Record<string, string> = {};
        if (parameters && parameters.length > 0) {
            parameters.forEach(param => {
                parameterConf[`spark.script.param.${param.name}`] = param.value;
                //parameterConf[`spark.script.param.${param.name}.type`] = param.type;
            });
            
            if (onProgress) {
                onProgress(`Configured ${parameters.length} parameter(s) in Spark config`);
            }
        }
        
        // Create a batch request
        const batchRequest: BatchRequest = {
            name: `Fabric CLI Script: ${scriptName} - ${new Date().toISOString()}`,
            file: abfssUrl,
            conf: {
                "spark.targetLakehouse": lakehouseId,
                "spark.fabric.environmentDetails": `{"id" : "${environmentId}"}`,
                ...parameterConf
            },
            tags: {
                source: "Fabric CLI Item",
                scriptName: scriptName,
            }
        };

        // Create the batch job
        const asyncIndicator = await this.sparkClient.createBatch(
            workspaceId,
            lakehouseId,
            batchRequest
        );
        
        console.log(`[FabricCLI] Batch creation operation ID: ${asyncIndicator.operationId}`);
        if (onProgress) {
            onProgress(`Batch job creation started. Operation ID: ${asyncIndicator.operationId}`);
            onProgress('Waiting for batch job to be created...');
        }

        // Poll for batch to be created and appear in the list
        let batchFound = false;
        let foundBatch: BatchResponse | null = null;
        let attempts = 0;
        const maxAttempts = 30; // 1 minute with 2 second intervals

        while (!batchFound && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            try {
                const batches = await this.sparkClient.listBatches(workspaceId, lakehouseId);
                const targetBatch = batches.find(b => b.name === batchRequest.name);

                if (targetBatch && targetBatch.id) {
                    const bid = String(targetBatch.id);
                    
                    if (!foundBatch) {
                        foundBatch = targetBatch;
                        if (onProgress) {
                            onProgress(`Batch job created with ID: ${bid}`);
                            onProgress(`Batch job state: ${targetBatch.state}`);
                        }
                    } else {
                        // Update the batch object with latest state
                        foundBatch = targetBatch;
                    }
                    
                    // Batch is created and found - we can return it
                    // The caller can use waitForBatchCompletion if they want to wait for it to finish
                    batchFound = true;
                } else if (attempts % 5 === 0 && onProgress) {
                    // Log every 10 seconds that we're still waiting
                    onProgress('Still waiting for batch job to be created...');
                }
            } catch (listError: any) {
                console.warn('Error listing batches:', listError);
            }
        }

        if (!batchFound || !foundBatch) {
            throw new Error('Batch job creation timed out - batch did not appear in the list');
        }

        if (onProgress) {
            onProgress('Batch job created successfully!');
        }

        return foundBatch;
    }

    /**
     * Get the status of a batch job
     * @param workspaceId The workspace ID
     * @param lakehouseId The lakehouse ID
     * @param batchId The batch job ID
     * @returns Promise resolving to the batch response
     */
    async getBatchStatus(
        workspaceId: string,
        lakehouseId: string,
        batchId: string
    ): Promise<BatchResponse> {
        return await this.sparkClient.getBatch(workspaceId, lakehouseId, batchId);
    }

    /**
     * Get the logs for a batch job
     * @param workspaceId The workspace ID
     * @param lakehouseId The lakehouse ID
     * @param batchId The batch job ID
     * @param from Optional starting line for logs
     * @param size Optional number of lines to retrieve
     * @returns Promise resolving to an object containing log lines
     */
    async getBatchLogs(
        workspaceId: string,
        lakehouseId: string,
        batchId: string,
        from?: number,
        size?: number
    ): Promise<{ id: string, log: string[] }> {
        return await this.sparkClient.getBatchLogs(workspaceId, lakehouseId, batchId, from, size);
    }

    /**
     * Cancel a running batch job
     * @param workspaceId The workspace ID
     * @param lakehouseId The lakehouse ID
     * @param batchId The batch job ID
     * @returns Promise resolving to the batch response
     */
    async cancelBatch(
        workspaceId: string,
        lakehouseId: string,
        batchId: string
    ): Promise<BatchResponse> {
        return await this.sparkClient.cancelBatch(workspaceId, lakehouseId, batchId);
    }

    /**
     * Wait for a batch job to complete
     * @param workspaceId The workspace ID
     * @param lakehouseId The lakehouse ID
     * @param batchId The batch job ID
     * @param onProgress Optional callback for progress updates
     * @param maxWaitMinutes Maximum time to wait in minutes (default: 30)
     * @returns Promise resolving to the final batch response
     */
    async waitForBatchCompletion(
        workspaceId: string,
        lakehouseId: string,
        batchId: string,
        onProgress?: (message: string) => void,
        maxWaitMinutes: number = 30
    ): Promise<BatchResponse> {
        const maxAttempts = (maxWaitMinutes * 60) / 5; // Check every 5 seconds
        let attempts = 0;

        while (attempts < maxAttempts) {
            const batchStatus = await this.getBatchStatus(workspaceId, lakehouseId, batchId);
            
            const state = batchStatus.state;
            const schedulerState = batchStatus.schedulerInfo?.state;
            
            if (onProgress) {
                onProgress(`Batch job status: ${state} (Scheduler: ${schedulerState})`);
            }

            // Check for terminal states
            if (state === 'success' || batchStatus.result === 'Succeeded') {
                if (onProgress) {
                    onProgress('Batch job completed successfully!');
                }
                return batchStatus;
            } else if (state === 'dead' || state === 'error' || state === 'killed' || 
                       batchStatus.result === 'Failed' || batchStatus.result === 'Cancelled') {
                if (onProgress) {
                    onProgress(`Batch job failed with state: ${state}, result: ${batchStatus.result}`);
                }
                throw new Error(`Batch job failed with state: ${state}, result: ${batchStatus.result}`);
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
        }

        throw new Error(`Batch job did not complete within ${maxWaitMinutes} minutes`);
    }

    /**
     * Convert OneLake URL to ABFSS URL format required by Spark
     * @param oneLakeLink The OneLake HTTPS URL
     * @param workspaceId The workspace ID
     * @returns ABFSS formatted URL
     */
    private convertOneLakeLinkToABFSSLink(oneLakeLink: string, workspaceId: string): string {
        let retVal = oneLakeLink.replace(`${workspaceId}/`, "");
        retVal = retVal.replace("https://", `abfss://${workspaceId}@`);
        return retVal;
    }
}
