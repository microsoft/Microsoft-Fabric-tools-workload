/**
 * Azure OpenAI Client for GitHub Copilot CLI
 * 
 * This provides the real AI chat experience by connecting to Azure OpenAI.
 * Users can configure their own Azure OpenAI endpoint and key.
 */

import { WorkloadClientAPI } from "@ms-fabric/workload-client";

/**
 * Chat message in a conversation
 */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Azure OpenAI configuration
 */
export interface AzureOpenAIConfig {
    /** Azure OpenAI endpoint (e.g., https://your-resource.openai.azure.com) */
    endpoint: string;
    /** Azure OpenAI API key */
    apiKey: string;
    /** Deployment name (e.g., gpt-4, gpt-35-turbo) */
    deploymentName: string;
    /** API version */
    apiVersion?: string;
}

/**
 * Response from the chat API
 */
export interface ChatResponse {
    message: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * System prompt that makes the AI behave like GitHub Copilot CLI
 */
const GITHUB_COPILOT_SYSTEM_PROMPT = `You are GitHub Copilot, an AI assistant integrated into Microsoft Fabric. You help developers with coding tasks, shell commands, and working with Fabric resources.

## Your Personality
- Be concise but helpful
- Be friendly and conversational
- Use emojis sparingly for emphasis
- When suggesting commands, always explain what they do

## Response Style
- For shell commands: wrap in \`backticks\` or code blocks
- For code: use fenced code blocks with language
- For explanations: be clear and educational
- Always warn about destructive commands

## Fabric Context
You're running inside Microsoft Fabric. Users can:
- Execute shell commands in a Spark environment
- Run Python code
- Work with Lakehouses and Delta tables
- Use the Fabric CLI (fab) for resource management

## Common Fabric CLI Commands
- \`fab workspace list\` - List workspaces
- \`fab lakehouse list --workspace <id>\` - List lakehouses
- \`fab notebook run --workspace <id> --notebook <id>\` - Run notebooks

When the user asks for help with Fabric, suggest appropriate fab CLI commands or Python code.`;

/**
 * Azure OpenAI Client for real AI chat
 */
export class AzureOpenAIClient {
    private config: AzureOpenAIConfig | null = null;
    private conversationHistory: ChatMessage[] = [];

    constructor(_workloadClient: WorkloadClientAPI) {
        // workloadClient reserved for future use (e.g., token acquisition)
        this.resetConversation();
    }

    /**
     * Configure the Azure OpenAI connection
     */
    configure(config: AzureOpenAIConfig): void {
        this.config = {
            ...config,
            apiVersion: config.apiVersion || '2024-02-15-preview'
        };
    }

    /**
     * Check if the client is configured
     */
    isConfigured(): boolean {
        return this.config !== null && 
               !!this.config.endpoint && 
               !!this.config.apiKey && 
               !!this.config.deploymentName;
    }

    /**
     * Get current configuration (without exposing the API key)
     */
    getConfig(): { endpoint: string; deploymentName: string } | null {
        if (!this.config) return null;
        return {
            endpoint: this.config.endpoint,
            deploymentName: this.config.deploymentName
        };
    }

    /**
     * Reset the conversation history
     */
    resetConversation(): void {
        this.conversationHistory = [{
            role: 'system',
            content: GITHUB_COPILOT_SYSTEM_PROMPT
        }];
    }

    /**
     * Add context about the user's workspace to the system prompt
     */
    addWorkspaceContext(context: {
        workspaceId?: string;
        workspaceName?: string;
        lakehouseId?: string;
        lakehouseName?: string;
    }): void {
        let contextInfo = '\n\n## Current User Context\n';
        if (context.workspaceId) {
            contextInfo += `- Workspace ID: ${context.workspaceId}\n`;
        }
        if (context.workspaceName) {
            contextInfo += `- Workspace Name: ${context.workspaceName}\n`;
        }
        if (context.lakehouseId) {
            contextInfo += `- Lakehouse ID: ${context.lakehouseId}\n`;
        }
        if (context.lakehouseName) {
            contextInfo += `- Lakehouse Name: ${context.lakehouseName}\n`;
        }
        
        if (this.conversationHistory.length > 0 && this.conversationHistory[0].role === 'system') {
            this.conversationHistory[0].content = GITHUB_COPILOT_SYSTEM_PROMPT + contextInfo;
        }
    }

    /**
     * Send a message and get a response
     */
    async chat(userMessage: string): Promise<ChatResponse> {
        if (!this.isConfigured()) {
            throw new Error('Azure OpenAI is not configured. Please set up your endpoint and API key.');
        }

        // Add user message to history
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });

        try {
            const response = await this.callAzureOpenAI();
            
            // Add assistant response to history
            this.conversationHistory.push({
                role: 'assistant',
                content: response.message
            });

            return response;
        } catch (error: any) {
            // Remove failed message from history
            this.conversationHistory.pop();
            throw error;
        }
    }

    /**
     * Call the Azure OpenAI API
     */
    private async callAzureOpenAI(): Promise<ChatResponse> {
        const config = this.config!;
        const url = `${config.endpoint}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': config.apiKey
            },
            body: JSON.stringify({
                messages: this.conversationHistory,
                temperature: 0.7,
                max_tokens: 2000,
                top_p: 0.95,
                frequency_penalty: 0,
                presence_penalty: 0
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Azure OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content || 'No response received';

        return {
            message: assistantMessage,
            usage: data.usage ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens
            } : undefined
        };
    }

    /**
     * Get the conversation history
     */
    getHistory(): ChatMessage[] {
        return [...this.conversationHistory];
    }

    /**
     * Clear conversation history but keep system prompt
     */
    clearHistory(): void {
        this.resetConversation();
    }
}

/**
 * Storage key for Azure OpenAI config
 */
const STORAGE_KEY = 'github-copilot-cli-azure-openai-config';

/**
 * Save Azure OpenAI config to local storage
 */
export function saveAzureOpenAIConfig(config: AzureOpenAIConfig): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.warn('Failed to save Azure OpenAI config to localStorage:', e);
    }
}

/**
 * Load Azure OpenAI config from local storage
 */
export function loadAzureOpenAIConfig(): AzureOpenAIConfig | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Failed to load Azure OpenAI config from localStorage:', e);
    }
    return null;
}

/**
 * Clear stored Azure OpenAI config
 */
export function clearAzureOpenAIConfig(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to clear Azure OpenAI config from localStorage:', e);
    }
}
