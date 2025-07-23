import React from "react";
import { Route, Router, Switch } from "react-router-dom";
import { History } from "history";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { HelloWorldItemEditor } from "./implementation/items/HelloWorldItem/HelloWorldItemEditor";
import { PackageInstallerItemEditor } from "./implementation/items/PackageInstallerItem/PackageInstallerItemEditor";
import { PackageInstallerDeployDialogWrapper } from "./implementation/items/PackageInstallerItem/components/PackageInstallerDeployDialog";

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
            {/* Routing to the Empty Item Editor */}
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
                    workloadClient={workloadClient} data-testid="PackageInstallerItem-editor" />
            </Route>
                <Route path="/PackageInstallerItem-deploy-dialog/:itemObjectId">
                <PackageInstallerDeployDialogWrapper
                    workloadClient={workloadClient} />
            </Route>

        </Switch>
    </Router>;
}