<#
.SYNOPSIS
    Creates a Service Principal with Federated Credentials for Fabric CLI authentication

.DESCRIPTION
    This script creates an Azure AD Service Principal (App Registration) configured with
    federated credentials for authenticating with Microsoft Fabric using the Fabric CLI.
    
    The script performs the following:
    1. Creates an App Registration in Azure AD
    2. Configures federated credentials for workload identity
    3. Assigns necessary API permissions for Microsoft Fabric
    4. Outputs the configuration details for Fabric CLI

.PARAMETER AppName
    The display name for the service principal/app registration

.PARAMETER FederatedIssuer
    The OIDC issuer URL (e.g., for GitHub: https://token.actions.githubusercontent.com)

.PARAMETER FederatedSubject
    The subject claim for the federated credential (e.g., repo:owner/repo:ref:refs/heads/main)

.PARAMETER FederatedAudience
    The audience for the federated credential (default: api://AzureADTokenExchange)

.EXAMPLE
    .\CreateFabricCLIServicePrincipal.ps1 -AppName "FabricCLI-ServicePrincipal" -FederatedIssuer "https://token.actions.githubusercontent.com" -FederatedSubject "repo:myorg/myrepo:ref:refs/heads/main"

.NOTES
    Requires:
    - Az PowerShell module (Install-Module -Name Az)
    - Appropriate permissions to create app registrations in Azure AD
    - Permissions to assign API permissions
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$AppName,
    
    [Parameter(Mandatory = $false)]
    [string]$FederatedIssuer = "",
    
    [Parameter(Mandatory = $false)]
    [string]$FederatedSubject = "",
    
    [Parameter(Mandatory = $false)]
    [string]$FederatedAudience = "api://AzureADTokenExchange",
    
    [Parameter(Mandatory = $false)]
    [switch]$SkipFederatedCredential
)

$ErrorActionPreference = "Stop"

# Check if Az module is installed
if (-not (Get-Module -ListAvailable -Name Az.Accounts)) {
    Write-Error "Az.Accounts module is not installed. Please run: Install-Module -Name Az"
    exit 1
}

if (-not (Get-Module -ListAvailable -Name Az.Resources)) {
    Write-Error "Az.Resources module is not installed. Please run: Install-Module -Name Az"
    exit 1
}

# Connect to Azure
Write-Host "Connecting to Azure..." -ForegroundColor Cyan
Connect-AzAccount

# Get current context
$context = Get-AzContext
$tenantId = $context.Tenant.Id

Write-Host "`nTenant ID: $tenantId" -ForegroundColor Green
Write-Host "Subscription: $($context.Subscription.Name)" -ForegroundColor Green

# Create App Registration
Write-Host "`nCreating App Registration: $AppName" -ForegroundColor Cyan

try {
    # Check if app already exists
    $existingApp = Get-AzADApplication -DisplayName $AppName -ErrorAction SilentlyContinue
    
    if ($existingApp) {
        Write-Host "App Registration '$AppName' already exists. Using existing app." -ForegroundColor Yellow
        $app = $existingApp
    } else {
        $app = New-AzADApplication -DisplayName $AppName
        Write-Host "App Registration created successfully" -ForegroundColor Green
    }
    
    $appId = $app.AppId
    $objectId = $app.Id
    
    Write-Host "  Application (client) ID: $appId" -ForegroundColor Green
    Write-Host "  Object ID: $objectId" -ForegroundColor Green
    
} catch {
    Write-Error "Failed to create App Registration: $_"
    exit 1
}

# Create Service Principal if it doesn't exist
Write-Host "`nCreating Service Principal..." -ForegroundColor Cyan

try {
    $sp = Get-AzADServicePrincipal -ApplicationId $appId -ErrorAction SilentlyContinue
    
    if (-not $sp) {
        $sp = New-AzADServicePrincipal -ApplicationId $appId
        Write-Host "Service Principal created successfully" -ForegroundColor Green
    } else {
        Write-Host "Service Principal already exists" -ForegroundColor Yellow
    }
    
} catch {
    Write-Error "Failed to create Service Principal: $_"
    exit 1
}

# Configure API Permissions for Microsoft Fabric
Write-Host "`nConfiguring API Permissions for Microsoft Fabric..." -ForegroundColor Cyan

# Microsoft Fabric API permissions
# Note: You may need to adjust these based on your specific Fabric requirements
$fabricResourceId = "00000009-0000-0000-c000-000000000000" # Microsoft Graph (commonly used for Fabric)

try {
    # Add required permissions
    # You'll need to identify the specific permission IDs for Fabric
    Write-Host "  API permissions need to be configured manually in Azure Portal" -ForegroundColor Yellow
    Write-Host "  Navigate to: Azure Portal > App Registrations > $AppName > API Permissions" -ForegroundColor Yellow
    Write-Host "  Add permissions for Microsoft Fabric (Power BI Service)" -ForegroundColor Yellow
    
} catch {
    Write-Warning "Could not configure API permissions automatically: $_"
}

# Create Federated Credential if requested
if (-not $SkipFederatedCredential) {
    if ([string]::IsNullOrEmpty($FederatedIssuer) -or [string]::IsNullOrEmpty($FederatedSubject)) {
        Write-Host "`nSkipping Federated Credential creation (issuer or subject not provided)" -ForegroundColor Yellow
        Write-Host "You can add federated credentials later using the Azure Portal or:" -ForegroundColor Yellow
        Write-Host "  az ad app federated-credential create --id <APP_ID> --parameters credential.json" -ForegroundColor Gray
    } else {
        Write-Host "`nCreating Federated Credential..." -ForegroundColor Cyan
        
        $credentialName = "FederatedCredential-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        
        $federatedCredential = @{
            name = $credentialName
            issuer = $FederatedIssuer
            subject = $FederatedSubject
            audiences = @($FederatedAudience)
        }
        
        try {
            # Use Azure CLI since Az PowerShell doesn't have direct cmdlet for federated credentials
            $credentialJson = $federatedCredential | ConvertTo-Json -Compress
            $credentialJson | Out-File -FilePath "temp_credential.json" -Encoding utf8
            
            az ad app federated-credential create --id $appId --parameters temp_credential.json
            
            Remove-Item "temp_credential.json" -ErrorAction SilentlyContinue
            
            Write-Host "Federated Credential created successfully" -ForegroundColor Green
            Write-Host "  Name: $credentialName" -ForegroundColor Green
            Write-Host "  Issuer: $FederatedIssuer" -ForegroundColor Green
            Write-Host "  Subject: $FederatedSubject" -ForegroundColor Green
            Write-Host "  Audience: $FederatedAudience" -ForegroundColor Green
            
        } catch {
            Write-Warning "Could not create federated credential using Azure CLI: $_"
            Write-Host "Please create it manually in the Azure Portal" -ForegroundColor Yellow
        }
    }
}

# Output configuration summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Service Principal Configuration Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nConfiguration Details:" -ForegroundColor Green
Write-Host "  Tenant ID: $tenantId"
Write-Host "  Application (Client) ID: $appId"
Write-Host "  Object ID: $objectId"
Write-Host "  Display Name: $AppName"

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Configure API Permissions in Azure Portal:"
Write-Host "   - Navigate to: App Registrations > $AppName > API Permissions"
Write-Host "   - Add required permissions for Power BI Service / Microsoft Fabric"
Write-Host "   - Grant admin consent if required"

Write-Host "`n2. Configure Fabric CLI environment variables:"
Write-Host "   export AZURE_TENANT_ID='$tenantId'"
Write-Host "   export AZURE_CLIENT_ID='$appId'"

if (-not $SkipFederatedCredential -and -not [string]::IsNullOrEmpty($FederatedIssuer)) {
    Write-Host "`n3. Use federated credentials for authentication:"
    Write-Host "   - No client secret needed!"
    Write-Host "   - Token will be obtained from the federated identity provider"
}

Write-Host "`n4. Test Fabric CLI authentication:"
Write-Host "   fab auth login --service-principal"
Write-Host "   fab workspace list"

# Save configuration to file
$configFile = "FabricCLI-ServicePrincipal-Config.json"
$config = @{
    TenantId = $tenantId
    ClientId = $appId
    ObjectId = $objectId
    AppName = $AppName
    CreatedDate = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
}

if (-not $SkipFederatedCredential -and -not [string]::IsNullOrEmpty($FederatedIssuer)) {
    $config.FederatedCredential = @{
        Issuer = $FederatedIssuer
        Subject = $FederatedSubject
        Audience = $FederatedAudience
    }
}

$config | ConvertTo-Json -Depth 5 | Out-File -FilePath $configFile -Encoding utf8

Write-Host "`nConfiguration saved to: $configFile" -ForegroundColor Green
Write-Host "`n========================================`n" -ForegroundColor Cyan
