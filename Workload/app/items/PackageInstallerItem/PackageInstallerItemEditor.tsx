import React, { useEffect, useState, useCallback } from "react";
import { Text, ProgressBar } from "@fluentui/react-components";
import { ContextProps, PageProps } from "../../App";
import { PackageInstallerItemRibbon } from "./PackageInstallerItemRibbon";
import { callGetItem, getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { useLocation, useParams } from "react-router-dom";
import "./PackageInstallerItem.scss";
import { useTranslation } from "react-i18next";
import { PackageDeployment, PackageInstallerItemDefinition, DeploymentStatus } from "./PackageInstallerItemModel";
import { PackageInstallerItemEmptyView } from "./PackageInstallerItemEmptyView";
import { PackageInstallerItemDefaultView } from "./PackageInstallerItemDefaultView";
import { callNotificationOpen } from "../../controller/NotificationController";
import { DeploymentDetailView } from "./DeploymentDetailView";
import { DeploymentStrategyFactory } from "./deployment/DeploymentStrategyFactory";
import { PackageInstallerContext } from "./package/PackageInstallerContext";
import { DeployPackageWizardResult } from "./components/DeployPackageWizard";
import { callDialogOpen } from "../../controller/DialogController";
import { NotificationType } from "@ms-fabric/workload-client";
import { callOpenSettings } from "../../controller/SettingsController";
import { PackageCreationStrategyFactory, PackageCreationStrategyType } from "./package/PackageCreationStrategyFactory";
import { OneLakeStorageClient } from "../../clients/OneLakeStorageClient";
import { ItemEditor } from "../../components/ItemEditor";

/**
 * Different views that are available for the PackageInstaller item
 */
export const EDITOR_VIEW_TYPES = {
  DEFAULT: "default",
  EMPTY: "empty",
  DEPLOYMENT: "deployment"
} as const;


export function PackageInstallerItemEditor(props: PageProps) {
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { workloadClient } = props;
  
  // State management following HelloWorldItem pattern
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<PackageInstallerItemDefinition>>();
  const [isUnsaved, setIsUnsaved] = useState<boolean>(false);
  const [selectedDeployment, setSelectedDeployment] = useState<PackageDeployment | undefined>(undefined);
  const [context, setContext] = useState<PackageInstallerContext>(new PackageInstallerContext(workloadClient));
  const [packageRegistryVersion, setPackageRegistryVersion] = useState<number>(0); // Force re-renders when packages change
  const [isDeploymentInProgress, setIsDeploymentInProgress] = useState<boolean>(false);
  const [deploymentProgress, setDeploymentProgress] = useState<{
    deploymentId: string;
    packageName: string;
    currentStep: string;
    progress: number;
  } | null>(null);
  const [currentViewSetter, setCurrentViewSetter] = useState<((view: string) => void) | null>(null);

  // Helper function to update item definition immutably
  const updateItemDefinition = useCallback((updates: Partial<PackageInstallerItemDefinition>) => {
    setItem(prevItem => {
      if (!prevItem) return prevItem;
      
      return {
        ...prevItem,
        definition: {
          ...prevItem.definition,
          ...updates
        }
      };
    });
    setIsUnsaved(true);
  }, []);

  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  // Effect to set the correct view after loading completes
  useEffect(() => {
    if (!isLoading && item && currentViewSetter) {
      // Only set view if we don't have a current view (initial load)
      // Don't override the current view if user is already navigated somewhere
      const hasDeployments = item.definition?.deployments?.length > 0;
      const correctInitialView = hasDeployments ? EDITOR_VIEW_TYPES.DEFAULT : EDITOR_VIEW_TYPES.EMPTY;
      
      // Only set the view if we're coming from initial load (when no view is set yet)
      // This preserves detail views and prevents unwanted navigation during item updates
      currentViewSetter(correctInitialView);
    }
  }, [isLoading, currentViewSetter]); // Removed 'item' dependency to prevent navigation on item updates

  // Prevent navigation when deployment is in progress
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDeploymentInProgress) {
        event.preventDefault();
        event.returnValue = 'A deployment is currently in progress. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      if (isDeploymentInProgress) {
        const confirmLeave = window.confirm('A deployment is currently in progress. Are you sure you want to leave?');
        if (!confirmLeave) {
          event.preventDefault();
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDeploymentInProgress]);

  async function openSettings() {
    if (item) {
      //TODO: this needs to be updated to use the Item instead of Itemv2
      const itemDetails = await callGetItem(workloadClient, item.id);
      await callOpenSettings(workloadClient, itemDetails.item, 'About');
    }
  }

  async function saveItemWithSuccessDialog(definition?: PackageInstallerItemDefinition) {
    console.log('PackageInstallerItemEditor: saveItemWithSuccessDialog called', { definition, item });
    try {
      const successResult = await SaveItem(definition);
      console.log('PackageInstallerItemEditor: Save result:', successResult);
      if (successResult) {
          callNotificationOpen(
              workloadClient,
              t("ItemEditor_Saved_Notification_Title"),
              t("ItemEditor_Saved_Notification_Text", { itemName: item.displayName }),
              undefined,
              undefined
          );
          console.log('PackageInstallerItemEditor: Success notification sent');
        } else {
          console.warn('PackageInstallerItemEditor: Save failed');
        }
    } catch (error) {
      console.error('PackageInstallerItemEditor: Error saving item:', error);
    }
  }

  async function SaveItem(definition?: PackageInstallerItemDefinition) {
    var successResult = await saveItemDefinition<PackageInstallerItemDefinition>(
      workloadClient,
      item.id,
      definition || item.definition);
    setIsUnsaved(!successResult); 
    return successResult;  
  }

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoading(true);
    var loadedItem: ItemWithDefinition<PackageInstallerItemDefinition> = undefined;    
    if (pageContext.itemObjectId) {
      // for Edit scenario we get the itemObjectId and then load the item via the workloadClient SDK
      try {
        loadedItem = await getWorkloadItem<PackageInstallerItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,          
        );
        
        // Ensure item definition is properly initialized without mutation
        if (!loadedItem.definition) {
          loadedItem = {
            ...loadedItem,
            definition: {
              deployments: []
            }
          };
        }
        const context = new PackageInstallerContext(workloadClient);
        await context.packageRegistry.loadFromAssets();
        if(loadedItem.definition?.oneLakePackages) {
          // Use Promise.all to wait for all packages to load
          await Promise.all(loadedItem.definition.oneLakePackages.map(async oneLakePath => {
            try {
              const oneLakeClient = new OneLakeStorageClient(workloadClient).createItemWrapper(loadedItem);
              const packJson = await oneLakeClient.readFileAsText(oneLakePath);
              const pack = JSON.parse(packJson);
              context.packageRegistry.addPackage(pack);
            } catch (error) {
              console.error(`Failed to add package from Onelake ${oneLakePath}:`, error);
            }
          }));
        }
        setContext(context);
        setItem(loadedItem);
        // Force re-render to show the loaded OneLake packages
        setPackageRegistryVersion(prev => prev + 1);        
      } catch (error) {
        setItem(undefined);        
      } 
    } else {
    }
    setIsUnsaved(false);
    setIsLoading(false);
  }

  // Helper functions that need to be implemented
  const handleRefreshDeployments = useCallback(async () => {
    if (!item?.definition?.deployments || !workloadClient) {
      return;
    }

    try {
      // Process all deployments that have job IDs (indicating they have been started)
      const deploymentsToUpdate = item.definition.deployments.filter(
        deployment => deployment.job && deployment.status !== DeploymentStatus.Succeeded && deployment.status !== DeploymentStatus.Failed && deployment.status !== DeploymentStatus.Cancelled
      );

      if (deploymentsToUpdate.length === 0) {
        callNotificationOpen(
          workloadClient,
          "No Updates Available",
          "No deployments require status updates.",
          NotificationType.Info,
          undefined
        );
        return;
      }

      // Process all deployments that need status updates
      const updatePromises = deploymentsToUpdate.map(async (deployment) => {
        try {
          const pack = context.getPackage(deployment.packageId);
          if (!pack) {
            console.warn(`Package with typeId ${deployment.packageId} not found`);
            return null;
          }

          // Create the deployment strategy and update status
          const strategy = DeploymentStrategyFactory.createStrategy(
            context,
            item,
            pack,
            deployment
          );

          const updatedDeployment = await strategy.updateDeploymentStatus();
          return updatedDeployment;
        } catch (error) {
          console.error(`Error updating deployment status for ${deployment.id}:`, error);
          return null;
        }
      });

      const updatedDeployments = await Promise.all(updatePromises);
      
      // Filter out null results and check if any deployments were actually updated
      const validUpdates = updatedDeployments.filter(
        (deployment): deployment is PackageDeployment => deployment !== null
      );

      if (validUpdates.length > 0) {
        // Update the deployments array with the new statuses
        const updatedDeploymentsArray = item.definition.deployments.map(deployment => {
          const updatedDeployment = validUpdates.find(updated => updated.id === deployment.id);
          return updatedDeployment || deployment;
        });

        const newItemDefinition: PackageInstallerItemDefinition = {
          ...item.definition,
          deployments: updatedDeploymentsArray
        };

        // Update the item definition and save changes
        updateItemDefinition(newItemDefinition);
        await SaveItem(newItemDefinition);

        callNotificationOpen(
          workloadClient,
          "Deployments Refreshed",
          `Successfully updated ${validUpdates.length} deployment(s).`,
          NotificationType.Success,
          undefined
        );
      } else {
        callNotificationOpen(
          workloadClient,
          "No Changes",
          "All deployments are up to date.",
          NotificationType.Info,
          undefined
        );
      }
    } catch (error) {
      console.error('Error during deployment status refresh:', error);
      callNotificationOpen(
        workloadClient,
        "Refresh Error",
        `Failed to refresh deployment statuses: ${error.message || error}`,
        NotificationType.Error,
        undefined
      );
    }
  }, [item, workloadClient, context, updateItemDefinition, SaveItem]);

  const uploadPackageJson = useCallback(async () => {
    try {
      // Use the HTML file input to get the file
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = async (event: any) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
          const fileContent = await file.text();
          
          const packageCreationStrategy = PackageCreationStrategyFactory.createStrategy(
            PackageCreationStrategyType.Standard,
            context,
            item
          );
          const packageResult = await packageCreationStrategy.createPackageFromJson(
            {
              displayName: undefined,
              description: undefined, 
              deploymentLocation: undefined
            },
            fileContent);

          // Add to additional packages list
          const currentAdditionalPackages = item?.definition?.oneLakePackages || [];
          const newItemDefinition: PackageInstallerItemDefinition = {
            ...item?.definition,
            oneLakePackages: [...currentAdditionalPackages, packageResult.oneLakeLocation]
          };
          
          // Update item definition
          updateItemDefinition(newItemDefinition);
          await SaveItem(newItemDefinition);
          
          // Refresh the package registry to show the new package
          try {
            const oneLakeClient = new OneLakeStorageClient(workloadClient).createItemWrapper(item);
            const packJson = await oneLakeClient.readFileAsText(packageResult.oneLakeLocation);
            const pack = JSON.parse(packJson);
            context.packageRegistry.addPackage(pack);
            // Force re-render to show the new package in the UI
            setPackageRegistryVersion(prev => prev + 1);
          } catch (error) {
            console.error(`Failed to add new package to registry:`, error);
          }
          
          // Add to package registry
          const packageJson = JSON.parse(fileContent);
          context.packageRegistry.addPackage(packageJson);
          
          callNotificationOpen(
            workloadClient,
            "Package Uploaded",
            `Successfully uploaded package: ${packageJson.displayName || packageJson.name}`,
            NotificationType.Success,
            undefined
          );
        } catch (error) {
          console.error('Error uploading package:', error);
          callNotificationOpen(
            workloadClient,
            "Upload Error",
            `Failed to upload package: ${error.message || error}`,
            NotificationType.Error,
            undefined
          );
        }
      };
      
      input.click();
    } catch (error) {
      callNotificationOpen(
        workloadClient,
        "Upload Error",
        "Failed to set up file upload.",
        NotificationType.Error,
        undefined
      );
    }
  }, [item, context, updateItemDefinition, SaveItem, workloadClient]);

  const createPackage = useCallback(async () => {
    try {
      const dialogResult = await callDialogOpen(
        workloadClient,
        process.env.WORKLOAD_NAME,
        `/PackageInstallerItem-packaging-wizard/${item.id}`,
        900, 700,
        true
      );

      if (dialogResult && dialogResult.value) {
        const result = dialogResult.value as { 
          state: 'package' | 'cancel'; 
          selectedItems?: any[]; 
          workspaceId?: string;
          packageDisplayName?: string;
          packageDescription?: string;
          deploymentLocation?: any;
          updateItemReferences?: boolean;
        };
        
        if (result.state === 'package' && result.selectedItems && result.selectedItems.length > 0) {
          const selectedItems = result.selectedItems;
          
          try {
            // Create the package strategy
            const packageCreationStrategy = PackageCreationStrategyFactory.createStrategy(
              PackageCreationStrategyType.Standard,
              context,
              item
            );
            
            const packageResult = await packageCreationStrategy.createPackageFromItems(
              {
                displayName: result.packageDisplayName,
                description: result.packageDescription,
                deploymentLocation: result.deploymentLocation
              },
              selectedItems
            );

            // Add to additional packages list
            const currentAdditionalPackages = item?.definition?.oneLakePackages || [];
            const newItemDefinition: PackageInstallerItemDefinition = {
              ...item?.definition,
              oneLakePackages: [...currentAdditionalPackages, packageResult.oneLakeLocation]
            };
            
            // Update item definition and save
            updateItemDefinition(newItemDefinition);
            await SaveItem(newItemDefinition);
            
            // Refresh the package registry to show the new package
            try {
              const oneLakeClient = new OneLakeStorageClient(workloadClient).createItemWrapper(item);
              const packJson = await oneLakeClient.readFileAsText(packageResult.oneLakeLocation);
              const pack = JSON.parse(packJson);
              context.packageRegistry.addPackage(pack);
              // Force re-render to show the new package in the UI
              setPackageRegistryVersion(prev => prev + 1);
            } catch (error) {
              console.error(`Failed to add new package to registry:`, error);
            }
            
            callNotificationOpen(
              workloadClient,
              "Package Created",
              `Successfully created package: ${result.packageDisplayName}`,
              NotificationType.Success,
              undefined
            );
          } catch (error) {
            console.error('Error creating package:', error);
            callNotificationOpen(
              workloadClient,
              "Package Creation Error", 
              `Failed to create package: ${error.message || error}`,
              NotificationType.Error,
              undefined
            );
          }
        }
      }
    } catch (error) {
      console.error('Error opening package creation dialog:', error);
      callNotificationOpen(
        workloadClient,
        "Dialog Error",
        "Failed to open package creation dialog.",
        NotificationType.Error,
        undefined
      );
    }
  }, [item, context, updateItemDefinition, SaveItem, workloadClient]);

  // Helper function for generating unique IDs
  const generateUniqueId = useCallback(() => {
    // Generate a shorter ID (9 characters) like before
    return Math.random().toString(36).substr(2, 9);
  }, []);

  const addDeployment = useCallback(async (packageId: string) => {
    // Find the package configuration that should be used for the deployment
    const pack = context.getPackage(packageId);
    if (pack) {
      const id = generateUniqueId();

      const createdDeployment: PackageDeployment = {
        id: id,
        status: DeploymentStatus.Pending,
        deployedItems: [],
        packageId: packageId,
      };

      const newItemDefinition: PackageInstallerItemDefinition = {
        ...item?.definition,
        deployments: Array.isArray(item?.definition?.deployments) 
          ? [...item.definition.deployments, createdDeployment]
          : [createdDeployment]
      };
      updateItemDefinition(newItemDefinition);
      
      // Save with the updated definition directly to avoid race condition
      await SaveItem(newItemDefinition);
      
      // Switch to home view to show the new deployment in the table
      // changeView will be available in the views function parameter    
    } else {      
      callNotificationOpen(
        workloadClient,
        "Package Not Found",
        `Package with ID ${packageId} was not found.`,
        NotificationType.Error,
        undefined
      );
    }
  }, [item, context, updateItemDefinition, SaveItem, workloadClient, generateUniqueId]);

  // Handle deployment update function
  const handleDeploymentUpdate = useCallback(async (updatedDeployment: PackageDeployment) => {
    // Update the deployments in the item definition
    if (item?.definition?.deployments) {
      const updatedDeployments = item.definition.deployments.map(deployment =>
        deployment.id === updatedDeployment.id ? updatedDeployment : deployment
      );
      
      const newItemDefinition: PackageInstallerItemDefinition = {
        ...item.definition,
        deployments: updatedDeployments
      };
      
      // Update the item definition and save changes
      updateItemDefinition(newItemDefinition);
      await SaveItem(newItemDefinition);
      
      if (updatedDeployment.status === DeploymentStatus.Succeeded) {
        handleRefreshDeployments();
      }
    }
  }, [item, updateItemDefinition, SaveItem, handleRefreshDeployments]);

  const handleStartDeployment = useCallback(async (deployment: PackageDeployment, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent row click from triggering
    }
    
    // Get the package to determine deployment location
    const pack = context.getPackage(deployment.packageId);
    const deploymentLocation = pack?.deploymentConfig.location;
    
    // Serialize package data to pass to dialog
    const packageDataParam = pack ? encodeURIComponent(JSON.stringify(pack)) : '';
    
    try {
      const dialogResult = await callDialogOpen(
        workloadClient,
        process.env.WORKLOAD_NAME,
        `/PackageInstallerItem-deploy-wizard/${item.id}?packageId=${deployment.packageId}&deploymentId=${deployment.id}&deploymentLocation=${deploymentLocation}&packageData=${packageDataParam}`,
        800, 600,
        true
      );
      
      const result = dialogResult.value as DeployPackageWizardResult;
      
      if (result && result.state === 'deploy') {
        // If a capacity was selected, update the deployment with the capacity info
        if (result.workspaceConfig) {
          deployment.workspace = {
            ...result.workspaceConfig          
          };
        }

        // Set deployment progress state
        setIsDeploymentInProgress(true);
        setDeploymentProgress({
          deploymentId: deployment.id,
          packageName: pack?.displayName || deployment.packageId,
          currentStep: 'Initializing deployment...',
          progress: 0
        });
      
        // Start the specific deployment strategy
        try {
          // Create the deployment strategy and start the deployment
          const strategy = DeploymentStrategyFactory.createStrategy(
            context,
            item,
            pack,
            deployment
          );

          // Update deployment progress callback
          const updateDeploymentProgress = (step: string, progress: number) => {
            setDeploymentProgress({
              deploymentId: deployment.id,
              packageName: pack?.displayName || deployment.packageId,
              currentStep: step,
              progress: progress
            });
          };

          // Start deployment and update status
          const updatedDeployment = await strategy.deploy(updateDeploymentProgress);
          await handleDeploymentUpdate(updatedDeployment);
          
          setIsDeploymentInProgress(false);
          setDeploymentProgress(null);
          
          // Show success notification
          if (updatedDeployment.status === DeploymentStatus.Succeeded) {
            callNotificationOpen(
              workloadClient,
              "Deployment Completed",
              `Successfully deployed package: ${pack?.displayName}`,
              NotificationType.Success,
              undefined
            );
          } else {
            callNotificationOpen(
              workloadClient,
              "Deployment Warning",
              `Deployment completed with status: ${DeploymentStatus[updatedDeployment.status]}`,
              NotificationType.Warning,
              undefined
            );
          }
        } catch (deploymentError) {
          console.error('Deployment execution failed:', deploymentError);
          setIsDeploymentInProgress(false);
          setDeploymentProgress(null);
          
          // Update deployment status to failed
          const failedDeployment: PackageDeployment = {
            ...deployment,
            status: DeploymentStatus.Failed,
            triggeredTime: new Date(),
            triggeredBy: "User"
          };
          await handleDeploymentUpdate(failedDeployment);
          
          callNotificationOpen(
            workloadClient,
            "Deployment Failed",
            `Deployment execution failed: ${deploymentError.message || deploymentError}`,
            NotificationType.Error,
            undefined
          );
        }
      }
    } catch (error) {
      console.error('Error starting deployment:', error);
      setIsDeploymentInProgress(false);
      setDeploymentProgress(null);
      callNotificationOpen(
        workloadClient,
        "Deployment Error",
        `Failed to start deployment: ${error.message || error}`,
        NotificationType.Error,
        undefined
      );
    }
  }, [context, item, workloadClient, setIsDeploymentInProgress, setDeploymentProgress, handleDeploymentUpdate]);

  const handleRemoveDeployment = useCallback((deploymentId: string) => {
    if (item?.definition?.deployments) {
      const filteredDeployments = item.definition.deployments.filter(
        (deployment) => deployment.id !== deploymentId
      );
      
      const newItemDefinition: PackageInstallerItemDefinition = {
        ...item.definition,
        deployments: filteredDeployments
      };
      
      updateItemDefinition(newItemDefinition);
      SaveItem(newItemDefinition);
    }
  }, [item, updateItemDefinition, SaveItem]);

  /**
   * Add a new configuration to the list
   */
  const addInstallation = useCallback((setCurrentView?: (view: string) => void) => {
    // Switch to empty view to allow package selection
    if (setCurrentView) {
      setCurrentView(EDITOR_VIEW_TYPES.EMPTY);
    } else {
    }
  }, []);

  // Static view definitions - no function wrapper needed!
  const views = [
    {
      name: EDITOR_VIEW_TYPES.EMPTY,
      component: (
        <PackageInstallerItemEmptyView
          context={context}
          refreshKey={packageRegistryVersion}
          onPackageSelected={async (packageId) => {
            await addDeployment(packageId);
            if (currentViewSetter) {
              currentViewSetter(EDITOR_VIEW_TYPES.DEFAULT);
            }
          }}
        />
      )
    },
    {
      name: EDITOR_VIEW_TYPES.DEFAULT,
      component: (
        <PackageInstallerItemDefaultView
          editorItem={item}
          context={context}
          isDeploymentInProgress={isDeploymentInProgress}
          deploymentProgress={deploymentProgress}
          onDeploymentSelected={(deployment) => {
            setSelectedDeployment(deployment);
            if (currentViewSetter) {
              currentViewSetter(EDITOR_VIEW_TYPES.DEPLOYMENT);
            }
          }}
          onStartDeployment={handleStartDeployment}
          onRemoveDeployment={handleRemoveDeployment}
        />
      )
    },
    {
      name: EDITOR_VIEW_TYPES.DEPLOYMENT,
      isDetailView: true,
      component: (
        <DeploymentDetailView
          context={context}
          deployment={selectedDeployment}
          item={item}
          onStartDeployment={() => handleStartDeployment(selectedDeployment, undefined)}
        />
      )
    }
  ];

  return (
    <ItemEditor
      isLoading={isLoading}
      loadingMessage="Loading Package Installer item..."
      ribbon={(viewContext) => (
        <PackageInstallerItemRibbon
          {...props}      
          saveItemCallback={() => saveItemWithSuccessDialog()}
          openSettingsCallback={openSettings}
          addInstallationCallback={() => addInstallation(viewContext.setCurrentView)}
          refreshDeploymentsCallback={handleRefreshDeployments}
          uploadPackageCallback={uploadPackageJson}
          createPackageCallback={createPackage}
          isSaveButtonEnabled={isUnsaved}
          isDeploymentInProgress={isDeploymentInProgress}
          viewContext={viewContext}
        />
      )}
      messageBar={
        deploymentProgress ? [
          {
            name: 'deployment-progress',
            component: (
              <div className="deployment-progress-container">
                <Text className="deployment-progress-title">
                  Deploying {deploymentProgress.packageName}...
                </Text>
                <ProgressBar 
                  value={deploymentProgress.progress}
                  max={100}
                  thickness="medium"
                />
                <Text className="deployment-progress-status">
                  {deploymentProgress.currentStep}
                </Text>
              </div>
            ),
            showInViews: [EDITOR_VIEW_TYPES.DEFAULT]
          }
        ] : []
      }
      views={views}
      viewSetter={(setCurrentView) => {
        // Store the setCurrentView function so we can use it after loading
        if (!currentViewSetter) {
          setCurrentViewSetter(() => setCurrentView);
        }
      }}
    />
  );
}

