import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Stack } from "@fluentui/react";
import {  
  Input, 
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from "@fluentui/react-components";
import { Send24Regular } from '@fluentui/react-icons';
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { CloudShellItemDefinition, ScriptMetadata, Command, CommandType, Script } from "./CloudShellItemModel";
import { Item } from "../../clients/FabricPlatformTypes";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import { SessionKind, SparkLivyCloudShellClient } from "./engine/SparkLivyCloudShellClient";
import { ScriptsList } from "./ScriptsList";
import { CloudShellItemEngine } from "./engine/CloudShellItemEngine";
import { ConsoleCommandContext } from "./engine/index";
import "./CloudShellItem.scss";


interface CloudShellItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<CloudShellItemDefinition>;
  selectedLakehouse?: Item | null;
  sessionActive: boolean;
  setSessionActive: (active: boolean) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  terminalEntries: TerminalEntry[];
  setTerminalEntries: (terminalEntries: TerminalEntry[] | ((prev: TerminalEntry[]) => TerminalEntry[])) => void;
  commandHistory: string[];
  setCommandHistory: (history: string[] | ((prev: string[]) => string[])) => void;
  isConnecting: boolean;
  setIsConnecting: (connecting: boolean) => void;
  onSessionCreated?: (sessionId: string) => void;
  showSystemMessage?: { message: string; timestamp: number };
  executionMode?: CommandType;
  onExecutionModeChange?: (mode: CommandType) => void;
  scriptsMap?: Map<string, string>;
  onScriptSelect?: (scriptId: string) => void;
  onScriptCreate?: () => void;
  onScriptDelete?: (scriptId: string) => void;
}

interface TerminalEntry {
  type: 'command' | 'response' | 'error' | 'system';
  content: string | React.ReactNode;
  timestamp: Date;
  executionMode?: CommandType; // Store execution mode for command entries
}

export function CloudShellItemDefaultView({
  workloadClient,
  item,
  selectedLakehouse,
  sessionActive,
  setSessionActive,
  sessionId,
  setSessionId,
  terminalEntries,
  setTerminalEntries,
  commandHistory,
  setCommandHistory,
  isConnecting,
  setIsConnecting,
  onSessionCreated,
  showSystemMessage: systemMessage,
  executionMode: executionModeProp,
  onExecutionModeChange,
  scriptsMap = new Map(),
  onScriptSelect,
  onScriptCreate,
  onScriptDelete
}: CloudShellItemDefaultViewProps) {
  const { t } = useTranslation();
  
  // Get scripts from item definition
  const scripts: ScriptMetadata[] = item?.definition?.scripts || [];
  
  // Terminal State (local only)
  const [command, setCommand] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef<boolean>(false);
  
  // Execution mode - use from props or default to FAB_CLI
  const executionMode = executionModeProp || CommandType.FAB_CLI;
  
  // Command history navigation
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const cliClient = new SparkLivyCloudShellClient(workloadClient);

  // Resolve Lakehouse ID and Workspace ID
  const activeLakehouse = item?.definition?.selectedLakehouse || selectedLakehouse;
  const workspaceId = activeLakehouse?.workspaceId;
  const lakehouseId = activeLakehouse?.id;

  // Auto-scroll
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [terminalEntries]);

  // Add system message when prop changes
  useEffect(() => {
    if (systemMessage) {
      setTerminalEntries(prev => [...prev, { type: 'system', content: systemMessage.message, timestamp: new Date() }]);
    }
  }, [systemMessage]);

  // Helper function for adding system messages
  const addSystemMessage = (message: string) => {
    setTerminalEntries(prev => [...prev, { type: 'system', content: message, timestamp: new Date() }]);
  };

  // Session Management Effect
  useEffect(() => {
    if (sessionActive && !sessionId && !isConnecting && !isInitializingRef.current && workspaceId && lakehouseId) {
      // Check if environment is selected before initializing session
      if (!item?.definition?.selectedSparkEnvironment?.id) {
        addSystemMessage(t('CloudShellItem_NoEnvironmentSelected', 'Please select a Spark environment before starting the session.'));
        setSessionActive(false);
        return;
      }
      initializeSession();
    } else if (!sessionActive && sessionId && !isCancelling) {
      cancelCurrentSession();
    }
  }, [sessionActive, sessionId, isConnecting, isCancelling, workspaceId, lakehouseId]);

  const formatTimestamp = (date: Date) => date.toLocaleTimeString();

  const initializeSession = async () => {
    if (!workspaceId || !lakehouseId || isInitializingRef.current) return;
    
    isInitializingRef.current = true;
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
      
      // Save session ID to model
      if (newSessionId && onSessionCreated) {
        onSessionCreated(newSessionId);
      }
    } catch (error: any) {
      console.error('Error initializing session:', error);
      addSystemMessage(`Failed to initialize session: ${error.message}`);
      setTerminalEntries(prev => [...prev, { type: 'error', content: `Error: ${error.message}`, timestamp: new Date() }]);
      setSessionActive(false);
    } finally {
      setIsConnecting(false);
      isInitializingRef.current = false;
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
    } catch (error: any) {
      addSystemMessage(`Failed to cancel session: ${error.message}`);
      setSessionId(null); // Clear session ID even on failure
    } finally {
      setIsCancelling(false);
    }
  };

  /**
   * Main command execution entry point using CloudShellItemEngine
   */
  const executeCommand = async () => {
    if (!command.trim()) return;
    
    const userCommand = command;
    setTerminalEntries(prev => [...prev, { 
      type: 'command', 
      timestamp: new Date(),
      executionMode: executionMode,
      content: userCommand, 
    }]);
    
    // Add to command history
    setCommandHistory(prev => [...prev, userCommand]);
    setHistoryIndex(-1);
    setCommand('');

    // Create engine instance
    const engine = new CloudShellItemEngine(workloadClient);

    // Build console command context
    const consoleContext: ConsoleCommandContext = {
      item: item!,
      commandType: executionMode,
      sessionInfo: {
        id: sessionId,
        state: sessionActive ? 'Scheduled' : null
      },
      engine: engine,
      fabCLIAuthInfo: {
        useFrontendToken: true
      },
      onClearTerminal: () => setTerminalEntries([]),
      getScriptByName: async (scriptName: string): Promise<Script | null> => {
        const scriptMeta = scripts.find(s => s.name === scriptName);
        if (!scriptMeta) return null;
        const content = scriptsMap.get(scriptName) || "";
        return { ...scriptMeta, content };
      }
    };

    try {
      // Create Command object
      const commandObj: Command = {
        text: userCommand,
        timestamp: new Date(),
        type: executionMode
      };

      // Try to handle as a console command first (help, clear, run, etc.)
      let consoleResult = await engine.executeConsoleCommand(commandObj, consoleContext);
      
      if (consoleResult !== null) {
        setTerminalEntries(prev => [...prev, { type: 'response', content: consoleResult, timestamp: new Date() }]);
      } else {
        // No output and no error - show success message
        setTerminalEntries(prev => [...prev, { type: 'system', content: t('CloudShellItem_CommandSuccess', "Command executed successfully"), timestamp: new Date() }]);
      }
    } catch (error: any) {
      setTerminalEntries(prev => [...prev, { type: 'error', content: `Error: ${error.message}`, timestamp: new Date() }]);
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
    <Stack className="cloud-shell-editor">
      <div className="terminal-container">
        <div className="terminal-body" ref={terminalBodyRef}>
          {terminalEntries.length === 0 ? (
            <div className="system">
              {t('CloudShellItem_Wellcome', 'Welcome to Cloud Shell.')}
              <br />
              {!sessionActive && "Click 'Start Terminal' in the ribbon to begin."}
              {sessionActive && !sessionId && "Initializing session..."}
              {sessionId && "Session Ready. Type Cloud Shell commands (e.g., 'ls -l', 'cd ws1.Workspace')."}
            </div>
          ) : (
            terminalEntries.map((entry, index) => (
              <div key={index}>
                {entry.type === 'command' ? (
                  <React.Fragment>
                    <span className="prompt-symbol">
                      {entry.executionMode === CommandType.PYTHON ? 'py> ' : 
                       entry.executionMode === CommandType.FAB_CLI ? 'fab> ' : 'sh> '}
                    </span>
                    <span className="command">{entry.content}</span>
                  </React.Fragment>
                ) : entry.type === 'system' ? (
                  <span className={entry.type}>{formatTimestamp(entry.timestamp)} {entry.content}</span>
                ) : (
                  <span className={`${entry.type} terminal-entry-content`}>{entry.content}</span>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="terminal-input">
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <span className="prompt-symbol clickable-prefix" title="Click to change execution mode">
                {executionMode === CommandType.PYTHON ? 'py> ' : 
                 executionMode === CommandType.FAB_CLI ? 'fab> ' : 
                 executionMode === CommandType.SHELL ? 'sh> ' : '&gt;'}
              </span>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  onClick={() => onExecutionModeChange?.(CommandType.FAB_CLI)}
                >
                  <span className="menu-prefix">fab&gt;</span> Fabric CLI
                </MenuItem>
                <MenuItem
                  onClick={() => onExecutionModeChange?.(CommandType.PYTHON)}
                >
                  <span className="menu-prefix">py&gt;</span> Python
                </MenuItem>
                <MenuItem
                  onClick={() => onExecutionModeChange?.(CommandType.SHELL)}
                >
                  <span className="menu-prefix">sh&gt;</span> Shell
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
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
        title: t('CloudShellItem_Scripts_Panel_Title', 'Scripts'),
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

