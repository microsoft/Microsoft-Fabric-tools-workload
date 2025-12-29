import { IConsoleCommand, ConsoleCommandContext } from "./IConsoleCommand";
import { Command } from "../../CloudShellItemModel";
import { ScriptCommandContext } from '../scripts/IScriptCommand';

/**
 * Run command - executes a saved script by name with optional parameters
 * Usage: run {scriptName} [-paramName1 value1 -paramName2 value2 ...]
 * 
 * Parameters are specified using -paramName followed by the value.
 * Values with spaces should be quoted.
 */
export class RunScriptCommand implements IConsoleCommand {

    /**
     * Parse command arguments to extract script name and parameters
     * @param commandText The command text after "run"
     * @returns Object with scriptName and parameters
     */
    private parseArguments(commandText: string): { scriptName: string; parameters: Record<string, string> } {
        const tokens = this.tokenize(commandText);
        
        if (tokens.length === 0) {
            return { scriptName: '', parameters: {} };
        }

        const scriptName = tokens[0];
        const parameters: Record<string, string> = {};

        // Parse parameters starting from index 1
        for (let i = 1; i < tokens.length; i++) {
            const token = tokens[i];
            
            // Check if it's a parameter flag (starts with -)
            if (token.startsWith('-')) {
                const paramName = token.substring(1);
                
                // Get the next token as the value
                if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
                    parameters[paramName] = tokens[i + 1];
                    i++; // Skip the value token
                } else {
                    // No value provided, treat as empty string
                    parameters[paramName] = '';
                }
            }
        }

        return { scriptName, parameters };
    }

    /**
     * Tokenize command text, respecting quoted strings
     * @param text Command text to tokenize
     * @returns Array of tokens
     */
    private tokenize(text: string): string[] {
        const tokens: string[] = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = '';
            } else if (char === ' ' && !inQuotes) {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }

        if (current) {
            tokens.push(current);
        }

        return tokens;
    }

    async execute(command: Command, context: ConsoleCommandContext): Promise<string | null> {
        const { scriptName, parameters } = this.parseArguments(command.text.trim());

        if (!scriptName) {
            return 'Usage: run {scriptName} [-myParameter1 value1 -myParameter2 value2 ...]';
        }

        //missing the scritp content here - need to find the script by name
        const script = await context.getScriptByName(scriptName);
        
        if (!script) {
            return `Script "${scriptName}" not found.`;
        }
        
        if (!context.item.definition.selectedLakehouse.workspaceId || 
            !context.item.definition.selectedLakehouse.id || 
            !context.item.definition.selectedSparkEnvironment.id) {
            return 'CloudShell configuration is incomplete. Please configure workspace, lakehouse, and environment.';
        }

        try {
            // Execute script using the engine
            const scriptContext: ScriptCommandContext = {
                item: context.item,
                engine: context.engine,
                workloadClient: context.engine.getWorkloadClient(),
                cloudShellClient: context.engine.getCloudShellClient(),
            };
            
            // Pass parameters to executeScript if any were provided
            const batchResponse = await context.engine.executeScript(
                script, 
                scriptContext, 
                Object.keys(parameters).length > 0 ? parameters : undefined
            );
            
            return `Script "${scriptName}" has been submitted with job id ${batchResponse.id}`;
        } catch (error: any) {
            throw new Error(`Failed to execute script: ${error.message}`);
        }
    }
}
