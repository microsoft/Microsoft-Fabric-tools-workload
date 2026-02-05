import { WorkloadClientAPI } from "@ms-fabric/workload-client";

/**
 * Message in a Copilot conversation
 */
export interface CopilotMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Fabric action that can be executed
 */
export interface FabricAction {
    type: 'fab_cli' | 'python' | 'info';
    command?: string;
    description: string;
}

/**
 * Response from Copilot with optional action
 */
export interface CopilotResponse {
    message: string;
    suggestedAction?: FabricAction;
    code?: string;
}

/**
 * Configuration for the Copilot client
 */
export interface CopilotClientConfig {
    model: string;
    systemPrompt?: string;
}

/**
 * System prompt that provides Fabric context to Copilot
 */
const FABRIC_SYSTEM_PROMPT = `You are GitHub Copilot integrated into Microsoft Fabric. You help users work with Fabric resources using the Fabric CLI (fab) and Python.

## Available Fabric CLI Commands (fab)

The Fabric CLI is a command-line tool for managing Microsoft Fabric resources. Key commands include:

### Workspace Commands
- \`fab workspace list\` - List all workspaces
- \`fab workspace show <workspace-id>\` - Show workspace details
- \`fab workspace create --name <name>\` - Create a new workspace

### Item Commands  
- \`fab item list --workspace <workspace-id>\` - List items in a workspace
- \`fab item show --workspace <workspace-id> --item <item-id>\` - Show item details
- \`fab item create --workspace <workspace-id> --type <type> --name <name>\` - Create an item

### Lakehouse Commands
- \`fab lakehouse list --workspace <workspace-id>\` - List lakehouses
- \`fab lakehouse table list --workspace <workspace-id> --lakehouse <lakehouse-id>\` - List tables

### Data Pipeline Commands
- \`fab pipeline list --workspace <workspace-id>\` - List pipelines
- \`fab pipeline run --workspace <workspace-id> --pipeline <pipeline-id>\` - Run a pipeline

### Notebook Commands
- \`fab notebook list --workspace <workspace-id>\` - List notebooks
- \`fab notebook run --workspace <workspace-id> --notebook <notebook-id>\` - Run a notebook

## Response Format

When the user asks you to perform a Fabric action, respond with:
1. A brief explanation of what you'll do
2. The command or code in a code block

For Fabric CLI commands, format as:
\`\`\`fab
<command>
\`\`\`

For Python code, format as:
\`\`\`python
<code>
\`\`\`

If you're just providing information without an action, respond conversationally.

## Guidelines
- Be concise but helpful
- When suggesting commands, explain what they do
- If unsure about the exact command, provide the closest match and explain any uncertainties
- For data operations, always remind users to verify they have the right permissions
- Suggest using \`--help\` for command details when appropriate
`;

/**
 * Client for interacting with GitHub Copilot API
 * 
 * This client handles:
 * - Sending prompts to the Copilot API
 * - Maintaining conversation context
 * - Parsing responses for executable Fabric actions
 */
export class CopilotClient {
    private workloadClient: WorkloadClientAPI;
    private config: CopilotClientConfig;
    private conversationHistory: CopilotMessage[] = [];

    constructor(workloadClient: WorkloadClientAPI, config: CopilotClientConfig) {
        this.workloadClient = workloadClient;
        this.config = config;
        
        // Initialize with system prompt
        this.conversationHistory = [{
            role: 'system',
            content: config.systemPrompt || FABRIC_SYSTEM_PROMPT
        }];
    }

    /**
     * Send a message to Copilot and get a response
     */
    async chat(userMessage: string): Promise<CopilotResponse> {
        // Add user message to history
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });

        try {
            // Call the Copilot API
            const response = await this.callCopilotAPI(this.conversationHistory);
            
            // Add assistant response to history
            this.conversationHistory.push({
                role: 'assistant',
                content: response.message
            });

            return response;
        } catch (error: any) {
            // Remove the failed user message from history
            this.conversationHistory.pop();
            throw error;
        }
    }

    /**
     * Call the GitHub Copilot API
     * 
     * This uses the workload client to acquire a GitHub token and make the API call
     */
    private async callCopilotAPI(messages: CopilotMessage[]): Promise<CopilotResponse> {
        try {
            // Get GitHub Copilot token through workload client
            // The token is acquired via the OAuth flow configured in the workload
            const tokenResult = await this.workloadClient.auth.acquireAccessToken({
                additionalScopesToConsent: ['https://api.github.com/copilot']
            });

            const response = await fetch('https://api.github.com/copilot/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenResult.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-GitHub-Api-Version': '2024-02-01'
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    stream: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Copilot API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            const assistantMessage = data.choices?.[0]?.message?.content || 'No response received';

            // Parse the response for executable actions
            return this.parseResponse(assistantMessage);
        } catch (error: any) {
            console.error('Copilot API call failed:', error);
            
            // Fallback to local processing if API fails
            return this.processLocally(messages[messages.length - 1].content);
        }
    }

    /**
     * Parse Copilot's response to extract executable actions
     */
    private parseResponse(message: string): CopilotResponse {
        const response: CopilotResponse = { message };

        // Look for fab CLI code blocks
        const fabMatch = message.match(/```fab\n([\s\S]*?)```/);
        if (fabMatch) {
            response.suggestedAction = {
                type: 'fab_cli',
                command: fabMatch[1].trim(),
                description: 'Execute Fabric CLI command'
            };
            response.code = fabMatch[1].trim();
            return response;
        }

        // Look for Python code blocks
        const pythonMatch = message.match(/```python\n([\s\S]*?)```/);
        if (pythonMatch) {
            response.suggestedAction = {
                type: 'python',
                command: pythonMatch[1].trim(),
                description: 'Execute Python code'
            };
            response.code = pythonMatch[1].trim();
            return response;
        }

        // Look for generic code blocks (might be CLI commands)
        const genericMatch = message.match(/```\n?([\s\S]*?)```/);
        if (genericMatch) {
            const code = genericMatch[1].trim();
            // Check if it looks like a fab command
            if (code.startsWith('fab ')) {
                response.suggestedAction = {
                    type: 'fab_cli',
                    command: code,
                    description: 'Execute Fabric CLI command'
                };
                response.code = code;
            }
        }

        return response;
    }

    /**
     * Process the message locally when API is unavailable
     * Provides basic pattern matching for common Fabric operations
     */
    private processLocally(userMessage: string): CopilotResponse {
        const lowerMessage = userMessage.toLowerCase();

        // Pattern matching for common requests
        if (lowerMessage.includes('list') && lowerMessage.includes('workspace')) {
            return {
                message: "To list all workspaces you have access to, you can use the Fabric CLI:\n\n```fab\nworkspace list\n```\n\nThis will show all workspaces with their IDs and names.",
                suggestedAction: {
                    type: 'fab_cli',
                    command: 'workspace list',
                    description: 'List all workspaces'
                },
                code: 'workspace list'
            };
        }

        if (lowerMessage.includes('list') && lowerMessage.includes('lakehouse')) {
            return {
                message: "To list lakehouses, you need to specify a workspace. Here's the command pattern:\n\n```fab\nlakehouse list --workspace <workspace-id>\n```\n\nReplace `<workspace-id>` with your actual workspace ID. You can get workspace IDs by running `fab workspace list` first.",
                suggestedAction: {
                    type: 'info',
                    description: 'Requires workspace ID'
                }
            };
        }

        if (lowerMessage.includes('create') && lowerMessage.includes('lakehouse')) {
            return {
                message: "To create a new lakehouse:\n\n```fab\nlakehouse create --workspace <workspace-id> --name <lakehouse-name>\n```\n\nReplace the placeholders with your workspace ID and desired lakehouse name.",
                suggestedAction: {
                    type: 'info',
                    description: 'Requires workspace ID and name'
                }
            };
        }

        if (lowerMessage.includes('run') && lowerMessage.includes('notebook')) {
            return {
                message: "To run a notebook:\n\n```fab\nnotebook run --workspace <workspace-id> --notebook <notebook-id>\n```\n\nYou can find notebook IDs using `fab notebook list --workspace <workspace-id>`.",
                suggestedAction: {
                    type: 'info',
                    description: 'Requires workspace and notebook IDs'
                }
            };
        }

        if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
            return {
                message: `I'm GitHub Copilot integrated with Microsoft Fabric! I can help you with:

**🔧 Fabric CLI Commands**
- List and manage workspaces, lakehouses, notebooks, pipelines
- Create and delete Fabric items
- Run notebooks and pipelines

**📝 Code Assistance**
- Write Python code for data processing
- Explain Fabric concepts and best practices
- Debug issues with your Fabric resources

**💡 Examples you can try:**
- "List all my workspaces"
- "Show me how to create a lakehouse"
- "Write Python code to read a Delta table"
- "How do I run a pipeline?"

Just ask me anything about Fabric!`
            };
        }

        // Default response for unrecognized patterns
        return {
            message: `I understand you're asking about: "${userMessage}"

I'm currently running in offline mode. When connected to GitHub Copilot, I can provide detailed assistance with:
- Fabric CLI commands
- Python code for data operations
- Best practices and troubleshooting

Try asking something specific like:
- "List my workspaces"
- "How do I create a lakehouse?"
- "Write code to read a Delta table"`
        };
    }

    /**
     * Clear conversation history (keep system prompt)
     */
    clearHistory(): void {
        const systemPrompt = this.conversationHistory[0];
        this.conversationHistory = [systemPrompt];
    }

    /**
     * Get current conversation history
     */
    getHistory(): CopilotMessage[] {
        return [...this.conversationHistory];
    }

    /**
     * Update the model being used
     */
    setModel(model: string): void {
        this.config.model = model;
    }
}
