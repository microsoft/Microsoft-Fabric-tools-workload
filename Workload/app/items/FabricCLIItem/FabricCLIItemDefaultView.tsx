import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Stack } from "@fluentui/react";
import {  
  Input, 
  Button, 
} from "@fluentui/react-components";
import { Send24Regular } from '@fluentui/react-icons';
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { FabricCLIItemDefinition } from "./FabricCLIItemModel";
import { Item } from "../../clients/FabricPlatformTypes";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import { ExecutionMode, SessionKind, SparkLivyFabricCLIClient } from "./SparkLivyFabricCLIClient";

import "./FabricCLIItem.scss";



interface FabricCLIItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<FabricCLIItemDefinition>;
  selectedLakehouse?: Item | null;
  isUnsaved?: boolean;
  sessionActive: boolean;
  clearTrigger?: number;
  onSessionCreated?: (sessionId: string) => void;
  executionMode?: ExecutionMode;
}

interface TerminalEntry {
  type: 'command' | 'response' | 'error' | 'system';
  content: string | React.ReactNode;
  timestamp: Date;
  executionMode?: ExecutionMode; // Store execution mode for command entries
}

export function FabricCLIItemDefaultView({
  workloadClient,
  item,
  selectedLakehouse,
  isUnsaved,
  sessionActive,
  clearTrigger,
  onSessionCreated,
  executionMode: executionModeProp
}: FabricCLIItemDefaultViewProps) {
  const { t } = useTranslation();
  
  // Terminal State
  const [command, setCommand] = useState<string>('');
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const terminalBodyRef = useRef<HTMLDivElement>(null);
  
  // Execution mode - use from props or default to FAB_CLI
  const executionMode = executionModeProp || ExecutionMode.FAB_CLI;
  
  // Command history
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const cliClient = new SparkLivyFabricCLIClient(workloadClient);

  // Resolve Lakehouse ID and Workspace ID
  const activeLakehouse = item?.definition?.selectedLakehouse || selectedLakehouse;
  const workspaceId = activeLakehouse?.workspaceId;
  const lakehouseId = activeLakehouse?.id;

  // Clear terminal when trigger changes
  useEffect(() => {
    if (clearTrigger && clearTrigger > 0) {
      setEntries([]);
    }
  }, [clearTrigger]);

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
      // Use selected environment from model, or fallback to hardcoded ID
      const environmentId = item?.definition?.selectedSparkEnvironment?.id;
      const existingSessionId = item?.definition?.lastSparkSessionId;
      
      const session = await cliClient.reuseOrCreateSession(
        {
          workspaceId,
          lakehouseId,
          environmentId,
          sessionKind: SessionKind.PYTHON
        },
        existingSessionId && existingSessionId.trim() !== '' ? existingSessionId : null,
        (message) => addSystemMessage(message)
      );

      const newSessionId = session.id || '';
      setSessionId(newSessionId);
      setSessionState(session.schedulerState || '');
      
      // Save session ID to model
      if (newSessionId && onSessionCreated) {
        onSessionCreated(newSessionId);
      }
    } catch (error: any) {
      console.error('Error initializing session:', error);
      addSystemMessage(`Failed to initialize session: ${error.message}`);
      setEntries(prev => [...prev, { type: 'error', content: `Error: ${error.message}`, timestamp: new Date() }]);
    } finally {
      setIsConnecting(false);
    }
  };

  const cancelCurrentSession = async () => {
    if (!sessionId || !workspaceId || !lakehouseId || isCancelling) return;
    
    setIsCancelling(true);
    addSystemMessage(`Cancelling session ${sessionId}...`);
    
    try {
      await cliClient.cancelSession(workspaceId, lakehouseId, sessionId);
      addSystemMessage(`Session ${sessionId} cancelled successfully.`);
      setSessionId(null);
      setSessionState(null);
    } catch (error: any) {
      addSystemMessage(`Failed to cancel session: ${error.message}`);
      setSessionId(null); // Clear session ID even on failure
      setSessionState(null);
    } finally {
      setIsCancelling(false);
    }
  };

  const executeCommand = async () => {
    if (!command.trim()) return;
    
    const userCommand = command;
    setEntries(prev => [...prev, { 
      type: 'command', 
      timestamp: new Date(),
      executionMode: executionMode, // Store the execution mode used for this command
      content: userCommand, 
    }]);
    
    // Add to command history
    setCommandHistory(prev => [...prev, userCommand]);
    setHistoryIndex(-1);
    setCommand('');

    if (userCommand.toLowerCase() === 'clear') {
      setEntries([]);
      return;
    }

    if (!sessionId) {
      addSystemMessage('No active session. Please start the terminal from the ribbon.');
      return;
    }

    // Check if session is ready (schedulerState should be 'Scheduled')
    const isSessionReady = sessionState?.toLowerCase() === 'scheduled';
    if (!isSessionReady) {
      addSystemMessage(`Session is not ready. Current scheduler state: ${sessionState || 'Unknown'}. Please wait...`);
      return;
    }

    try {
      const result = await cliClient.executeCommand(workspaceId!, lakehouseId!, 
                                                    sessionId, userCommand, executionMode);
      
      if (result.isError) {
        setEntries(prev => [...prev, { type: 'error', content: result.output, timestamp: new Date() }]);
      } else if (result.output && result.output.trim()) {
        setEntries(prev => [...prev, { type: 'response', content: result.output, timestamp: new Date() }]);
      } else {
        // No output and no error - show success message
        setEntries(prev => [...prev, { type: 'system', content: t('FabricCLIItem_CommandSuccess', "Command executed successfully"), timestamp: new Date() }]);
      }
    } catch (error: any) {
      setEntries(prev => [...prev, { type: 'error', content: `Error: ${error.message}`, timestamp: new Date() }]);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      executeCommand();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (commandHistory.length === 0) return;
      
      const newIndex = historyIndex === -1 
        ? commandHistory.length - 1 
        : Math.max(0, historyIndex - 1);
      
      setHistoryIndex(newIndex);
      setCommand(commandHistory[newIndex]);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex === -1) return;
      
      const newIndex = historyIndex + 1;
      
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setCommand('');
      } else {
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    }
  };

  const content = (
    <Stack className="fabric-cli-editor">
      <div className="terminal-container">
        <div className="terminal-body" ref={terminalBodyRef}>
          {entries.length === 0 ? (
            <div className="system">
              {t('FabricCLIItem_Wellcome', 'Welcome to Fabric CLI.')}
              <br />
              {!sessionActive && "Click 'Start Terminal' in the ribbon to begin."}
              {sessionActive && !sessionId && "Initializing session..."}
              {sessionId && "Session Ready. Type Fabric CLI commands (e.g., 'workspace list', 'lakehouse list')."}
            </div>
          ) : (
            entries.map((entry, index) => (
              <div key={index}>
                {entry.type === 'command' ? (
                  <React.Fragment>
                    <span className="prompt-symbol">
                      {entry.executionMode === ExecutionMode.NATIVE ? '>>> ' : 
                       entry.executionMode === ExecutionMode.FAB_CLI ? '> fab ' : '> '}
                    </span>
                    <span className="command">{entry.content}</span>
                  </React.Fragment>
                ) : entry.type === 'system' ? (
                  <span className={entry.type}>{formatTimestamp(entry.timestamp)} {entry.content}</span>
                ) : (
                  <span className={entry.type} style={{ whiteSpace: 'pre-wrap' }}>{entry.content}</span>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="terminal-input">
          <span className="prompt-symbol">
            {executionMode === ExecutionMode.NATIVE ? '>>> ' : 
             executionMode === ExecutionMode.FAB_CLI ? '> fab ' : '> '}
          </span>
          <Input
            className="command-input"
            value={command}
            onChange={(e, data) => setCommand(data.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            disabled={!sessionId || isConnecting || isCancelling}
          />
          <Button
            icon={<Send24Regular />}
            onClick={executeCommand}
            disabled={!sessionId || isConnecting || isCancelling}
          />
        </div>
      </div>
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
