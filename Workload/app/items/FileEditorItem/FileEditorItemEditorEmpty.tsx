import React from "react";
import { Stack, Text } from "@fluentui/react";
import { Button } from "@fluentui/react-components";
import { DocumentAdd24Regular, Code24Regular, FolderOpen24Regular } from "@fluentui/react-icons";
import "../../styles.scss";

interface FileEditorItemEmptyProps {
  onCreateNewFile: () => Promise<void>;
  onUploadFile: () => Promise<void>;
  onOpenFile: () => Promise<void>;
}

export function FileEditorItemEditorEmpty({ onCreateNewFile, onUploadFile, onOpenFile }: FileEditorItemEmptyProps) {
  return (
    <div className="itemEditorEmpty">
      <Stack 
        horizontalAlign="center" 
        verticalAlign="center" 
        styles={{ root: { height: "100%", padding: "40px" } }}
        tokens={{ childrenGap: 20 }}
      >
        <Code24Regular style={{ fontSize: "48px", color: "#0078d4" }} />
        
        <Text 
          variant="xxLarge" 
          styles={{ root: { fontWeight: "600", marginBottom: "8px" } }}
        >
          Welcome to File Editor
        </Text>
        
        <Text 
          variant="large" 
          styles={{ root: { color: "#605e5c", textAlign: "center", maxWidth: "400px" } }}
        >
          Start coding by creating a new file, opening from OneLake, or uploading an existing one. 
          Experience code editing with syntax highlighting, IntelliSense, and more.
        </Text>

        <Stack horizontal tokens={{ childrenGap: 16 }} styles={{ root: { marginTop: "20px" } }}>
          <Button
            appearance="primary"
            size="large"
            icon={<DocumentAdd24Regular />}
            onClick={onCreateNewFile}
          >
            Create New File
          </Button>
          
          <Button
            appearance="secondary"
            size="large"
            icon={<FolderOpen24Regular />}
            onClick={onOpenFile}
          >
            Open from OneLake
          </Button>
          
          <Button
            appearance="secondary"
            size="large"
            onClick={onUploadFile}
          >
            Upload File
          </Button>
        </Stack>

        <Stack tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: "30px" } }}>
          <Text variant="medium" styles={{ root: { fontWeight: "600" } }}>
            Features:
          </Text>
          <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
            • Direct integration with OneLake storage
          </Text>
          <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
            • Syntax highlighting for 100+ languages
          </Text>
          <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
            • IntelliSense and auto-completion
          </Text>
          <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
            • Multiple file tabs
          </Text>
          <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
            • Customizable themes and settings
          </Text>
        </Stack>
      </Stack>
    </div>
  );
}
