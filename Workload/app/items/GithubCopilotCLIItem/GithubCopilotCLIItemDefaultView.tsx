import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Input, 
  Button,
  Dropdown,
  Option,
  Label,
} from "@fluentui/react-components";
import { Send24Regular, Sparkle24Regular } from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import { 
  GithubCopilotCLIItemDefinition, 
  TerminalEntry, 
  COPILOT_MODELS,
  CopilotModelId 
} from "./GithubCopilotCLIItemModel";
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
  onDefinitionChange
}: GithubCopilotCLIItemDefaultViewProps) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalBodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [terminalEntries]);

  const addSystemMessage = (message: string) => {
    setTerminalEntries(prev => [...prev, { 
      type: 'system', 
      content: message, 
      timestamp: new Date() 
    }]);
  };

  const executePrompt = async () => {
    if (!prompt.trim() || isProcessing) return;

    const userPrompt = prompt.trim();
    
    // Add user prompt to terminal
    setTerminalEntries(prev => [...prev, {
      type: 'prompt',
      content: userPrompt,
      timestamp: new Date(),
      model: selectedModel
    }]);

    // Add to history
    setCommandHistory(prev => [...prev, userPrompt]);
    setHistoryIndex(-1);
    setPrompt('');
    setIsProcessing(true);

    try {
      // Simulate Copilot CLI response
      // In a real implementation, this would call the gh copilot CLI
      // For now, we'll show a placeholder response
      const response = await simulateCopilotResponse(userPrompt, selectedModel);
      
      setTerminalEntries(prev => [...prev, {
        type: 'response',
        content: response,
        timestamp: new Date(),
        model: selectedModel
      }]);
    } catch (error: any) {
      setTerminalEntries(prev => [...prev, {
        type: 'error',
        content: `Error: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulate Copilot response (placeholder for actual CLI integration)
  const simulateCopilotResponse = async (prompt: string, model: CopilotModelId): Promise<string> => {
    // Add a small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const modelInfo = COPILOT_MODELS.find(m => m.id === model);
    return `[${modelInfo?.name || model}] Response to: "${prompt}"\n\nThis is a placeholder response. In the actual implementation, this would execute:\n\n  gh copilot suggest "${prompt}" --model ${model}\n\nThe GitHub Copilot CLI would provide contextual code suggestions and explanations based on your prompt.`;
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      executePrompt();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (commandHistory.length === 0) return;
      
      const newIndex = historyIndex === -1 
        ? commandHistory.length - 1 
        : Math.max(0, historyIndex - 1);
      
      setHistoryIndex(newIndex);
      setPrompt(commandHistory[newIndex]);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex === -1) return;
      
      const newIndex = historyIndex + 1;
      
      if (newIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setPrompt('');
      } else {
        setHistoryIndex(newIndex);
        setPrompt(commandHistory[newIndex]);
      }
    }
  };

  const handleModelChange = (event: any, data: any) => {
    const newModel = data.optionValue as CopilotModelId;
    onModelChange(newModel);
    addSystemMessage(t('GithubCopilotCLIItem_ModelChanged', 'Model changed to {{model}}', { 
      model: COPILOT_MODELS.find(m => m.id === newModel)?.name || newModel 
    }));
  };

  const selectedModelInfo = COPILOT_MODELS.find(m => m.id === selectedModel);

  const content = (
    <div className="github-copilot-cli-view">
      <div className="copilot-terminal-container">
        <div className="copilot-terminal-header">
          <div className="header-title">
            <Sparkle24Regular />
            <span>{t('GithubCopilotCLIItem_Terminal_Title', 'GitHub Copilot')}</span>
          </div>
          <div className="model-selector">
            <Dropdown
              value={selectedModelInfo?.name || selectedModel}
              selectedOptions={[selectedModel]}
              onOptionSelect={handleModelChange}
              disabled={isProcessing}
            >
              {COPILOT_MODELS.map(model => (
                <Option key={model.id} value={model.id} text={model.name}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{model.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--colorNeutralForeground3)' }}>
                      {model.description}
                    </div>
                  </div>
                </Option>
              ))}
            </Dropdown>
          </div>
        </div>

        <div className="copilot-terminal-body" ref={terminalBodyRef}>
          {terminalEntries.length === 0 ? (
            <div className="welcome-message">
              <h3>{t('GithubCopilotCLIItem_Welcome_Title', '👋 Welcome to GitHub Copilot CLI')}</h3>
              <p>{t('GithubCopilotCLIItem_Welcome_Description', 
                'Ask questions, get code suggestions, or request explanations. Examples:'
              )}</p>
              <ul>
                <li>{t('GithubCopilotCLIItem_Example_1', '"How do I create a REST API in Python?"')}</li>
                <li>{t('GithubCopilotCLIItem_Example_2', '"Explain this error: TypeError: undefined is not a function"')}</li>
                <li>{t('GithubCopilotCLIItem_Example_3', '"Write a function to sort an array in JavaScript"')}</li>
              </ul>
            </div>
          ) : (
            terminalEntries.map((entry, index) => (
              <div key={index} className={`terminal-entry ${entry.type}`}>
                {entry.type === 'prompt' && (
                  <>
                    <span className="prompt-symbol">❯</span>
                    {entry.content}
                  </>
                )}
                {entry.type === 'response' && entry.content}
                {entry.type === 'error' && entry.content}
                {entry.type === 'system' && entry.content}
              </div>
            ))
          )}
          {isProcessing && (
            <div className="terminal-entry system">
              {t('GithubCopilotCLIItem_Processing', 'Thinking...')}
            </div>
          )}
        </div>

        <div className="copilot-terminal-input">
          <span className="prompt-indicator">❯</span>
          <Input
            className="prompt-input"
            value={prompt}
            onChange={(e, data) => setPrompt(data.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('GithubCopilotCLIItem_Prompt_Placeholder', 'Ask Copilot anything...')}
            disabled={isProcessing}
          />
          <Button
            icon={<Send24Regular />}
            onClick={executePrompt}
            disabled={isProcessing || !prompt.trim()}
            appearance="primary"
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
