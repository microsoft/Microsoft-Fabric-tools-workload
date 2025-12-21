import React from "react";
import { Route, Router, Switch } from "react-router-dom";
import { History } from "history";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { PackageInstallerItemEditor, CreatePackageWizardWrapper, DeployPackageWizardWrapper, UploadPackageWizardWrapper } from "./items/PackageInstallerItem";
import { OneLakeExplorerItemEditor } from "./items/OneLakeExplorerItem";
import { HelloWorldItemEditor} from "./items/HelloWorldItem";
import { ConditionalPlaygroundRoutes } from "./playground/ConditionalPlaygroundRoutes";
import { FabricCLIItemEditor, CreateScriptDialog } from "./items/FabricCLIItem/";

/*
    Add your Item Editor in the Route section of the App function below
*/

interface AppProps {
    history: History;
    workloadClient: WorkloadClientAPI;
}

export interface PageProps {
    workloadClient: WorkloadClientAPI;
    history?: History
}

export interface ContextProps {
    itemObjectId?: string;
    workspaceObjectId?: string
    source?: string;
}

export interface SharedState {
    message: string;
}

export function App({ history, workloadClient }: AppProps) {
    console.log('🎯 App component rendering with history:', history);
    console.log('🎯 Current location:', history.location);

    return <Router history={history}>
        {/* Test route for debugging */}
        <Route exact path="/">
            <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
                <h1>🎉 Workload is running!</h1>
                <p>Current URL: {window.location.href}</p>
                <p>Workload Name: {process.env.WORKLOAD_NAME}</p>
            </div>
        </Route>    
        <Switch>
            {/* Routings for the Hello World Item Editor */}
            <Route path="/HelloWorldItem-editor/:itemObjectId">
                <HelloWorldItemEditor
                    workloadClient={workloadClient} data-testid="HelloWorldItem-editor" />
            </Route>
            <Route path="/HelloWorldItem-editor/:itemObjectId">
                <HelloWorldItemEditor
                    workloadClient={workloadClient} data-testid="HelloWorldItem-editor" />
            </Route>
            
            <Route path="/PackageInstallerItem-editor/:itemObjectId">
                <PackageInstallerItemEditor
                    workloadClient={workloadClient} 
                    data-testid="PackageInstallerItem-editor" />
            </Route>
            <Route path="/PackageInstallerItem-deploy-wizard/:itemObjectId">
                <DeployPackageWizardWrapper
                    workloadClient={workloadClient} 
                    data-testid="PackageInstallerItem-deploy-wizard" />
            </Route>
            <Route path="/PackageInstallerItem-packaging-wizard/:itemObjectId">
                <CreatePackageWizardWrapper
                    workloadClient={workloadClient} 
                    data-testid="PackageInstallerItem-packaging-wizard" />
            </Route>
            <Route path="/PackageInstallerItem-upload-wizard/:itemObjectId">
                <UploadPackageWizardWrapper
                    workloadClient={workloadClient} 
                    data-testid="PackageInstallerItem-upload-wizard" />
            </Route>

            <Route path="/OneLakeExplorerItem-editor/:itemObjectId">
                <OneLakeExplorerItemEditor
                    workloadClient={workloadClient} 
                    data-testid="OneLakeExplorerItem-editor" />
            </Route>

            <Route path="/FabricCLIItem-editor/:itemObjectId">
                <FabricCLIItemEditor
                    workloadClient={workloadClient} data-testid="FabricCLIItem-editor" />
            </Route>

            <Route path="/FabricCLIItem-create-script/:itemObjectId">
                <CreateScriptDialog
                    workloadClient={workloadClient} />
            </Route>

            {/* Conditionally loaded playground routes (only in development) */}
            <ConditionalPlaygroundRoutes workloadClient={workloadClient} />
        </Switch>
    </Router>;
}