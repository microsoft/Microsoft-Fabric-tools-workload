import { ItemReference } from "../../controller/ItemCRUDController";

/**
 * Data model for FabricCLIItem
 * Defines the structure for data that will be persisted in Fabric storage
 */
export interface FabricCLIItemDefinition {
  // Selected lakehouse reference
  selectedLakehouse?: ItemReference;
  // Selected Spark environment reference
  selectedSparkEnvironment?: ItemReference;  
}