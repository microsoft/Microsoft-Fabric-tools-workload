import { ItemReference, ItemWithDefinition } from "src/controller/ItemCRUDController";

export interface ExcelTableEditorItemDefinition {
  tableList?: OneLakeTable[];
  selectedTable?: OneLakeTable;
  isInitialized?: boolean;
}

export interface TableItemReference extends ItemReference {
  displayName: string;
  type: string;
}

export interface OneLakeTable {
  name: string;
  description: string;
  item: TableItemReference;
  lastModified?: Date;
}

export interface FabricTableItem extends ItemWithDefinition<any> {
  tables?: OneLakeTable[];
}

export interface ExcelApiRequestBody {
  tableName: string;
  tableData: any[];
  schema: TableSchema[];
  metadata: {
    lakehouseId: string;
    tableName: string;
    workspaceId: string;
  };
}

export interface TableSchema {
  name: string;
  dataType: 'string' | 'number' | 'date' | 'boolean';
}

