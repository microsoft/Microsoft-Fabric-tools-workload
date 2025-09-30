# PackageInstallerItem - Deployment Flow

## Deployment Strategy Architecture

```mermaid
flowchart TD
    A[User Initiates Deployment] --> B[Select Package & Configuration]
    B --> C[Validate Deployment Prerequisites]
    C --> D{Deployment Strategy}
    
    subgraph "UX Deployment Strategy"
        D -->|UX| E[Direct API Deployment]
        E --> F[Create/Validate Workspace]
        F --> G[Create/Validate Folder]
        G --> H[Process Items Sequentially]
        H --> I[Create Fabric Item]
        I --> J[Update Item Definition]
        J --> K[Upload Data to OneLake]
        K --> L{More Items?}
        L -->|Yes| H
        L -->|No| M[Complete Deployment]
    end
    
    subgraph "Spark Notebook Strategy"
        D -->|Spark| N[Create Deployment Notebook]
        N --> O[Upload Package Data]
        O --> P[Submit Spark Job]
        P --> Q[Monitor Job Status]
        Q --> R{Job Complete?}
        R -->|No| S[Wait & Check Status]
        S --> Q
        R -->|Yes| T{Job Success?}
        T -->|No| U[Handle Deployment Error]
        T -->|Yes| V[Process Deployment Results]
        V --> M
    end
    
    M --> W[Update Deployment Status]
    W --> X[Notify User]
    X --> Y[Log Deployment History]
    
    style E fill:#e3f2fd
    style N fill:#fff3e0
    style M fill:#e8f5e8
    style U fill:#ffebee
```

## UX Deployment Strategy Flow

### 1. Prerequisites Validation

```mermaid
flowchart LR
    A[Validate Prerequisites] --> B{Workspace Exists?}
    B -->|No| C[Create New Workspace]
    B -->|Yes| D[Validate Permissions]
    C --> E[Assign Capacity]
    E --> F[Configure Workspace]
    F --> D
    D --> G{Folder Required?}
    G -->|Yes| H[Create/Validate Folder]
    G -->|No| I[Start Item Deployment]
    H --> I
```

### 2. Item Deployment Pipeline

```typescript
async deployPackage(package: Package, deployment: PackageDeployment) {
    // 1. Workspace Setup
    const workspace = await this.setupWorkspace(deployment.workspace);
    
    // 2. Folder Setup (if required)
    const folder = await this.setupFolder(workspace, deployment.workspace?.folder);
    
    // 3. Deploy Items
    for (const item of package.items) {
        const deployedItem = await this.deployItem(item, workspace, folder);
        deployment.deployedItems.push(deployedItem);
        
        // Real-time progress update
        this.updateProgress(deployment, deployedItem);
    }
    
    // 4. Deploy Data Files
    await this.deployDataFiles(package.data, workspace);
    
    // 5. Run Post-Deployment Jobs
    await this.runOnFinishJobs(deployment.onFinishJobs);
}
```

### 3. Real-time Progress Tracking

- **Item Creation**: Track individual item creation status
- **Definition Updates**: Monitor definition part uploads
- **Data Upload**: Track OneLake file upload progress
- **Error Recovery**: Handle and retry failed operations
- **User Notifications**: Real-time status updates in UI

## Spark Notebook Deployment Strategy Flow

### 1. Notebook Generation

```mermaid
flowchart TD
    A[Generate Deployment Notebook] --> B[Template Processing]
    B --> C[Variable Substitution]
    C --> D[Package Data Integration]
    D --> E[Error Handling Logic]
    E --> F[Progress Reporting Code]
    F --> G[Upload Notebook to Workspace]
```

### 2. Job Execution Pipeline

```typescript
async deployViaSpark(package: Package, deployment: PackageDeployment) {
    // 1. Create deployment notebook
    const notebook = await this.generateDeploymentNotebook(package, deployment);
    
    // 2. Upload notebook to workspace
    const notebookItem = await this.uploadNotebook(notebook, deployment.workspace);
    
    // 3. Submit Spark job
    const job = await this.sparkClient.submitJob({
        notebookId: notebookItem.id,
        parameters: {
            packageId: package.id,
            deploymentId: deployment.id,
            workspaceId: deployment.workspace.id
        }
    });
    
    // 4. Monitor job execution
    deployment.job = {
        id: job.id,
        item: notebookItem,
        startTime: new Date(),
        status: job.status
    };
    
    // 5. Poll for completion
    await this.monitorJobExecution(deployment);
}
```

### 3. Job Monitoring

- **Status Polling**: Regular job status checks
- **Progress Parsing**: Extract progress from job logs
- **Error Detection**: Identify and report job failures
- **Result Processing**: Parse deployment results from job output
- **Timeout Handling**: Handle long-running job scenarios

## Deployment Configuration Options

### Workspace Configuration

```typescript
interface WorkspaceConfig {
    createNew: boolean;
    id?: string;              // For existing workspace
    name?: string;            // For new workspace
    description?: string;
    capacityId?: string;      // F-SKU capacity assignment
    folder?: FolderConfig;    // Optional folder organization
}
```

### Deployment Types

#### UX Deployment
- **Use Case**: Interactive deployments, immediate feedback required
- **Best For**: Small to medium packages, development scenarios
- **Characteristics**: Real-time progress, direct API calls, immediate error handling

#### Spark Notebook Deployment
- **Use Case**: Large packages, automated pipelines, batch processing
- **Best For**: Production deployments, scheduled installations
- **Characteristics**: Asynchronous execution, scalable processing, job monitoring

## Error Handling Strategies

### UX Deployment Errors

```mermaid
flowchart TD
    A[Item Creation Error] --> B{Retry Possible?}
    B -->|Yes| C[Retry with Backoff]
    B -->|No| D[Mark Item Failed]
    C --> E{Retry Success?}
    E -->|Yes| F[Continue Deployment]
    E -->|No| D
    D --> G[Continue with Remaining Items]
    G --> H[Report Partial Success]
    F --> I[Complete Successfully]
```

### Spark Deployment Errors

- **Job Submission Failures**: Validate notebook and parameters before submission
- **Execution Errors**: Parse job logs for specific error details
- **Timeout Handling**: Implement job cancellation for stuck executions
- **Resource Constraints**: Handle capacity and quota limitations

## Performance Optimization

### UX Strategy Optimizations
- **Parallel Processing**: Deploy multiple items concurrently
- **Batch Operations**: Group similar operations together
- **Progress Batching**: Update UI progress efficiently
- **Resource Management**: Optimize API call patterns

### Spark Strategy Optimizations
- **Job Bundling**: Package multiple deployments in single job
- **Data Locality**: Optimize data placement for Spark processing
- **Resource Allocation**: Right-size Spark cluster for package size
- **Monitoring Efficiency**: Optimize job status polling intervals

## Deployment Status Management

### Status Transitions

```mermaid
stateDiagram-v2
    [*] --> Pending: Create Deployment
    Pending --> InProgress: Start Deployment
    InProgress --> Succeeded: Complete Successfully
    InProgress --> Failed: Error Occurred
    InProgress --> Cancelled: User Cancellation
    Failed --> InProgress: Retry Deployment
    Succeeded --> [*]
    Failed --> [*]
    Cancelled --> [*]
```

### Status Persistence
- **Database Storage**: Deployment history and status tracking
- **Real-time Updates**: Live status synchronization across UI
- **Audit Trail**: Complete deployment history with timestamps
- **Recovery Information**: Data needed for retry operations

## Integration Points

### Fabric Platform APIs
- **Items API**: Create and manage Fabric items
- **Workspaces API**: Workspace and folder management
- **OneLake API**: Data file upload and management
- **Capacity API**: F-SKU capacity assignment

### External Services
- **Spark Livy**: Job submission and monitoring
- **Notification Service**: User alerts and status updates
- **Authentication**: AAD integration for secure access
- **Logging**: Comprehensive deployment audit trails