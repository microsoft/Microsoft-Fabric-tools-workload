import React from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Text,
  Spinner,
} from "@fluentui/react-components";
import { Warning20Regular, Database20Regular } from "@fluentui/react-icons";

interface SaveToLakehouseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  tableName: string;
  lakehouseName: string;
  rowCount: number;
  columnCount: number;
  isLoading?: boolean;
  error?: string | null;
}

export const SaveToLakehouseDialog: React.FC<SaveToLakehouseDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tableName,
  lakehouseName,
  rowCount,
  columnCount,
  isLoading = false,
  error = null
}) => {
  const [isSaving, setIsSaving] = React.useState(false);

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onConfirm();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !isSaving && !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Warning20Regular style={{ color: '#D83B01' }} />
              Save Changes to Lakehouse
            </div>
          </DialogTitle>
          <DialogContent>
            {error ? (
              <div style={{ 
                padding: '12px', 
                background: '#FDE7E9', 
                borderRadius: '4px',
                marginBottom: '16px'
              }}>
                <Text style={{ color: '#A80000' }}>
                  <strong>Error:</strong> {error}
                </Text>
              </div>
            ) : null}

            <div style={{ marginBottom: '16px' }}>
              <Text>
                This will <strong>overwrite</strong> the existing table in your lakehouse with the current Excel data.
              </Text>
            </div>

            <div style={{ 
              background: '#F3F2F1', 
              padding: '16px', 
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Database20Regular />
                <Text weight="semibold">Target Details</Text>
              </div>
              
              <div style={{ paddingLeft: '28px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <Text size={200} style={{ color: '#605E5C' }}>Lakehouse:</Text>
                  <Text style={{ marginLeft: '8px' }}>{lakehouseName}</Text>
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <Text size={200} style={{ color: '#605E5C' }}>Table:</Text>
                  <Text style={{ marginLeft: '8px' }}>{tableName}</Text>
                </div>
                
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div>
                    <Text size={200} style={{ color: '#605E5C' }}>Rows:</Text>
                    <Text style={{ marginLeft: '8px' }}>{rowCount.toLocaleString()}</Text>
                  </div>
                  <div>
                    <Text size={200} style={{ color: '#605E5C' }}>Columns:</Text>
                    <Text style={{ marginLeft: '8px' }}>{columnCount}</Text>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ 
              padding: '12px', 
              background: '#FFF4CE', 
              borderRadius: '4px',
              borderLeft: '3px solid #FFB900'
            }}>
              <Text size={200}>
                ⚠️ <strong>Warning:</strong> This action cannot be undone. The original table data will be replaced.
                Delta Lake history will be preserved for rollback if needed.
              </Text>
            </div>
          </DialogContent>
          <DialogActions>
            <Button 
              appearance="secondary" 
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              appearance="primary" 
              onClick={handleConfirm}
              disabled={isSaving}
              icon={isSaving ? <Spinner size="tiny" /> : undefined}
            >
              {isSaving ? 'Saving...' : 'Overwrite Table'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
