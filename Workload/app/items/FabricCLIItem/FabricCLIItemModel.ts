import { ItemReference } from "../../controller/ItemCRUDController";

/**
 * Parameter definition for a Python script
 */
export interface ScriptParameter {
  name: string;
  type: 'string' | 'int' | 'float' | 'bool' | 'date';
  value: string;
}

/**
 * Metadata for a Python script stored as a definition part
 * The name serves as the unique identifier and must include .py extension
 */
export interface PythonScriptMetadata {
  name: string;
  parameters?: ScriptParameter[];
  createdAt?: string;
  modifiedAt?: string;
}

/**
 * Full Python script with content (used in memory, not persisted in main definition)
 */
export interface PythonScript extends PythonScriptMetadata {
  content: string;
}

/**
 * Data model for FabricCLIItem
 * Defines the structure for data that will be persisted in Fabric storage
 */
export interface FabricCLIItemDefinition {
  // Selected lakehouse reference
  selectedLakehouse?: ItemReference;
  // Last used Spark session id
  lastSparkSessionId?: string;
  // Selected Spark environment reference
  selectedSparkEnvironment?: ItemReference;
  // Python scripts metadata (actual content stored as separate definition parts in scripts/{name}.py)
  scripts?: PythonScriptMetadata[];
}