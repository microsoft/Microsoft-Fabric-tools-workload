import { IConsoleCommand, ConsoleCommandContext } from "./IConsoleCommand";
import { Command } from "../../CloudShellItemModel";
import { ScriptCommandContext } from '../scripts/IScriptCommand';

/**
 * Run command - executes a saved script by name
 * Usage: run {scriptName}
 */
export class RunScriptCommand implements IConsoleCommand {


    async execute(command: Command, context: ConsoleCommandContext): Promise<string | null> {
        const scriptName = command.text.trim();

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
            const batchResponse = await context.engine.executeScript(script, scriptContext);
            
            return `Script "${scriptName}" has been submitted with job id ${batchResponse.id}`;
        } catch (error: any) {
            throw new Error(`Failed to execute script: ${error.message}`);
        }
    }
}
