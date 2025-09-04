import React, { useState } from "react";
import { Stack } from "@fluentui/react";
import { Text, Button, Input, Field, Textarea, Checkbox } from "@fluentui/react-components";
import "../../styles.scss";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ExternalDataShareItemDefinition, ExternalDataShareConfiguration, DEFAULT_SHARE_PREFIX } from "./ExternalDataShareItemModel";

interface ExternalDataShareItemEmptyStateProps {
  workloadClient: WorkloadClientAPI;
  onFinishEmpty: (config: ExternalDataShareItemDefinition) => void;
}

export const ExternalDataShareItemEmpty: React.FC<ExternalDataShareItemEmptyStateProps> = ({
  workloadClient,
  onFinishEmpty
}) => {
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [allowExternalSharing, setAllowExternalSharing] = useState<boolean>(true);
  const [autoAcceptShares, setAutoAcceptShares] = useState<boolean>(false);
  const [defaultShareExpiration, setDefaultShareExpiration] = useState<number>(30);
  const [allowedDomains, setAllowedDomains] = useState<string>("");
  const [sharePrefixNaming, setSharePrefixNaming] = useState<string>(DEFAULT_SHARE_PREFIX);

  const canConfigure = title.trim().length > 0;

  const saveItem = () => {
    const configuration: ExternalDataShareConfiguration = {
      allowExternalSharing,
      autoAcceptShares,
      defaultShareExpiration,
      allowedDomains: allowedDomains.split(',').map(d => d.trim()).filter(d => d.length > 0),
      sharePrefixNaming
    };
    
    const definition: ExternalDataShareItemDefinition = {
      title: title.trim(),
      description: description.trim(),
      createdShares: [],
      receivedShares: [],
      configuration,
      lastSyncDate: undefined
    };
    
    onFinishEmpty(definition);
  };

  return (
    <Stack className="empty-item-container" style={{ minHeight: 1200, height: '100%', maxHeight: '100%' }} horizontalAlign="start" tokens={{ childrenGap: 16 }}>
      <Stack.Item>
        <img
          src="/assets/items/ExternalDataShareItem/EditorEmpty.png"
          alt="Empty Data Sharing item illustration"
          className="empty-item-image"
        />
      </Stack.Item>
      <Stack.Item>
        <Text as="h2" size={800} weight="semibold">
          Configure Data Sharing
        </Text>
      </Stack.Item>
      <Stack.Item style={{ marginTop: '16px', marginBottom: '24px' }}>
        <Text>
          Set up data sharing to create external data shares and accept shared data from other organizations.
        </Text>
      </Stack.Item>
      
      <Stack style={{ width: '600px', gap: '16px' }}>
        {/* Basic Configuration */}
        <Field label="Title" required>
          <Input
            value={title}
            onChange={(e, data) => setTitle(data.value)}
            placeholder="Enter a title for this data sharing item"
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e, data) => setDescription(data.value)}
            placeholder="Describe the purpose of this data sharing configuration"
            rows={3}
          />
        </Field>

        {/* Sharing Configuration */}
        <Text size={500} weight="semibold" style={{ marginTop: '16px' }}>
          Sharing Settings
        </Text>

        <Field>
          <Checkbox
            label="Allow External Sharing"
            checked={allowExternalSharing}
            onChange={(e, data) => setAllowExternalSharing(data.checked === true)}
          />
          <Text size={200} style={{ marginTop: '4px', color: '#666' }}>
            Enable creation of external data shares to organizations outside your tenant
          </Text>
        </Field>

        <Field>
          <Checkbox
            label="Auto-Accept Shares"
            checked={autoAcceptShares}
            onChange={(e, data) => setAutoAcceptShares(data.checked === true)}
          />
          <Text size={200} style={{ marginTop: '4px', color: '#666' }}>
            Automatically accept data shares from trusted domains
          </Text>
        </Field>

        <Field label="Default Share Expiration (Days)">
          <Input
            type="number"
            value={defaultShareExpiration.toString()}
            onChange={(e, data) => setDefaultShareExpiration(parseInt(data.value) || 30)}
            placeholder="30"
            min={1}
            max={365}
          />
          <Text size={200} style={{ marginTop: '4px', color: '#666' }}>
            Default expiration period for new shares (1-365 days)
          </Text>
        </Field>

        <Field label="Share Prefix">
          <Input
            value={sharePrefixNaming}
            onChange={(e, data) => setSharePrefixNaming(data.value)}
            placeholder="DataShare_"
          />
          <Text size={200} style={{ marginTop: '4px', color: '#666' }}>
            Prefix used for naming new data shares
          </Text>
        </Field>

        <Field label="Allowed Domains (Optional)">
          <Input
            value={allowedDomains}
            onChange={(e, data) => setAllowedDomains(data.value)}
            placeholder="example.com, partner.org, trusted-domain.net"
          />
          <Text size={200} style={{ marginTop: '4px', color: '#666' }}>
            Comma-separated list of trusted domains for auto-accepting shares
          </Text>
        </Field>
      </Stack>
      
      {/* Configure Button */}
      <Stack.Item style={{ marginTop: '24px' }}>
        <Button 
          appearance="primary" 
          onClick={saveItem}
          disabled={!canConfigure}
        >
          Configure Data Sharing
        </Button>
      </Stack.Item>
    </Stack>
  );
};
