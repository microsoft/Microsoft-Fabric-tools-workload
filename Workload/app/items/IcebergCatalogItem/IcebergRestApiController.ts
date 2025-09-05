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
    private proxyUrl?: string;

    constructor(catalogConfig?: IcebergCatalogConfig, proxyUrl?: string) {
        this.catalogConfig = catalogConfig;
        this.baseUrl = catalogConfig?.catalogUri;
        this.proxyUrl = proxyUrl;
        if(!this.proxyUrl && process.env.NODE_ENV === 'development'){
            this.proxyUrl = '/api/proxy';
        }
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

        return await this.makeRequest<IcebergConfigResponse>(url.toString());
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

        return await this.makeRequest<ListNamespacesResponse>(url.toString());
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

        return await this.makeRequest<IcebergNamespace>(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });
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

        return await this.makeRequest<IcebergNamespace>(url);
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

        try {
            const status = await this.makeRequest<number>(url, { method: 'HEAD' });
            return status === 204;
        } catch (error) {
            return false;
        }
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

        await this.makeRequest<void>(url, { method: 'DELETE' });
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

        return await this.makeRequest<{ updated: string[]; removed: string[]; missing?: string[] }>(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });
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

        return await this.makeRequest<ListTablesResponse>(url.toString());
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
            'Content-Type': 'application/json'
        };

        if (dataAccess) {
            headers['X-Iceberg-Access-Delegation'] = dataAccess;
        }

        return await this.makeRequest<LoadTableResult>(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(request)
        });
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

        const headers: Record<string, string> = {};
        if (dataAccess) headers['X-Iceberg-Access-Delegation'] = dataAccess;
        if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch;

        try {
            return await this.makeRequest<LoadTableResult>(url.toString(), { headers });
        } catch (error) {
            if (error instanceof Error && error.message.includes('304 Not Modified')) {
                throw new Error('Table metadata not modified');
            }
            throw error;
        }
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

        return await this.makeRequest<LoadTableResult>(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });
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

        await this.makeRequest<void>(url.toString(), { method: 'DELETE' });
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

        try {
            const status = await this.makeRequest<number>(url, { method: 'HEAD' });
            return status === 204;
        } catch (error) {
            return false;
        }
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

        await this.makeRequest<void>(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });
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

    /**
     * Generic method for making HTTP requests to the Iceberg REST API
     * Supports proxy routing when proxyUrl is configured
     */
    private async makeRequest<T>(
        targetUrl: string,
        options: {
            method?: string;
            headers?: Record<string, string>;
            body?: string;
        } = {}
    ): Promise<T> {
        const { method = 'GET', headers = {}, body } = options;
        
        let requestUrl = targetUrl;

        const requestOptions: RequestInit = {
            method,
            headers: { ...this.getAuthHeaders(), ...headers },
            mode: 'cors',
            credentials: 'omit'
        };

        // If proxy is configured, use it and add the target URL as headers
        if (this.proxyUrl) {
            requestUrl = this.proxyUrl;
            requestOptions.headers = {
                ...requestOptions.headers,
                'X-Target-URL': targetUrl,
                'X-Target-Base-URL': this.baseUrl.replace('/api/2.1/unity-catalog/iceberg-rest', '') // Remove API path for base URL
            };
        }

        if (body && method !== 'GET') {
            requestOptions.body = JSON.stringify(body);
        }

         const response = await fetch(requestUrl, requestOptions);

        // Special handling for 304 Not Modified
        if (response.status === 304) {
            throw new Error('HTTP Error: 304 Not Modified');
        }

        if (!response.ok) {
            throw await this.handleErrorResponse(response);
        }

        // Handle HEAD requests that don't return JSON
        if (method === 'HEAD') {
            return response.status as T;
        }

        // Handle DELETE requests that might not return JSON
        if (method === 'DELETE') {
            const text = await response.text();
            return (text ? JSON.parse(text) : undefined) as T;
        }

        return await response.json() as T;
    }

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
