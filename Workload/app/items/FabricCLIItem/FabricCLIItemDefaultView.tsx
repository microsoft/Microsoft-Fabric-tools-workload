import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Stack } from "@fluentui/react";
import { 
  Text, 
  Input, 
  Button, 
} from "@fluentui/react-components";
import { Send24Regular } from '@fluentui/react-icons';
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { FabricCLIItemDefinition } from "./FabricCLIItemModel";
import { Item } from "../../clients/FabricPlatformTypes";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import { SparkLivyFabricCLIClient } from "./SparkLivyFabricCLIClient";

import "./FabricCLIItem.scss";

interface FabricCLIItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<FabricCLIItemDefinition>;
  selectedLakehouse?: Item | null;
  isUnsaved?: boolean;
  sessionActive: boolean;
  clearTrigger?: number;
  onSessionCreated?: (sessionId: string) => void;
}

interface TerminalEntry {
  type: 'command' | 'response' | 'error' | 'system';
  content: string | React.ReactNode;
  timestamp: Date;
}

export function FabricCLIItemDefaultView({
  workloadClient,
  item,
  selectedLakehouse,
  isUnsaved,
  sessionActive,
  clearTrigger,
  onSessionCreated
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
          environmentId
        },
        existingSessionId,
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
    setEntries(prev => [...prev, { type: 'command', content: userCommand, timestamp: new Date() }]);
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
      const result = await cliClient.executeCommand(workspaceId!, lakehouseId!, sessionId, userCommand);
      
      if (result.isError) {
        setEntries(prev => [...prev, { type: 'error', content: result.output, timestamp: new Date() }]);
      } else {
        setEntries(prev => [...prev, { type: 'response', content: result.output, timestamp: new Date() }]);
      }
    } catch (error: any) {
      setEntries(prev => [...prev, { type: 'error', content: `Error: ${error.message}`, timestamp: new Date() }]);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') executeCommand();
  };

  const content = (
    <Stack className="fabric-cli-editor">
      <div className="terminal-container">
        <div className="terminal-body" ref={terminalBodyRef}>
          {entries.length === 0 ? (
            <div className="system">
              Welcome to Fabric CLI.
              <br />
              {!sessionActive && "Click 'Start Terminal' in the ribbon to begin."}
              {sessionActive && !sessionId && "Initializing session..."}
              {sessionId && "Session Ready. Type Fabric CLI commands (e.g., 'workspace list', 'lakehouse list')."}
            </div>
          ) : (
            entries.map((entry, index) => (
              <div key={index}>
                <span className="timestamp">[{formatTimestamp(entry.timestamp)}]</span>
                {entry.type === 'command' ? (
                  <React.Fragment>
                    <span className="prompt-symbol">{'> fab '}</span>
                    <span className="command">{entry.content}</span>
                  </React.Fragment>
                ) : (
                  <span className={entry.type}>{entry.content}</span>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="terminal-input">
          <span className="prompt-symbol">{'> fab '}</span>
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
            {t("FabricCLIItem_UnsavedChanges", "Configuration changes will be saved automatically...")}
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
