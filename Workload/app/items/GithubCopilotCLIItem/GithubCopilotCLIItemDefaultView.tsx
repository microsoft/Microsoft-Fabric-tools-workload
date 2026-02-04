import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  Button,
  Tooltip,
  Spinner,
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import { 
  GithubCopilotCLIItemDefinition, 
  TerminalEntry, 
  CopilotModelId,
  WorkspaceContext
} from "./GithubCopilotCLIItemModel";
import { GithubCopilotCLI, ExecutionContext } from "./engine";
import "./GithubCopilotCLIItem.scss";

interface GithubCopilotCLIItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<GithubCopilotCLIItemDefinition>;
  terminalEntries: TerminalEntry[];
  setTerminalEntries: (entries: TerminalEntry[] | ((prev: TerminalEntry[]) => TerminalEntry[])) => void;
  commandHistory: string[];
  setCommandHistory: (history: string[] | ((prev: string[]) => string[])) => void;
  selectedModel: CopilotModelId;
  onModelChange: (model: CopilotModelId) => void;
  onDefinitionChange?: (definition: GithubCopilotCLIItemDefinition) => void;
  /** Active session ID for command execution */
  sessionId?: string | null;
  /** Callback to execute a command in the Spark session */
  onExecuteCommand?: (command: string) => Promise<{ success: boolean; output: string }>;
}

export function GithubCopilotCLIItemDefaultView({
  workloadClient,
  item,
  terminalEntries,
  setTerminalEntries,
  commandHistory,
  setCommandHistory,
  selectedModel,
  onModelChange,
  onDefinitionChange,
  sessionId,
  onExecuteCommand
}: GithubCopilotCLIItemDefaultViewProps) {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build workspace context from item
  const workspaceContext = useMemo<WorkspaceContext>(() => {
    const ctx: WorkspaceContext = {};
    
    if (item) {
      // Get workspace info from item
      ctx.workspaceId = item.workspaceId;
      ctx.itemId = item.id;
      ctx.itemName = item.displayName;
      
      // Get lakehouse info from item definition
      if (item.definition?.selectedLakehouse) {
        ctx.lakehouseId = item.definition.selectedLakehouse.id;
        ctx.lakehouseName = item.definition.selectedLakehouse.displayName;
      }
    }
    
    return ctx;
  }, [item, item?.definition?.selectedLakehouse]);

  // Build execution context from item definition
  const executionContext = useMemo<ExecutionContext>(() => {
    return {
      sessionId: sessionId || item?.definition?.sessionId,
      lakehouseId: item?.definition?.selectedLakehouse?.id,
      environmentId: item?.definition?.environmentId || undefined
    };
  }, [sessionId, item?.definition?.sessionId, item?.definition?.selectedLakehouse?.id, item?.definition?.environmentId]);

  // Create CLI instance with workspace and execution context
  const cli = useMemo(() => {
    return new GithubCopilotCLI(workloadClient, selectedModel, workspaceContext, executionContext);
  }, [workloadClient, selectedModel, workspaceContext, executionContext]);

  // Generate dynamic welcome message with context
  const getWelcomeMessage = useMemo(() => {
    const hasContext = workspaceContext.workspaceId || workspaceContext.itemId;
    
    let contextInfo = '';
    if (hasContext) {
      contextInfo = `\n  ✓ Connected to Fabric workspace`;
      if (workspaceContext.lakehouseId) {
        contextInfo += ` with lakehouse`;
      }
      contextInfo += `\n  Type 'context' to see available variables\n`;
    }

    return `
 ██████╗ ██╗████████╗██╗  ██╗██╗   ██╗██████╗      ██████╗ ██████╗ ██████╗ ██╗██╗      ██████╗ ████████╗
██╔════╝ ██║╚══██╔══╝██║  ██║██║   ██║██╔══██╗    ██╔════╝██╔═══██╗██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝
██║  ███╗██║   ██║   ███████║██║   ██║██████╔╝    ██║     ██║   ██║██████╔╝██║██║     ██║   ██║   ██║   
██║   ██║██║   ██║   ██╔══██║██║   ██║██╔══██╗    ██║     ██║   ██║██╔═══╝ ██║██║     ██║   ██║   ██║   
╚██████╔╝██║   ██║   ██║  ██║╚██████╔╝██████╔╝    ╚██████╗╚██████╔╝██║     ██║███████╗╚██████╔╝   ██║   
 ╚═════╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝      ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝   

Welcome to GitHub Copilot in the CLI!
Version 1.0.0 (Fabric Edition)
${contextInfo}
I'm your AI pair programmer in the terminal. I can help you:
  - suggest  Get command suggestions for what you want to do
  - explain  Understand what a shell command does
  - context  Show your workspace context and variables
  - help     Show all available commands

Examples:
  suggest "list all files in the current directory"
  suggest "list lakehouses in my workspace"
  explain "fab lakehouse list"

Type 'help' for more information.
`;
  }, [workspaceContext]);

  // Show welcome message on first load
  useEffect(() => {
    if (terminalEntries.length === 0) {
      showWelcome();
    }
  }, []);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [terminalEntries]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const showWelcome = () => {
    setTerminalEntries([{
      type: 'system',
      content: getWelcomeMessage,
      timestamp: new Date()
    }]);
  };

  const executeCommand = async () => {
    if (!command.trim() || isProcessing) return;

    const inputCommand = command.trim();
    
    // Add command to terminal
    setTerminalEntries(prev => [...prev, {
      type: 'prompt',
      content: inputCommand,
      timestamp: new Date()
    }]);

    // Add to history
    setCommandHistory(prev => [...prev, inputCommand]);
    setHistoryIndex(-1);
    setCommand('');
    setIsProcessing(true);

    try {
      // Parse and execute the command
      const parsed = cli.parseCommand(inputCommand);
      const result = await cli.execute(parsed);

      // Handle special clear command
      if (result.output === '__CLEAR__') {
        setTerminalEntries([]);
        showWelcome();
      } else if (result.requiresExecution && result.commandToExecute && onExecuteCommand) {
        // This command needs to be executed in the Spark session
        setTerminalEntries(prev => [...prev, {
          type: 'system',
          content: `Executing: ${result.commandToExecute}`,
          timestamp: new Date()
        }]);
        
        try {
          const execResult = await onExecuteCommand(result.commandToExecute);
          setTerminalEntries(prev => [...prev, {
            type: execResult.success ? 'response' : 'error',
            content: execResult.output,
            timestamp: new Date()
          }]);
        } catch (execError: any) {
          setTerminalEntries(prev => [...prev, {
            type: 'error',
            content: `Execution failed: ${execError.message}`,
            timestamp: new Date()
          }]);
        }
      } else {
        setTerminalEntries(prev => [...prev, {
          type: result.isError ? 'error' : 'response',
          content: result.output,
          timestamp: new Date()
        }]);
      }
    } catch (error: any) {
      setTerminalEntries(prev => [...prev, {
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
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
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault();
      setTerminalEntries([]);
      showWelcome();
    }
  };

  const clearTerminal = () => {
    setTerminalEntries([]);
    showWelcome();
  };

  const content = (
    <div className="github-copilot-cli-view">
      <div className="copilot-terminal-container cli-mode">
        <div className="copilot-terminal-header">
          <div className="header-title">
            <span className="gh-icon">⌘</span>
            <span>gh copilot</span>
          </div>
          <div className="header-actions">
            <Tooltip content="Clear terminal (Ctrl+L)" relationship="label">
              <Button
                icon={<Dismiss24Regular />}
                appearance="subtle"
                onClick={clearTerminal}
                size="small"
              />
            </Tooltip>
          </div>
        </div>

        <div className="copilot-terminal-body cli-body" ref={terminalBodyRef}>
          {terminalEntries.map((entry, index) => (
            <div key={index} className={`terminal-entry ${entry.type}`}>
              {entry.type === 'prompt' && (
                <div className="cli-prompt-line">
                  <span className="cli-prompt">$ gh copilot</span>
                  <span className="cli-command">{entry.content}</span>
                </div>
              )}
              {entry.type === 'response' && (
                <div className="cli-response">
                  <pre>{entry.content}</pre>
                </div>
              )}
              {entry.type === 'error' && (
                <div className="cli-error">
                  <pre>{entry.content}</pre>
                </div>
              )}
              {entry.type === 'system' && (
                <div className="cli-system">
                  <pre>{entry.content}</pre>
                </div>
              )}
            </div>
          ))}
          {isProcessing && (
            <div className="terminal-entry processing">
              <Spinner size="tiny" />
              <span>Thinking...</span>
            </div>
          )}
        </div>

        <div className="copilot-terminal-input cli-input">
          <span className="cli-prompt-indicator">$ gh copilot</span>
          <input
            ref={inputRef}
            className="cli-text-input"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="suggest, explain, or help..."
            disabled={isProcessing}
            autoFocus
          />
        </div>
      </div>
    </div>
  );

  return (
    <ItemEditorDefaultView
      center={{
        content: content
      }}
    />
  );
}
