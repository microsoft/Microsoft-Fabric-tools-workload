import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { SparkLivyClient } from "../../clients/SparkLivyClient";
import { SessionRequest, SessionResponse, StatementRequest, StatementResponse } from "../../clients/FabricPlatformTypes";

export interface FabricCLISessionConfig {
  workspaceId: string;
  lakehouseId: string;
  environmentId: string;
}

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

  constructor(workloadClient: WorkloadClientAPI) {
    this.sparkClient = new SparkLivyClient(workloadClient);
  }

  /**
   * Initialize a new Spark session for Fabric CLI execution
   */
  async initializeSession(
    config: FabricCLISessionConfig,
    onProgress: (message: string) => void
  ): Promise<SessionResponse> {
    const { workspaceId, lakehouseId, environmentId } = config;

    const sessionRequest: SessionRequest = {
      name: `Fabric CLI Session ${new Date().toISOString()}`,
      kind: 'python',
      conf: {
        "spark.targetLakehouse": lakehouseId,
        "spark.fabric.environmentDetails": `{"id" : "${environmentId}"}`
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
            onProgress('Session is ready! You can now execute Fabric CLI commands.');
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

    // Verify Fabric CLI is available in the environment
    onProgress('Verifying Fabric CLI installation...');
    try {


      const response = await this.executeCommand(workspaceId, lakehouseId, foundSession.id!.toString(), "--version");            
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
    command: string
  ): Promise<FabricCLICommandResult> {
    // Wrap command in Python subprocess format
    const escapedCommand = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const wrappedCode = 
`import subprocess;
import json;
cmd = ["fab"] + "${escapedCommand}".split();
result = subprocess.run(cmd, capture_output=True, text=True);
jsonResult = {"returncode": result.returncode, "stdout": result.stdout.strip(), "stderr": result.stderr.strip()};
print(json.dumps(jsonResult));`;

    const statementRequest: StatementRequest = { code: wrappedCode, kind: 'python' };
    const response = await this.sparkClient.submitStatement(workspaceId, lakehouseId, sessionId, statementRequest);

    // Wait for statement to complete
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

          // Parse JSON response from Fabric CLI
          const rawOutput = statementInfo.output?.data?.['text/plain'] || '';

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
                  output: jsonResult.stderr || `Command failed with exit code ${jsonResult.returncode}`,
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
}
