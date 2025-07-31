import React from "react";
import { Stack, Text } from "@fluentui/react";
import { Button } from "@fluentui/react-components";
import { DocumentAdd24Regular, Code24Regular, FolderOpen24Regular } from "@fluentui/react-icons";
import "../../styles.scss";

interface FileEditorItemEmptyProps {
  onCreateNewFile: () => Promise<void>;
  onUploadFile: () => Promise<void>;
  onOpenItem: () => Promise<void>;
}

export function FileEditorItemEditorEmpty({ onCreateNewFile, onUploadFile, onOpenItem }: FileEditorItemEmptyProps) {
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
          Start editing files in OneLake by selecting an Data Item with files, creating a new file, or uploading an existing one to the current item. 
          Experience editing with syntax highlighting, IntelliSense, and more.
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
            onClick={onOpenItem}
          >
            Open another OneLake item
          </Button>
          
          <Button
            appearance="secondary"
            size="large"
            onClick={onUploadFile}
          >
            Upload File
          </Button>
        </Stack>
       
      </Stack>
    </div>
  );
}
