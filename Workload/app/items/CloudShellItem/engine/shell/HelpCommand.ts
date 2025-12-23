import { IConsoleCommand, ConsoleCommandContext } from "./IConsoleCommand";
import { Command, CommandType } from "../../CloudShellItemModel";

/**
 * Help command - displays available commands and usage information
 */
export class HelpCommand implements IConsoleCommand {
    async execute(command: Command, context: ConsoleCommandContext): Promise<string | null> {
        const sections = [
            'Available commands:',
            '  help              - Display this help message',
            '  clear             - Clear the terminal',
            '  run {scriptName}  - Execute a saved script',
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
                '  fab ls -l MyWorkspace.Workspace  - Use Fabric CLI to list all items in a workspace',
                '  echo "Hello World!"              - Display a message',
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
        sections.push(
            'Available scripts:',
            context.item.definition.scripts.length > 0 
                ? context.item.definition.scripts.map(s => `  - ${s.name} (${s.type})`).join('\n')
                : '  (No scripts available)',
        );

        return sections.join('\n');
    }
}
