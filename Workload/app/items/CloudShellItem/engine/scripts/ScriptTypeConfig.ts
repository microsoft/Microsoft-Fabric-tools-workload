import { ScriptType } from "../../CloudShellItemModel";

/**
 * Configuration for a script type
 */
export interface ScriptTypeConfig {
  /** The script type identifier */
  type: ScriptType;
  /** File extension including the dot (e.g., '.py') */
  extension: string;
  /** Path to the default template file */
  defaultTemplatePath: string;
  /** Fallback content if template cannot be loaded */
  fallbackContent: string;
  /** Display label key for translations */
  labelKey: string;
  /** Default display label (English) */
  defaultLabel: string;
  /** Default script name (without extension) */
  defaultScriptName: string;
  /** Monaco editor language identifier for syntax highlighting */
  editorLanguage: string;
}

/**
 * Centralized configuration for all supported script types
 */
export const SCRIPT_TYPE_CONFIGS: Record<ScriptType, ScriptTypeConfig> = {
  fabcli: {
    type: ScriptType.FABCLI,
    extension: '.fab',
    defaultTemplatePath: '/assets/items/CloudShellItem/DefaultScript.fab',
    fallbackContent: '# Fabric CLI script\nfab workspace list\n',
    labelKey: 'CloudShellItem_Scripts_Type_FabCLI',
    defaultLabel: 'Fabric CLI (.fab)',
    defaultScriptName: 'my_script',
    editorLanguage: 'fabriccli'
  },
  python: {
    type: ScriptType.PYTHON,
    extension: '.py',
    defaultTemplatePath: '/assets/items/CloudShellItem/DefaultScript.py',
    fallbackContent: '# New Python script\n',
    labelKey: 'CloudShellItem_Scripts_Type_Python',
    defaultLabel: 'Python (.py)',
    defaultScriptName: 'my_script',
    editorLanguage: 'python'
  }
  /*shell: {
    type: ScriptType.SHELL,
    extension: '.sh',
    defaultTemplatePath: '/assets/items/CloudShellItem/DefaultScript.sh',
    fallbackContent: '#!/bin/bash\necho "Hello from shell script!"\n',
    labelKey: 'CloudShellItem_Scripts_Type_Shell',
    defaultLabel: 'Shell (.sh)',
    defaultScriptName: 'my_script',
    editorLanguage: 'shell'
  },*/
};

/**
 * Get script type configuration by type
 */
export function getScriptTypeConfig(type: ScriptType): ScriptTypeConfig {
  return SCRIPT_TYPE_CONFIGS[type];
}

/**
 * Get all supported script type values
 */
export function getAllScriptTypes(): ScriptType[] {
  return Object.keys(SCRIPT_TYPE_CONFIGS) as ScriptType[];
}

/**
 * Load default template content for a script type
 */
export async function loadDefaultTemplate(type: ScriptType): Promise<string> {
  const config = getScriptTypeConfig(type);
  try {
    const response = await fetch(config.defaultTemplatePath);
    if (response.ok) {
      return await response.text();
    }
  } catch (error) {
    console.warn(`Failed to load template for ${type}, using fallback`, error);
  }
  return config.fallbackContent;
}

/**
 * Ensure script name has the correct extension for its type
 */
export function ensureCorrectExtension(name: string, type: ScriptType): string {
  const config = getScriptTypeConfig(type);
  const allExtensions = getAllScriptTypes().map(t => getScriptTypeConfig(t).extension);
  
  // Remove any existing script extension
  let baseName = name.trim();
  for (const ext of allExtensions) {
    if (baseName.toLowerCase().endsWith(ext.toLowerCase())) {
      baseName = baseName.slice(0, -ext.length);
      break;
    }
  }
  
  // Add the correct extension if not already present
  if (!baseName.toLowerCase().endsWith(config.extension.toLowerCase())) {
    return baseName + config.extension;
  }
  
  return baseName;
}
