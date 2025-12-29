import { IConsoleCommand, ConsoleCommandContext } from "./IConsoleCommand";
import { Command, CommandType, ScriptType } from "../../CloudShellItemModel";

/**
 * Help command - displays available commands and usage information
 */
export class HelpCommand implements IConsoleCommand {
    async execute(command: Command, context: ConsoleCommandContext): Promise<string | null> {
        const sections = [
            'Available commands:',
            '  help              - Display this help message',
            '  clear             - Clear the terminal',
            '  run {scriptName}  - Execute a saved script with optional parameters',
            '',
        ];

        // Add mode-specific examples
        if (context.commandType === CommandType.FAB_CLI) {
            sections.push(
                'Fabric CLI Examples:',
                '  ls -l                        - List all workspaces',
                '  ls -l MyWorkspace.Workspace  - List all items in a workspace',
                '',
                'Fabric CLI documentation:',
                '  https://microsoft.github.io/fabric-cli/commands/',
                '',
            );
        } else if (context.commandType === CommandType.SHELL) {
            sections.push(
                'Shell Examples:',
                '  echo "Hello World!"    - Display a message',
                '',
            );
        } else if (context.commandType === CommandType.PYTHON) {
            sections.push(
                'Python Examples:',
                '  print("Hello World!")  - Display a message',
                '',
            );
        }

        // Add available scripts
        const availableScripts  = context.item.definition.scripts
                    ?.filter(s => (context.commandType === CommandType.FAB_CLI && s.type === ScriptType.FAB_CLI) ||
                                 (context.commandType === CommandType.PYTHON && s.type === ScriptType.PYTHON)) || [];
        sections.push(
            'Available scripts:',
            availableScripts?.length > 0 
                ? availableScripts.map(s => {
                        const params = s.parameters && s.parameters.length > 0
                            ? ' ' + s.parameters
                                .filter(p => !p.isSystemParameter)
                                .map(p => `-${p.name} <${p.type}>`)
                                .join(' ')
                            : '';
                    return `  - run ${s.name}${params}`;
                }).join('\n')
                : '  (No scripts available)',
        );

        return sections.join('\n');
    }
}
