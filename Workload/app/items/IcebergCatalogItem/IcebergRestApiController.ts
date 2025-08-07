import { IcebergCatalogConfig } from "./IcebergCatalogItemModel";

// Apache Iceberg REST API Types based on the official specification
export interface IcebergTableSchema {
    type: 'struct';
    'schema-id': number;
    fields: IcebergSchemaField[];
    'identifier-field-ids'?: number[];
}

export interface IcebergSchemaField {
    id: number;
    name: string;
    required: boolean;
    type: string | IcebergComplexType;
    doc?: string;
    'initial-default'?: any;
    'write-default'?: any;
}

export interface IcebergComplexType {
    type: 'list' | 'map' | 'struct';
    'element-id'?: number;
    element?: string | IcebergComplexType;
    'element-required'?: boolean;
    'key-id'?: number;
    key?: string | IcebergComplexType;
    'value-id'?: number;
    value?: string | IcebergComplexType;
    'value-required'?: boolean;
    fields?: IcebergSchemaField[];
}

export interface IcebergTableMetadata {
    'format-version': number;
    'table-uuid': string;
    location?: string;
    'last-updated-ms'?: number;
    'next-row-id'?: number;
    properties?: Record<string, string>;
    schemas: IcebergTableSchema[];
    'current-schema-id': number;
    'last-column-id': number;
    'partition-specs': IcebergPartitionSpec[];
    'default-spec-id': number;
    'last-partition-id': number;
    'sort-orders': IcebergSortOrder[];
    'default-sort-order-id': number;
    snapshots?: IcebergSnapshot[];
    refs?: Record<string, IcebergSnapshotReference>;
    'current-snapshot-id'?: number;
    'last-sequence-number'?: number;
    'snapshot-log'?: IcebergSnapshotLogEntry[];
    'metadata-log'?: IcebergMetadataLogEntry[];
}

export interface IcebergPartitionSpec {
    'spec-id': number;
    fields: IcebergPartitionField[];
}

export interface IcebergPartitionField {
    'field-id': number;
    'source-id': number;
    name: string;
    transform: string;
}

export interface IcebergSortOrder {
    'order-id': number;
    fields: IcebergSortField[];
}

export interface IcebergSortField {
    'source-id': number;
    transform: string;
    direction: 'asc' | 'desc';
    'null-order': 'nulls-first' | 'nulls-last';
}

export interface IcebergSnapshot {
    'snapshot-id': number;
    'parent-snapshot-id'?: number;
    'sequence-number'?: number;
    'timestamp-ms': number;
    'manifest-list': string;
    'first-row-id'?: number;
    summary: IcebergSnapshotSummary;
    'schema-id'?: number;
}

export interface IcebergSnapshotSummary {
    operation: 'append' | 'replace' | 'overwrite' | 'delete';
    [key: string]: string;
}

export interface IcebergSnapshotReference {
    type: 'tag' | 'branch';
    'snapshot-id': number;
    'max-ref-age-ms'?: number;
    'max-snapshot-age-ms'?: number;
    'min-snapshots-to-keep'?: number;
}

export interface IcebergSnapshotLogEntry {
    'snapshot-id': number;
    'timestamp-ms': number;
}

export interface IcebergMetadataLogEntry {
    'metadata-file': string;
    'timestamp-ms': number;
}

export interface IcebergNamespace {
    namespace: string[];
    properties?: Record<string, string>;
}

export interface IcebergTableIdentifier {
    namespace: string[];
    name: string;
}

export interface IcebergConfigResponse {
    overrides?: Record<string, string>;
    defaults?: Record<string, string>;
    endpoints?: string[];
}

export interface IcebergErrorResponse {
    error: {
        message: string;
        type: string;
        code: number;
        stack?: string[];
    };
}

export interface CreateTableRequest {
    name: string;
    location?: string;
    schema: IcebergTableSchema;
    'partition-spec'?: IcebergPartitionSpec;
    'write-order'?: IcebergSortOrder;
    'stage-create'?: boolean;
    properties?: Record<string, string>;
}

export interface CreateNamespaceRequest {
    namespace: string[];
    properties?: Record<string, string>;
}

export interface UpdateNamespacePropertiesRequest {
    removals?: string[];
    updates?: Record<string, string>;
}

export interface RenameTableRequest {
    source: IcebergTableIdentifier;
    destination: IcebergTableIdentifier;
}

export interface CommitTableRequest {
    identifier?: IcebergTableIdentifier;
    requirements: IcebergTableRequirement[];
    updates: IcebergTableUpdate[];
}

export interface IcebergTableRequirement {
    type: string;
    [key: string]: any;
}

export interface IcebergTableUpdate {
    action: string;
    [key: string]: any;
}

export interface LoadTableResult {
    'metadata-location'?: string;
    metadata: IcebergTableMetadata;
    config?: Record<string, string>;
}

export interface PageToken {
    token?: string;
}

export interface ListNamespacesResponse {
    namespaces: string[][];
    'next-page-token'?: string;
}

export interface ListTablesResponse {
    identifiers: IcebergTableIdentifier[];
    'next-page-token'?: string;
}

export interface TableInfo {
    namespace: string[];
    name: string;
    location: string;
    fileFormat: 'PARQUET' | 'ORC' | 'AVRO';
    schema?: IcebergTableSchema;
    metadata?: IcebergTableMetadata;
}

/**
 * Controller implementing the Apache Iceberg REST Catalog API specification
 * Provides a clean interface for interacting with Iceberg REST catalogs
 */
export class IcebergRestApiController {
    private baseUrl: string;
    private catalogConfig?: IcebergCatalogConfig;

    constructor(catalogConfig?: IcebergCatalogConfig) {
        this.catalogConfig = catalogConfig;
        this.baseUrl = catalogConfig?.catalogUri || 'http://localhost:60006/api/iceberg-catalog';
    }

    // ========================================
    // Apache Iceberg REST Catalog API Methods
    // ========================================

    /**
     * GET /v1/config
     * Get catalog configuration
     */
    async getConfig(warehouse?: string): Promise<IcebergConfigResponse> {
        const url = new URL(`${this.baseUrl}/v1/config`);
        if (warehouse) {
            url.searchParams.set('warehouse', warehouse);
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }

        return await response.json();
    }

    /**
     * GET /v1/{prefix}/namespaces
     * List namespaces
     */
    async listNamespaces(
        prefix?: string,
        parent?: string,
        pageToken?: string,
        pageSize?: number
    ): Promise<ListNamespacesResponse> {
        const url = new URL(`${this.baseUrl}/v1/${prefix || ''}/namespaces`);
        
        if (parent) url.searchParams.set('parent', parent);
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        if (pageSize) url.searchParams.set('pageSize', pageSize.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }

        return await response.json();
    }

    /**
     * POST /v1/{prefix}/namespaces
     * Create a namespace
     */
    async createNamespace(
        request: CreateNamespaceRequest,
        prefix?: string
    ): Promise<IcebergNamespace> {
        const url = `${this.baseUrl}/v1/${prefix || ''}/namespaces`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }

        return await response.json();
    }

    /**
     * GET /v1/{prefix}/namespaces/{namespace}
     * Load namespace metadata
     */
    async loadNamespaceMetadata(
        namespace: string[],
        prefix?: string
    ): Promise<IcebergNamespace> {
        const namespacePath = namespace.join('\u001F'); // Unit separator for multipart namespace
        const url = `${this.baseUrl}/v1/${prefix || ''}/namespaces/${encodeURIComponent(namespacePath)}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }

        return await response.json();
    }

    /**
     * HEAD /v1/{prefix}/namespaces/{namespace}
     * Check if namespace exists
     */
    async namespaceExists(
        namespace: string[],
        prefix?: string
    ): Promise<boolean> {
        const namespacePath = namespace.join('\u001F');
        const url = `${this.baseUrl}/v1/${prefix || ''}/namespaces/${encodeURIComponent(namespacePath)}`;

        const response = await fetch(url, {
            method: 'HEAD',
            headers: this.getAuthHeaders()
        });

        return response.status === 204;
    }

    /**
     * DELETE /v1/{prefix}/namespaces/{namespace}
     * Drop a namespace
     */
    async dropNamespace(
        namespace: string[],
        prefix?: string
    ): Promise<void> {
        const namespacePath = namespace.join('\u001F');
        const url = `${this.baseUrl}/v1/${prefix || ''}/namespaces/${encodeURIComponent(namespacePath)}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }
    }

    /**
     * POST /v1/{prefix}/namespaces/{namespace}/properties
     * Update namespace properties
     */
    async updateNamespaceProperties(
        namespace: string[],
        request: UpdateNamespacePropertiesRequest,
        prefix?: string
    ): Promise<{ updated: string[]; removed: string[]; missing?: string[] }> {
        const namespacePath = namespace.join('\u001F');
        const url = `${this.baseUrl}/v1/${prefix || ''}/namespaces/${encodeURIComponent(namespacePath)}/properties`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }

        return await response.json();
    }

    /**
     * GET /v1/{prefix}/namespaces/{namespace}/tables
     * List tables in a namespace
     */
    async listTables(
        namespace: string[],
        prefix?: string,
        pageToken?: string,
        pageSize?: number
    ): Promise<ListTablesResponse> {
        const namespacePath = namespace.join('\u001F');
        const url = new URL(`${this.baseUrl}/v1/${prefix || ''}/namespaces/${encodeURIComponent(namespacePath)}/tables`);
        
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        if (pageSize) url.searchParams.set('pageSize', pageSize.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }

        return await response.json();
    }

    /**
     * POST /v1/{prefix}/namespaces/{namespace}/tables
     * Create a table
     */
    async createTable(
        namespace: string[],
        request: CreateTableRequest,
        prefix?: string,
        dataAccess?: string
    ): Promise<LoadTableResult> {
        const namespacePath = namespace.join('\u001F');
        const url = `${this.baseUrl}/v1/${prefix || ''}/namespaces/${encodeURIComponent(namespacePath)}/tables`;

        const headers: Record<string, string> = {
            ...this.getAuthHeaders(),
            'Content-Type': 'application/json'
        };

        if (dataAccess) {
            headers['X-Iceberg-Access-Delegation'] = dataAccess;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }

        return await response.json();
    }

    /**
     * GET /v1/{prefix}/namespaces/{namespace}/tables/{table}
     * Load a table
     */
    async loadTable(
        namespace: string[],
        tableName: string,
        prefix?: string,
        dataAccess?: string,
        ifNoneMatch?: string,
        snapshots?: 'all' | 'refs'
    ): Promise<LoadTableResult> {
        const namespacePath = namespace.join('\u001F');
        const url = new URL(`${this.baseUrl}/v1/${prefix || ''}/namespaces/${encodeURIComponent(namespacePath)}/tables/${encodeURIComponent(tableName)}`);
        
        if (snapshots) url.searchParams.set('snapshots', snapshots);

        const headers: Record<string, string> = { ...this.getAuthHeaders() };
        if (dataAccess) headers['X-Iceberg-Access-Delegation'] = dataAccess;
        if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch;

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers
        });

        if (response.status === 304) {
            throw new Error('Table metadata not modified');
        }

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }

        return await response.json();
    }

    /**
     * POST /v1/{prefix}/namespaces/{namespace}/tables/{table}
     * Update a table
     */
    async updateTable(
        namespace: string[],
        tableName: string,
        request: CommitTableRequest,
        prefix?: string
    ): Promise<LoadTableResult> {
        const namespacePath = namespace.join('\u001F');
        const url = `${this.baseUrl}/v1/${prefix || ''}/namespaces/${encodeURIComponent(namespacePath)}/tables/${encodeURIComponent(tableName)}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }

        return await response.json();
    }

    /**
     * DELETE /v1/{prefix}/namespaces/{namespace}/tables/{table}
     * Drop a table
     */
    async dropTable(
        namespace: string[],
        tableName: string,
        prefix?: string,
        purgeRequested?: boolean
    ): Promise<void> {
        const namespacePath = namespace.join('\u001F');
        const url = new URL(`${this.baseUrl}/v1/${prefix || ''}/namespaces/${encodeURIComponent(namespacePath)}/tables/${encodeURIComponent(tableName)}`);
        
        if (purgeRequested !== undefined) {
            url.searchParams.set('purgeRequested', purgeRequested.toString());
        }

        const response = await fetch(url.toString(), {
            method: 'DELETE',
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }
    }

    /**
     * HEAD /v1/{prefix}/namespaces/{namespace}/tables/{table}
     * Check if table exists
     */
    async tableExists(
        namespace: string[],
        tableName: string,
        prefix?: string
    ): Promise<boolean> {
        const namespacePath = namespace.join('\u001F');
        const url = `${this.baseUrl}/v1/${prefix || ''}/namespaces/${encodeURIComponent(namespacePath)}/tables/${encodeURIComponent(tableName)}`;

        const response = await fetch(url, {
            method: 'HEAD',
            headers: this.getAuthHeaders()
        });

        return response.status === 204;
    }

    /**
     * POST /v1/{prefix}/tables/rename
     * Rename a table
     */
    async renameTable(
        request: RenameTableRequest,
        prefix?: string
    ): Promise<void> {
        const url = `${this.baseUrl}/v1/${prefix || ''}/tables/rename`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                ...this.getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }
    }

    // ========================================
    // Helper Methods for TableInfo Conversion
    // ========================================

    /**
     * Convert TableInfo to Iceberg table for use with REST API
     */
    async getIcebergTable(namespace: string[], tableName: string, prefix?: string): Promise<TableInfo> {
        const tableResult = await this.loadTable(namespace, tableName, prefix);
        
        return {
            namespace,
            name: tableName,
            location: tableResult.metadata.location || '',
            fileFormat: 'PARQUET', // Default, could be detected from metadata
            schema: tableResult.metadata.schemas.find(s => s['schema-id'] === tableResult.metadata['current-schema-id']),
            metadata: tableResult.metadata
        };
    }

    /**
     * List tables from Iceberg catalog and convert to TableInfo format
     */
    async getTablesInNamespace(namespace: string[], prefix?: string): Promise<TableInfo[]> {
        const tablesResponse = await this.listTables(namespace, prefix);
        const tables: TableInfo[] = [];

        for (const identifier of tablesResponse.identifiers) {
            try {
                const table = await this.getIcebergTable(identifier.namespace, identifier.name, prefix);
                tables.push(table);
            } catch (error) {
                console.warn(`Failed to load table ${identifier.namespace.join('.')}.${identifier.name}:`, error);
            }
        }

        return tables;
    }

    /**
     * Get all namespaces from the catalog
     */
    async getAllNamespaces(prefix?: string): Promise<string[][]> {
        const response = await this.listNamespaces(prefix);
        return response.namespaces;
    }

    // ========================================
    // Private Helper Methods
    // ========================================

    private getAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {};
        
        // Add authentication headers based on configuration
        if (this.catalogConfig?.authToken) {
            headers['Authorization'] = `Bearer ${this.catalogConfig.authToken}`;
        }
        
        return headers;
    }

    private async handleErrorResponse(response: Response): Promise<Error> {
        try {
            const errorData: IcebergErrorResponse = await response.json();
            return new Error(`Iceberg API Error: ${errorData.error.message} (${errorData.error.code})`);
        } catch {
            return new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
    }
}
