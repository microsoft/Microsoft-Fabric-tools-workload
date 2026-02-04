import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { CopilotModelId, WorkspaceContext } from "../GithubCopilotCLIItemModel";

/**
 * Execution context for running commands
 */
export interface ExecutionContext {
    sessionId?: string | null;
    lakehouseId?: string;
    environmentId?: string;
}

/**
 * Command types supported by GitHub Copilot CLI
 */
export type CopilotCLICommandType = 'suggest' | 'explain' | 'help' | 'clear' | 'context' | 'run' | 'unknown';

/**
 * Parsed CLI command
 */
export interface ParsedCommand {
    type: CopilotCLICommandType;
    query: string;
    shellType?: 'bash' | 'powershell' | 'zsh';
}

/**
 * Result from executing a Copilot CLI command
 */
export interface CLIResult {
    output: string;
    isError: boolean;
    suggestions?: string[];
    /** Indicates command needs execution via Spark session */
    requiresExecution?: boolean;
    /** The command to execute */
    commandToExecute?: string;
}

/**
 * GitHub Copilot CLI - Simulates the `gh copilot` CLI experience
 * 
 * Supported commands:
 * - suggest "what you want to do" - Get shell command suggestions
 * - explain "command" - Explain what a command does
 * - run "command" - Execute a command (requires active session)
 * - help - Show available commands
 * - context - Show current workspace context
 * - clear - Clear the terminal
 */
export class GithubCopilotCLI {
    private currentModel: CopilotModelId;
    private workspaceContext: WorkspaceContext;
    private executionContext: ExecutionContext;

    constructor(_workloadClient: WorkloadClientAPI, model: CopilotModelId, context?: WorkspaceContext, execContext?: ExecutionContext) {
        this.currentModel = model;
        this.workspaceContext = context || {};
        this.executionContext = execContext || {};
    }

    /**
     * Update the workspace context
     */
    setContext(context: WorkspaceContext): void {
        this.workspaceContext = context;
    }

    /**
     * Get the current workspace context
     */
    getContext(): WorkspaceContext {
        return this.workspaceContext;
    }

    /**
     * Update the execution context
     */
    setExecutionContext(context: ExecutionContext): void {
        this.executionContext = context;
    }

    /**
     * Get the execution context
     */
    getExecutionContext(): ExecutionContext {
        return this.executionContext;
    }

    /**
     * Check if we have an active session for command execution
     */
    hasActiveSession(): boolean {
        return !!this.executionContext.sessionId;
    }

    /**
     * Get the current model
     */
    getModel(): CopilotModelId {
        return this.currentModel;
    }

    /**
     * Parse a command string into structured format
     */
    parseCommand(input: string): ParsedCommand {
        const trimmed = input.trim();
        
        // Check for help command
        if (trimmed === 'help' || trimmed === '?') {
            return { type: 'help', query: '' };
        }
        
        // Check for clear command
        if (trimmed === 'clear' || trimmed === 'cls') {
            return { type: 'clear', query: '' };
        }

        // Check for context command
        if (trimmed === 'context' || trimmed === 'ctx' || trimmed === 'workspace') {
            return { type: 'context', query: '' };
        }

        // Parse run command: run "command" or run command
        const runMatch = trimmed.match(/^run\s+["']?(.+?)["']?$/i);
        if (runMatch) {
            return { type: 'run', query: runMatch[1] };
        }

        // Direct shell/fab commands (run them directly)
        if (trimmed.startsWith('fab ') || 
            trimmed.startsWith('ls ') || trimmed === 'ls' ||
            trimmed.startsWith('pwd') ||
            trimmed.startsWith('cat ') ||
            trimmed.startsWith('echo ') ||
            trimmed.startsWith('python ') ||
            trimmed.startsWith('pip ')) {
            return { type: 'run', query: trimmed };
        }

        // Parse suggest command: suggest "query" or suggest query
        const suggestMatch = trimmed.match(/^suggest\s+["']?(.+?)["']?$/i);
        if (suggestMatch) {
            return { type: 'suggest', query: suggestMatch[1] };
        }

        // Parse explain command: explain "command" or explain command
        const explainMatch = trimmed.match(/^explain\s+["']?(.+?)["']?$/i);
        if (explainMatch) {
            return { type: 'explain', query: explainMatch[1] };
        }

        // If it starts with a natural language query, treat as suggest
        if (trimmed.toLowerCase().startsWith('how do i') || 
            trimmed.toLowerCase().startsWith('how to') ||
            trimmed.toLowerCase().startsWith('what is the command') ||
            trimmed.toLowerCase().startsWith('i want to') ||
            trimmed.toLowerCase().startsWith('show me')) {
            return { type: 'suggest', query: trimmed };
        }

        // Unknown command - provide helpful message
        return { type: 'unknown', query: trimmed };
    }

    /**
     * Execute a parsed command
     */
    async execute(command: ParsedCommand): Promise<CLIResult> {
        switch (command.type) {
            case 'help':
                return this.showHelp();
            case 'clear':
                return { output: '__CLEAR__', isError: false };
            case 'context':
                return this.showContext();
            case 'run':
                return this.handleRunCommand(command.query);
            case 'suggest':
                return this.suggest(command.query);
            case 'explain':
                return this.explain(command.query);
            case 'unknown':
                return {
                    output: `Unknown command. Type 'help' for available commands.\n\nTip: Try 'suggest "${command.query}"' or 'explain "${command.query}"'`,
                    isError: true
                };
        }
    }

    /**
     * Handle the run command - checks if session is available
     */
    private handleRunCommand(command: string): CLIResult {
        // Check if we have a session
        if (!this.hasActiveSession()) {
            return {
                output: `⚠️  No active session for command execution

To run commands like \`${command}\`, you need:

1. Select a Lakehouse (click the Lakehouse button in the ribbon)
2. Select a Spark Environment from the dropdown
3. Start a session (click ▶️ Start Session)

NOTE: For 'fab' CLI commands, your Spark environment needs the
Fabric CLI pre-installed. Check if it's available by running:
  python -c "import subprocess; print(subprocess.run('fab --version', shell=True, capture_output=True).stdout.decode())"

If 'fab' is not available, you can still run Python commands like:
  python -c "print('Hello from Spark!')"
  pip list

💡 Tip: You can still use 'suggest' and 'explain' without a session:
   suggest "list workspaces"
   explain "fab workspace list"
`,
                isError: true
            };
        }

        // If we have a session, indicate the command should be executed
        return {
            output: `Executing: ${command}`,
            isError: false,
            requiresExecution: true,
            commandToExecute: command
        };
    }

    /**
     * Show current workspace context
     */
    private showContext(): CLIResult {
        const ctx = this.workspaceContext;
        const hasContext = ctx.workspaceId || ctx.itemId || ctx.lakehouseId;
        
        if (!hasContext) {
            return {
                output: `┌─────────────────────────────────────────────────────────────┐
│                    Workspace Context                         │
└─────────────────────────────────────────────────────────────┘

  No workspace context available.
  
  Context is automatically populated when you open this item
  in a Fabric workspace.

  Variables available when context is set:
    $workspaceId      - Current workspace GUID
    $workspaceName    - Current workspace name
    $itemId           - Current item GUID  
    $itemName         - Current item name
    $lakehouseId      - Selected lakehouse GUID
    $lakehouseName    - Selected lakehouse name
`,
                isError: false
            };
        }

        let contextDisplay = `┌─────────────────────────────────────────────────────────────┐
│                    Workspace Context                         │
└─────────────────────────────────────────────────────────────┘

  Current context variables (available in suggestions):

`;
        if (ctx.workspaceId) {
            contextDisplay += `    $workspaceId    = ${ctx.workspaceId}\n`;
        }
        if (ctx.workspaceName) {
            contextDisplay += `    $workspaceName  = ${ctx.workspaceName}\n`;
        }
        if (ctx.itemId) {
            contextDisplay += `    $itemId         = ${ctx.itemId}\n`;
        }
        if (ctx.itemName) {
            contextDisplay += `    $itemName       = ${ctx.itemName}\n`;
        }
        if (ctx.lakehouseId) {
            contextDisplay += `    $lakehouseId    = ${ctx.lakehouseId}\n`;
        }
        if (ctx.lakehouseName) {
            contextDisplay += `    $lakehouseName  = ${ctx.lakehouseName}\n`;
        }

        contextDisplay += `
  These variables will be automatically substituted in suggestions.
  Example: fab workspace list --workspace $workspaceId
`;

        return { output: contextDisplay, isError: false };
    }

    /**
     * Show help message
     */
    private showHelp(): CLIResult {
        const ctx = this.workspaceContext;
        const hasContext = ctx.workspaceId || ctx.itemId;
        const hasSession = this.hasActiveSession();
        
        let contextInfo = '';
        if (hasContext) {
            contextInfo = `
WORKSPACE CONTEXT:
  ✓ Connected to workspace${ctx.workspaceName ? `: ${ctx.workspaceName}` : ''}
  Type 'context' to see all available variables
`;
        } else {
            contextInfo = `
WORKSPACE CONTEXT:
  Not connected - context variables not available
  Type 'context' for more information
`;
        }

        let sessionInfo = '';
        if (hasSession) {
            sessionInfo = `
SESSION STATUS:
  ✓ Active session - you can run commands directly
  Try: fab workspace list
`;
        } else {
            sessionInfo = `
SESSION STATUS:
  ✗ No active session - cannot run commands
  To run commands, select a Lakehouse and Spark Environment,
  then click "Start Session" in the ribbon.
`;
        }

        const help = `
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Copilot CLI                         │
│              Your AI pair programmer in Fabric               │
└─────────────────────────────────────────────────────────────┘

USAGE:
  suggest <description>    Get command suggestions for what you want to do
  explain <command>        Explain what a shell command does
  fab <command>            Run a Fabric CLI command (requires session)
  run <command>            Execute any shell command (requires session)
  context                  Show current workspace context and variables
  help                     Show this help message
  clear                    Clear the terminal

EXAMPLES:
  suggest "list all files in current directory"
  suggest "list lakehouses in my workspace"
  
  explain "fab lakehouse list"
  explain "git status"
  
  fab workspace list       (requires active session)
  fab lakehouse list       (requires active session)
${contextInfo}${sessionInfo}
TIPS:
  • suggest/explain work without a session
  • To run commands, you need an active Spark session
  • Fabric commands will use your workspace context automatically
`;
        return { output: help, isError: false };
    }

    /**
     * Get command suggestions based on natural language query
     */
    private async suggest(query: string): Promise<CLIResult> {
        const systemPrompt = `You are GitHub Copilot CLI's suggest command. The user will describe what they want to do, and you must suggest shell commands to accomplish it.

Response format:
1. First, provide the most likely command the user wants
2. Then explain what it does briefly
3. If there are alternative approaches, list 1-2 more options

Keep responses concise and practical. Focus on common Unix/Linux/macOS commands.

For Fabric-specific requests, suggest using the 'fab' CLI:
- fab workspace list - List workspaces
- fab lakehouse list --workspace <id> - List lakehouses
- fab notebook run --workspace <id> --notebook <id> - Run notebook

Always format commands in backticks like \`command\`.`;

        try {
            const response = await this.callCopilotAPI(systemPrompt, query);
            return { output: response, isError: false };
        } catch (error: any) {
            // Fallback to local suggestions
            return this.localSuggest(query);
        }
    }

    /**
     * Explain what a command does
     */
    private async explain(command: string): Promise<CLIResult> {
        const systemPrompt = `You are GitHub Copilot CLI's explain command. The user will provide a shell command, and you must explain what it does.

Response format:
1. Start with a one-line summary of what the command does
2. Break down each part/flag of the command
3. Mention any important warnings or side effects

Keep explanations clear and educational. If the command could be destructive, warn the user.`;

        try {
            const response = await this.callCopilotAPI(systemPrompt, `Explain this command: ${command}`);
            return { output: response, isError: false };
        } catch (error: any) {
            // Fallback to local explanation
            return this.localExplain(command);
        }
    }

    /**
     * Call the GitHub Copilot API
     */
    private async callCopilotAPI(systemPrompt: string, userMessage: string): Promise<string> {
        // Try to get a token for GitHub Copilot
        // In a real implementation, this would use proper GitHub OAuth
        // For now, we'll use the local fallback which provides a good experience
        
        // Attempt API call (will likely fail without proper auth, triggering fallback)
        throw new Error('Using local processing');
    }

    /**
     * Local suggest fallback - provides intelligent suggestions without API
     */
    private localSuggest(query: string): CLIResult {
        const lowerQuery = query.toLowerCase();
        
        // File operations
        if (lowerQuery.includes('list') && (lowerQuery.includes('file') || lowerQuery.includes('directory') || lowerQuery.includes('folder'))) {
            return {
                output: `Suggestion: \`ls -la\`

This lists all files and directories in the current location with detailed information including permissions, owner, size, and modification date.

Alternatives:
• \`ls\` - Simple list
• \`ls -lh\` - Human-readable file sizes
• \`tree\` - Visual directory tree`,
                isError: false,
                suggestions: ['ls -la', 'ls', 'ls -lh', 'tree']
            };
        }

        if (lowerQuery.includes('find') && lowerQuery.includes('file')) {
            if (lowerQuery.includes('large') || lowerQuery.includes('big') || lowerQuery.includes('size')) {
                return {
                    output: `Suggestion: \`find . -type f -size +100M\`

This finds all files larger than 100MB in the current directory and subdirectories.

Alternatives:
• \`find . -type f -size +1G\` - Files larger than 1GB
• \`du -sh * | sort -rh | head -10\` - Top 10 largest items`,
                    isError: false,
                    suggestions: ['find . -type f -size +100M', 'du -sh * | sort -rh | head -10']
                };
            }
            return {
                output: `Suggestion: \`find . -name "filename"\`

This searches for files by name in the current directory and subdirectories.

Alternatives:
• \`find . -name "*.txt"\` - Find by extension
• \`find . -type f -mtime -7\` - Files modified in last 7 days
• \`locate filename\` - Fast search using index`,
                isError: false,
                suggestions: ['find . -name "filename"', 'locate filename']
            };
        }

        if (lowerQuery.includes('delete') || lowerQuery.includes('remove')) {
            return {
                output: `⚠️  Suggestion: \`rm filename\`

This permanently deletes a file. Use with caution!

Safer alternatives:
• \`rm -i filename\` - Ask for confirmation
• \`trash filename\` - Move to trash (if available)
• \`rm -rf directory\` - Remove directory (DANGEROUS)`,
                isError: false,
                suggestions: ['rm -i filename', 'rm filename']
            };
        }

        // Git operations
        if (lowerQuery.includes('git') || lowerQuery.includes('branch') || lowerQuery.includes('commit')) {
            if (lowerQuery.includes('new branch') || lowerQuery.includes('create branch')) {
                return {
                    output: `Suggestion: \`git checkout -b branch-name\`

This creates a new branch and switches to it.

Alternatives:
• \`git branch branch-name\` - Create without switching
• \`git switch -c branch-name\` - Modern Git syntax`,
                    isError: false,
                    suggestions: ['git checkout -b branch-name', 'git switch -c branch-name']
                };
            }
            if (lowerQuery.includes('status')) {
                return {
                    output: `Suggestion: \`git status\`

Shows the current state of your working directory and staging area.

Related commands:
• \`git diff\` - Show unstaged changes
• \`git log --oneline -10\` - Recent commits`,
                    isError: false,
                    suggestions: ['git status', 'git diff']
                };
            }
        }

        // Fabric operations
        if (lowerQuery.includes('fabric') || lowerQuery.includes('workspace') || lowerQuery.includes('lakehouse')) {
            const ctx = this.workspaceContext;
            const hasWorkspaceId = !!ctx.workspaceId;
            const hasLakehouseId = !!ctx.lakehouseId;
            
            if (lowerQuery.includes('list') && lowerQuery.includes('workspace')) {
                return {
                    output: `Suggestion: \`fab workspace list\`

This lists all Fabric workspaces you have access to.

Related Fabric CLI commands:
• \`fab workspace show ${hasWorkspaceId ? ctx.workspaceId : '<id>'}\` - Show workspace details
• \`fab item list --workspace ${hasWorkspaceId ? ctx.workspaceId : '<id>'}\` - List items in workspace${hasWorkspaceId ? `

💡 Using your current workspace: ${ctx.workspaceName || ctx.workspaceId}` : ''}`,
                    isError: false,
                    suggestions: ['fab workspace list']
                };
            }
            if (lowerQuery.includes('lakehouse')) {
                const workspaceArg = hasWorkspaceId ? ctx.workspaceId : '<workspace-id>';
                const lakehouseArg = hasLakehouseId ? ctx.lakehouseId : '<lakehouse-id>';
                
                let contextHint = '';
                if (hasWorkspaceId && hasLakehouseId) {
                    contextHint = `\n\n💡 Using your context:\n   Workspace: ${ctx.workspaceName || ctx.workspaceId}\n   Lakehouse: ${ctx.lakehouseName || ctx.lakehouseId}`;
                } else if (hasWorkspaceId) {
                    contextHint = `\n\n💡 Using your workspace: ${ctx.workspaceName || ctx.workspaceId}`;
                }
                
                return {
                    output: `Suggestion: \`fab lakehouse list --workspace ${workspaceArg}\`

Lists all lakehouses in the specified workspace.

Related commands:
• \`fab lakehouse table list --workspace ${workspaceArg} --lakehouse ${lakehouseArg}\` - List tables
• \`fab lakehouse show --workspace ${workspaceArg} --lakehouse ${lakehouseArg}\` - Details${contextHint}`,
                    isError: false,
                    suggestions: [`fab lakehouse list --workspace ${workspaceArg}`]
                };
            }
            
            // Generic Fabric suggestions with context
            if (lowerQuery.includes('notebook') || lowerQuery.includes('run')) {
                const workspaceArg = hasWorkspaceId ? ctx.workspaceId : '<workspace-id>';
                return {
                    output: `Suggestion: \`fab notebook list --workspace ${workspaceArg}\`

Lists all notebooks in the workspace.

Related commands:
• \`fab notebook run --workspace ${workspaceArg} --notebook <id>\` - Run a notebook
• \`fab notebook show --workspace ${workspaceArg} --notebook <id>\` - Details${hasWorkspaceId ? `\n\n💡 Using your workspace: ${ctx.workspaceName || ctx.workspaceId}` : ''}`,
                    isError: false,
                    suggestions: [`fab notebook list --workspace ${workspaceArg}`]
                };
            }
            
            // List items in current workspace
            if (lowerQuery.includes('item') || lowerQuery.includes('list')) {
                const workspaceArg = hasWorkspaceId ? ctx.workspaceId : '<workspace-id>';
                return {
                    output: `Suggestion: \`fab item list --workspace ${workspaceArg}\`

Lists all items in the workspace.

Related commands:
• \`fab item show --workspace ${workspaceArg} --item <id>\` - Show item details
• \`fab item delete --workspace ${workspaceArg} --item <id>\` - Delete an item${hasWorkspaceId ? `\n\n💡 Using your workspace: ${ctx.workspaceName || ctx.workspaceId}` : ''}`,
                    isError: false,
                    suggestions: [`fab item list --workspace ${workspaceArg}`]
                };
            }
        }

        // Process operations
        if (lowerQuery.includes('process') || lowerQuery.includes('running') || lowerQuery.includes('kill')) {
            if (lowerQuery.includes('list') || lowerQuery.includes('show') || lowerQuery.includes('running')) {
                return {
                    output: `Suggestion: \`ps aux\`

Shows all running processes with details.

Alternatives:
• \`top\` - Interactive process viewer
• \`htop\` - Enhanced process viewer
• \`ps aux | grep name\` - Find specific process`,
                    isError: false,
                    suggestions: ['ps aux', 'top', 'htop']
                };
            }
        }

        // Network operations
        if (lowerQuery.includes('network') || lowerQuery.includes('ip') || lowerQuery.includes('port') || lowerQuery.includes('connection')) {
            return {
                output: `Suggestion: \`netstat -an\` or \`ss -tuln\`

Shows network connections and listening ports.

Alternatives:
• \`ifconfig\` or \`ip addr\` - Show IP addresses
• \`ping hostname\` - Test connectivity
• \`curl -I url\` - Check HTTP headers`,
                isError: false,
                suggestions: ['netstat -an', 'ss -tuln', 'ifconfig']
            };
        }

        // Default fallback
        return {
            output: `I'll help you with: "${query}"

Here are some approaches you might try:

For file operations: \`ls\`, \`find\`, \`cat\`, \`grep\`
For process management: \`ps\`, \`top\`, \`kill\`
For networking: \`ping\`, \`curl\`, \`netstat\`
For Fabric: \`fab workspace list\`, \`fab lakehouse list\`

Try being more specific, for example:
• suggest "list all python files"
• suggest "find files modified today"`,
            isError: false
        };
    }

    /**
     * Local explain fallback - provides command explanations without API
     */
    private localExplain(command: string): CLIResult {
        const cmd = command.trim().toLowerCase();
        
        // Common command explanations
        const explanations: Record<string, string> = {
            'ls': `\`ls\` - List directory contents

Lists files and directories in the current directory.

Common flags:
• \`-l\` - Long format with details
• \`-a\` - Show hidden files
• \`-h\` - Human-readable sizes`,

            'ls -la': `\`ls -la\` - List all files with details

Combines two flags:
• \`-l\` - Long format showing permissions, owner, size, date
• \`-a\` - All files including hidden ones (starting with .)

Example output shows: permissions, links, owner, group, size, date, name`,

            'cd': `\`cd\` - Change directory

Changes your current working directory.

Examples:
• \`cd /path/to/dir\` - Go to specific path
• \`cd ..\` - Go up one level
• \`cd ~\` - Go to home directory
• \`cd -\` - Go to previous directory`,

            'grep': `\`grep\` - Search text patterns

Searches for patterns in files or input.

Common usage:
• \`grep "pattern" file\` - Search in file
• \`grep -r "pattern" .\` - Recursive search
• \`grep -i "pattern"\` - Case-insensitive
• \`command | grep "pattern"\` - Filter output`,

            'rm': `\`rm\` - Remove files

⚠️ WARNING: Permanently deletes files!

Common flags:
• \`-i\` - Prompt before deletion
• \`-r\` - Recursive (for directories)
• \`-f\` - Force (no prompts)

Use \`rm -rf\` with extreme caution!`,

            'git status': `\`git status\` - Show repository status

Displays:
• Current branch
• Staged changes (ready to commit)
• Unstaged changes (modified files)
• Untracked files (new files)

This is a safe, read-only command.`,

            'git commit': `\`git commit\` - Record changes

Saves staged changes to the repository history.

Common usage:
• \`git commit -m "message"\` - Commit with message
• \`git commit -am "message"\` - Stage all & commit
• \`git commit --amend\` - Modify last commit`,

            'docker ps': `\`docker ps\` - List containers

Shows running Docker containers.

Common flags:
• \`-a\` - Show all containers (including stopped)
• \`-q\` - Only show container IDs
• \`--format\` - Custom output format`,

            'fab': `\`fab\` - Fabric CLI

Microsoft Fabric command-line interface for managing Fabric resources.

Common commands:
• \`fab workspace list\` - List workspaces
• \`fab lakehouse list --workspace <id>\` - List lakehouses
• \`fab notebook run\` - Run a notebook`,
        };

        // Check for exact match first
        if (explanations[cmd]) {
            return { output: explanations[cmd], isError: false };
        }

        // Check for partial matches
        for (const [key, explanation] of Object.entries(explanations)) {
            if (cmd.startsWith(key)) {
                return { output: explanation, isError: false };
            }
        }

        // Parse the command for basic explanation
        const parts = command.split(' ');
        const baseCmd = parts[0];
        
        return {
            output: `\`${command}\`

I don't have a detailed explanation for this command, but here's what I can tell:

• Base command: \`${baseCmd}\`
• Arguments: ${parts.slice(1).join(' ') || '(none)'}

For more information, try:
• \`man ${baseCmd}\` - Manual page
• \`${baseCmd} --help\` - Built-in help
• \`tldr ${baseCmd}\` - Simplified examples`,
            isError: false
        };
    }

    /**
     * Update the model being used
     */
    setModel(model: CopilotModelId): void {
        this.currentModel = model;
    }

    /**
     * Clear conversation history
     */
    clearHistory(): void {
        // No-op for local mode
    }
}
