/**
 * GitHub Copilot CLI Item Model
 * Defines the data structure for persisting Copilot CLI item configuration
 */

/**
 * Available Copilot models for selection
 */
export const COPILOT_MODELS = [
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Balanced performance and speed' },
  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', description: 'Latest Claude model' },
  { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', description: 'Fast and efficient' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'OpenAI GPT-4.1' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Fast GPT-5 variant' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Google Gemini model' },
] as const;

export type CopilotModelId = typeof COPILOT_MODELS[number]['id'];

/**
 * Terminal entry for command history display
 */
export interface TerminalEntry {
  type: 'prompt' | 'response' | 'error' | 'system';
  content: string;
  timestamp: Date;
  model?: CopilotModelId;
}

/**
 * Item definition that gets persisted to Fabric
 */
export interface GithubCopilotCLIItemDefinition {
  /** Selected model for Copilot CLI */
  selectedModel?: CopilotModelId;
  /** Command history for persistence */
  commandHistory?: string[];
  /** Last used prompt */
  lastPrompt?: string;
}
