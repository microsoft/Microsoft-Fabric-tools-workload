import { ItemReference } from "../../controller/ItemCRUDController";

export const DEFAULT_SHORTCUT_PREFIX = "iceberg";
export const ICEBERG_PROXY_URL = "http://localhost:60006/api/iceberg-catalog";

export interface ShortcutInfo {
    id: string,
    fabric?: ShortcutInfoFabric;
    icebergCatalog: ShortcutInfoIcebergCatalog,
    status: 'active' | 'failed' | 'creating';
    createdDate: Date;
    lastSyncDate?: Date;
    error?: string;
}

export interface ShortcutInfoFabric extends ItemReference {
    name: string;
    targetPath: string;
    location: string;
    subpath: string;
    shortcutPath: string;
    connectionId: string;
}

export interface ShortcutInfoIcebergCatalog {
    namespace: string;
    tableName: string;
    tableLocation: string;
    fileFormat: 'PARQUET' | 'ORC' | 'AVRO';
    schema?: IcebergSchema;
}

export interface IcebergSchema {
    type: 'struct';
    fields: IcebergField[];
}

export interface IcebergField {
    id: number;
    name: string;
    required: boolean;
    type: string | IcebergComplexType;
}

export interface IcebergComplexType {
    type: 'list' | 'map' | 'struct';
    element?: string | IcebergComplexType;
    key?: string | IcebergComplexType;
    value?: string | IcebergComplexType;
    fields?: IcebergField[];
}

export interface IcebergCatalogConfig {
    catalogUri: string;
    catalogType: 'REST' | 'HIVE' | 'HADOOP' | 'GLUE';
    authToken?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    warehouse: string;
    namespaces: string[];
    connectionId: string;
    properties?: Record<string, string>;
}

export interface FabricConfig {
    shortcutPrefix: string
    connectionId: string;
}

export interface IcebergCatalogItemDefinition {
    icebergConfig?: IcebergCatalogConfig;
    fabricConfig?: FabricConfig;
    shortcuts?: ShortcutInfo[];
    lastSyncDate?: Date;
}
