import React, { useState, useEffect } from "react";
import { Stack } from "@fluentui/react";
import { Text, Button, Input, Field, Dropdown, Option, Checkbox, Spinner } from "@fluentui/react-components";
import "../../styles.scss";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { IcebergCatalogItemDefinition, IcebergCatalogConfig } from "./IcebergCatalogItemModel";
import { IcebergRestApiController } from "./IcebergRestApiController";
import { FabricPlatformAPIClient } from "../../clients/FabricPlatformAPIClient";
import { Connection } from "../../clients/FabricPlatformTypes";

interface IcebergCatalogItemEmptyStateProps {
  workloadClient: WorkloadClientAPI;
  onFinishEmpty: (config: IcebergCatalogItemDefinition) => void;
}

export const IcebergCatalogItemEmpty: React.FC<IcebergCatalogItemEmptyStateProps> = ({
  workloadClient,
  onFinishEmpty
}) => {
  const [catalogUri, setCatalogUri] = useState<string>("");
  const [catalogType, setCatalogType] = useState<'REST' | 'HIVE' | 'HADOOP' | 'GLUE'>('REST');
  const [authToken, setAuthToken] = useState<string>("");
  const [accessKeyId, setAccessKeyId] = useState<string>("");
  const [secretAccessKey, setSecretAccessKey] = useState<string>("");
  const [selectedNamespace, setSelectedNamespace] = useState<string>("");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [connectionId, setConnectionId] = useState<string>("");
  
  // UI state
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [availableNamespaces, setAvailableNamespaces] = useState<string[]>([]);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [availableConnections, setAvailableConnections] = useState<Connection[]>([]);
  const [isLoadingNamespaces, setIsLoadingNamespaces] = useState<boolean>(false);
  const [isLoadingTables, setIsLoadingTables] = useState<boolean>(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");
  
  const canLogin = catalogUri && (
    catalogType === 'REST' && authToken ||
    catalogType === 'GLUE' && accessKeyId && secretAccessKey ||
    catalogType === 'HIVE' ||
    catalogType === 'HADOOP'
  );
  const canConfigure = isLoggedIn && selectedNamespace && selectedTables.length > 0 && connectionId && 
    availableConnections.some(conn => conn.id === connectionId);

  // Load connections on component mount
  useEffect(() => {
    loadConnections();
  }, []);

  function getIcebergCatalogAPIClient(): IcebergRestApiController {
    const tempConfig: IcebergCatalogConfig = {
      catalogUri,
      catalogType,
      authToken: authToken || undefined,
      accessKeyId: accessKeyId || undefined,
      secretAccessKey: secretAccessKey || undefined,
      namespace: selectedNamespace,
      connectionId: connectionId
    };
    return new IcebergRestApiController(tempConfig);
  }

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

  const loadTablesForNamespace = async (namespace: string) => {
    if (!namespace) return;
    
    setIsLoadingTables(true);
    try {
      const apiClient = getIcebergCatalogAPIClient();
      const tablesResponse = await apiClient.getTablesInNamespace(namespace);
      console.log("Tables in namespace:", tablesResponse);

      setAvailableTables(tablesResponse.map((table: any) => table.name));
      setSelectedTables([]); // Reset selected tables when namespace changes
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      setAvailableTables([]);
      setSelectedTables([]);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handleLogin = async () => {
    if (!canLogin) return;
    
    setIsLoggingIn(true);
    setLoginError("");
    
    try {
      const apiClient = getIcebergCatalogAPIClient();
      
      // Test connection and fetch namespaces
      setIsLoadingNamespaces(true);
      const namespaces = await apiClient.listAllNamespaces();

      // const availableNamespaces = namespacesResponse.namespaces;
      setAvailableNamespaces(namespaces || []);
      setIsLoggedIn(true);
      setIsLoadingNamespaces(false);

    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Failed to connect to Iceberg Catalog");
      setIsLoggedIn(false);
      setAvailableNamespaces([]);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleNamespaceSelection = async (namespace: string) => {
    setSelectedNamespace(namespace);
    setAvailableTables([]);
    setSelectedTables([]);
    
    if (namespace) {
      await loadTablesForNamespace(namespace);
    }
  };

  const handleTableToggle = (tableName: string, checked: boolean) => {
    if (checked) {
      setSelectedTables(prev => [...prev, tableName]);
    } else {
      setSelectedTables(prev => prev.filter(table => table !== tableName));
    }
  };
  
  const saveItem = () => {
    const icebergConfig: IcebergCatalogConfig = {
      catalogUri,
      catalogType,
      authToken: authToken || undefined,
      accessKeyId: accessKeyId || undefined,
      secretAccessKey: secretAccessKey || undefined,
      namespace: selectedNamespace, // Single namespace selected
      connectionId,
      selectedTables: selectedTables // Add selected tables to config
    };
    
    const config: IcebergCatalogItemDefinition = {
      icebergConfig: icebergConfig,
      fabricConfig: {
        connectionId: connectionId,
        shortcutPrefix: ""
      }
    };
    
    onFinishEmpty(config);
  };

  return (
    <Stack className="empty-item-container" 
            style={{ minHeight: 1200, height: '100%', maxHeight: '100%' }} 
            horizontalAlign="start" tokens={{ childrenGap: 16 }}>
      <Stack.Item>
        <img
          src="/assets/items/IcebergCatalog/EditorEmpty.png"
          alt="Empty Iceberg Catalog item illustration"
          className="empty-item-image"
        />
      </Stack.Item>
      <Stack.Item>
        <Text as="h2" size={800} weight="semibold">
          Configure Apache Iceberg Catalog Integration
        </Text>
      </Stack.Item>
      <Stack.Item style={{ marginTop: '16px', marginBottom: '24px' }}>
        <Text>
          Connect to your Apache Iceberg Catalog to create shortcuts to OneLake tables.
        </Text>
      </Stack.Item>
      
      <Stack style={{ width: '600px', gap: '16px' }}>
        {/* Step 1: Catalog Configuration */}
        <Field label="Catalog URI" required>
          <Input
            value={catalogUri}
            onChange={(e, data) => setCatalogUri(data.value)}
            placeholder="http://localhost:8181 or https://catalog.example.com"
            disabled={isLoggedIn}
          />
        </Field>

        <Field label="Catalog Type" required>
          <Dropdown
            placeholder="Select catalog type"
            value={catalogType}
            onOptionSelect={(e, data) => setCatalogType(data.optionValue as any)}
            disabled={isLoggedIn}
          >
            <Option value="REST">REST</Option>
            <Option value="HIVE">Hive Metastore</Option>
            <Option value="HADOOP">Hadoop</Option>
            <Option value="GLUE">AWS Glue</Option>
          </Dropdown>
        </Field>

        {/* Authentication fields based on catalog type */}
        {catalogType === 'REST' && (
          <Field label="Authentication Token">
            <Input
              type="password"
              value={authToken}
              onChange={(e, data) => setAuthToken(data.value)}
              placeholder="Bearer token for REST API authentication"
              disabled={isLoggedIn}
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
                disabled={isLoggedIn}
              />
            </Field>
            <Field label="AWS Secret Access Key" required>
              <Input
                type="password"
                value={secretAccessKey}
                onChange={(e, data) => setSecretAccessKey(data.value)}
                placeholder="AWS Secret Access Key"
                disabled={isLoggedIn}
              />
            </Field>
          </>
        )}

        {/* Login Button */}
        {!isLoggedIn && (
          <>
            <Stack.Item style={{ marginTop: '8px' }}>
              <Button 
                appearance="secondary" 
                onClick={handleLogin}
                disabled={!canLogin || isLoggingIn}
              >
                {isLoggingIn ? (
                  <Stack horizontal tokens={{ childrenGap: 8 }}>
                    <Spinner size="tiny" />
                    <Text>Connecting...</Text>
                  </Stack>
                ) : (
                  "Connect to Iceberg Catalog"
                )}
              </Button>
            </Stack.Item>
            {loginError && (
              <Stack.Item>
                <Text style={{ color: 'red', fontSize: '12px' }}>
                  {loginError}
                </Text>
              </Stack.Item>
            )}
          </>
        )}

        {/* Step 2: Namespace Selection */}
        {isLoggedIn && (
          <>
            <Field label="Namespace" required>
              <Dropdown
                placeholder={isLoadingNamespaces ? "Loading namespaces..." : availableNamespaces.length > 0 ? "Select a namespace" : "No namespaces available"}
                value={selectedNamespace}
                onOptionSelect={(e, data) => handleNamespaceSelection(data.optionValue as string)}
                disabled={isLoadingNamespaces || availableNamespaces.length === 0}
              >
                {availableNamespaces.map((namespaceName) => (
                  <Option key={namespaceName} value={namespaceName}>
                    {namespaceName}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            {/* Step 3: Table Selection */}
            {selectedNamespace && (
              <Field label="Tables" required>
                <Stack style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #ccc', padding: '8px', borderRadius: '4px' }}>
                  {isLoadingTables ? (
                    <Stack horizontal tokens={{ childrenGap: 8 }}>
                      <Spinner size="tiny" />
                      <Text style={{ fontSize: '12px' }}>Loading tables...</Text>
                    </Stack>
                  ) : availableTables.length > 0 ? (
                    availableTables.map(tableName => (
                      <Checkbox
                        key={tableName}
                        label={tableName}
                        checked={selectedTables.includes(tableName)}
                        onChange={(e, data) => handleTableToggle(tableName, data.checked === true)}
                      />
                    ))
                  ) : (
                    <Text style={{ fontSize: '12px', color: '#666' }}>No tables found in this namespace</Text>
                  )}
                </Stack>
              </Field>
            )}

            {/* Step 4: Connection Selection */}
            {selectedNamespace && selectedTables.length > 0 && (
              <Field label="Fabric Connection" required>
                <Stack>
                  <Dropdown
                    placeholder={availableConnections.length > 0 ? "Select a connection" : "No connections available"}
                    value={connectionId}
                    onOptionSelect={(e, data) => setConnectionId(data.optionValue as string)}
                    disabled={isLoadingConnections || availableConnections.length === 0}
                    style={{ maxHeight: '240px' }}
                    listbox={{ style: { maxHeight: '240px', overflowY: 'auto' } }}
                  >
                    {availableConnections.map(connection => (
                      <Option key={connection.id} value={connection.id} text={`${connection.displayName} (${connection.connectionDetails.type})`}>
                        {connection.displayName} ({connection.connectionDetails.type})
                      </Option>
                    ))}
                  </Dropdown>
                  
                  <Stack horizontal tokens={{ childrenGap: 8 }} style={{ marginTop: '8px' }}>
                    <Button 
                      size="small" 
                      appearance="subtle" 
                      onClick={loadConnections}
                      disabled={isLoadingConnections}
                    >
                      {isLoadingConnections ? (
                        <>
                          <Spinner size="tiny" />
                          <Text style={{ marginLeft: '4px', fontSize: '12px' }}>Loading...</Text>
                        </>
                      ) : (
                        availableConnections.length > 0 ? "Refresh Connections" : "Load Connections"
                      )}
                    </Button>
                  </Stack>
                  
                  {!isLoadingConnections && availableConnections.length === 0 && (
                    <Text style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                      No connections available. Please create a connection in Fabric first, then click "Load Connections".
                    </Text>
                  )}
                </Stack>
              </Field>
            )}
          </>
        )}
      </Stack>
      
      {/* Configure Button */}
      {canConfigure && (
        <Stack.Item style={{ marginTop: '24px' }}>
          <Button 
            appearance="primary" 
            onClick={saveItem}
          >
            Configure Iceberg Catalog
          </Button>
        </Stack.Item>
      )}
    </Stack>
  );
};
