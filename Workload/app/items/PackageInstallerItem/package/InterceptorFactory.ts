import { ItemPartInterceptorDefinition, ItemPartInterceptorDefinitionConfig, ReferenceInterceptorDefinitionConfig, StringReplacementInterceptorDefinitionConfig} from "../PackageInstallerItemModel";
import { DeploymentContext } from "../deployment/DeploymentContext";

/**
 * Abstract base class for all item part content interceptors in the Package Installer system.
 * 
 * Interceptors provide a mechanism to modify package item content during deployment,
 * allowing for dynamic content transformation such as:
 * - Variable substitution and replacement
 * - Environment-specific configuration injection
 * - Content customization based on deployment context
 * - Reference resolution and cross-item linking
 * 
 * The interceptor pattern enables extensible content processing without modifying
 * the core deployment logic, supporting both text and base64-encoded content.
 * 
 * @template T - The configuration type for the specific interceptor implementation
 */
export abstract class Interceptor<T extends ItemPartInterceptorDefinitionConfig> {

    /** The interceptor definition containing configuration and processing rules */
    protected definition: ItemPartInterceptorDefinition<T>;
    
    /** Deployment context providing access to variables and system state */
    protected depContext: DeploymentContext;

    /**
     * Creates a new Interceptor instance with validation.
     * 
     * @param definition - The interceptor definition with configuration
     * @param depContext - The deployment context for variable access and logging
     * @throws Error if definition is null or undefined
     */
    constructor(definition: ItemPartInterceptorDefinition<T>, depContext: DeploymentContext) {
        if (!definition) {
            throw new Error("Interceptor definition is required");
        }
        this.definition = definition;
        this.depContext = depContext;
    }

    /**
     * Intercepts and processes base64-encoded content from package item parts.
     * 
     * This method provides a complete workflow for processing encoded content:
     * 1. Decodes base64 content to text
     * 2. Applies interceptor-specific text processing
     * 3. Re-encodes the modified content to base64
     * 
     * This is the primary entry point for content processing when working with
     * binary or base64-encoded package assets.
     * 
     * @param content - The original base64-encoded content to process
     * @returns Promise<string> - The processed content, re-encoded as base64
     * @throws Error if content is empty or decoding/encoding fails
     * 
     * @example
     * ```typescript
     * const interceptor = new StringReplaceInterceptor(definition, context);
     * const processedContent = await interceptor.interceptBase64(originalContent);
     * ```
     */
    async interceptBase64(content: string): Promise<string> {
        if (!content) {
            throw new Error("Content to intercept cannot be empty");
        }
        // Decode the base64 content
        const decodedContent = atob(content);
        // Perform the interception logic
        const modifiedContent = await this.interceptText(decodedContent);
        // Return the modified content encoded in base64
        return btoa(modifiedContent);
    }

    /**
     * Intercepts and processes text content from package item parts.
     * 
     * This method serves as the main entry point for text-based content processing:
     * 1. Copies deployment context variables for use in processing
     * 2. Delegates to the interceptor-specific implementation
     * 3. Returns the processed text content
     * 
     * The method provides access to the complete variable map from the deployment
     * context, enabling dynamic content substitution and environment-specific processing.
     * 
     * @param content - The original text content to process
     * @returns Promise<string> - The processed text content
     * @throws Error if content is empty or processing fails
     * 
     * @example
     * ```typescript
     * const result = await interceptor.interceptText("Hello {{userName}}!");
     * // Result might be: "Hello John Doe!" after variable substitution
     * ```
     */
    async interceptText(content: string): Promise<string> {
        if (!content) {
            throw new Error("Content to intercept cannot be empty");
        }
        // copy all global variables
        const variables: Record<string, string> = {...this.depContext.variableMap};
        // Perform the interception logic
        const modifiedContent = await this.interceptContentInt(content, variables);
        return modifiedContent;
    }

    /**
     * Abstract method that defines the core content processing logic for each interceptor type.
     * 
     * This method must be implemented by each concrete interceptor to define its specific
     * content transformation behavior. It receives the text content and has access to
     * system variables for dynamic processing.
     * 
     * @param content - The text content to process and transform
     * @param systemVariables - Map of system variables available for substitution and logic
     * @returns Promise<string> - The transformed content
     * 
     * @example
     * ```typescript
     * // StringReplaceInterceptor implementation
     * protected async interceptContentInt(content: string, systemVariables: Record<string, string>): Promise<string> {
     *   return content.replace(/{{workspaceName}}/g, systemVariables.workspaceName);
     * }
     * ```
     */
    protected abstract interceptContentInt(content: string, systemVariables: Record<string, string>): Promise<string>;
}

/**
 * Reference interceptor implementation for delegating content processing to global interceptors.
 * 
 * This interceptor provides a mechanism to reuse global interceptor configurations
 * by referencing them by ID. It enables:
 * - Centralized interceptor configuration management
 * - Reusability of common processing patterns
 * - Consistent processing across multiple package items
 * - Dynamic interceptor composition
 * 
 * The reference interceptor looks up global interceptors defined in the package
 * deployment configuration and applies them to the current content.
 */
export class ReferenceInterceptor extends Interceptor<ReferenceInterceptorDefinitionConfig> {
    /**
     * Creates a new ReferenceInterceptor instance.
     * 
     * @param definition - Interceptor definition containing the global interceptor ID to reference
     * @param depContext - Deployment context for accessing global interceptors and variables
     */
    constructor(definition: ItemPartInterceptorDefinition<ReferenceInterceptorDefinitionConfig>, depContext: DeploymentContext) {
        super(definition, depContext);
    }

    /**
     * Processes content by delegating to a referenced global interceptor.
     * 
     * This method:
     * 1. Retrieves the global interceptor ID from the configuration
     * 2. Looks up the global interceptor definition in the deployment configuration
     * 3. Creates an instance of the referenced interceptor
     * 4. Delegates content processing to the referenced interceptor
     * 
     * @param content - The text content to process
     * @param systemVariables - System variables available for processing
     * @returns Promise<string> - Content processed by the referenced interceptor
     * @throws Error if the referenced interceptor is not found or processing fails
     * 
     * @example
     * ```typescript
     * // Configuration references a global "EnvironmentReplacer" interceptor
     * const config = { id: "EnvironmentReplacer" };
     * const processed = await interceptor.interceptContentInt(content, variables);
     * ```
     */
    protected async interceptContentInt(content: string, systemVariables: Record<string, string>): Promise<string> {
        let modifiedContent = content;
        
        const globalInterceptors = this.depContext.pack.deploymentConfig?.globalInterceptors;
        const globalInterceptorId = this.definition.config.id;

        if (globalInterceptors) {
            // Look for the interceptor with matching ID
            const foundInterceptor: ItemPartInterceptorDefinition<any> | undefined = globalInterceptors[globalInterceptorId];
            
            if (foundInterceptor) {
                // Create and apply the referenced interceptor
                try {
                    const referencedInterceptor = InterceptorFactory.createInterceptor(foundInterceptor, this.depContext);
                    modifiedContent = await referencedInterceptor.interceptText(modifiedContent);
                } catch (error) {
                    console.error(`Failed to apply referenced interceptor '${globalInterceptorId}':`, error);
                    throw new Error(`Failed to apply referenced interceptor '${globalInterceptorId}': ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            } else {
                throw new Error(`Global interceptor with ID '${globalInterceptorId}' not found`);
            }
        } else {
            throw new Error(`No global interceptors defined, cannot find interceptor '${globalInterceptorId}'`);
        }       
        return modifiedContent;
    }
}

/**
 * String replacement interceptor for performing text substitution in package content.
 * 
 * This interceptor enables flexible content transformation through:
 * - Direct string replacement with static values
 * - Variable-based replacement using system variables
 * - Regular expression-safe replacement handling
 * - Support for multiple simultaneous replacements
 * 
 * The interceptor processes replacement mappings defined in its configuration,
 * where keys are search patterns and values are replacement text or variable references.
 * Variable references are resolved from the deployment context's variable map.
 * 
 * @example
 * ```typescript
 * // Configuration example:
 * const config = {
 *   replacements: {
 *     "{{WORKSPACE_NAME}}": "workspaceName",  // Variable reference
 *     "localhost": "prod.example.com"         // Static replacement
 *   }
 * };
 * ```
 */
export class StringReplaceInterceptor extends Interceptor<StringReplacementInterceptorDefinitionConfig> {

    /**
     * Creates a new StringReplaceInterceptor instance.
     * 
     * @param definition - Interceptor definition containing replacement mappings
     * @param depContext - Deployment context for variable resolution
     */
    constructor(definition: ItemPartInterceptorDefinition<StringReplacementInterceptorDefinitionConfig>, 
        depContext: DeploymentContext) {
        super(definition, depContext);
    }

    /**
     * Processes content by applying configured string replacements.
     * 
     * This method performs the following operations:
     * 1. Iterates through all configured replacement mappings
     * 2. Resolves replacement values from system variables if they are variable references
     * 3. Escapes special regex characters in search patterns for safe replacement
     * 4. Applies global replacements using regular expressions
     * 
     * The replacement process supports:
     * - Static string replacements (direct text substitution)
     * - Variable-based replacements (resolved from system variables)
     * - Multiple replacements in a single pass
     * - Safe handling of special regex characters
     * 
     * @param content - The text content to process for replacements
     * @param systemVariables - System variables for resolving replacement values
     * @returns Promise<string> - Content with all configured replacements applied
     * 
     * @example
     * ```typescript
     * // Given content: "Connect to {{DATABASE_HOST}} on port {{PORT}}"
     * // With variables: { DATABASE_HOST: "prod-db.example.com", PORT: "5432" }
     * // Result: "Connect to prod-db.example.com on port 5432"
     * ```
     */
    async interceptContentInt(content: string, systemVariables: Record<string, string>): Promise<string> {
        let modifiedContent = content;
            
        // Then, perform configured replacements
        const replacements = this.definition.config.replacements;
        if(replacements){
            for (const [variableName, variableValue] of Object.entries(replacements)) {
                // Check if replacement value is a variable placeholder
                let actualReplacement = variableValue;
                if (systemVariables[variableValue]) {
                    actualReplacement = systemVariables[variableValue];
                }
                
                // Escape special regex characters in the search pattern for safe replacement
                const escapedSearchPattern = variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                modifiedContent = modifiedContent.replace(new RegExp(escapedSearchPattern, 'g'), actualReplacement);
            }
        }
        
        return modifiedContent;
    }
}

/**
 * Factory class for creating and managing interceptor instances in the Package Installer system.
 * 
 * This factory provides a centralized mechanism for:
 * - Creating interceptor instances based on configuration type
 * - Supporting multiple interceptor types with type safety
 * - Managing interceptor lifecycle and instantiation
 * - Providing utility methods for interceptor type validation
 * - Batch creation of multiple interceptors
 * 
 * The factory follows the Factory Pattern to encapsulate interceptor creation logic
 * and provide a clean interface for the deployment system to work with interceptors
 * without needing to know the specific implementation details.
 */
export class InterceptorFactory {
    
    /**
     * Creates an interceptor instance based on the provided configuration type.
     * 
     * This method examines the interceptor definition type and instantiates the
     * appropriate concrete interceptor class. It provides type-safe creation
     * with proper error handling for unsupported types.
     * 
     * Supported interceptor types:
     * - "Reference": Delegates to global interceptors by ID
     * - "StringReplacement": Performs text substitution and variable replacement
     * 
     * @param interceptorDef - The interceptor definition containing type and configuration
     * @param depContext - Deployment context for variable access and logging
     * @returns An instance of the appropriate interceptor implementation
     * @throws Error if interceptorDef is null/undefined or type is unsupported
     * 
     * @example
     * ```typescript
     * const definition = {
     *   type: "StringReplacement",
     *   config: { replacements: { "old": "new" } }
     * };
     * const interceptor = InterceptorFactory.createInterceptor(definition, context);
     * ```
     */
    static createInterceptor(interceptorDef: ItemPartInterceptorDefinition<any>, depContext: DeploymentContext): Interceptor<any> {
        if (!interceptorDef) {
            throw new Error("Interceptor definition is required");
        }
        switch (interceptorDef.type) {
            case "Reference":
                return new ReferenceInterceptor(interceptorDef as ItemPartInterceptorDefinition<ReferenceInterceptorDefinitionConfig>, depContext);
            case "StringReplacement":
                return new StringReplaceInterceptor(interceptorDef as ItemPartInterceptorDefinition<StringReplacementInterceptorDefinitionConfig>, depContext);
            default:
                throw new Error(`Unsupported interceptor type: ${interceptorDef.type}`);
        }
    }

    /**
     * Creates multiple interceptor instances from an array of configurations.
     * 
     * This utility method simplifies batch creation of interceptors, handling
     * empty arrays gracefully and applying the same deployment context to all
     * created interceptors.
     * 
     * @param interceptors - Array of interceptor definitions to create instances from
     * @param depContext - Deployment context shared by all created interceptors
     * @returns Array of interceptor instances in the same order as input definitions
     * 
     * @example
     * ```typescript
     * const definitions = [
     *   { type: "StringReplacement", config: { ... } },
     *   { type: "Reference", config: { id: "global1" } }
     * ];
     * const interceptors = InterceptorFactory.createInterceptors(definitions, context);
     * ```
     */
    static createInterceptors(interceptors: ItemPartInterceptorDefinition<any>[], depContext: DeploymentContext): Interceptor<any>[] {
        if (!interceptors || interceptors.length === 0) {
            return [];
        }
        return interceptors.map(interceptor => this.createInterceptor(interceptor, depContext));
    }

    /**
     * Gets all currently supported interceptor types.
     * 
     * This method provides a way to discover available interceptor implementations
     * without hardcoding type names throughout the application.
     * 
     * @returns Array of supported interceptor type names
     * 
     * @example
     * ```typescript
     * const supportedTypes = InterceptorFactory.getSupportedTypes();
     * console.log(supportedTypes); // ["Reference", "StringReplacement"]
     * ```
     */
    static getSupportedTypes(): string[] {
        return ["Reference", "StringReplacement"];
    }

    /**
     * Validates whether a given interceptor type is supported by the factory.
     * 
     * This utility method enables runtime validation of interceptor types before
     * attempting to create instances, preventing runtime errors and providing
     * better error handling in configuration validation scenarios.
     * 
     * @param type - The interceptor type string to validate
     * @returns true if the type is supported and can be instantiated, false otherwise
     * 
     * @example
     * ```typescript
     * if (InterceptorFactory.isTypeSupported("CustomType")) {
     *   // Safe to use this type
     * } else {
     *   throw new Error("Unsupported interceptor type");
     * }
     * ```
     */
    static isTypeSupported(type: string): boolean {
        return this.getSupportedTypes().includes(type);
    }
}
