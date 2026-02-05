/**
 * GitHub Copilot CLI Item Model
 * Defines the data structure for persisting Copilot CLI item configuration
 */

import { Item } from "../../clients/FabricPlatformTypes";

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
  type: 'prompt' | 'response' | 'error' | 'system' | 'action';
  content: string;
  timestamp: Date;
  model?: CopilotModelId;
  /** For action entries - the suggested action that can be executed */
  action?: {
    type: 'fab_cli' | 'python' | 'info';
    command?: string;
    description: string;
  };
  /** Whether an action has been executed */
  actionExecuted?: boolean;
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
  /** Selected Lakehouse for Fabric actions */
  selectedLakehouse?: Item | null;
  /** Active session ID for command execution */
  sessionId?: string | null;
  /** Spark environment ID */
  environmentId?: string | null;
}

/**
 * Workspace context for GitHub Copilot CLI
 */
export interface WorkspaceContext {
  /** Current workspace ID */
  workspaceId?: string;
  /** Current workspace name */
  workspaceName?: string;
  /** Current item ID */
  itemId?: string;
  /** Current item name */
  itemName?: string;
  /** Selected lakehouse ID */
  lakehouseId?: string;
  /** Selected lakehouse name */
  lakehouseName?: string;
}

