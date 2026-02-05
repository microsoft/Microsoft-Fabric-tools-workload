// GitHub Copilot CLI Engine exports
export { CopilotClient, type CopilotMessage, type CopilotResponse, type FabricAction, type CopilotClientConfig } from './CopilotClient';
export { GithubCopilotCLIEngine, type ActionExecutionResult, type FabricActionContext } from './GithubCopilotCLIEngine';
export { GithubCopilotCLI, type ParsedCommand, type CLIResult, type CopilotCLICommandType, type ExecutionContext } from './GithubCopilotCLI';
export { 
    AzureOpenAIClient, 
    type ChatMessage, 
    type ChatResponse, 
    type AzureOpenAIConfig,
    saveAzureOpenAIConfig,
    loadAzureOpenAIConfig,
    clearAzureOpenAIConfig
} from './AzureOpenAIClient';
export {
    GhCopilotCLIClient,
    type GhCopilotResult,
    type ExecuteCommandFn
} from './GhCopilotCLIClient';
