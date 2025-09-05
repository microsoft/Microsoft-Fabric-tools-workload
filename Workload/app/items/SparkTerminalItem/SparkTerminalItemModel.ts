import { ItemReference } from "../../controller/ItemCRUDController";

/**
 * Data model for SparkTerminalItem
 * Defines the structure for data that will be persisted in Fabric storage
 */
export interface SparkTerminalItemDefinition {
  // Selected lakehouse reference
  selectedLakehouse?: ItemReference;
  
  // Terminal session settings
  sessionSettings?: {
    autoStart?: boolean;
    maxExecutors?: number;
    executorMemory?: string;
    executorCores?: number;
  };
  
  // Command history for the item
  commandHistory?: string[];
  
  // Last used session information
  lastSession?: {
    sessionId?: string;
    createdAt?: string;
    workspace?: string;
    lakehouse?: string;
  };
}

/**
 * Default configuration for new SparkTerminal items
 */
export const DEFAULT_SPARK_TERMINAL_CONFIG: SparkTerminalItemDefinition = {
  sessionSettings: {
    autoStart: false,
    maxExecutors: 2,
    executorMemory: "4g",
    executorCores: 2
  },
  commandHistory: []
};
