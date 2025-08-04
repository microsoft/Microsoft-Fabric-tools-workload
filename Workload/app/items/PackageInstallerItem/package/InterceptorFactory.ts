import { ItemPartInterceptorDefinition, ItemPartInterceptorDefinitionConfig, ReferenceInterceptorDefinitionConfig, StringReplacementInterceptorDefinitionConfig} from "../PackageInstallerItemModel";
import { DeploymentContext } from "../deployment/DeploymentContext";

export abstract class Interceptor<T extends ItemPartInterceptorDefinitionConfig> {

    protected definition: ItemPartInterceptorDefinition<T>;
    protected depContext: DeploymentContext;

    constructor(definition: ItemPartInterceptorDefinition<T>, depContext: DeploymentContext) {
        if (!definition) {
            throw new Error("Interceptor definition is required");
        }
        this.definition = definition;
        this.depContext = depContext;
    }

    /**
     * Intercepts the content of a package item part.
     * @param content The original content of the item part encoded in base64.
     * @returns The modified content of the item part.
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

    protected abstract interceptContentInt(content: string, systemVariables: Record<string, string>): Promise<string>;
}

export class ReferenceInterceptor extends Interceptor<ReferenceInterceptorDefinitionConfig> {
    constructor(definition: ItemPartInterceptorDefinition<ReferenceInterceptorDefinitionConfig>, depContext: DeploymentContext) {
        super(definition, depContext);
    }

    protected async interceptContentInt(content: string, systemVariables: Record<string, string>): Promise<string> {
        let modifiedContent = content;
        
        const globalInterceptors = this.depContext.pack.deploymentConfig?.globalInterceptors;
        const globalInterceptorId = this.definition.config.globalInterceptorId;

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

export class StringReplaceInterceptor extends Interceptor<StringReplacementInterceptorDefinitionConfig> {

    constructor(definition: ItemPartInterceptorDefinition<StringReplacementInterceptorDefinitionConfig>, 
        depContext: DeploymentContext) {
        super(definition, depContext);
    }

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
 * Factory for creating PackageItemParInterceptor instances based on configuration type.
 */
export class InterceptorFactory {
    
    /**
     * Creates an interceptor instance based on the provided configuration.
     * @param interceptorDef The interceptor definition
     * @returns An instance of the appropriate interceptor
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
     * @param interceptors Array of interceptor definitions
     * @returns Array of interceptor instances
     */
    static createInterceptors(interceptors: ItemPartInterceptorDefinition<any>[], depContext: DeploymentContext): Interceptor<any>[] {
        if (!interceptors || interceptors.length === 0) {
            return [];
        }
        return interceptors.map(interceptor => this.createInterceptor(interceptor, depContext));
    }

    /**
     * Gets all supported interceptor types.
     * @returns Array of supported interceptor type names
     */
    static getSupportedTypes(): string[] {
        return ["Reference", "StringReplacement"];
    }

    /**
     * Checks if an interceptor type is supported.
     * @param type The interceptor type to check
     * @returns True if the type is supported, false otherwise
     */
    static isTypeSupported(type: string): boolean {
        return this.getSupportedTypes().includes(type);
    }
}
