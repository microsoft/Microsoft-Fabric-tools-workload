import React from "react";
import { Stack, Text } from "@fluentui/react";
import { Button, Dropdown, Option, DropdownProps } from "@fluentui/react-components";
import { 
  DocumentAdd24Regular, 
  FolderOpen24Regular, 
  Save24Regular,
  ColorBackground24Regular,
  Search24Regular,
  Play24Regular
} from "@fluentui/react-icons";

interface VSCodeEditorItemRibbonProps {
  onNewFile: () => void;
  onOpenFile: () => void;
  onSave: () => void;
  onThemeChange: (theme: string) => void;
  onSearch: () => void;
  onRun: () => void;
  currentTheme: string;
  fileName?: string;
  isDirty: boolean;
  language?: string;
}

export function VSCodeEditorItemRibbon({ 
  onNewFile, 
  onOpenFile, 
  onSave, 
  onThemeChange,
  onSearch,
  onRun,
  currentTheme,
  fileName,
  isDirty,
  language
}: VSCodeEditorItemRibbonProps) {
  const themeOptions = [
    { key: "vs-dark", text: "Dark" },
    { key: "vs", text: "Light" },
    { key: "hc-black", text: "High Contrast" }
  ];

  const handleThemeChange: DropdownProps["onOptionSelect"] = (_, data) => {
    if (data.optionValue) {
      onThemeChange(data.optionValue);
    }
  };

  return (
    <div style={{ 
      borderBottom: "1px solid #e1dfdd", 
      padding: "8px 16px",
      backgroundColor: "#faf9f8"
    }}>
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 16 }}>
        {/* File Operations */}
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <Button
            appearance="subtle"
            size="small"
            icon={<DocumentAdd24Regular />}
            onClick={onNewFile}
          >
            New File
          </Button>
          
          <Button
            appearance="subtle"
            size="small"
            icon={<FolderOpen24Regular />}
            onClick={onOpenFile}
          >
            Open
          </Button>
          
          <Button
            appearance="subtle"
            size="small"
            icon={<Save24Regular />}
            onClick={onSave}
            disabled={!isDirty}
          >
            Save
          </Button>
        </Stack>

        {/* Separator */}
        <div style={{ 
          width: "1px", 
          height: "24px", 
          backgroundColor: "#e1dfdd" 
        }} />

        {/* Tools */}
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <Button
            appearance="subtle"
            size="small"
            icon={<Search24Regular />}
            onClick={onSearch}
          >
            Search
          </Button>
          
          {language && (language === "javascript" || language === "typescript" || language === "python") && (
            <Button
              appearance="subtle"
              size="small"
              icon={<Play24Regular />}
              onClick={onRun}
            >
              Run
            </Button>
          )}
        </Stack>

        {/* Separator */}
        <div style={{ 
          width: "1px", 
          height: "24px", 
          backgroundColor: "#e1dfdd" 
        }} />

        {/* Theme Selection */}
        <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
          <ColorBackground24Regular style={{ fontSize: "16px" }} />
          <Dropdown
            appearance="outline"
            size="small"
            value={themeOptions.find(t => t.key === currentTheme)?.text || "Dark"}
            onOptionSelect={handleThemeChange}
            style={{ minWidth: "100px" }}
          >
            {themeOptions.map((option) => (
              <Option key={option.key} value={option.key}>
                {option.text}
              </Option>
            ))}
          </Dropdown>
        </Stack>

        {/* File Info */}
        <Stack grow horizontalAlign="end">
          <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
            {fileName && (
              <Text variant="small" styles={{ root: { color: "#605e5c" } }}>
                {fileName}{isDirty ? " •" : ""}
              </Text>
            )}
            {language && (
              <Text variant="small" styles={{ root: { color: "#0078d4", fontWeight: "600" } }}>
                {language.toUpperCase()}
              </Text>
            )}
          </Stack>
        </Stack>
      </Stack>
    </div>
  );
}
