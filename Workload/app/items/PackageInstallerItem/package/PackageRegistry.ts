import { Package, DeploymentType, DeploymentLocation, ItemPartInterceptorType, ItemPartInterceptorDefinition, StringReplacementInterceptorDefinitionConfig, ReferenceInterceptorDefinitionConfig, DeploymentConfiguration } from '../PackageInstallerItemModel';

export type ConfiguredPackages = {
  [key: string]: Package;
};

// Helper function to convert interceptor config and create interceptor instance
export function convertInterceptor(definition: any, deploymentConfig: DeploymentConfiguration): ItemPartInterceptorDefinition<any> | undefined {
  if (!definition) return undefined;
  
  // Validate interceptor structure
  if (!definition.type) {
    throw new Error('Interceptor type is required');
  }
  
  // Convert string interceptor type to enum and validate configuration
  let interceptorType: ItemPartInterceptorType;
  let config: any;
  
  if (typeof definition.type === 'string') {
    switch (definition.type) {
      case "Reference":
        interceptorType = ItemPartInterceptorType.Reference;
        
        if (!definition.config.id) {
          throw new Error('Reference interceptor requires an id that is referenced');
        }
        if (!deploymentConfig.globalInterceptors || !deploymentConfig.globalInterceptors[definition.config.id]) {
          throw new Error(`Global interceptor with ID '${definition.config.id}' not found`);
        }
        config = {
          id: definition.config.id
        } as ReferenceInterceptorDefinitionConfig;
        break;
      case "StringReplacement":
        interceptorType = ItemPartInterceptorType.StringReplacement;
        
        // Validate StringReplacementInterceptorDefinitionConfig structure
        if (!definition.config.replacements || typeof definition.config.replacements !== 'object') {
          throw new Error('StringReplacement interceptor requires a "replacements" object with key-value pairs');
        }
        
        // Validate that replacements is not an array and has string values
        if (Array.isArray(definition.config.replacements)) {
          throw new Error('StringReplacement interceptor "replacements" must be an object, not an array');
        }
        
        // Validate that all replacement values are strings
        for (const [key, value] of Object.entries(definition.config.replacements)) {
          if (typeof value !== 'string') {
            throw new Error(`StringReplacement interceptor replacement value for key "${key}" must be a string, got ${typeof value}`);
          }
        }
        
        // Create proper StringReplacementInterceptorDefinitionConfig
        config = {
          replacements: definition.config.replacements
        } as StringReplacementInterceptorDefinitionConfig;
        break;
        
      default:
        throw new Error(`Unsupported interceptor type: ${definition.type}`);
    }
  } else {
    throw new Error('Interceptor type must be specified as a string');
  }

  // Create the interceptor definition
  const interceptorDefinition: ItemPartInterceptorDefinition<any> = {
    type: interceptorType,
    config: config
  };

  // Use InterceptorFactory to create the actual interceptor instance
  return interceptorDefinition;
}

// Helper function to convert config JSON to Package interface
export function convertConfigToPackage(pack: any): Package {
  // Ensure deploymentConfig is defined;
  const deploymentConfig = {
    ...pack.deploymentConfig
  }
  // Convert string deployment type to enum
  if (typeof deploymentConfig.type === 'string') {
    switch (deploymentConfig.type) {
      case "UX":
        deploymentConfig.type = DeploymentType.UX;
        break;
      case "SparkNotebook":
        deploymentConfig.type = DeploymentType.SparkNotebook;
        break;
      default:
        throw new Error(`Unsupported deployment type: ${deploymentConfig.type}`);
    }
  } else {
    deploymentConfig.type = DeploymentType.UX; // Default to UX if not specified
  }

  // Convert string location type to enum  
  if (typeof deploymentConfig.location === 'string') {
  switch (deploymentConfig.location) {
      case "Default":
        deploymentConfig.location = DeploymentLocation.Default;
        break;
      case "NewWorkspace":
        deploymentConfig.location = DeploymentLocation.NewWorkspace;
        break;
      default:
        deploymentConfig.location = DeploymentLocation.Default; // Default to Default if not specified
    }
  } else {
    deploymentConfig.location = DeploymentLocation.Default;
  }

  if(deploymentConfig.suffixItemNames === undefined) {
    switch (deploymentConfig.location) {
      case DeploymentLocation.Default:
        deploymentConfig.suffixItemNames = true; //need to make sure we suffix for item name conflicts
        break;
      case DeploymentLocation.NewWorkspace:
        deploymentConfig.suffixItemNames = false;
        break;
    }
  }

  // Process items and their interceptors
  const processedItems = pack.items?.map((item: any) => {
    try {
      const processedItem = { ...item };
      
      // Process definition interceptor if present
      if (processedItem.definition?.interceptor) {
        processedItem.definition.interceptor = convertInterceptor(processedItem.definition.interceptor, deploymentConfig);
      }
      
      // Process data interceptor if present
      if (processedItem.data?.interceptor) {
        processedItem.data.interceptor = convertInterceptor(processedItem.data.interceptor, deploymentConfig);
      }
      
      return processedItem;
    } catch (error) {
      console.error(`Failed to process interceptors for item ${item.displayName}:`, error);
      throw error;
    }
  }) || [];

  return {
    id: pack.id,
    deploymentConfig: deploymentConfig,
    displayName: pack.displayName,
    description: pack.description,
    icon: pack.icon,
    items: processedItems
  };
}

/**
 * Package Registry Class for dynamic package management
 */
export class PackageRegistry {
  private packages: ConfiguredPackages = {};
  private initialized = false;

  /**
   * Loads package configurations from asset files.
   */
  async loadFromAssets(): Promise<void> {
    console.log('PackageRegistry.loadFromAssets() called, initialized:', this.initialized);
    
    if (this.initialized) {
      console.log('PackageRegistry already initialized, skipping asset loading');
      return;
    }

    try {
      console.log('Loading packages from assets...');
      // Import config files from assets - adjust paths as needed
      const configModules: (() => Promise<any>)[] = [
        // Add your config file imports here
        () => import('../../../assets/items/PackageInstallerItem/NewWorkspace/package.json'),
        //() => import('../../../assets/items/PackageInstallerItem/SentimentAnalysis/package.json'),
        () => import('../../../assets/items/PackageInstallerItem/UnifiedAdminMonitoring/package.json'),
        () => import('../../../assets/items/PackageInstallerItem/SemanticModelAudit/package.json'),
        () => import('../../../assets/items/PackageInstallerItem/SemanticLinkLabs/package.json'),
        () => import('../../../assets/items/PackageInstallerItem/DAXPerformanceTesting/package.json'),
      ];

      // Load all config files
      const configs = await Promise.all(
        configModules.map(async (importFn: () => Promise<any>) => {
          try {
            const module = await importFn();
            return module.default || module;
          } catch (error) {
            console.warn('Failed to load package config:', error);
            return null;
          }
        })
      );

      // Convert and register packages
      configs
        .filter(config => config !== null)
        .forEach(config => {
          try {
            const packageObj = convertConfigToPackage(config);
            this.packages[packageObj.id] = packageObj;
            console.log('Successfully loaded package:', packageObj.id);
          } catch (error) {
            console.error('Failed to convert package config:', error);
          }
        });

      this.initialized = true;
      console.log(`Loaded ${Object.keys(this.packages).length} packages from assets`);
    } catch (error) {
      console.error('Failed to load packages from assets:', error);
      this.initialized = true; // Mark as initialized even on failure to prevent retries
    }
  }

  /**
   * Adds a package dynamically.
   * @param packageConfig - The package configuration to add.
   */
  addPackage(packageConfig: Package): void {
    try {
      const packageObj = typeof packageConfig.id === 'string' 
        ? packageConfig as Package 
        : convertConfigToPackage(packageConfig);
      
      this.packages[packageObj.id] = packageObj;
      console.log(`Added package: ${packageObj.id}`);
    } catch (error) {
      console.error('Failed to add package:', error);
      throw error;
    }
  }

  /**
   * Removes a package dynamically.
   * @param id - The ID of the package to remove.
   */
  removePackage(id: string): boolean {
    if (this.packages[id]) {
      delete this.packages[id];
      console.log(`Removed package: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Gets all packages.
   */
  getAllPackages(): ConfiguredPackages {
    return { ...this.packages };
  }

  /**
   * Gets all packages as an array.
   */
  getPackagesArray(): Package[] {
    return Object.values(this.packages);
  }

  /**
   * Gets a specific package.
   * @param id - The ID of the package to retrieve.
   * @returns The package if found, or undefined.
   */
  getPackage(id: string): Package | undefined {
    return this.packages[id];
  }

  /**
   * Checks if a package exists.
   * @param id - The ID of the package to check.
   * @returns True if the package exists, false otherwise.
   */
  hasPackage(id: string): boolean {
    return id in this.packages;
  }

  /**
   * Clears all packages.
   */
  clear(): void {
    this.packages = {};
    this.initialized = false;
  }
}

/**
 * Global package registry instance.
 */
export const packageRegistry = new PackageRegistry();

/**
 * Initialize packages from assets (call this during app startup)
 */
export async function initializePackages(): Promise<void> {
  await packageRegistry.loadFromAssets();
}

/**
 * Utility function to load packages from a specific directory
 */
export async function loadPackagesFromDirectory(packageConfigs: any[]): Promise<void> {
  packageConfigs.forEach(config => {
    try {
      packageRegistry.addPackage(config);
    } catch (error) {
      console.error('Failed to load package config:', error);
    }
  });
}
