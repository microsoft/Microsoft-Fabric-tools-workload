import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { IcebergCatalogItemDefinition, ShortcutInfo, DEFAULT_SHORTCUT_PREFIX, IcebergCatalogConfig } from "./IcebergCatalogItemModel";
import { OneLakeShortcutClient } from "../../clients/OneLakeShortcutClient";
import { CreateShortcutRequest } from "../../clients/FabricPlatformTypes";
import { v4 as uuidv4 } from 'uuid';
import { IcebergRestApiController, TableInfo, IcebergTableSchema, IcebergComplexType } from "./IcebergRestApiController";

/**
 * Controller for managing Iceberg Catalog shortcuts in Microsoft Fabric
 * Handles the creation and management of OneLake shortcuts that point to Iceberg tables
 */
export class IcebergShortcutController {
    private shortcutClient: OneLakeShortcutClient;
    private icebergApi: IcebergRestApiController;

    constructor(workloadClient: WorkloadClientAPI, catalogConfig?: IcebergCatalogConfig) {
        this.shortcutClient = new OneLakeShortcutClient(workloadClient);
        this.icebergApi = new IcebergRestApiController(catalogConfig);
    }

    // ========================================
    // Iceberg Catalog Integration Methods
    // ========================================

    /**
     * Get the underlying Iceberg REST API controller
     */
    getIcebergApi(): IcebergRestApiController {
        return this.icebergApi;
    }

    /**
     * Get tables from a namespace using the Iceberg API
     */
    async getTablesInNamespace(namespace: string[], prefix?: string): Promise<TableInfo[]> {
        return this.icebergApi.getTablesInNamespace(namespace, prefix);
    }

    /**
     * Get all namespaces from the catalog
     */
    async getAllNamespaces(prefix?: string): Promise<string[][]> {
        return this.icebergApi.getAllNamespaces(prefix);
    }

    /**
     * Get a specific table from the catalog
     */
    async getIcebergTable(namespace: string[], tableName: string, prefix?: string): Promise<TableInfo> {
        return this.icebergApi.getIcebergTable(namespace, tableName, prefix);
    }

    // ========================================
    // Fabric Shortcut Management Methods
    // ========================================
    /**
     * Convert Iceberg table info to shortcut info
     */
    convertTable(table: TableInfo): ShortcutInfo {
        const shortcutId = uuidv4();
        
        return {
            id: shortcutId,
            icebergCatalog: {
                namespace: table.namespace.join('.'), // Convert array to string
                tableName: table.name,
                tableLocation: table.location,
                fileFormat: table.fileFormat,
                schema: table.schema ? this.convertIcebergSchemaToLegacy(table.schema) : undefined
            },
            status: 'creating',
            createdDate: new Date()
        };
    }

    /**
     * Convert the full Iceberg schema to the legacy simplified format
     */
    private convertIcebergSchemaToLegacy(schema: IcebergTableSchema): any {
        return {
            type: schema.type,
            fields: schema.fields.map(field => ({
                id: field.id,
                name: field.name,
                required: field.required,
                type: typeof field.type === 'string' ? field.type : this.convertComplexType(field.type)
            }))
        };
    }

    /**
     * Convert complex Iceberg types to legacy format
     */
    private convertComplexType(type: IcebergComplexType): any {
        switch (type.type) {
            case 'list':
                return {
                    type: 'list',
                    element: typeof type.element === 'string' ? type.element : this.convertComplexType(type.element!)
                };
            case 'map':
                return {
                    type: 'map',
                    key: typeof type.key === 'string' ? type.key : this.convertComplexType(type.key!),
                    value: typeof type.value === 'string' ? type.value : this.convertComplexType(type.value!)
                };
            case 'struct':
                return {
                    type: 'struct',
                    fields: type.fields?.map(field => ({
                        id: field.id,
                        name: field.name,
                        required: field.required,
                        type: typeof field.type === 'string' ? field.type : this.convertComplexType(field.type)
                    })) || []
                };
            default:
                return type;
        }
    }

    /**
     * Create an Iceberg shortcut in Fabric
     */
    async createIcebergShortcut(
        editorItem: ItemWithDefinition<IcebergCatalogItemDefinition>,
        config: IcebergCatalogItemDefinition,
        shortcutInfo: ShortcutInfo
    ): Promise<void> {
        const tableName = shortcutInfo.icebergCatalog.tableName;
        const namespace = shortcutInfo.icebergCatalog.namespace;
        const shortcutName = `${config.fabricConfig?.shortcutPrefix || DEFAULT_SHORTCUT_PREFIX}_${namespace}_${tableName}`;
        
        try {
            // Extract location details from Iceberg table location
            const locationInfo = this.parseIcebergLocation(shortcutInfo.icebergCatalog.tableLocation);
            
            const createRequest: CreateShortcutRequest = {
                path: "Tables",
                name: shortcutName,
                target: {
                    adlsGen2: {
                        location: locationInfo.location,
                        subpath: locationInfo.subpath,
                        connectionId: config.fabricConfig?.connectionId || config.icebergConfig?.connectionId || ""
                    }
                }
            };

            // Create the shortcut using OneLakeShortcutClient
            const result = await this.shortcutClient.createShortcut(
                editorItem.workspaceId,
                editorItem.id,
                createRequest
            );

            // Update shortcut info with Fabric details
            shortcutInfo.fabric = {
                id: editorItem.id,
                workspaceId: editorItem.workspaceId,
                name: result.name,
                targetPath: result.path,
                location: locationInfo.location,
                subpath: locationInfo.subpath,
                shortcutPath: `${result.path}/${result.name}`,
                connectionId: config.fabricConfig?.connectionId || config.icebergConfig?.connectionId || ""
            };

            shortcutInfo.status = 'active';
            shortcutInfo.lastSyncDate = new Date();

        } catch (error) {
            console.error(`Failed to create shortcut for ${namespace}.${tableName}:`, error);
            shortcutInfo.status = 'failed';
            shortcutInfo.error = error instanceof Error ? error.message : 'Unknown error';
        }
    }

    /**
     * Delete a shortcut from Fabric
     */
    async deleteShortcut(shortcutInfo: ShortcutInfo): Promise<void> {
        if (!shortcutInfo.fabric) {
            console.warn('Cannot delete shortcut: No Fabric information available');
            return;
        }

        try {
            await this.shortcutClient.deleteShortcut(
                shortcutInfo.fabric.workspaceId,
                shortcutInfo.fabric.id,
                shortcutInfo.fabric.shortcutPath
            );
        } catch (error) {
            console.error(`Failed to delete shortcut ${shortcutInfo.fabric.name}:`, error);
            throw error;
        }
    }

    /**
     * Parse Iceberg table location to extract location and subpath for ADLS Gen2
     */
    private parseIcebergLocation(tableLocation: string): { location: string; subpath: string } {
        // Handle different storage formats
        if (tableLocation.startsWith('abfss://')) {
            // Azure Data Lake Storage Gen2 format: abfss://container@account.dfs.core.windows.net/path
            const url = new URL(tableLocation);
            const pathParts = url.pathname.split('/').filter(part => part.length > 0);
            
            return {
                location: `${url.protocol}//${url.host}`,
                subpath: pathParts.join('/')
            };
        } else if (tableLocation.startsWith('s3://')) {
            // S3 format: s3://bucket/path
            const url = new URL(tableLocation);
            const pathParts = url.pathname.split('/').filter(part => part.length > 0);
            
            return {
                location: `${url.protocol}//${url.host}`,
                subpath: pathParts.join('/')
            };
        } else if (tableLocation.startsWith('hdfs://')) {
            // HDFS format: hdfs://namenode:port/path
            const url = new URL(tableLocation);
            const pathParts = url.pathname.split('/').filter(part => part.length > 0);
            
            return {
                location: `${url.protocol}//${url.host}`,
                subpath: pathParts.join('/')
            };
        } else if (tableLocation.startsWith('file://')) {
            // Local file system format: file:///path
            const url = new URL(tableLocation);
            
            return {
                location: `${url.protocol}//${url.host || 'localhost'}`,
                subpath: url.pathname.substring(1) // Remove leading slash
            };
        } else {
            // Fallback for other formats - treat as full path
            const lastSlashIndex = tableLocation.lastIndexOf('/');
            if (lastSlashIndex > 0) {
                return {
                    location: tableLocation.substring(0, lastSlashIndex),
                    subpath: tableLocation.substring(lastSlashIndex + 1)
                };
            } else {
                return {
                    location: tableLocation,
                    subpath: ''
                };
            }
        }
    }

    /**
     * Get shortcut status summary
     */
    getShortcutSummary(shortcuts: ShortcutInfo[]): {
        total: number;
        active: number;
        failed: number;
        creating: number;
    } {
        return {
            total: shortcuts.length,
            active: shortcuts.filter(s => s.status === 'active').length,
            failed: shortcuts.filter(s => s.status === 'failed').length,
            creating: shortcuts.filter(s => s.status === 'creating').length
        };
    }
}
