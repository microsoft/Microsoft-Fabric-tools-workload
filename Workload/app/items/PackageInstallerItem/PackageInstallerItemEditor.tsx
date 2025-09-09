import { Stack } from "@fluentui/react";
import {
  TabValue,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Button,
  ProgressBar,
} from "@fluentui/react-components";
import { DeleteRegular, PlayRegular } from "@fluentui/react-icons";
import React, { useEffect, useState, useCallback } from "react";
import { ContextProps, PageProps } from "../../App";
import { PackageInstallerItemEditorRibbon } from "./PackageInstallerItemEditorRibbon";
import { callGetItem, getWorkloadItem, saveItemDefinition } from "../../controller/ItemCRUDController";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { useLocation, useParams } from "react-router-dom";
import "./../../styles.scss";
import { useTranslation } from "react-i18next";
import { PackageDeployment, PackageInstallerItemDefinition, DeploymentStatus } from "./PackageInstallerItemModel";
import { PackageInstallerItemEditorEmpty } from "./PackageInstallerItemEditorEmpty";
import { ItemEditorLoadingProgressBar } from "../../controls/ItemEditorLoadingProgressBar";
import { callNotificationOpen } from "../../controller/NotificationController";
import { DeploymentDetailView } from "./DeploymentDetailView";
import { DeploymentStrategyFactory } from "./deployment/DeploymentStrategyFactory";
import { WorkspaceDisplayNameCell } from "./components/WorkspaceDisplayName";
import { FolderDisplayNameCell } from "./components/FolderDisplayName";
import { PackageInstallerContext } from "./package/PackageInstallerContext";
import { PackageDisplayNameCell } from "./components/PackageDisplayName";
import { PackageInstallerDeployResult } from "./components/PackageInstallerDeployDialog";
import { callDialogOpen } from "../../controller/DialogController";
import { NotificationType } from "@ms-fabric/workload-client";
import { t } from "i18next";
import { callOpenSettings } from "../../controller/SettingsController";
import { PackageCreationStrategyFactory, PackageCreationStrategyType } from "./package/PackageCreationStrategyFactory";
import { OneLakeStorageClient } from "../../clients/OneLakeStorageClient";

// Component to fetch and display folder name


export function PackageInstallerItemEditor(props: PageProps) {
  const pageContext = useParams<ContextProps>();
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { workloadClient } = props;
  const [isUnsaved, setIsUnsaved] = useState<boolean>(true);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [editorItem, setEditorItem] = useState<ItemWithDefinition<PackageInstallerItemDefinition>>(undefined);
  const [selectedTab, setSelectedTab] = useState<TabValue>("");
  const [selectedSolution, setSelectedDeployment] = useState<PackageDeployment | undefined>(undefined);
  const [context, setContext] = useState<PackageInstallerContext>(new PackageInstallerContext(workloadClient));
  const [isDeploymentInProgress, setIsDeploymentInProgress] = useState<boolean>(false);
  const [deploymentProgress, setDeploymentProgress] = useState<{
    deploymentId: string;
    packageName: string;
    currentStep: string;
    progress: number;
  } | null>(null);

  // Helper function to update item definition immutably
  const updateItemDefinition = useCallback((updates: Partial<PackageInstallerItemDefinition>) => {
    setEditorItem(prevItem => {
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
    if (editorItem) {
      //TODO: this needs to be updated to use the Item instead of Itemv2
      const item = await callGetItem(workloadClient, editorItem.id);
      await callOpenSettings(workloadClient, item.item, 'About');
    }
  }

  async function saveItemWithSuccessDialog(definition?: PackageInstallerItemDefinition) {
    const successResult = await SaveItem(definition);
    if (successResult) {
       callNotificationOpen(
            workloadClient,
            t("ItemEditor_Saved_Notification_Title"),
            t("ItemEditor_Saved_Notification_Text", { itemName: editorItem.displayName }),
            undefined,
            undefined
        );
      }
  }

  async function SaveItem(definition?: PackageInstallerItemDefinition) {
    var successResult = await saveItemDefinition<PackageInstallerItemDefinition>(
      workloadClient,
      editorItem.id,
      definition || editorItem.definition);
    setIsUnsaved(!successResult); 
    return successResult;  
  }

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    setIsLoadingData(true);
    var item: ItemWithDefinition<PackageInstallerItemDefinition> = undefined;    
    if (pageContext.itemObjectId) {
      // for Edit scenario we get the itemObjectId and then load the item via the workloadClient SDK
      try {
        item = await getWorkloadItem<PackageInstallerItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,          
        );
        
        // Ensure item definition is properly initialized without mutation
        if (!item.definition) {
          item = {
            ...item,
            definition: {
              deployments: []
            }
          };
        }
        const context = new PackageInstallerContext(workloadClient);
        await context.packageRegistry.loadFromAssets();
        if(item.definition?.oneLakePackages) {
          item.definition.oneLakePackages.forEach(async oneLakePath => {
            try {
              const oneLakeClient = new OneLakeStorageClient(workloadClient).createItemWrapper(item);
              const packJson = await oneLakeClient.readFileAsText(oneLakePath);
              const pack = JSON.parse(packJson);
              context.packageRegistry.addPackage(pack);
            } catch (error) {
              console.error(`Failed to add package from Onelake ${oneLakePath}:`, error);
            }
          });
        }
        setContext(context);
        setEditorItem(item);        
      } catch (error) {
        setEditorItem(undefined);        
      } 
    } else {
      console.log(`non-editor context. Current Path: ${pathname}`);
    }
    setIsUnsaved(false);
    if(item?.definition?.deployments?.length > 0) {
      setSelectedTab("home");
    } else {
      setSelectedTab("empty");
    }
    setIsLoadingData(false);
  }

  /**
   * Add a new configuration to the list
   */
  function addInstallation() {
    setSelectedTab("empty");
  }

  /**
   * Handle package JSON file upload to OneLake and add to package registry
   */
  async function uploadPackageJson() {
    try {
      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      
      // Handle file selection
      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) {
          return;
        }

        if (!file.name.toLowerCase().endsWith('.json')) {
          callNotificationOpen(
            workloadClient,
            "Invalid File Type",
            "Please select a JSON file.",
            NotificationType.Error,
            undefined
          );
          return;
        }

        try {
          // Read file content
          const fileContent = await file.text();
          

          const packageCreationStrategy = PackageCreationStrategyFactory.createStrategy(PackageCreationStrategyType.Standard,
            context, editorItem);
          const packageResult = await packageCreationStrategy.createPackageFromJson(
            {
              displayName: undefined,
              description: undefined, 
              deploymentLocation: undefined
            },
            fileContent);


          // Add to additional packages list
          const currentAdditionalPackages = editorItem?.definition?.oneLakePackages || [];
          const newItemDefinition: PackageInstallerItemDefinition = {
            ...editorItem?.definition,
            oneLakePackages: [...currentAdditionalPackages, packageResult.oneLakeLocation]
          };
          
          // Update item definition
          updateItemDefinition(newItemDefinition);
          await SaveItem(newItemDefinition);
          
          // Add to package registry
          context.packageRegistry.addPackage(packageResult.package);
          
          callNotificationOpen(
            workloadClient,
            "Package Uploaded",
            `Package "${packageResult.package.displayName}" has been uploaded and added to the registry.`,
            NotificationType.Success,
            undefined
          );
          
        } catch (error) {
          console.error('Error uploading package:', error);
          callNotificationOpen(
            workloadClient,
            "Upload Failed",
            `Failed to upload package: ${error.message || error}`,
            NotificationType.Error,
            undefined
          );
        } finally {
          // Clean up
          document.body.removeChild(input);
        }
      };
      
      // Trigger file selection
      document.body.appendChild(input);
      input.click();
      
    } catch (error) {
      console.error('Error setting up file upload:', error);
      callNotificationOpen(
        workloadClient,
        "Upload Error",
        "Failed to set up file upload.",
        NotificationType.Error,
        undefined
      );
    }
  }

  /**
   * Handle creating a new package using the PackageInstallerPackagingDialog
   */
  async function createPackage() {
    try {
      const dialogResult = await callDialogOpen(
        workloadClient,
        process.env.WORKLOAD_NAME,
        `/PackageInstallerItem-packaging-dialog/${editorItem.id}`,
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
            const packageStrategy = PackageCreationStrategyFactory.createStrategy(
              PackageCreationStrategyType.Standard,
              context, 
              editorItem,
            );
            
            // Use the provided display name and description from the wizard
            const packageDisplayName = result.packageDisplayName || `Custom Package ${new Date().toLocaleDateString()}`;
            const packageDescription = result.packageDescription || `Package created from ${selectedItems.length} selected items`;
            
            // Create the package
            const createdPackageItem = await packageStrategy.createPackageFromItems(           
              {
                originalWorkspaceId: result.workspaceId,
                displayName: packageDisplayName,
                description: packageDescription,
                deploymentLocation: result.deploymentLocation,
                updateItemReferences: result.updateItemReferences
              },
              selectedItems
            );
            

            // Add the package to the itemOneLake packages list
            const currentItemOneLakePackages = editorItem?.definition?.oneLakePackages || [];
            const newItemDefinition: PackageInstallerItemDefinition = {
              ...editorItem?.definition,
              oneLakePackages: [...currentItemOneLakePackages, createdPackageItem.oneLakeLocation]
            };
            
            // Update item definition and save
            updateItemDefinition(newItemDefinition);
            await SaveItem(newItemDefinition);
            
            // Add the created package to the package registry using the actual package data
            context.packageRegistry.addPackage(createdPackageItem.package);

            callNotificationOpen(
              workloadClient,
              "Package Created Successfully",
              `Package "${packageDisplayName}" has been created with ${selectedItems.length} item(s) and added to the registry.`,
              NotificationType.Success,
              undefined
            );
            
          } catch (error) {
            console.error('Error during package creation:', error);
            callNotificationOpen(
              workloadClient,
              "Package Creation Failed",
              `Failed to create package: ${error.message || error}`,
              NotificationType.Error,
              undefined
            );
          }
          
        } else if (result.state === 'cancel') {
          console.log("Package creation dialog was cancelled");
        } else {
          callNotificationOpen(
            workloadClient,
            "No Items Selected",
            "Please select at least one item to create a package.",
            NotificationType.Warning,
            undefined
          );
        }
      } else {
        console.log("Package creation dialog was cancelled or failed");
      }
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
  

  /**
   * Refresh deployment statuses for all deployments
   */
  async function handleRefreshDeployments() {
    if (!editorItem?.definition?.deployments || !workloadClient) {
      return;
    }

    try {
      // Process all deployments that have job IDs (indicating they have been started)
      const deploymentsToUpdate = editorItem.definition.deployments.filter(
        deployment => deployment.job && deployment.status !== DeploymentStatus.Succeeded && deployment.status !== DeploymentStatus.Failed && deployment.status !== DeploymentStatus.Cancelled
      );

      if (deploymentsToUpdate.length === 0) {
        callNotificationOpen(
          workloadClient,
          "No Updates Available",
          "No deployments require status updates.",
          undefined,
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
            editorItem,
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
        const updatedDeploymentsArray = editorItem.definition.deployments.map(deployment => {
          const updatedDeployment = validUpdates.find(updated => updated.id === deployment.id);
          return updatedDeployment || deployment;
        });

        const newItemDefinition: PackageInstallerItemDefinition = {
          ...editorItem.definition,
          deployments: updatedDeploymentsArray
        };

        // Update the item definition and save changes
        updateItemDefinition(newItemDefinition);
        await SaveItem(newItemDefinition);

        // Update selectedSolution if it was one of the updated deployments
        if (selectedSolution) {
          const updatedSelectedSolution = validUpdates.find(
            updated => updated.id === selectedSolution.id
          );
          if (updatedSelectedSolution) {
            setSelectedDeployment(updatedSelectedSolution);
          }
        }

        callNotificationOpen(
          workloadClient,
          "Deployments Refreshed",
          `Successfully updated ${validUpdates.length} deployment(s).`,
          undefined,
          undefined
        );
      } else {
        callNotificationOpen(
          workloadClient,
          "No Changes",
          "All deployments are up to date.",
          undefined,
          undefined
        );
      }
    } catch (error) {
      console.error('Error during deployment status refresh:', error);
      callNotificationOpen(
        workloadClient,
        "Refresh Error",
        `Failed to refresh deployment statuses: ${error.message || error}`,
        undefined,
        undefined
      );
    }
  }

  /**
   * Remove a deployment from the list
   */
  function handleRemoveDeployment(deploymentId: string) {
    if (editorItem?.definition?.deployments) {
      const filteredDeployments = editorItem.definition.deployments.filter(
        (deployment) => deployment.id !== deploymentId
      );
      
      updateItemDefinition({ deployments: filteredDeployments });
    }
  }

  /**
   * Start deployment for a pending deployment
   */
  async function handleStartDeployment(deployment: PackageDeployment, event: React.MouseEvent) {
    if(event){
      event.stopPropagation(); // Prevent row click from triggering
    }
    
    // Get the package to determine deployment location
    const pack = context.getPackage(deployment.packageId);
    const deploymentLocation = pack?.deploymentConfig.location;
    
    // Serialize package data to pass to dialog
    const packageDataParam = pack ? encodeURIComponent(JSON.stringify(pack)) : '';
    
    const dialogResult = await callDialogOpen(
      workloadClient,
      process.env.WORKLOAD_NAME,
      `/PackageInstallerItem-deploy-dialog/${editorItem.id}?packageId=${deployment.packageId}&deploymentId=${deployment.id}&deploymentLocation=${deploymentLocation}&packageData=${packageDataParam}`,
      800, 600,
      true)
    const result = dialogResult.value as PackageInstallerDeployResult;

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
        await startDeployment(context, editorItem, deployment,           
          handleDeploymentUpdate,
          updateDeploymentProgress
        );
      } finally {
        // Clear deployment progress state
        setIsDeploymentInProgress(false);
        setDeploymentProgress(null);
      }
    } else {
      console.log("Deployment dialog was cancelled");
    }
  }

async function addDeployment(packageId: string) {
  // fint the package configuration that should be used for the deployment
  //TODO: configuration needs to be added to Deployment
  const pack = context.getPackage(packageId);
  if (pack) {
    const id = generateUniqueId();

    const createdSolution: PackageDeployment = {
      id: id,
      status: DeploymentStatus.Pending,
      deployedItems: [],
      packageId: packageId,
    };

    const newItemDefinition: PackageInstallerItemDefinition = {
      ...editorItem?.definition,
        deployments: Array.isArray(editorItem?.definition?.deployments) 
          ? [...editorItem.definition.deployments, createdSolution]
          : [createdSolution]
    };
    updateItemDefinition(newItemDefinition);
    
    // Save with the updated definition directly to avoid race condition
    await SaveItem(newItemDefinition);
    
    setSelectedDeployment(createdSolution);
    setSelectedTab("deployment");        
  } else {      
    console.error(`Package with typeId ${packageId} not found`);
    return;
  }
  }

  /**
   * Handle deployment update from the DeploymentDetailView component
   * Updates the deployment in the editor item and saves the changes
   */
  async function handleDeploymentUpdate(updatedDeployment: PackageDeployment) {
    // Update the selectedSolution state
    setSelectedDeployment(updatedDeployment);

    // Update the deplyoments in the editorItem.definition.deployments array
    if (editorItem?.definition?.deployments) {
      const updatedSolutions = editorItem.definition.deployments.map(deployment =>
        deployment.id === updatedDeployment.id ? updatedDeployment : deployment
      );
      
      const newItemDefinition: PackageInstallerItemDefinition = {
        ...editorItem.definition,
        deployments: updatedSolutions
      };
      
      // Update the item definition and save changes
      updateItemDefinition(newItemDefinition);
      await SaveItem(newItemDefinition);
      if(updatedDeployment.status === DeploymentStatus.Succeeded){
        handleRefreshDeployments();
      }
    }
  }

  /**
   * Update deployment progress callback
   */
  function updateDeploymentProgress(step: string, progress: number) {
    setDeploymentProgress(prev => prev ? {
      ...prev,
      currentStep: step,
      progress: Math.max(0, Math.min(100, progress))
    } : null);
  }

  if (isLoadingData) {
    //making sure we show a loding indicator while the itme is loading
    return (<ItemEditorLoadingProgressBar 
      message={`Loading Installer item ...`} />);
  }
  else {
    return (
      <Stack className="editor" data-testid="item-editor-inner">
        <PackageInstallerItemEditorRibbon
            {...props}      
            saveItemCallback={saveItemWithSuccessDialog}
            openSettingsCallback={openSettings}
            addInstallationCallback={addInstallation}
            refreshDeploymentsCallback={handleRefreshDeployments}
            uploadPackageCallback={uploadPackageJson}
            createPackageCallback={createPackage}
            isSaveButtonEnabled={isUnsaved}
            isDeploymentInProgress={isDeploymentInProgress}      
            selectedTab={selectedTab}
            onTabChange={setSelectedTab}
        />
        
        {/* Deployment Progress Bar */}
        {deploymentProgress && (
          <Stack style={{ padding: '12px 16px', backgroundColor: '#f3f2f1', borderBottom: '1px solid #e1dfdd' }}>
            <Text style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              Deploying {deploymentProgress.packageName}...
            </Text>
            <ProgressBar 
              value={deploymentProgress.progress}
              max={100}
              thickness="medium"
            />
            <Text style={{ fontSize: '12px', color: '#605e5c', marginTop: '4px' }}>
              {deploymentProgress.currentStep}
            </Text>
          </Stack>
        )}
        
        <Stack className="main" style={{ height: "calc(100vh - 120px)", overflow: "hidden" }}>
          <span style={{ height: "100%", overflow: "auto", padding: "16px" }}>
            {["empty"].includes(selectedTab as string) && (
              <PackageInstallerItemEditorEmpty
                context={context}
                onPackageSelected={addDeployment}
              />
            )}
            {["deployment"].includes(selectedTab as string) && (
              <DeploymentDetailView
                context={context}
                deployment={selectedSolution}
                item={editorItem}
                onBackToHome={() => setSelectedTab("home")}
                onStartDeployment={() => handleStartDeployment(selectedSolution, undefined)}
              />
            )}

            {["home"].includes(selectedTab as string) && (
            <span>
                <h2>{t('Deployed packages')}</h2>
                {editorItem?.definition?.deployments?.length > 0 ? (
                  <div className="deployment-container">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHeaderCell>{t('Deployment Id')}</TableHeaderCell>
                          <TableHeaderCell>{t('Package Type')}</TableHeaderCell>
                          <TableHeaderCell>{t('Deployment Status')}</TableHeaderCell>
                          <TableHeaderCell>{t('Deployment Triggerd')}</TableHeaderCell>
                          <TableHeaderCell>{t('Workspace Name')}</TableHeaderCell>
                          <TableHeaderCell>{t('Folder Name')}</TableHeaderCell>
                          <TableHeaderCell>{t('Actions')}</TableHeaderCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editorItem.definition.deployments.map((deployment: PackageDeployment) => {
                          return (
                            <TableRow key={deployment.id} onClick={() => {
                              if (!isDeploymentInProgress) {
                                setSelectedDeployment(deployment);
                                setSelectedTab("deployment");
                              }
                            }} style={{ 
                              cursor: isDeploymentInProgress ? 'not-allowed' : 'pointer',
                              opacity: isDeploymentInProgress && deploymentProgress?.deploymentId !== deployment.id ? 0.6 : 1
                            }}>
                              <TableCell>{deployment.id}</TableCell>
                              <TableCell>
                                <PackageDisplayNameCell
                                  context={context}
                                  packageId={deployment.packageId}
                                  showIcon={true} />
                              </TableCell>
                              <TableCell>{DeploymentStatus[deployment.status]}</TableCell>
                              <TableCell>
                                {deployment.triggeredTime 
                                  ? new Date(deployment.triggeredTime).toLocaleString() 
                                  : t('Not started yet')}
                              </TableCell>
                              <TableCell>
                                <WorkspaceDisplayNameCell
                                  context={context}
                                  workspaceId={deployment.workspace?.id} />
                              </TableCell>
                              <TableCell>
                                <FolderDisplayNameCell
                                    context={context}
                                    workspaceId={deployment.workspace?.id} 
                                    folderId={deployment.workspace?.folder?.id} />
                              </TableCell>
                              <TableCell>
                                <div style={{ display: "flex", gap: "4px" }}>
                                  {deployment.status === DeploymentStatus.Pending && (
                                    <Button
                                      icon={<PlayRegular />}
                                      appearance="subtle"
                                      disabled={isDeploymentInProgress && deploymentProgress?.deploymentId === deployment.id}
                                      onClick={(e: React.MouseEvent) => handleStartDeployment(deployment, e)}
                                      aria-label={t('Start deployment')}
                                      title={t('Start deployment')}
                                    />
                                  )}
                                  <Button
                                    icon={<DeleteRegular />}
                                    appearance="subtle"
                                    disabled={isDeploymentInProgress || (deployment.status !== DeploymentStatus.Pending 
                                      && deployment.status !== DeploymentStatus.Failed)}                                   
                                    onClick={(e: any) => {
                                      e.stopPropagation(); // Prevent row click from triggering
                                      handleRemoveDeployment(deployment.id);
                                    }}
                                    aria-label={t('Remove deployment')}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="no-deployments">
                    <Text size={300} italic>
                      {t('No Packages have been deployed yet')}
                    </Text>
                  </div>
                )}
            </span>
            )}
          </span>
        </Stack>
      </Stack>
    );
  }
}

function generateUniqueId(): string {
  // Generate a random unique ID for deployment
  return '' + Math.random().toString(36).substring(2, 9);
}

async function startDeployment(context: PackageInstallerContext, 
          item: ItemWithDefinition<PackageInstallerItemDefinition>, 
          deployment: PackageDeployment, 
          onDeploymentUpdate?:(updatedPackage: PackageDeployment) => void, 
          updateDeploymentProgress?: (step: string, progress: number) => void) {
  console.log(`Starting deployment for package: ${deployment.id}`);

  updateDeploymentProgress?.("Starting deployment", 0);
  // Create a new deployment object to avoid modifying the original
  var newDeployment:PackageDeployment = {
    ...deployment,
    triggeredTime: new Date(),
    triggeredBy: "TODO",
    workspace: {
      ...deployment.workspace,
    }
  }; 

  try {
    // This allows us to track the deployment status without affecting the original deployment object
    updateDeploymentProgress?.("Validating config ....", 10);
    if (!newDeployment.workspace) {
      throw new Error("Deployment workspace is not defined");
    }

    //Get the package from the context
    const pack = context.getPackage(newDeployment.packageId);
    if (!pack) {
      throw new Error(`Package with typeId ${newDeployment.packageId} not found`);
    }

    //updating the deployment to InProgress
    newDeployment.status = DeploymentStatus.InProgress
    if (onDeploymentUpdate) {
      onDeploymentUpdate(newDeployment);
    }

    // Create the deployment strategy based on the package type
    const strategy = DeploymentStrategyFactory.createStrategy(
              context,
              item,
              pack,
              newDeployment,              
    );
    //set the updated deployment object
    updateDeploymentProgress?.("Starting deployment ....", 20);
    newDeployment = await strategy.deploy(updateDeploymentProgress);

    switch (newDeployment.status) {
      case DeploymentStatus.Succeeded:
        callNotificationOpen(
            context.workloadClientAPI,
            t("Deployment finished"),
            t(`Deployment has successfully started ${newDeployment.job.id}.`),
            NotificationType.Success,
            undefined
          );
        break;
      case DeploymentStatus.Failed:
          callNotificationOpen(
            context.workloadClientAPI,
            t("Deployment failed"),
            t(`Deployment has failed.`),
            NotificationType.Error,
            undefined
          );
        break;
      case DeploymentStatus.InProgress:
          callNotificationOpen(
            context.workloadClientAPI,
            t("Deployment started"),
            t(`Deployment has successfully started ${newDeployment.job.id}.`),
            NotificationType.Info,
            undefined
          );
        break;
      case DeploymentStatus.Pending:
        break;
      case DeploymentStatus.Cancelled:
        break;
      default:
        console.warn(`Unknown deployment status: ${newDeployment.status}`);
        break;
    }
  }
  catch (error) {
    console.error(`Error on Deployment: ${error}`);
    callNotificationOpen(
      context.workloadClientAPI,
      "Deployment failed",
      `Failed to deploy the package: ${error.message || error}`,
      NotificationType.Error,
      undefined
    );
    // Create a failed deployment copy and update via callback
    newDeployment.status = DeploymentStatus.Failed
  }
  finally {
    if (onDeploymentUpdate) {
      onDeploymentUpdate(newDeployment);
    }
  }
}

