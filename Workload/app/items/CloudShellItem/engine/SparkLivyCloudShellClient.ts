import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { SparkLivyClient } from "../../../clients/SparkLivyClient";
import { SessionRequest, SessionResponse, StatementRequest, StatementResponse, BatchRequest, BatchResponse } from "../../../clients/FabricPlatformTypes";

/**
 * Session kinds supported by Spark Livy for Cloud Shell.
 * Currently only Python sessions are supported for Cloud Shell execution.
 */
export enum SessionKind {
  PYTHON = 'python',
}

/**
 * Configuration for initializing a Cloud Shell Spark session.
 * 
 * Sessions are created with lakehouse context and environment binding.
 * Session IDs are cached in item definition for automatic reuse.
 */
export interface CloudShellSessionConfig {
    /** Workspace containing the lakehouse and environment */
    workspaceId: string;
    /** Lakehouse ID providing data context and OneLake access */
    lakehouseId: string;
    /** Spark environment ID (determines Python packages and configuration) */
    environmentId: string;
    /** Session kind (currently only PYTHON supported) */
    sessionKind: SessionKind;
}

/**
 * Result of executing a Cloud Shell command or statement.
 * 
 * Commands are wrapped based on execution mode:
 * - FAB_CLI/SHELL: Wrapped with subprocess.run() returning JSON
 * - PYTHON: Executed directly, returns plain text output
 */
export interface CloudShellCommandResult {
    /** Whether execution completed successfully (exit code 0 or no error) */
    success: boolean;
    /** Command output (stdout for success, stderr for errors) */
    output: string;
    /** Whether the result represents an error state */
    isError: boolean;
}

/**
 * Client for managing Cloud Shell execution through Spark Livy sessions.
 * 
 * **Key Responsibilities**:
 * - Session lifecycle: Create, validate, reuse, and cancel Spark sessions
 * - Command execution: Execute statements with mode-specific wrapping
 * - Batch jobs: Submit scripts as Spark batch jobs with parameter injection
 * - Session validation: Ensure sessions are ready before reuse
 * - Fabric CLI verification: Check CLI availability in Spark environment
 * 
 * **Session Management**:
 * - Sessions created with lakehouse and environment context
 * - Automatic validation before reuse (schedulerState='Scheduled', livyState='idle')
 * - Session IDs cached in item definition for cross-reload reuse
 * - CLI availability verified on session creation/reuse
 * 
 * **Batch Execution**:
 * - Scripts uploaded to OneLake before batch creation
 * - Parameters injected via Spark configuration (spark.script.param.*)
 * - Polling for batch creation with 60-second timeout
 * - Returns BatchResponse with ID for monitoring
 * 
 * **Performance Optimizations**:
 * - Static caching of FabCliCheckWrapper.py content
 * - Session reuse to avoid creation overhead (5+ minute startup)
 * - Efficient polling strategies for session/batch creation
 */
export class SparkLivyCloudShellClient {
    private sparkClient: SparkLivyClient;
    private static fabCliCheckWrapperContent: string | null = null;

    constructor(workloadClient: WorkloadClientAPI) {
        this.sparkClient = new SparkLivyClient(workloadClient);
    }

    /**
     * Get the FabCliCheckWrapper.py content (cached).
     * 
     * This wrapper verifies Fabric CLI availability in the Spark environment.
     * Static caching prevents repeated file fetches across instances.
     * 
     * @returns Promise resolving to Python wrapper script content
     * @throws Error if wrapper file cannot be loaded
     */
    private static async getFabCliCheckWrapperContent(): Promise<string> {
        if (SparkLivyCloudShellClient.fabCliCheckWrapperContent === null) {
            const response = await fetch('/assets/items/CloudShellItem/FabCliCheckWrapper.py');
            if (!response.ok) {
                throw new Error('Failed to load FabCliCheckWrapper.py');
            }
            SparkLivyCloudShellClient.fabCliCheckWrapperContent = await response.text();
        }
        return SparkLivyCloudShellClient.fabCliCheckWrapperContent;
    }

    /**
     * Initialize a new Spark session for Cloud Shell execution.
     * 
     * **Session Creation Flow**:
     * 1. Create session request with lakehouse and environment binding
     * 2. Poll for session to reach 'Scheduled' + 'idle' state (max 5 minutes)
     * 3. Verify Fabric CLI availability using FabCliCheckWrapper.py
     * 4. Return ready session or throw error
     * 
     * **State Monitoring**:
     * - Progress updates provided via onProgress callback every 5 poll attempts
     * - Final states: schedulerState='Scheduled' AND livyState='idle'
     * - Timeout: 150 attempts × 2 seconds = 5 minutes
     * 
     * **CLI Verification**:
     * - Runs "fab --version" to verify ms-cloud-shell package
     * - Session cancelled if CLI not available
     * - Provides setup instructions on failure
     * 
     * @param config Session configuration with workspace, lakehouse, and environment
     * @param onProgress Callback for progress updates (session creation status messages)
     * @returns Promise resolving to ready SessionResponse
     * @throws Error if session creation times out, CLI not available, or other failures
     */
    async initializeSession(
        config: CloudShellSessionConfig,
        onProgress: (message: string) => void
    ): Promise<SessionResponse> {
        const { workspaceId, lakehouseId, environmentId, sessionKind } = config;

        const sessionRequest: SessionRequest = {
            name: `CloudShell Session: ${new Date().toISOString()}`,
            kind: sessionKind,
            conf: {
                "spark.targetLakehouse": lakehouseId,
                "spark.fabric.environmentDetails": `{"id" : "${environmentId}"}`
            },
            tags: {
                source: "Cloud Shell Item",
            }
        };

        // Create session
        const asyncIndicator = await this.sparkClient.createSession(workspaceId, lakehouseId, sessionRequest);
        console.log(`[CloudShell] Session creation operation ID: ${asyncIndicator.operationId}`);
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

        // Verify Cloud Shell is available in the environment (only in fab mode)
        onProgress('Verifying Cloud Shell installation...');
        try {
            // Build verification statement
            const wrapperCode = await SparkLivyCloudShellClient.getFabCliCheckWrapperContent();
            const verifyStatement: StatementRequest = {
                code: wrapperCode,
                kind: SessionKind.PYTHON
            };
            
            const response = await this.executeStatement(
                workspaceId,
                lakehouseId,
                foundSession.id!.toString(),
                verifyStatement
            );

            if (response.isError) {
                throw new Error(
                    'Cloud Shell is not available in this environment.\n\n' +
                    'Please add the "ms-cloud-shell" package to the Spark environment being used.\n' +
                    'You can do this by:\n' +
                    '1. Opening your Spark environment settings\n' +
                    '2. Adding "ms-cloud-shell" to the Python packages list\n' +
                    '3. Saving the environment and waiting for it to be ready' +
                    '4. Publishing the environment and retrying\n\n'
                );
            }

            onProgress(`Cloud Shell verified: ${response.output}`);
        } catch (error: any) {
            // Cancel the session since it's not usable
            try {
                await this.sparkClient.cancelSession(workspaceId, lakehouseId, foundSession.id!.toString());
            } catch (cancelError) {
                console.warn('Failed to cancel session after CLI verification failure:', cancelError);
            }

            throw new Error(
                'Cloud Shell is not available in this environment.\n\n' +
                'Please add the "ms-cloud-shell" package to the Spark environment being used.\n' +
                'You can do this by:\n' +
                '1. Opening your Spark environment settings\n' +
                '2. Adding "ms-cloud-shell" to the Python packages list\n' +
                '3. Saving the environment and waiting for it to be ready\n\n' +
                `Original error: ${error.message}`
            );
        }

        return foundSession;
    }

    /**
     * Check if an existing session is still valid and can be reused.
     * 
     * Validation ensures session is in ready state before reuse:
     * - schedulerState must be 'Scheduled' (session allocated to cluster)
     * - livyState must be 'idle' (ready to accept new statements)
     * 
     * Returns null if session not found or not in valid state.
     * 
     * @param workspaceId Workspace containing the session
     * @param lakehouseId Lakehouse bound to the session
     * @param sessionId Session ID to validate
     * @returns Promise resolving to SessionResponse if valid, null otherwise
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
     * Reuse an existing session or create a new one.
     * 
     * **Session Reuse Logic**:
     * 1. If existingSessionId provided, attempt validation
     * 2. If valid, verify CLI availability and return session
     * 3. If invalid or CLI check fails, create new session
     * 4. If no existingSessionId, create new session immediately
     * 
     * **Benefits of Reuse**:
     * - Avoids 5+ minute session startup time
     * - Preserves session state and loaded packages
     * - Reduces resource consumption
     * 
     * **Validation Criteria**:
     * - Session exists in list
     * - schedulerState = 'Scheduled'
     * - livyState = 'idle'
     * - CLI verification passes (fab --version succeeds)
     * 
     * @param config Session configuration for new session if needed
     * @param existingSessionId Optional session ID to attempt reuse
     * @param onProgress Callback for progress updates
     * @returns Promise resolving to ready SessionResponse (reused or new)
     */
    async reuseOrCreateSession(
        config: CloudShellSessionConfig,
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
                    onProgress('Verifying Cloud Shell installation...');
                    
                    // Build verification statement
                    const wrapperCode = await SparkLivyCloudShellClient.getFabCliCheckWrapperContent();
                    const verifyStatement: StatementRequest = {
                        code: wrapperCode,
                        kind: SessionKind.PYTHON
                    };
                    
                    const response = await this.executeStatement(
                        workspaceId,
                        lakehouseId,
                        existingSessionId,
                        verifyStatement
                    );

                    if (!response.isError) {
                        onProgress(`Cloud Shell verified: ${response.output}`);
                        onProgress('Session is ready! You can now execute Cloud Shell commands.');
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
     * Cancel an active Spark session.
     * 
     * Sends cancellation request to Spark Livy API.
     * Session will transition to 'dead' state and resources will be released.
     * 
     * Note: Cancellation is async - session may not terminate immediately.
     * 
     * @param workspaceId Workspace containing the session
     * @param lakehouseId Lakehouse bound to the session
     * @param sessionId Session ID to cancel
     * @returns Promise resolving when cancellation request is sent
     */
    async cancelSession(workspaceId: string, lakehouseId: string, sessionId: string): Promise<void> {
        await this.sparkClient.cancelSession(workspaceId, lakehouseId, sessionId);
    }

    /**
     * Execute a statement through the Spark session.
     * 
     * **Execution Flow**:
     * 1. Submit statement via Livy API
     * 2. Poll for result (1-second intervals, 60-second timeout)
     * 3. Parse output based on mode:
     *    - FAB_CLI/SHELL: Extract JSON with returncode, stdout, stderr
     *    - PYTHON: Return plain text output
     * 
     * **Result Handling**:
     * - state='available' + status='ok': Success with output
     * - state='available' + status='error': Python exception with traceback
     * - state='error': Statement execution failed
     * - Timeout after 60 attempts: Throws error
     * 
     * This is a lightweight proxy - does not block terminal UI.
     * 
     * @param workspaceId Workspace containing the session
     * @param lakehouseId Lakehouse bound to the session
     * @param sessionId Active session ID
     * @param statementRequest Statement to execute with code and kind
     * @returns Promise resolving to CloudShellCommandResult
     * @throws Error if statement execution times out
     */
    async executeStatement(
        workspaceId: string,
        lakehouseId: string,
        sessionId: string,
        statementRequest: StatementRequest
    ): Promise<CloudShellCommandResult> {
        const response = await this.sparkClient.submitStatement(workspaceId, lakehouseId, sessionId, statementRequest);
        return await this.waitForStatementResult(workspaceId, lakehouseId, sessionId, response);
    }

    /**
     * Poll for statement result and parse JSON response
     */
    private async waitForStatementResult(
        workspaceId: string,
        lakehouseId: string,
        sessionId: string,
        statement: StatementResponse
    ): Promise<CloudShellCommandResult> {
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
                    
                    // Try to parse as JSON subprocess result
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
                        }
                    } catch (parseError) {
                        // Not a JSON subprocess result, treat as direct output
                    }
                    
                    // Direct output (Python NATIVE mode or fallback)
                    return {
                        success: true,
                        output: rawOutput || 'Command executed successfully',
                        isError: false
                    };
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
     * Submit a batch job for script execution.
     * 
     * **Batch Job Flow**:
     * 1. Script already uploaded to OneLake by caller
     * 2. Create batch with Spark configuration including parameters
     * 3. Poll for batch to appear in list (2-second intervals, 20-second timeout)
     * 4. Return BatchResponse with ID for monitoring
     * 
     * **Parameter Injection**:
     * Parameters passed via Spark conf as:
     * - spark.script.param.<name> = value
     * - spark.script.param.<name>.type = type
     * 
     * **Polling Strategy**:
     * - Check every 2 seconds for batch creation
     * - Match by batch name
     * - Max 10 attempts (20 seconds total)
     * - Throws error if batch not found in time
     * 
     * **Public Access**: Shared by script execution commands (FabricCLIScriptCommand, etc.)
     * 
     * @param workspaceId Workspace for batch execution
     * @param lakehouseId Lakehouse providing data context
     * @param batchRequest Batch configuration with file path, name, and Spark conf
     * @returns Promise resolving to BatchResponse with batch ID
     * @throws Error if batch creation times out or fails
     */
    async submitBatchJob(
        workspaceId: string,
        lakehouseId: string,
        batchRequest: BatchRequest): Promise<BatchResponse> {
        await this.sparkClient.createBatch(workspaceId, lakehouseId, batchRequest);

        let foundBatch: BatchResponse | null = null;
        let attempts = 0;
        const maxAttempts = 10;

        while (!foundBatch && attempts < maxAttempts) {
            try {
                const batches = await this.sparkClient.listBatches(workspaceId, lakehouseId);
                const targetBatch = batches.find(b => b.name === batchRequest.name);

                if (targetBatch && (targetBatch.id || targetBatch.artifactId)) {
                    foundBatch = targetBatch;
                } else {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    attempts++;
                }
            } catch (listError: any) {
                console.warn('Error listing batches:', listError);
                await new Promise(resolve => setTimeout(resolve, 2000));
                attempts++;
            }
        }

        if (!foundBatch) {
            throw new Error('Batch job creation timed out - batch did not appear in the list');
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
}
