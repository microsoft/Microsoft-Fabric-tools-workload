# Integration Guide for Developers

This guide explains how developers can integrate the PackageInstallerItem's deployment and packaging functionality into their own custom items while maintaining the original PackageInstallerItem for easy updates.

## Overview

The PackageInstallerItem is designed with a modular architecture that allows developers to reuse its core functionality without duplicating code. This approach ensures that updates to the deployment strategies and package management features can be easily inherited by custom implementations.

## Architecture Benefits

By keeping the original PackageInstallerItem intact and referencing its code from your custom item, you get:

- **Automatic Updates**: Bug fixes and feature enhancements flow to your implementation
- **Reduced Maintenance**: No need to maintain duplicate deployment logic
- **Consistent Behavior**: Same deployment patterns across different items
- **Tested Components**: Leverage thoroughly tested deployment strategies

## Integration Approaches

### 1. Component-Level Integration

#### Reusing Deployment Strategies

Import and use the deployment strategies directly in your custom item:

```typescript
// In your custom item: MyCustomItem/MyCustomItemEditor.tsx
import { 
  DeploymentStrategy,
  UXDeploymentStrategy,
  SparkLivyDeploymentStrategy,
  DeploymentContext
} from '../PackageInstallerItem/deployment';
import { PackageDefinition } from '../PackageInstallerItem/PackageInstallerItemModel';

export function MyCustomItemEditor(props: MyCustomItemProps) {
  const [deploymentContext] = useState(new DeploymentContext(props.workloadClient));
  
  const handleDeploy = async (packageDef: PackageDefinition) => {
    // Use the same deployment strategies
    const strategy = new UXDeploymentStrategy(deploymentContext);
    const result = await strategy.executeDeployment(packageDef);
    
    // Handle results in your custom UI
    updateCustomUI(result);
  };
  
  return (
    <div>
      {/* Your custom UI */}
      <CustomPackageSelector onDeploy={handleDeploy} />
    </div>
  );
}
```

#### Reusing Package Management

```typescript
// In your custom item: MyCustomItem/MyCustomItemController.ts
import { 
  PackageRegistry,
  BasePackageStrategy,
  PackageStrategyFactory,
  PackageStrategyType
} from '../PackageInstallerItem/package';

export class MyCustomItemController {
  private packageRegistry: PackageRegistry;
  
  constructor(workloadClient: WorkloadClient) {
    this.packageRegistry = new PackageRegistry(workloadClient);
  }
  
  async createCustomPackage(selectedItems: Item[]) {
    // Reuse package creation logic
    const strategy = PackageStrategyFactory.createStrategy(
      PackageStrategyType.Standard,
      this.context,
      this.editorItem
    );
    
    const packageId = `custom-${Date.now()}`;
    const packagePath = await strategy.createPackageFromItems(
      selectedItems,
      packageId,
      "My Custom Package",
      "Created from custom item"
    );
    
    return packagePath;
  }
}
```

### 2. UI Component Integration

#### Reusing Deployment Dialogs

```typescript
// In your custom item
import { DeploymentDialog } from '../PackageInstallerItem/components/DeploymentDialog';
import { WorkspaceDropdown, CapacityDropdown } from '../PackageInstallerItem/components';

export function MyCustomDeploymentView(props: MyCustomProps) {
  return (
    <div className="my-custom-deployment">
      {/* Your custom header */}
      <h2>Deploy from My Custom Item</h2>
      
      {/* Reuse proven UI components */}
      <WorkspaceDropdown 
        selectedWorkspaceId={props.workspaceId}
        onWorkspaceChange={props.onWorkspaceChange}
        workloadClient={props.workloadClient}
      />
      
      <CapacityDropdown
        selectedCapacityId={props.capacityId}
        onCapacityChange={props.onCapacityChange}
        workloadClient={props.workloadClient}
      />
      
      {/* Reuse deployment dialog */}
      <DeploymentDialog
        isOpen={props.showDeployDialog}
        package={props.selectedPackage}
        onDeploy={props.onDeploy}
        onCancel={props.onCancel}
        workloadClient={props.workloadClient}
      />
    </div>
  );
}
```

#### Reusing Package Selection

```typescript
// Reuse package selection components
import { PackageSelectionView } from '../PackageInstallerItem/PackageSelectionView';

export function MyCustomPackageSelector(props: MyCustomProps) {
  return (
    <div className="my-custom-selector">
      <div className="custom-header">
        {/* Your custom branding/instructions */}
        <h3>Select Package for My Custom Workflow</h3>
      </div>
      
      {/* Reuse the proven package selection UI */}
      <PackageSelectionView
        workloadClient={props.workloadClient}
        onPackageSelected={props.onPackageSelected}
        allowedPackageTypes={props.customAllowedTypes}
        customFilters={props.customFilters}
      />
      
      <div className="custom-actions">
        {/* Your custom action buttons */}
        <button onClick={props.onCustomAction}>
          Process with Custom Logic
        </button>
      </div>
    </div>
  );
}
```

### 3. Service-Level Integration

#### Creating a Deployment Service Wrapper

```typescript
// MyCustomItem/services/CustomDeploymentService.ts
import { 
  DeploymentContext,
  DeploymentStrategy,
  UXDeploymentStrategy,
  DeploymentResult
} from '../../PackageInstallerItem/deployment';

export class CustomDeploymentService {
  private deploymentContext: DeploymentContext;
  
  constructor(workloadClient: WorkloadClient) {
    this.deploymentContext = new DeploymentContext(workloadClient);
  }
  
  async deployWithCustomLogic(
    packageDef: PackageDefinition,
    customOptions: CustomDeploymentOptions
  ): Promise<CustomDeploymentResult> {
    
    // Pre-deployment custom logic
    await this.executePreDeploymentHooks(customOptions);
    
    // Use the proven deployment strategy
    const strategy = new UXDeploymentStrategy(this.deploymentContext);
    const standardResult = await strategy.executeDeployment(packageDef);
    
    // Post-deployment custom logic
    const customResult = await this.executePostDeploymentHooks(
      standardResult, 
      customOptions
    );
    
    return {
      standardResult,
      customResult,
      combinedStatus: this.calculateCombinedStatus(standardResult, customResult)
    };
  }
  
  private async executePreDeploymentHooks(options: CustomDeploymentOptions) {
    // Your custom pre-deployment logic
  }
  
  private async executePostDeploymentHooks(
    result: DeploymentResult, 
    options: CustomDeploymentOptions
  ) {
    // Your custom post-deployment logic
  }
}
```

### 4. Configuration and Customization

#### Custom Configuration with Base Functionality

```typescript
// MyCustomItem/MyCustomItemModel.ts
import { 
  PackageDefinition,
  DeploymentConfiguration 
} from '../PackageInstallerItem/PackageInstallerItemModel';

export interface MyCustomItemDefinition {
  // Inherit standard package functionality
  packageConfig: PackageDefinition;
  deploymentConfig: DeploymentConfiguration;
  
  // Add your custom properties
  customWorkflow: CustomWorkflowConfig;
  integrationSettings: IntegrationSettings;
  customValidationRules: ValidationRule[];
}

export interface CustomWorkflowConfig {
  enableCustomPreProcessing: boolean;
  customNotificationSettings: NotificationSettings;
  integrationEndpoints: string[];
}
```

## Best Practices

### 1. Maintain Separation of Concerns

```typescript
// Good: Separate your custom logic from core functionality
class MyCustomItemLogic {
  private deploymentService: CustomDeploymentService; // Wraps PackageInstallerItem logic
  private customBusinessLogic: MyCustomBusinessLogic; // Your specific logic
  
  async processCustomWorkflow(input: CustomInput) {
    // Your custom validation
    const validatedInput = await this.customBusinessLogic.validate(input);
    
    // Convert to standard package format
    const packageDef = this.customBusinessLogic.convertToPackage(validatedInput);
    
    // Use proven deployment logic
    return await this.deploymentService.deploy(packageDef);
  }
}
```

### 2. Extend Rather Than Modify

```typescript
// Good: Extend base functionality
export class ExtendedPackageStrategy extends BasePackageStrategy {
  async createPackageFromItems(items: Item[]): Promise<string> {
    // Add custom validation
    await this.validateCustomRequirements(items);
    
    // Call parent implementation
    const result = await super.createPackageFromItems(items);
    
    // Add custom post-processing
    await this.applyCustomPostProcessing(result);
    
    return result;
  }
  
  private async validateCustomRequirements(items: Item[]) {
    // Your custom validation logic
  }
}
```

### 3. Use Dependency Injection

```typescript
// Good: Use dependency injection for testability and flexibility
export class MyCustomItemEditor {
  constructor(
    private workloadClient: WorkloadClient,
    private deploymentService: CustomDeploymentService = new CustomDeploymentService(workloadClient),
    private packageRegistry: PackageRegistry = new PackageRegistry(workloadClient)
  ) {}
  
  // Your implementation can easily test with mock services
}
```

## File Structure Recommendations

```text
Workload/app/items/
├── PackageInstallerItem/          # Keep original for updates
│   ├── deployment/                # Core deployment strategies
│   ├── package/                   # Core package management
│   ├── components/                # Reusable UI components
│   └── PackageInstallerItem*.tsx  # Original item files
│
└── MyCustomItem/                  # Your custom item
    ├── MyCustomItemEditor.tsx     # Your main UI
    ├── MyCustomItemModel.ts       # Your data models
    ├── services/                  # Your service layer
    │   ├── CustomDeploymentService.ts
    │   └── CustomBusinessLogic.ts
    ├── components/                # Your custom components
    │   ├── CustomWorkflowView.tsx
    │   └── CustomConfigView.tsx
    └── styles/
        └── MyCustomItem.scss
```

## Import Patterns

### Recommended Import Strategy

```typescript
// In your custom item files, import from PackageInstallerItem
import { 
  // Core services
  DeploymentContext,
  UXDeploymentStrategy,
  PackageRegistry,
  
  // UI components
  WorkspaceDropdown,
  DeploymentDialog,
  
  // Types and interfaces
  PackageDefinition,
  DeploymentResult,
  DeploymentConfiguration
} from '../PackageInstallerItem';

// Your custom types
import { 
  MyCustomItemDefinition,
  CustomWorkflowConfig 
} from './MyCustomItemModel';
```

### Barrel Exports (Recommended)

Create barrel exports in PackageInstallerItem for easier importing:

```typescript
// PackageInstallerItem/index.ts
export * from './deployment';
export * from './package';
export * from './components';
export * from './PackageInstallerItemModel';
export { WorkspaceDropdown, CapacityDropdown } from './components/dropdowns';
export { DeploymentDialog } from './components/DeploymentDialog';
```

## Update Strategy

### Keeping Your Custom Item Current

1. **Monitor PackageInstallerItem Updates**: Watch for changes in the deployment and package modules
2. **Test After Updates**: Verify your custom integrations after PackageInstallerItem updates
3. **Use Interface Contracts**: Rely on stable interfaces rather than implementation details
4. **Version Pinning**: Consider pinning to specific interface versions for stability

### Handling Breaking Changes

```typescript
// Use adapter pattern for handling breaking changes
export class DeploymentStrategyAdapter {
  constructor(private strategy: DeploymentStrategy) {}
  
  async deploy(packageDef: PackageDefinition): Promise<CustomResult> {
    // Adapt interface changes here
    const adaptedPackage = this.adaptPackageFormat(packageDef);
    const result = await this.strategy.executeDeployment(adaptedPackage);
    return this.adaptResultFormat(result);
  }
}
```

## Testing Your Integration

### Unit Testing with Mocks

```typescript
// Test your custom logic with mocked PackageInstallerItem services
describe('CustomDeploymentService', () => {
  let mockDeploymentStrategy: jest.Mocked<DeploymentStrategy>;
  let customService: CustomDeploymentService;
  
  beforeEach(() => {
    mockDeploymentStrategy = jest.createMockFromModule('../PackageInstallerItem/deployment');
    customService = new CustomDeploymentService(mockWorkloadClient);
    // Inject mock
    customService['deploymentContext'].setStrategy(mockDeploymentStrategy);
  });
  
  it('should execute custom workflow', async () => {
    // Test your custom logic while mocking the base functionality
  });
});
```

### Integration Testing

```typescript
// Test the actual integration with PackageInstallerItem components
describe('Custom Item Integration', () => {
  it('should work with real PackageInstallerItem deployment', async () => {
    // Test against real PackageInstallerItem code
    const deploymentContext = new DeploymentContext(testWorkloadClient);
    const strategy = new UXDeploymentStrategy(deploymentContext);
    
    // Your custom package
    const customPackage = await createTestPackage();
    
    // Should work with real deployment strategy
    const result = await strategy.executeDeployment(customPackage);
    expect(result.success).toBe(true);
  });
});
```

## Benefits Summary

By following this integration approach, you get:

✅ **Maintainability**: Updates to PackageInstallerItem automatically benefit your custom item  
✅ **Reliability**: Leverage thoroughly tested deployment and packaging logic  
✅ **Consistency**: Same behavior patterns across different items  
✅ **Flexibility**: Customize only what you need while reusing proven components  
✅ **Future-Proof**: Easy to adopt new features as they're added to PackageInstallerItem  

This approach ensures your custom item remains robust and up-to-date while providing the specific functionality your users need.