import { IConsoleCommand, ConsoleCommandContext } from "./IConsoleCommand";
import { Command } from "../../CloudShellItemModel";

/**
 * Clear command - clears the terminal output
 */
export class ClearCommand implements IConsoleCommand {
    async execute(command: Command, context: ConsoleCommandContext): Promise<string | null> {
        if (context.onClearTerminal) {
            context.onClearTerminal();
        }
        return null; // No message needed as terminal was cleared
    }
}
