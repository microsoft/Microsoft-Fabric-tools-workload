import React from "react";
import { Route, Router, Switch } from "react-router-dom";
import { History } from "history";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { HelloWorldItemEditor } from "./items/HelloWorldItem/HelloWorldItemEditor";
import { PackageInstallerItemEditor } from "./items/PackageInstallerItem/PackageInstallerItemEditor";
import { PackageInstallerDeployDialogWrapper } from "./items/PackageInstallerItem/components/PackageInstallerDeployDialog";
import { PackageInstallerPackagingDialogWrapper } from "./items/PackageInstallerItem/components/PackageInstallerPackagingDialogWrapper";
import { OneLakeExplorerItemEditor } from "./items/OneLakeExplorerItem/OneLakeExplorerItemEditor";
import { ExternalDataShareItemEditor } from "./items/ExternalDataShareItem/ExternalDataShareItemEditor";
import { ExternalDataShareItemCreateShareDialogWrapper } from "./items/ExternalDataShareItem/ExternalDataShareItemCreateShareDialog";
import ExternalDataShareItemImportShareDialog from "./items/ExternalDataShareItem/ExternalDataShareItemImportShareDialog";
import PackageInstallerItemEditorAboutPage from "./items/PackageInstallerItem/PackageInstallerItemEditorAboutPage";
import PackageInstallerItemEditorSettingsPage from "./items/PackageInstallerItem/PackageInstallerItemEditorSettingsPage";

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
                    workloadClient={workloadClient} data-testid="PackageInstallerItem-editor" />
            </Route>
            <Route path="/PackageInstallerItem-deploy-dialog/:itemObjectId">
                <PackageInstallerDeployDialogWrapper
                    workloadClient={workloadClient} />
            </Route>
            <Route path="/PackageInstallerItem-packaging-dialog/:itemObjectId">
                <PackageInstallerPackagingDialogWrapper
                    workloadClient={workloadClient} />
            </Route>
            <Route path="/PackageInstallerItem-about-page/">
                <PackageInstallerItemEditorAboutPage
                    workloadClient={workloadClient} />
            </Route>
            <Route path="/PackageInstallerItem-settings-page/">
                <PackageInstallerItemEditorSettingsPage
                    workloadClient={workloadClient} />
            </Route>

            <Route path="/OneLakeExplorerItem-editor/:itemObjectId">
                <OneLakeExplorerItemEditor
                    workloadClient={workloadClient} data-testid="OneLakeExplorerItem-editor" />
            </Route>

            <Route path="/ExternalDataShareItem-editor/:itemObjectId">
                <ExternalDataShareItemEditor
                    workloadClient={workloadClient} data-testid="ExternalDataShareItem-editor" />
            </Route>
            <Route path="/ExternalDataShareItem-create-share-dialog/:itemObjectId">
                <ExternalDataShareItemCreateShareDialogWrapper
                    workloadClient={workloadClient} />
            </Route>
            <Route path="/ExternalDataShareItem-import-share-dialog/:itemObjectId">
                <ExternalDataShareItemImportShareDialog
                    workloadClient={workloadClient} />
            </Route>

        </Switch>
    </Router>;
}