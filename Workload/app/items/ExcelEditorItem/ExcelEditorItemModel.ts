import { ItemReference } from "src/controller/ItemCRUDController";

export interface ExcelEditorItemDefinition {
  selectedLakehouse: ItemReference
  selectedContent: ContentReference
}


export interface ContentReference extends ItemReference {
  displayName: string;
  path: string;
  itemType: string;
  contentType: "table" | "file";
}


export interface ExcelApiRequestBody {
  tableName: string;
  tableData: any[];
  schema: TableSchema[];
  metadata: {
    lakehouseId: string;
    tableName: string;
    workspaceId: string;
    sourceType?: 'table' | 'csv' | 'parquet' | 'json';
    filePath?: string;
    fileSize?: number;
    rowCount?: number;
    columnCount?: number;
  };
}

export interface TableSchema {
  name: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
}

