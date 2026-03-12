# Clean Workload Environment - Step-by-Step Guide

## Process

This guide provides step-by-step instructions for AI tools on how to clean a Microsoft Fabric workload development environment to allow a fresh setup. Use this when you need to reset configuration, change workload names, reset authentication, or recover from setup errors.

## Prerequisites

- PowerShell 7+ available
- Access to the project root directory
- No running DevGateway or DevServer processes (stop them first)

## Step 1: Identify Files to Clean

The setup process creates the following files and variables:

| File/Variable | Purpose | Location |
|---------------|---------|----------|
| `Workload/.env.dev` | Development configuration | File |
| `Workload/.env.test` | Staging configuration | File |
| `Workload/.env.prod` | Production configuration | File |
| `FABRIC_DEV_WORKSPACE_GUID` | Cached workspace GUID for dev | User Environment Variable |

**Note**: Template files (`Workload/.env.template`) and source code (`Workload/app/`) are never removed during cleanup.

## Step 2: Clean Environment Files

### 2.1: Remove Generated .env Files

```powershell
Remove-Item Workload\.env.dev -Force -ErrorAction SilentlyContinue
Remove-Item Workload\.env.test -Force -ErrorAction SilentlyContinue
Remove-Item Workload\.env.prod -Force -ErrorAction SilentlyContinue
```

### 2.2: Remove Cached Environment Variable

```powershell
[Environment]::SetEnvironmentVariable("FABRIC_DEV_WORKSPACE_GUID", $null, "User")
```

### 2.3: Optional - Clean Build Artifacts

For a complete reset, also remove generated build files:

```powershell
Remove-Item build\* -Recurse -Force -ErrorAction SilentlyContinue
```

## Step 3: Verify Cleanup

```powershell
# Check files are removed
Test-Path Workload\.env.dev   # Should return False
Test-Path Workload\.env.test  # Should return False
Test-Path Workload\.env.prod  # Should return False

# Check environment variable is removed
[Environment]::GetEnvironmentVariable("FABRIC_DEV_WORKSPACE_GUID", "User")  # Should return $null
```

✅ All checks return `False` or `$null` — environment is clean.

## Step 4: Re-run Setup

After cleanup, run the setup script to generate fresh configuration:

```powershell
.\scripts\Setup\SetupWorkload.ps1 -WorkloadName "Org.YourWorkload"
```

### Alternative: Force Overwrite (Skip Cleanup)

Instead of cleaning first, you can force overwrite existing files:

```powershell
.\scripts\Setup\SetupWorkload.ps1 -WorkloadName "Org.YourWorkload" -Force $true
```

This skips the cleanup step and overwrites all existing configuration files directly.

## Usage

### Common Scenarios

#### Scenario 1: Change Workload Name
1. Clean environment (Steps 2-3)
2. Run setup with new workload name
3. Rebuild: `npm run build:dev`

#### Scenario 2: Reset Authentication
1. Clean environment (Steps 2-3)
2. Create new Entra App ID if needed
3. Run setup with new App ID

#### Scenario 3: Fresh Start After Errors
1. Clean environment including build artifacts (Steps 2.1-2.3)
2. Ensure Azure CLI is authenticated: `az login`
3. Run setup script

### Troubleshooting

#### Issue: Files Still Exist After Cleanup

**Symptoms**: `.env` files remain after running Remove-Item commands
**Solutions**:
- Close VS Code or other editors that might lock files
- Use `-Force` parameter on Remove-Item
- Check file permissions

#### Issue: Setup Script Still Detects Previous Setup

**Symptoms**: SetupWorkload.ps1 warns about existing configuration
**Solutions**:
- Verify all `.env` files are removed with `Test-Path`
- Use `-Force $true` parameter to bypass detection
- Check for `.env` file (without environment suffix) in Workload directory
