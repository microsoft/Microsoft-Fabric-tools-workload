# Microsoft Fabric Tools Workload

Welcome to the Microsoft Fabric Tools Workload repository. This repository is **based on the original [Microsoft Fabric Extensibility Toolkit](https://github.com/microsoft/fabric-extensibility-toolkit)** and contains various community-built item types that demonstrate advanced patterns and implementations.

## 🎯 Purpose

This repository serves as a **collection of community-contributed Fabric items** that can be:
- Used as-is in your Fabric workload
- Used as reference implementations for building your own custom items
- Studied to learn advanced patterns and best practices

## ⚠️ Important Notes

**If you're starting a new Fabric workload project**, we strongly recommend you start with the **[official Fabric Extensibility Toolkit repository](https://github.com/microsoft/fabric-extensibility-toolkit)** instead of this one. The official FET repository provides:
- Clean project structure optimized for new workloads
- Up-to-date baseline implementation
- Official documentation and support
- Streamlined setup process

**This repository is kept in sync** with updates from the official Fabric Extensibility Toolkit and will adopt new features as they become available in the base repository.

## 📦 What's Included

This repository contains community-built item types with full documentation:

- **[PackageInstallerItem](docs/items/PackageInstallerItem/)** - Complex deployment and configuration patterns with wizard workflows
- **[OneLakeExplorerItem](docs/items/OneLakeExplorerItem/)** - OneLake integration and file browsing examples
- **[ExcelEditorItem](docs/items/ExcelEditorItem/)** - Excel Online integration with OneDrive (coming soon)

Each item is fully documented in the `docs/items/[ItemName]/` folder with architecture details, usage guides, and implementation notes.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.

## Table of contents

- [Microsoft Fabric Tools Workload](#microsoft-fabric-tools-workload)
  - [🎯 Purpose](#-purpose)
  - [⚠️ Important Notes](#️-important-notes)
  - [📦 What's Included](#-whats-included)
  - [Trademarks](#trademarks)
  - [Table of contents](#table-of-contents)
  - [Latest Release](#latest-release)
- [Using This Repository](#using-this-repository)
  - [Prerequisites](#prerequisites)
  - [Project Structure](#project-structure)
  - [Setting things up](#setting-things-up)

## Latest Release

📋 **[v2025.11 - Standardized Base Components](docs/ReleaseNotes/2025/v2025.11.md)**

This release introduces comprehensive standardized base components, SCSS architecture improvements, and enhanced HelloWorld reference implementation. [View all release notes →](docs/ReleaseNotes/)

> [!NOTE]
> For comprehensive information about Microsoft Fabric, workloads, and items, please refer to the **[official Fabric Extensibility Toolkit repository](https://github.com/microsoft/fabric-extensibility-toolkit)** and the [Microsoft Fabric documentation](https://learn.microsoft.com/fabric/extensibility-toolkit).

## Using This Repository

### Prerequisites

To run the development environment locally you need the following prerequisites:

- [Node.js](https://nodejs.org/en/download/)
- [Powershell 7](https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell)
- [Dotnet](https://dotnet.microsoft.com/en-us/download) for MacOS please make sure to install the x64 version - after installing make sure to restart the powershell.
- [VSCode](https://code.visualstudio.com/download) or similar development environment
- [Fabric Tenant](https://app.fabric.microsoft.com/) that you use for development and publishing the Workload later on
- [Fabric Workspace](https://learn.microsoft.com/en-us/fabric/fundamentals/workspaces) that you can use to build your workload
- [Fabric Capacity](https://learn.microsoft.com/en-us/fabric/enterprise/licenses) that is assigned to the workspace you are planning to use
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest) (only used for Entra App creation) - after installing make sure to restart powershell.
- [Entra App](https://entra.microsoft.com/) You either need an existing Entra App you can use one that is configured correctly or you need permission to create a new Entra App.

> [!NOTE]
> After installing new software please make sure that you restart Powershell and Visual Studio, otherwise the scripts might fail because the software is not part of the path variable.

**Alternative: GitHub Codespaces**

We suggest using a [GitHub Codespace](https://github.com/features/codespaces) which has everything preconfigured. If you use a codespace, select at least an 8-core machine and open the Codespace in VSCode locally for the best experience.

### Project Structure

Use the [Project structure](./docs/Project_Structure.md) to get a better understanding about Extensibility projects are structured and where you can find and change it to your needs.

### Setting things up

To set things up follow the [Setup Guide](./docs/Project_Setup.md)
