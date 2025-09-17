import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ContentReference, ExcelApiRequestBody, TableSchema } from "../ExcelEditorItemModel";

/**
 * Result of saving data to OneLake
 */
export interface OneLakeSaveResult {
  success: boolean;
  rowsAffected?: number;
  newVersion?: string;
  error?: string;
  warnings?: string[];
  metadata?: Record<string, any>;
}

/**
 * Options for saving data to OneLake
 */
export interface SaveOptions {
  overwrite?: boolean; // Whether to overwrite existing dat
}

/**
 * Result of loading data from OneLake
 */
export interface ExcelData {
  contentReference: ContentReference
  success: boolean;
  data: any[][];
  schema: TableSchema[];
  rowCount: number;
  columnCount: number;
  error?: string;
  warnings?: string[];
}

/**
 * Configuration options for loading data
 */
export interface LoadingOptions {
  maxRows?: number;
  includeHeaders?: boolean;
  inferSchema?: boolean;
  dateFormat?: string;
  delimiter?: string; // For CSV files
  encoding?: string;
  preview?: boolean; // Load only a sample for preview
}

/**
 * Strategy interface for handling different types of OneLake data sources with Excel
 * Implements the Strategy pattern to handle various data source types for both loading and saving
 */
export interface IOneLakeExcelStrategy {

  /**
   * Determines if this strategy can handle the given data source
   * @param dataSource The data source to check
   */
  canHandle(dataSource: ContentReference): boolean;

  /**
   * Loads data from the OneLake data source
   * @param workloadClient The Fabric workload client
   * @param dataSource The data source to load from
   * @param options Loading configuration options
   */
  loadData(
    workloadClient: WorkloadClientAPI,
    dataSource: ContentReference,
    options?: LoadingOptions
  ): Promise<ExcelData>;

  /** 
   * Build ExcelApiRequestBody 
   * 
   * @param workloadClient The Fabric workload client
   * @param content The content reference to build the request body for
   * @return The constructed ExcelApiRequestBody
   */
  buildExcelApiRequestBody(
    workloadClient: WorkloadClientAPI,
    content: ContentReference
  ): ExcelApiRequestBody;

  /**
   * Determines if this strategy supports saving data back to the data source
   * @param dataSource The data source to check for save support
   */
  supportsSaving(dataSource: ContentReference): boolean;

  /**
   * Saves data back to the OneLake data source
   * @param workloadClient The Fabric workload client
   * @param dataSource The data source to save to
   * @param data The data to save (array of arrays)
   * @param schema The schema information for the data
   * @param options Save configuration options
   */
  saveData(
    workloadClient: WorkloadClientAPI,
    data: ExcelData,
    options?: SaveOptions
  ): Promise<OneLakeSaveResult>;
}