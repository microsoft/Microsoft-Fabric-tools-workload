import { Item } from "src/clients";
import { IItemPartInterceptorConfig, StringReplacementInterceptorConfig } from "../PackageInstallerItemModel";

export abstract class tInterceptor<T extends IItemPartInterceptorConfig> {

    constructor(public config: T) {
        if (!config) {
            throw new Error("Interceptor configuration is required");
        }    
    }

    /**
     * Intercepts the content of a package item part.
     * @param content The original content of the item part encoded in base64.
     * @returns The modified content of the item part.
     */

    async interceptContent(content: string, item?: Item): Promise<string> {
        if (!content) {
            throw new Error("Content to intercept cannot be empty");
        }
        // Decode the base64 content
        const decodedContent = atob(content);
        const variables: Record<string, string> = {};
        if(item) {
            variables["{{WORKSPACE_ID}}"] = item.workspaceId;
            variables["{{ITEM_ID}}"] = item.id;
            variables["{{FOLDER_ID}}"] = item.folderId || "";
        }
        // Perform the interception logic
        const modifiedContent = await this.interceptContentInt(decodedContent, variables);
        // Return the modified content encoded in base64
        return btoa(modifiedContent);
    }

    abstract interceptContentInt(content: string, variables: Record<string, string>): Promise<string>;
}

export class StringReplaceInterceptor extends tInterceptor<StringReplacementInterceptorConfig> {
  
    constructor(config: StringReplacementInterceptorConfig) {
        super(config);
    }

    async interceptContentInt(content: string, variables: Record<string, string>): Promise<string> {
        const replacements: { [key: string]: string } = {};
        for (const key in this.config.replacements) {
            const value = this.config.replacements[key];
            //check if value is in variables then us that value
            if(variables[value]) {
                replacements[key] = variables[value];
            } else {
                replacements[key] = value;
            }
        }

        let modifiedContent = content;
        for (const [search, replacement] of Object.entries(replacements)) {
            modifiedContent = modifiedContent.replace(new RegExp(search, 'g'), replacement as string);
        }
        return modifiedContent;
    }
}

/**
 * Factory for creating PackageItemPartInterceptor instances based on configuration type.
 */
export class InterceptorFactory {
    
    /**
     * Creates an interceptor instance based on the provided configuration.
     * @param config The interceptor configuration
     * @returns An instance of the appropriate interceptor
     */
    static createInterceptor(config: IItemPartInterceptorConfig): tInterceptor<IItemPartInterceptorConfig> {
        if (!config) {
            throw new Error("Interceptor configuration is required");
        }

        switch (config.type) {
            case "StringReplacement":
                return new StringReplaceInterceptor(config as StringReplacementInterceptorConfig);
            default:
                throw new Error(`Unsupported interceptor type: ${config.type}`);
        }
    }

    /**
     * Creates multiple interceptor instances from an array of configurations.
     * @param configs Array of interceptor configurations
     * @returns Array of interceptor instances
     */
    static createInterceptors(configs: IItemPartInterceptorConfig[]): tInterceptor<IItemPartInterceptorConfig>[] {
        if (!configs || configs.length === 0) {
            return [];
        }

        return configs.map(config => this.createInterceptor(config));
    }

    /**
     * Gets all supported interceptor types.
     * @returns Array of supported interceptor type names
     */
    static getSupportedTypes(): string[] {
        return ["StringReplacement"];
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

/**
 * Registry for managing PackageItemPartInterceptor types and their constructors.
 */
export class PackageItemPartInterceptorRegistry {
    private static readonly interceptorMap = new Map<string, new (config: any) => tInterceptor<any>>();
    
    static {
        // Register built-in interceptors
        this.register("StringReplacement", StringReplaceInterceptor);
    }

    /**
     * Registers an interceptor class for a specific type.
     * @param type The interceptor type name
     * @param interceptorClass The interceptor class constructor
     */
    static register<T extends IItemPartInterceptorConfig>(
        type: string, 
        interceptorClass: new (config: T) => tInterceptor<T>
    ): void {
        if (!type) {
            throw new Error("Interceptor type cannot be empty");
        }
        if (!interceptorClass) {
            throw new Error("Interceptor class is required");
        }
        
        this.interceptorMap.set(type, interceptorClass);
    }

    /**
     * Unregisters an interceptor type.
     * @param type The interceptor type to unregister
     * @returns True if the type was unregistered, false if it didn't exist
     */
    static unregister(type: string): boolean {
        return this.interceptorMap.delete(type);
    }

    /**
     * Creates an interceptor instance using the registry.
     * @param config The interceptor configuration
     * @returns An instance of the appropriate interceptor
     */
    static createInterceptor(config: IItemPartInterceptorConfig): tInterceptor<IItemPartInterceptorConfig> {
        if (!config) {
            throw new Error("Interceptor configuration is required");
        }

        const InterceptorClass = this.interceptorMap.get(config.type);
        if (!InterceptorClass) {
            throw new Error(`Unsupported interceptor type: ${config.type}. Available types: ${this.getRegisteredTypes().join(", ")}`);
        }

        return new InterceptorClass(config);
    }

    /**
     * Gets all registered interceptor types.
     * @returns Array of registered interceptor type names
     */
    static getRegisteredTypes(): string[] {
        return Array.from(this.interceptorMap.keys());
    }

    /**
     * Checks if an interceptor type is registered.
     * @param type The interceptor type to check
     * @returns True if the type is registered, false otherwise
     */
    static isRegistered(type: string): boolean {
        return this.interceptorMap.has(type);
    }

    /**
     * Clears all registered interceptors.
     */
    static clear(): void {
        this.interceptorMap.clear();
    }

    /**
     * Gets the number of registered interceptors.
     * @returns The count of registered interceptors
     */
    static getRegisteredCount(): number {
        return this.interceptorMap.size;
    }
}
