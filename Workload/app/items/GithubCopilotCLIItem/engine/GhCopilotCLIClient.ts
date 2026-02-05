/**
 * GitHub Copilot CLI Client
 * 
 * Executes the REAL `gh copilot` CLI commands through a Spark Livy session.
 * This gives you the authentic GitHub Copilot CLI experience within Fabric.
 */

/**
 * Result from executing a gh copilot command
 */
export interface GhCopilotResult {
    success: boolean;
    output: string;
    error?: string;
}

/**
 * Callback for executing shell commands in the Spark session
 */
export type ExecuteCommandFn = (command: string) => Promise<{ success: boolean; output: string }>;

/**
 * GitHub Copilot CLI wrapper
 * 
 * This class wraps the actual `gh copilot` CLI commands and executes them
 * through your Spark session. Requires:
 * - `gh` CLI installed in the Spark environment
 * - GitHub authentication configured (gh auth login or GITHUB_TOKEN)
 * - Active GitHub Copilot subscription
 */
export class GhCopilotCLIClient {
    private executeCommand: ExecuteCommandFn;
    private isAvailable: boolean | null = null;
    private ghVersion: string | null = null;

    constructor(executeCommand: ExecuteCommandFn) {
        this.executeCommand = executeCommand;
    }

    /**
     * Check if gh copilot is available in the Spark environment
     */
    async checkAvailability(): Promise<{ available: boolean; message: string }> {
        try {
            // First check if gh CLI is installed
            const ghCheck = await this.executeCommand('which gh || echo "NOT_FOUND"');
            if (!ghCheck.success || ghCheck.output.includes('NOT_FOUND')) {
                this.isAvailable = false;
                return {
                    available: false,
                    message: `GitHub CLI (gh) is not installed in this Spark environment.

To install gh CLI, you can add it to your Spark environment's packages or run:
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  sudo apt update && sudo apt install gh`
                };
            }

            // Check gh version
            const versionCheck = await this.executeCommand('gh --version | head -1');
            if (versionCheck.success) {
                this.ghVersion = versionCheck.output.trim();
            }

            // Check if copilot extension is installed
            const copilotCheck = await this.executeCommand('gh copilot --help 2>&1 || echo "COPILOT_NOT_FOUND"');
            if (!copilotCheck.success || copilotCheck.output.includes('COPILOT_NOT_FOUND') || copilotCheck.output.includes('unknown command')) {
                this.isAvailable = false;
                return {
                    available: false,
                    message: `GitHub Copilot CLI extension is not installed.

gh CLI is available (${this.ghVersion}), but the copilot extension is missing.

To install it, run:
  gh extension install github/gh-copilot

Then authenticate:
  gh auth login`
                };
            }

            // Check authentication status
            const authCheck = await this.executeCommand('gh auth status 2>&1 || echo "NOT_AUTHENTICATED"');
            if (!authCheck.success || authCheck.output.includes('NOT_AUTHENTICATED') || authCheck.output.includes('not logged in')) {
                this.isAvailable = false;
                return {
                    available: false,
                    message: `GitHub CLI is not authenticated.

The gh copilot extension is installed, but you need to authenticate.

Option 1 - Interactive login:
  gh auth login

Option 2 - Use a token (set GITHUB_TOKEN environment variable):
  export GITHUB_TOKEN=your_personal_access_token`
                };
            }

            this.isAvailable = true;
            return {
                available: true,
                message: `✅ GitHub Copilot CLI is ready!

${this.ghVersion}
Copilot extension: installed
Authentication: configured

You can now use:
  • suggest "what you want to do"
  • explain "command to explain"`
            };
        } catch (error: any) {
            this.isAvailable = false;
            return {
                available: false,
                message: `Error checking gh copilot availability: ${error.message}`
            };
        }
    }

    /**
     * Run gh copilot suggest
     */
    async suggest(query: string, shellType: 'bash' | 'powershell' | 'zsh' = 'bash'): Promise<GhCopilotResult> {
        if (this.isAvailable === false) {
            return {
                success: false,
                output: 'gh copilot is not available. Run "status" to check requirements.'
            };
        }

        try {
            // Escape the query for shell
            const escapedQuery = query.replace(/"/g, '\\"').replace(/\$/g, '\\$');
            
            // Run gh copilot suggest with the query
            // Using --shell-type and piping to handle interactive prompts
            const command = `echo "y" | gh copilot suggest -t ${shellType} "${escapedQuery}" 2>&1 || true`;
            
            const result = await this.executeCommand(command);
            
            if (result.output.includes('error') && result.output.includes('Copilot')) {
                return {
                    success: false,
                    output: result.output,
                    error: 'GitHub Copilot returned an error. Make sure you have an active Copilot subscription.'
                };
            }

            return {
                success: true,
                output: this.formatSuggestOutput(result.output)
            };
        } catch (error: any) {
            return {
                success: false,
                output: `Failed to run gh copilot suggest: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Run gh copilot explain
     */
    async explain(command: string): Promise<GhCopilotResult> {
        if (this.isAvailable === false) {
            return {
                success: false,
                output: 'gh copilot is not available. Run "status" to check requirements.'
            };
        }

        try {
            // Escape the command for shell
            const escapedCommand = command.replace(/"/g, '\\"').replace(/\$/g, '\\$');
            
            // Run gh copilot explain
            const shellCommand = `gh copilot explain "${escapedCommand}" 2>&1 || true`;
            
            const result = await this.executeCommand(shellCommand);
            
            if (result.output.includes('error') && result.output.includes('Copilot')) {
                return {
                    success: false,
                    output: result.output,
                    error: 'GitHub Copilot returned an error.'
                };
            }

            return {
                success: true,
                output: this.formatExplainOutput(result.output)
            };
        } catch (error: any) {
            return {
                success: false,
                output: `Failed to run gh copilot explain: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Format the output from gh copilot suggest
     */
    private formatSuggestOutput(raw: string): string {
        // Clean up ANSI escape codes
        const cleaned = raw.replace(/\x1b\[[0-9;]*m/g, '');
        
        // The output typically includes the suggestion and explanation
        return cleaned.trim();
    }

    /**
     * Format the output from gh copilot explain
     */
    private formatExplainOutput(raw: string): string {
        // Clean up ANSI escape codes
        const cleaned = raw.replace(/\x1b\[[0-9;]*m/g, '');
        
        return cleaned.trim();
    }

    /**
     * Check if gh copilot is available (cached result)
     */
    getAvailability(): boolean | null {
        return this.isAvailable;
    }

    /**
     * Get gh version
     */
    getVersion(): string | null {
        return this.ghVersion;
    }
}
