import React, { useState, useEffect } from "react";
import { Stack } from "@fluentui/react";
import { Text, Input, Field, Dropdown, Option, Button, Spinner } from "@fluentui/react-components";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { IcebergCatalogItemDefinition, IcebergCatalogConfig } from "./IcebergCatalogItemModel";
import { FabricPlatformAPIClient } from "../../clients/FabricPlatformAPIClient";
import { Connection } from "../../clients/FabricPlatformTypes";

interface IcebergCatalogItemEditorSettingsPageProps {
    workloadClient: WorkloadClientAPI;
    definition: IcebergCatalogItemDefinition;
    onSave: (definition: IcebergCatalogItemDefinition) => void;
}

export const IcebergCatalogItemEditorSettingsPage: React.FC<IcebergCatalogItemEditorSettingsPageProps> = ({
    workloadClient,
    definition,
    onSave
}) => {
    const [catalogUri, setCatalogUri] = useState<string>(definition.icebergConfig?.catalogUri || "");
    const [catalogType, setCatalogType] = useState<'REST' | 'HIVE' | 'HADOOP' | 'GLUE'>(definition.icebergConfig?.catalogType || 'REST');
    const [authToken, setAuthToken] = useState<string>(definition.icebergConfig?.authToken || "");
    const [accessKeyId, setAccessKeyId] = useState<string>(definition.icebergConfig?.accessKeyId || "");
    const [secretAccessKey, setSecretAccessKey] = useState<string>(definition.icebergConfig?.secretAccessKey || "");
    const [warehouse, setWarehouse] = useState<string>(definition.icebergConfig?.warehouse || "");
    const [connectionId, setConnectionId] = useState<string>(definition.icebergConfig?.connectionId || "");
    const [shortcutPrefix, setShortcutPrefix] = useState<string>(definition.fabricConfig?.shortcutPrefix || "iceberg");
    
    const [availableConnections, setAvailableConnections] = useState<Connection[]>([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState<boolean>(false);

    useEffect(() => {
        loadConnections();
    }, []);

    const loadConnections = async () => {
        setIsLoadingConnections(true);
        try {
            const fabricClient = FabricPlatformAPIClient.create(workloadClient);
            const connections = await fabricClient.connections.getAllConnections();
            setAvailableConnections(connections);
        } catch (error) {
            console.error("Failed to fetch connections:", error);
            setAvailableConnections([]);
        } finally {
            setIsLoadingConnections(false);
        }
    };

    const handleSave = () => {
        const icebergConfig: IcebergCatalogConfig = {
            catalogUri,
            catalogType,
            authToken: authToken || undefined,
            accessKeyId: accessKeyId || undefined,
            secretAccessKey: secretAccessKey || undefined,
            warehouse,
            namespaces: definition.icebergConfig?.namespaces || [],
            connectionId
        };

        const updatedDefinition: IcebergCatalogItemDefinition = {
            ...definition,
            icebergConfig,
            fabricConfig: {
                connectionId,
                shortcutPrefix
            }
        };

        onSave(updatedDefinition);
    };

    return (
        <Stack tokens={{ childrenGap: 20 }} style={{ padding: '20px', maxWidth: '600px' }}>
            <Text size={600} weight="semibold">Iceberg Catalog Settings</Text>

            <Stack tokens={{ childrenGap: 16 }}>
                <Field label="Catalog URI" required>
                    <Input
                        value={catalogUri}
                        onChange={(e, data) => setCatalogUri(data.value)}
                        placeholder="http://localhost:8181 or https://catalog.example.com"
                    />
                </Field>

                <Field label="Catalog Type" required>
                    <Dropdown
                        placeholder="Select catalog type"
                        value={catalogType}
                        onOptionSelect={(e, data) => setCatalogType(data.optionValue as any)}
                    >
                        <Option value="REST">REST</Option>
                        <Option value="HIVE">Hive Metastore</Option>
                        <Option value="HADOOP">Hadoop</Option>
                        <Option value="GLUE">AWS Glue</Option>
                    </Dropdown>
                </Field>

                <Field label="Warehouse Location" required>
                    <Input
                        value={warehouse}
                        onChange={(e, data) => setWarehouse(data.value)}
                        placeholder="s3://bucket/warehouse or abfss://container@account.dfs.core.windows.net/warehouse"
                    />
                </Field>

                {catalogType === 'REST' && (
                    <Field label="Authentication Token">
                        <Input
                            type="password"
                            value={authToken}
                            onChange={(e, data) => setAuthToken(data.value)}
                            placeholder="Bearer token for REST API authentication"
                        />
                    </Field>
                )}

                {catalogType === 'GLUE' && (
                    <>
                        <Field label="AWS Access Key ID" required>
                            <Input
                                value={accessKeyId}
                                onChange={(e, data) => setAccessKeyId(data.value)}
                                placeholder="AWS Access Key ID"
                            />
                        </Field>
                        <Field label="AWS Secret Access Key" required>
                            <Input
                                type="password"
                                value={secretAccessKey}
                                onChange={(e, data) => setSecretAccessKey(data.value)}
                                placeholder="AWS Secret Access Key"
                            />
                        </Field>
                    </>
                )}

                <Field label="Fabric Connection" required>
                    <Stack>
                        <Dropdown
                            placeholder={availableConnections.length > 0 ? "Select a connection" : "No connections available"}
                            value={connectionId}
                            onOptionSelect={(e, data) => setConnectionId(data.optionValue as string)}
                            disabled={isLoadingConnections || availableConnections.length === 0}
                        >
                            {availableConnections.map(connection => (
                                <Option key={connection.id} value={connection.id} text={`${connection.displayName} (${connection.connectionDetails.type})`}>
                                    {connection.displayName} ({connection.connectionDetails.type})
                                </Option>
                            ))}
                        </Dropdown>
                        
                        <Button 
                            size="small" 
                            appearance="subtle" 
                            onClick={loadConnections}
                            disabled={isLoadingConnections}
                            style={{ marginTop: '8px', alignSelf: 'flex-start' }}
                        >
                            {isLoadingConnections ? (
                                <>
                                    <Spinner size="tiny" />
                                    <Text style={{ marginLeft: '4px', fontSize: '12px' }}>Loading...</Text>
                                </>
                            ) : (
                                "Refresh Connections"
                            )}
                        </Button>
                    </Stack>
                </Field>

                <Field label="Shortcut Prefix">
                    <Input
                        value={shortcutPrefix}
                        onChange={(e, data) => setShortcutPrefix(data.value)}
                        placeholder="iceberg"
                    />
                </Field>

                <Button
                    appearance="primary"
                    onClick={handleSave}
                    style={{ marginTop: '16px', alignSelf: 'flex-start' }}
                >
                    Save Settings
                </Button>
            </Stack>
        </Stack>
    );
};

// Wrapper component to handle URL parameters for IcebergCatalogItemEditorSettingsPage
export function IcebergCatalogItemEditorSettingsPageWrapper({ workloadClient }: { workloadClient: WorkloadClientAPI }) {
    // TODO: Get definition from workload client context
    const mockDefinition: IcebergCatalogItemDefinition = {
        icebergConfig: {
            catalogUri: "",
            catalogType: 'REST',
            warehouse: "",
            namespaces: [],
            connectionId: ""
        },
        fabricConfig: {
            connectionId: "",
            shortcutPrefix: "iceberg"
        }
    };

    const handleSave = (definition: IcebergCatalogItemDefinition) => {
        console.log('Saving Iceberg Catalog settings:', definition);
        // TODO: Save to workload client
    };

    return (
        <IcebergCatalogItemEditorSettingsPage
            workloadClient={workloadClient}
            definition={mockDefinition}
            onSave={handleSave}
        />
    );
}
