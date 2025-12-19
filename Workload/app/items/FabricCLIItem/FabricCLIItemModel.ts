import { ItemReference } from "../../controller/ItemCRUDController";

/**
 * Data model for FabricCLIItem
 * Defines the structure for data that will be persisted in Fabric storage
 */
export interface FabricCLIItemDefinition {
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
 * Default configuration for new FabricCLI items
 */
export const DEFAULT_FABRIC_CLI_CONFIG: FabricCLIItemDefinition = {
  sessionSettings: {
    autoStart: false,
    maxExecutors: 2,
    executorMemory: "4g",
    executorCores: 2
  },
  commandHistory: []
};
