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
import { FabricCLIItemDefinition, PythonScriptMetadata } from "./FabricCLIItemModel";
import { Item } from "../../clients/FabricPlatformTypes";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import { ExecutionMode, SessionKind, SparkLivyFabricCLIClient } from "./SparkLivyFabricCLIClient";
import { ScriptsList } from "./ScriptsList";

import "./FabricCLIItem.scss";



interface FabricCLIItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<FabricCLIItemDefinition>;
  selectedLakehouse?: Item | null;
  isUnsaved?: boolean;
  sessionActive: boolean;
  clearTrigger?: number;
  onSessionCreated?: (sessionId: string) => void;
  showSystemMessage?: { message: string; timestamp: number };
  executionMode?: ExecutionMode;
  onScriptSelect?: (scriptId: string) => void;
  onScriptCreate?: () => void;
  onScriptDelete?: (scriptId: string) => void;
  onScriptRun?: (scriptId: string) => void | Promise<void>;
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
  showSystemMessage: systemMessage,
  executionMode: executionModeProp,
  onScriptSelect,
  onScriptCreate,
  onScriptDelete,
  onScriptRun
}: FabricCLIItemDefaultViewProps) {
  const { t } = useTranslation();
  
  // Get scripts from item definition
  const scripts: PythonScriptMetadata[] = item?.definition?.scripts || [];
  
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

  // Add system message when prop changes
  useEffect(() => {
    if (systemMessage) {
      setEntries(prev => [...prev, { type: 'system', content: systemMessage.message, timestamp: new Date() }]);
    }
  }, [systemMessage]);

  // Helper function for adding system messages
  const addSystemMessage = (message: string) => {
    setEntries(prev => [...prev, { type: 'system', content: message, timestamp: new Date() }]);
  };

  // Session Management Effect
  useEffect(() => {
    if (sessionActive && !sessionId && !isConnecting && workspaceId && lakehouseId) {
      // Check if environment is selected before initializing session
      if (!item?.definition?.selectedSparkEnvironment?.id) {
        addSystemMessage(t('FabricCLIItem_NoEnvironmentSelected', 'Please select a Spark environment before starting the session.'));
        return;
      }
      initializeSession();
    } else if (!sessionActive && sessionId && !isCancelling) {
      cancelCurrentSession();
    }
  }, [sessionActive, sessionId, isConnecting, isCancelling, workspaceId, lakehouseId]);

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

  /**
   * Command handler type
   */
  type CommandHandler = (args: string) => Promise<void> | void;

  /**
   * Handle the "run {ScriptName}" command
   */
  const handleRunCommand = async (scriptName: string) => {
    const script = scripts.find(s => s.name === scriptName);
    
    if (!script) {
      addSystemMessage(`Script "${scriptName}" not found. Available scripts: ${scripts.map(s => s.name).join(', ') || 'none'}`);
      return;
    }
    
    if (!onScriptRun) {
      addSystemMessage('Script execution is not available.');
      return;
    }

    addSystemMessage(`Executing script: ${scriptName}`);
    try {
      await onScriptRun(script.name);
    } catch (error: any) {
      setEntries(prev => [...prev, { 
        type: 'error', 
        content: `Failed to run script: ${error.message}`, 
        timestamp: new Date() 
      }]);
    }
  };

  /**
   * Handle the "clear" command
   */
  const handleClearCommand = () => {
    setEntries([]);
  };

  /**
   * Map of special commands to their handlers
   * Key is the command prefix (case-insensitive)
   * Value is the handler function that receives the remaining arguments
   */
  const specialCommands: Record<string, CommandHandler> = {
    'clear': handleClearCommand,
    'run': handleRunCommand,
  };

  /**
   * Try to handle special local commands
   * Returns true if the command was handled, false otherwise
   */
  const tryHandleSpecialCommand = async (userCommand: string): Promise<boolean> => {
    const trimmedCommand = userCommand.trim();
    const commandLower = trimmedCommand.toLowerCase();

    // Check each registered special command
    for (const [commandPrefix, handler] of Object.entries(specialCommands)) {
      if (commandLower === commandPrefix) {
        // Exact match, no arguments
        await handler('');
        return true;
      } else if (commandLower.startsWith(commandPrefix + ' ')) {
        // Command with arguments
        const args = trimmedCommand.substring(commandPrefix.length).trim();
        await handler(args);
        return true;
      }
    }

    return false;
  };

  /**
   * Execute a Fabric CLI command via the active Spark session
   */
  const executeFabricCLICommand = async (userCommand: string) => {
    if (!sessionId) {
      addSystemMessage('Session needs to be started first. Click \'Start Terminal\' in the ribbon.');
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

  /**
   * Main command execution entry point
   */
  const executeCommand = async () => {
    if (!command.trim()) return;
    
    const userCommand = command;
    setEntries(prev => [...prev, { 
      type: 'command', 
      timestamp: new Date(),
      executionMode: executionMode,
      content: userCommand, 
    }]);
    
    // Add to command history
    setCommandHistory(prev => [...prev, userCommand]);
    setHistoryIndex(-1);
    setCommand('');

    // Try to handle as a special command first
    const wasHandled = await tryHandleSpecialCommand(userCommand);
    if (wasHandled) {
      return;
    }

    // Execute as a regular Fabric CLI command
    await executeFabricCLICommand(userCommand);
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
          />
          <Button
            icon={<Send24Regular />}
            onClick={executeCommand}
          />
        </div>
      </div>
    </Stack>
  );

  const leftPanel = (
    <ScriptsList
      scripts={scripts}
      onScriptSelect={onScriptSelect || (() => {})}
      onScriptCreate={onScriptCreate || (() => {})}
      onScriptDelete={onScriptDelete || (() => {})}
    />
  );

  return (
    <ItemEditorDefaultView
      left={{
        content: leftPanel,
        title: t('FabricCLIItem_Scripts_Panel_Title', 'Scripts'),
        collapsible: true,
        minWidth: 200,
        maxWidth: 400,
        width: 250
      }}
      center={{
        content: content
      }}
    />
  );
}
