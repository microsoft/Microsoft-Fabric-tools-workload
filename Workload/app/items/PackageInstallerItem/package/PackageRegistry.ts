import { Package, DeploymentType, DeploymentLocation, ItemPartInterceptorType, ItemPartInterceptorDefinition, StringReplacementInterceptorDefinitionConfig } from '../PackageInstallerItemModel';

export type ConfiguredPackages = {
  [key: string]: Package;
};

// Helper function to convert interceptor config and create interceptor instance
export function convertInterceptor(definition: any): ItemPartInterceptorDefinition<any> | undefined {
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
        deploymentConfig.deploymentType = DeploymentType.UX;
        break;
      case "SparkNotebook":
        deploymentConfig.deploymentType = DeploymentType.SparkNotebook;
        break;
      default:
        throw new Error(`Unsupported deployment type: ${deploymentConfig.type}`);
    }
  } else {
    deploymentConfig.deploymentType = DeploymentType.UX; // Default to UX if not specified
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
        processedItem.definition.interceptor = convertInterceptor(processedItem.definition.interceptor);
      }
      
      // Process data interceptor if present
      if (processedItem.data?.interceptor) {
        processedItem.data.interceptor = convertInterceptor(processedItem.data.interceptor);
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

// Package Registry Class for dynamic package management
export class PackageRegistry {
  private packages: ConfiguredPackages = {};
  private initialized = false;

  // Load packages from asset config files
  async loadFromAssets(): Promise<void> {
    if (this.initialized) return;

    try {
      // Import config files from assets - adjust paths as needed
      const configModules: (() => Promise<any>)[] = [
        // Add your config file imports here
        () => import('../../../assets/items/PackageInstallerItem/NewWorkspace/package.json'),
        //() => import('../../../assets/items/PackageInstallerItem/SentimentAnalysis/package.json'),
        () => import('../../../assets/items/PackageInstallerItem/UnifiedAdminMonitoring/package.json'),
        () => import('../../../assets/items/PackageInstallerItem/SemanticModelAudit/package.json'),
        () => import('../../../assets/items/PackageInstallerItem/SemanticLinkLabs/package.json'),
        () => import('../../../assets/items/PackageInstallerItem/DAXPerformanceTesting/package.json'),
        //() => import('../../../assets/items/PackageInstallerItem/MDSF/package.json'),
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

  // Add a package dynamically
  addPackage(packageConfig: Package | any): void {
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

  // Download and add package from URL
  async addPackageFromUrl(url: string): Promise<void> {
    try {
      console.log(`Downloading package config from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON format');
      }
      
      const packageConfig = await response.json();
      
      // Validate that the downloaded content has required fields
      if (!packageConfig.id || !packageConfig.displayName) {
        throw new Error('Invalid package config: missing required fields (id, displayName)');
      }
      
      // Add the package to the registry
      this.addPackage(packageConfig);
      console.log(`Successfully added package from URL: ${packageConfig.name} (${packageConfig.id})`);
      
    } catch (error) {
      console.error(`Failed to add package from URL ${url}:`, error);
      throw error;
    }
  }

  // Remove a package
  removePackage(id: string): boolean {
    if (this.packages[id]) {
      delete this.packages[id];
      console.log(`Removed package: ${id}`);
      return true;
    }
    return false;
  }

  // Get all packages
  getAllPackages(): ConfiguredPackages {
    return { ...this.packages };
  }

  // Get packages as array
  getPackagesArray(): Package[] {
    return Object.values(this.packages);
  }

  // Get specific package
  getPackage(id: string): Package | undefined {
    return this.packages[id];
  }

  // Check if package exists
  hasPackage(id: string): boolean {
    return id in this.packages;
  }

  // Clear all packages
  clear(): void {
    this.packages = {};
    this.initialized = false;
  }
}

// Create global registry instance
export const packageRegistry = new PackageRegistry();

// Initialize packages from assets (call this during app startup)
export async function initializePackages(): Promise<void> {
  await packageRegistry.loadFromAssets();
}

// Utility function to load packages from a specific directory
export async function loadPackagesFromDirectory(packageConfigs: any[]): Promise<void> {
  packageConfigs.forEach(config => {
    try {
      packageRegistry.addPackage(config);
    } catch (error) {
      console.error('Failed to load package config:', error);
    }
  });
}

// Utility function to load packages from multiple URLs
export async function loadPackagesFromUrls(urls: string[]): Promise<void> {
  const results = await Promise.allSettled(
    urls.map(url => packageRegistry.addPackageFromUrl(url))
  );
  
  const successful = results.filter(result => result.status === 'fulfilled').length;
  const failed = results.filter(result => result.status === 'rejected').length;
  
  console.log(`Package loading complete: ${successful} successful, ${failed} failed`);
  
  if (failed > 0) {
    console.warn('Some packages failed to load:', 
      results
        .filter(result => result.status === 'rejected')
        .map((result, index) => ({ url: urls[index], error: result.reason }))
    );
  }
}