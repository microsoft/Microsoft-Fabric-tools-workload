import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Stack } from "@fluentui/react";
import { 
  Text, 
  Input, 
  Button, 
  Divider 
} from "@fluentui/react-components";
import { Send24Regular } from '@fluentui/react-icons';
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { SparkTerminalItemDefinition } from "./SparkTerminalItemModel";
import { Item, SessionResponse } from "../../clients/FabricPlatformTypes";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import {
  SessionRequest,
  StatementRequest,
  StatementResponse,
} from '../../clients/FabricPlatformTypes';
import { SparkLivyClient } from '../../clients/SparkLivyClient';
import { LongRunningOperationsClient } from '../../clients/LongRunningOperationsClient';

import "./SparkTerminalItem.scss";

interface SparkTerminalItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<SparkTerminalItemDefinition>;
  selectedLakehouse?: Item | null;
  isUnsaved?: boolean;
  sessionActive: boolean;
}

interface TerminalEntry {
  type: 'command' | 'response' | 'error' | 'system';
  content: string | React.ReactNode;
  timestamp: Date;
}

export function SparkTerminalItemDefaultView({
  workloadClient,
  item,
  selectedLakehouse,
  isUnsaved,
  sessionActive
}: SparkTerminalItemDefaultViewProps) {
  const { t } = useTranslation();
  
  // Terminal State
  const [command, setCommand] = useState<string>('');
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const terminalBodyRef = useRef<HTMLDivElement>(null);

  const sparkClient = new SparkLivyClient(workloadClient);

  // Resolve Lakehouse ID and Workspace ID
  const activeLakehouse = item?.definition?.selectedLakehouse || selectedLakehouse;
  const workspaceId = activeLakehouse?.workspaceId;
  const lakehouseId = activeLakehouse?.id;

  // Auto-scroll
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [entries]);

  // Session Management Effect
  useEffect(() => {
    if (sessionActive && !sessionId && !isConnecting && workspaceId && lakehouseId) {
      initializeSession();
    } else if (!sessionActive && sessionId && !isCancelling) {
      cancelCurrentSession();
    }
  }, [sessionActive, sessionId, isConnecting, isCancelling, workspaceId, lakehouseId]);

  const addSystemMessage = (message: string) => {
    setEntries(prev => [...prev, { type: 'system', content: message, timestamp: new Date() }]);
  };

  const formatTimestamp = (date: Date) => date.toLocaleTimeString();

  const initializeSession = async () => {
    if (!workspaceId || !lakehouseId) return;
    
    setIsConnecting(true);
    addSystemMessage('Initializing Spark session...');

    try {
      const sessionRequest: SessionRequest = {
        name: `Terminal Session ${new Date().toISOString()}`,
        kind: 'python',
        conf: { "spark.submit.deployMode": "cluster" }
      };

      // Create session returns AsyncOperationIndicator
      const asyncIndicator = await sparkClient.createSession(workspaceId, lakehouseId, sessionRequest);
      addSystemMessage(`Session creation started. Operation ID: ${asyncIndicator.operationId}`);
      
      // Use LongRunningOperationsClient to poll for result
      const lroClient = new LongRunningOperationsClient(workloadClient);
      addSystemMessage('Waiting for session to be created...');
      
      const sessionResponse = await lroClient.waitForSuccessAndGetResult<SessionResponse>(
        asyncIndicator,
        2000, // poll every 2 seconds
        600000 // 10 minute timeout
      );
      
      if (!sessionResponse.id) {
        throw new Error("Session created but no ID returned from server");
      }

      const sid = String(sessionResponse.id);
      setSessionId(sid);
      
      addSystemMessage(`Session created with ID: ${sid}`);
      addSystemMessage('Session is ready! You can now execute Spark code.');
    } catch (error: any) {
      console.error('Error initializing session:', error);
      addSystemMessage(`Failed to initialize session: ${error.message}`);
      setEntries(prev => [...prev, { type: 'error', content: `Error: ${error.message}`, timestamp: new Date() }]);
    } finally {
      setIsConnecting(false);
    }
  };

  const cancelCurrentSession = async () => {
    if (!sessionId || !workspaceId || !lakehouseId) return;
    
    try {
      setIsCancelling(true);
      addSystemMessage(`Cancelling session ${sessionId}...`);
      await sparkClient.cancelSession(workspaceId, lakehouseId, sessionId);
      addSystemMessage(`Session ${sessionId} cancelled successfully.`);
      setSessionId(null);
    } catch (error: any) {
      addSystemMessage(`Failed to cancel session: ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const executeCommand = async () => {
    if (!command.trim()) return;
    
    setEntries(prev => [...prev, { type: 'command', content: command, timestamp: new Date() }]);
    setCommand('');

    if (command.toLowerCase() === 'clear') {
      setEntries([]);
      return;
    }

    if (!sessionId) {
      addSystemMessage('No active session. Please start the terminal from the ribbon.');
      return;
    }

    try {
      const statementRequest: StatementRequest = { code: command, kind: 'python' };
      const response = await sparkClient.submitStatement(workspaceId!, lakehouseId!, sessionId, statementRequest);
      await waitForStatementResult(response);
    } catch (error: any) {
      setEntries(prev => [...prev, { type: 'error', content: `Error: ${error.message}`, timestamp: new Date() }]);
    }
  };

  const waitForStatementResult = async (statement: StatementResponse) => {
    if (!workspaceId || !lakehouseId || !sessionId) return;
    
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      try {
        const statementInfo = await sparkClient.getStatement(workspaceId, lakehouseId, sessionId, statement.id.toString());
        
        if (statementInfo.state === 'available') {
          let output = '';
          if (statementInfo.output?.data) {
            output = statementInfo.output.data['text/plain'] || 
                     JSON.stringify(statementInfo.output.data['application/json'] || statementInfo.output.data, null, 2);
          }
          setEntries(prev => [...prev, { type: 'response', content: output || 'Done.', timestamp: new Date() }]);
          return;
        } else if (statementInfo.state === 'error') {
          const errorMessage = statementInfo.output?.data?.['text/plain'] || 'Statement execution failed';
          setEntries(prev => [...prev, { type: 'error', content: errorMessage, timestamp: new Date() }]);
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error: any) {
        setEntries(prev => [...prev, { type: 'error', content: `Error: ${error.message}`, timestamp: new Date() }]);
        return;
      }
    }
    setEntries(prev => [...prev, { type: 'error', content: 'Statement execution timed out', timestamp: new Date() }]);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') executeCommand();
  };

  const content = (
    <Stack className="spark-terminal-editor">
      <div className="terminal-container">
        <div className="terminal-body" ref={terminalBodyRef}>
          {entries.length === 0 ? (
            <div className="system">
              Welcome to Spark Terminal.
              <br />
              {!sessionActive && "Click 'Start Terminal' in the ribbon to begin."}
              {sessionActive && !sessionId && "Initializing session..."}
              {sessionId && "Session Ready. Type commands to interact with Spark."}
            </div>
          ) : (
            entries.map((entry, index) => (
              <div key={index}>
                <span className="timestamp">[{formatTimestamp(entry.timestamp)}]</span>
                {entry.type === 'command' ? (
                  <React.Fragment>
                    <span className="prompt-symbol">{'>'}</span>
                    <span className="command">{entry.content}</span>
                  </React.Fragment>
                ) : (
                  <span className={entry.type}>{entry.content}</span>
                )}
              </div>
            ))
          )}
        </div>
        
        <Divider />
        
        <div className="terminal-input">
          <span className="prompt-symbol">{'>'}</span>
          <Input
            className="command-input"
            value={command}
            onChange={(e, data) => setCommand(data.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter Spark/SQL command..."
            disabled={!sessionId || isConnecting || isCancelling}
          />
          <Button
            icon={<Send24Regular />}
            onClick={executeCommand}
            disabled={!sessionId || isConnecting || isCancelling}
          />
        </div>
      </div>

      {isUnsaved && (
        <Stack horizontal style={{ padding: '8px 16px', backgroundColor: 'var(--colorWarningBackground1)' }}>
          <Text size={200}>
            {t("SparkTerminalItem_UnsavedChanges", "Configuration changes will be saved automatically...")}
          </Text>
        </Stack>
      )}
    </Stack>
  );

  return (
    <ItemEditorDefaultView
      center={{
        content: content
      }}
    />
  );
}
