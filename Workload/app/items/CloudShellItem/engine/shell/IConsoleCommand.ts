import { Command, CommandType, Script } from "../../CloudShellItemModel";
import { CommandContext } from "../scripts/IScriptCommand";

/**
 * Session information for Spark Livy sessions.
 * 
 * Tracks session state for console command execution.
 * Used by console commands to determine session availability.
 */
export interface SessionInfo {
    /** Session ID (null if no session active) */
    id: string | null;
    
    /** Session scheduler state (e.g., 'Scheduled', 'Starting', 'Ending') */
    state: string | null;
}

/**
 * Interface for console command execution.
 * 
 * Console commands are special built-in commands processed locally:
 * - help: Display available commands and examples
 * - clear: Clear terminal entries
 * - run {scriptName}: Execute a saved script as batch job
 * 
 * These commands do not execute in Spark sessions and return synchronously.
 */
export interface IConsoleCommand {
    /**
     * Execute the console command locally.
     * 
     * Console commands are processed without Spark execution:
     * - No session required
     * - Immediate execution
     * - Return message displayed in terminal
     * 
     * @param command Command object with text, timestamp, and type
     * @param context Execution context with session info and callbacks
     * @returns Promise resolving to message for terminal display (null for no output)
     */
    execute(command: Command, context: ConsoleCommandContext): Promise<string | null>;
}

/**
 * Context provided to console commands during execution.
 * 
 * Extends CommandContext with console-specific dependencies:
 * - Session information for status checking
 * - CommandType for mode-specific help text
 * - Terminal callbacks for clear operation
 * - Script lookup for run command
 */
export interface ConsoleCommandContext extends CommandContext {
    
    /** Current session information (ID and state) */
    sessionInfo: SessionInfo;

    /** Current execution mode for mode-specific help */
    commandType: CommandType;
    
    /** Callback to clear all terminal entries */
    onClearTerminal?: () => void;

    /**
     * Look up a script by name for execution.
     * 
     * Returns full Script object with content loaded from scriptsMap.
     * 
     * @param scriptName Script name to look up
     * @returns Promise resolving to Script with content, or null if not found
     */
    getScriptByName(scriptName: string): Promise<Script | null>;
    
}

