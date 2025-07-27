import React from 'react';
import { PageProps } from '../../App';

export function PackageInstallerItemEditorSettingsPage(props: PageProps) {
    return (
      <div>
        This workload was build using the Microsoft Fabric Workload Client.
        <br />
        If you want to see how it as build, contribute or change it to your needs, you can find the source code on <a href="https://github.com/microsoft/Microsoft-Fabric-tools-workload/" target="_blank">GitHub</a>.
      </div>
    );
  }

export default PackageInstallerItemEditorSettingsPage;