<#
.SYNOPSIS
    Creates a new release by syncing changes to public repository, creating PR, and tagging version

.DESCRIPTION
    This script automates the release process for the Microsoft Fabric Extensibility Toolkit:
    1. Validates the version number format
    2. Checks for corresponding release notes
    3. Syncs changes to public repository (with exclusions)
    4. Creates a Pull Request
    5. Updates README.md with latest release information
    6. Tags the version

.PARAMETER Version
    The version number in format YYYY.MM.P (e.g., 2025.11.1)

.PARAMETER PublicRepoUrl
    The URL of the public GitHub repository (default: detected from git remote)

.PARAMETER PublicRepoOwner
    The owner of the public repository (default: microsoft)

.PARAMETER PublicRepoName
    The name of the public repository (default: fabric-extensibility-toolkit)

.PARAMETER SourceBranch
    The source branch to sync from (default: main)

.PARAMETER TargetBranch
    The target branch in public repo (default: main)

.PARAMETER Force
    Skip confirmation prompts

.PARAMETER DryRun
    Perform a dry run - show what would be done without making changes (alias: WhatIf)

.EXAMPLE
    .\CreateRelease.ps1 -Version "2025.11.1"

.EXAMPLE
    .\CreateRelease.ps1 -Version "2025.11.1" -DryRun
    Shows what would be done for the release without making changes

.EXAMPLE
    .\CreateRelease.ps1 -Version "2025.11.1" -PublicRepoUrl "https://github.com/microsoft/fabric-extensibility-toolkit.git" -Force

#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Version,
    
    [Parameter()]
    [string]$PublicRepoUrl = "",
    
    [Parameter()]
    [string]$PublicRepoOwner = "microsoft",
    
    [Parameter()]
    [string]$PublicRepoName = "fabric-extensibility-toolkit",
    
    [Parameter()]
    [string]$SourceBranch = "main",
    
    [Parameter()]
    [string]$TargetBranch = "main",
    
    [Parameter()]
    [switch]$Force,
    
    [Parameter()]
    [Alias("WhatIf")]
    [switch]$DryRun
)

# Script configuration
$ErrorActionPreference = "Stop"
$InformationPreference = "Continue"

# Paths
$ScriptRoot = $PSScriptRoot
$ProjectRoot = Split-Path (Split-Path $ScriptRoot -Parent) -Parent
$ReleaseNotesDir = Join-Path $ProjectRoot "docs\ReleaseNotes"
$TempDir = Join-Path $env:TEMP "fabric-release-$Version"

# Files and directories to exclude from sync
$ExcludePatterns = @(
    "scripts/_internal/*",
    "Workload/node_modules/*",
    ".git/*",
    ".vs/*",
    ".vscode/*",
    "*.tmp",
    "*.log",
    "build/*",
    "release/*",
    ".env.*"
)

#region Helper Functions

function Write-StepHeader {
    param([string]$Message)
    Write-Information "`n=== $Message ===" -InformationAction Continue
}

function Write-StepSuccess {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-StepWarning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

function Write-StepError {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Test-GitRepository {
    try {
        git status | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Get-GitRemoteUrl {
    param([string]$RemoteName = "origin")
    try {
        $remoteUrl = git remote get-url $RemoteName 2>$null
        return $remoteUrl
    }
    catch {
        return $null
    }
}

function Test-VersionFormat {
    param([string]$Version)
    # Allow YYYY.MM or YYYY.MM.P format
    return $Version -match '^\d{4}\.\d{1,2}(\.\d+)?$'
}

function Test-ReleaseNotesExist {
    param([string]$Version)
    $releaseNotesPath = Get-ReleaseNotesPath $Version
    return Test-Path $releaseNotesPath
}

function Get-ReleaseNotesPath {
    param([string]$Version)
    # Extract year from version (format: YYYY.MM or YYYY.MM.P)
    $year = $Version.Split('.')[0]
    $yearFolder = Join-Path $ReleaseNotesDir $year
    return Join-Path $yearFolder "v$Version.md"
}

function Ensure-ReleaseNotesYearFolder {
    param([string]$Version)
    $year = $Version.Split('.')[0]
    $yearFolder = Join-Path $ReleaseNotesDir $year
    if (-not (Test-Path $yearFolder)) {
        Write-Information "Creating release notes folder for year: $year"
        New-Item -Path $yearFolder -ItemType Directory -Force | Out-Null
    }
    return $yearFolder
}

function Invoke-GitCommand {
    param(
        [string]$Command,
        [string]$WorkingDirectory = (Get-Location).Path,
        [switch]$SuppressOutput
    )
    
    try {
        Push-Location $WorkingDirectory
        if ($SuppressOutput) {
            $result = Invoke-Expression "git $Command" 2>$null
        } else {
            $result = Invoke-Expression "git $Command"
        }
        return $result
    }
    catch {
        throw "Git command failed: git $Command`nError: $_"
    }
    finally {
        Pop-Location
    }
}

function Copy-FilesWithExclusions {
    param(
        [string]$SourcePath,
        [string]$DestinationPath,
        [string[]]$ExcludePatterns
    )
    
    Write-Information "Copying files from $SourcePath to $DestinationPath..."
    
    # Create robocopy exclude file
    $excludeFile = Join-Path $env:TEMP "robocopy-exclude-$(Get-Random).txt"
    $ExcludePatterns | Out-File -FilePath $excludeFile -Encoding UTF8
    
    try {
        # Use robocopy for efficient copying with exclusions
        $robocopyArgs = @(
            $SourcePath
            $DestinationPath
            "/MIR"  # Mirror directory tree
            "/XF"   # Exclude files
            "/XD"   # Exclude directories
        )
        
        # Add exclude patterns
        foreach ($pattern in $ExcludePatterns) {
            if ($pattern.EndsWith("/*")) {
                $robocopyArgs += "/XD"
                $robocopyArgs += $pattern.Replace("/*", "")
            } else {
                $robocopyArgs += "/XF"
                $robocopyArgs += $pattern
            }
        }
        
        $robocopyArgs += "/NFL" # No file list
        $robocopyArgs += "/NDL" # No directory list
        $robocopyArgs += "/NP"  # No progress
        
        $result = & robocopy @robocopyArgs
        
        # Robocopy exit codes: 0-7 are success, 8+ are errors
        if ($LASTEXITCODE -ge 8) {
            throw "Robocopy failed with exit code $LASTEXITCODE"
        }
        
        Write-StepSuccess "Files copied successfully"
    }
    finally {
        if (Test-Path $excludeFile) {
            Remove-Item $excludeFile -Force
        }
    }
}

function Test-GitHubCLI {
    try {
        gh auth status | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Update-ReadmeLatestRelease {
    param(
        [string]$Version,
        [string]$ReadmePath = (Join-Path $ProjectRoot "README.md")
    )
    
    if (-not (Test-Path $ReadmePath)) {
        Write-StepWarning "README.md not found at: $ReadmePath"
        return
    }
    
    try {
        # Get release notes path for the link
        $releaseNotesPath = Get-ReleaseNotesPath $Version
        $relativePath = $releaseNotesPath -replace [regex]::Escape($ProjectRoot), '' -replace '^\\', '' -replace '\\', '/'
        
        # Read the current README content
        $content = Get-Content $ReadmePath -Raw
        
        # Define the pattern to match the "Latest Release" section
        $pattern = '(?s)## Latest Release.*?\[View all release notes →\]\(docs/ReleaseNotes/\)'
        
        # Create the new release section - try to get a meaningful title from release notes
        $releaseTitle = "Latest Release"
        if (Test-Path $releaseNotesPath) {
            $releaseContent = Get-Content $releaseNotesPath -Raw
            # Look for overview section content or meaningful descriptions
            if ($releaseContent -match '##?\s*🎯\s*Overview\s*\n\n([^\n]+)') {
                $releaseTitle = $matches[1].Trim()
            } elseif ($releaseContent -match '##?\s*Overview\s*\n\n([^\n]+)') {
                $releaseTitle = $matches[1].Trim()  
            } elseif ($releaseContent -match 'Major.*enhancement|Major.*toolkit.*enhancement') {
                $releaseTitle = "Major Toolkit Enhancement"
            } elseif ($releaseContent -match 'introduces.*controls|standardized.*controls') {
                $releaseTitle = "Standardized Base Controls"
            } elseif ($releaseContent -match 'Bug.*fixes|fixes.*and.*improvements') {
                $releaseTitle = "Bug Fixes and Improvements"
            } else {
                # Extract from the first line after the main heading
                if ($releaseContent -match '# Microsoft Fabric Extensibility Toolkit v[\d\.]+\s*\n\n\*\*.*?\*\*.*?\n\n.*?\n\n([^\n]+)') {
                    $releaseTitle = $matches[1].Trim()
                }
            }
        }
        
        # Create the replacement text
        $replacement = "## Latest Release`n`n📋 **[v$Version - $releaseTitle]($relativePath)**`n`nThis release introduces $releaseTitle. [View all release notes →](docs/ReleaseNotes/)"
        
        # Replace the existing section
        if ($content -match $pattern) {
            $newContent = $content -replace $pattern, $replacement
            Set-Content $ReadmePath -Value $newContent -NoNewline
            Write-StepSuccess "Updated README.md with latest release: v$Version"
        } else {
            Write-StepWarning "Could not find 'Latest Release' section in README.md to update"
        }
    }
    catch {
        Write-StepError "Failed to update README.md: $_"
    }
}

#endregion

#region Main Script

try {
    Write-StepHeader "Starting Release Process for Version $Version"

    # Step 1: Validate environment
    Write-StepHeader "Step 1: Validating Environment"
    
    # Check if we're in a git repository
    if (-not (Test-GitRepository)) {
        throw "Current directory is not a Git repository"
    }
    Write-StepSuccess "Git repository detected"
    
    # Validate version format
    if (-not (Test-VersionFormat $Version)) {
        throw "Invalid version format. Expected format: YYYY.MM or YYYY.MM.P (e.g., 2025.11 or 2025.11.1)"
    }
    Write-StepSuccess "Version format is valid: $Version"
    
    # Check for release notes
    if (-not (Test-ReleaseNotesExist $Version)) {
        $releaseNotesPath = Get-ReleaseNotesPath $Version
        throw "Release notes not found at: $releaseNotesPath"
    }
    $releaseNotesPath = Get-ReleaseNotesPath $Version
    Write-StepSuccess "Release notes found: $releaseNotesPath"
    
    # Check GitHub CLI
    if (-not (Test-GitHubCLI)) {
        Write-StepWarning "GitHub CLI not authenticated. PR creation will be skipped."
        $skipPR = $true
    } else {
        Write-StepSuccess "GitHub CLI authenticated"
        $skipPR = $false
    }
    
    # Handle DryRun mode
    if ($DryRun) {
        Write-StepHeader "DRY RUN MODE - Showing what would be done:"
        Write-Information "✓ Version: $Version"
        Write-Information "✓ Release notes: $releaseNotesPath"
        Write-Information "✓ Public repo URL: $PublicRepoUrl"
        Write-Information "✓ Feature branch: release/v$Version"
        Write-Information "✓ Target branch: $TargetBranch"
        Write-Information "✓ Would sync files from: $ProjectRoot"
        Write-Information "✓ Would exclude patterns: $($ExcludePatterns -join ', ')"
        
        if (-not $skipPR) {
            Write-Information "✓ Would create Pull Request with GitHub CLI"
        } else {
            Write-Information "⚠ Would skip PR creation (GitHub CLI not available)"
        }
        
        Write-Information "✓ Would update README.md with latest release link"
        Write-Information "✓ Would create Git tag: v$Version"
        Write-StepSuccess "DRY RUN completed - no changes made"
        return
    }
    
    # Determine public repository URL
    if ([string]::IsNullOrEmpty($PublicRepoUrl)) {
        $PublicRepoUrl = "https://github.com/$PublicRepoOwner/$PublicRepoName.git"
    }
    Write-Information "Public repository: $PublicRepoUrl"
    
    # Step 2: Prepare working directory
    Write-StepHeader "Step 2: Preparing Working Directory"
    
    if (Test-Path $TempDir) {
        Write-Information "Removing existing temp directory: $TempDir"
        Remove-Item $TempDir -Recurse -Force
    }
    
    New-Item -Path $TempDir -ItemType Directory -Force | Out-Null
    Write-StepSuccess "Created working directory: $TempDir"
    
    # Step 3: Clone public repository
    Write-StepHeader "Step 3: Cloning Public Repository"
    
    $publicRepoDir = Join-Path $TempDir "public-repo"
    Invoke-GitCommand "clone $PublicRepoUrl `"$publicRepoDir`"" -WorkingDirectory $TempDir
    Write-StepSuccess "Cloned public repository"
    
    # Create feature branch
    $featureBranch = "release/v$Version"
    Invoke-GitCommand "checkout -b $featureBranch" -WorkingDirectory $publicRepoDir
    Write-StepSuccess "Created feature branch: $featureBranch"
    
    # Step 4: Sync changes
    Write-StepHeader "Step 4: Syncing Changes"
    
    Copy-FilesWithExclusions -SourcePath $ProjectRoot -DestinationPath $publicRepoDir -ExcludePatterns $ExcludePatterns
    
    # Step 5: Commit changes
    Write-StepHeader "Step 5: Committing Changes"
    
    Invoke-GitCommand "add ." -WorkingDirectory $publicRepoDir
    
    # Check if there are any changes to commit
    $changes = Invoke-GitCommand "diff --cached --name-only" -WorkingDirectory $publicRepoDir
    if ([string]::IsNullOrWhiteSpace($changes)) {
        Write-StepWarning "No changes detected. Skipping commit and PR creation."
        return
    }
    
    $commitMessage = "Release v$Version`n`nSynced changes for version $Version release"
    Invoke-GitCommand "commit -m `"$commitMessage`"" -WorkingDirectory $publicRepoDir
    Write-StepSuccess "Committed changes"
    
    # Step 6: Push branch
    Write-StepHeader "Step 6: Pushing Feature Branch"
    
    Invoke-GitCommand "push origin $featureBranch" -WorkingDirectory $publicRepoDir
    Write-StepSuccess "Pushed feature branch to remote"
    
    # Step 7: Create Pull Request
    Write-StepHeader "Step 7: Creating Pull Request"
    
    if (-not $skipPR) {
        try {
            Push-Location $publicRepoDir
            
            # Read release notes for PR body
            $releaseNotes = Get-Content $releaseNotesPath -Raw
            $prBody = @"
## Release v$Version

This PR contains the changes for version $Version release.

### Release Notes

$releaseNotes

### Changes Included
- Synced all changes from staging repository
- Excluded internal scripts and build artifacts
- Updated documentation and examples

### Checklist
- [x] Release notes added
- [x] Version validated
- [x] Changes synced from staging
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Ready for merge

/cc @$PublicRepoOwner
"@
            
            $prTitle = "Release v$Version"
            gh pr create --title $prTitle --body $prBody --base $TargetBranch --head $featureBranch
            Write-StepSuccess "Pull Request created successfully"
        }
        catch {
            Write-StepError "Failed to create PR: $_"
            Write-Information "You can manually create a PR from branch: $featureBranch"
        }
        finally {
            Pop-Location
        }
    } else {
        Write-Information "Skipping PR creation (GitHub CLI not available)"
        Write-Information "Manual PR creation required from branch: $featureBranch"
    }
    
    # Step 8: Update README with Latest Release
    Write-StepHeader "Step 8: Updating README with Latest Release"
    
    try {
        Update-ReadmeLatestRelease -Version $Version
        
        # Add the README update to the git commit if we're in the public repo directory
        if (Test-Path $publicRepoDir) {
            Push-Location $publicRepoDir
            try {
                Invoke-GitCommand "add README.md" -WorkingDirectory $publicRepoDir
                Write-StepSuccess "Added README.md update to the release commit"
            }
            catch {
                Write-StepWarning "Could not add README.md to git: $_"
            }
            finally {
                Pop-Location
            }
        }
    }
    catch {
        Write-StepError "Failed to update README.md: $_"
    }
    
    # Step 9: Create Git Tag
    Write-StepHeader "Step 9: Creating Git Tag"
    
    try {
        # Tag in the public repository
        $tagMessage = "Release version $Version"
        Invoke-GitCommand "tag -a v$Version -m `"$tagMessage`"" -WorkingDirectory $publicRepoDir
        Invoke-GitCommand "push origin v$Version" -WorkingDirectory $publicRepoDir
        Write-StepSuccess "Created and pushed tag: v$Version"
        
        # Also tag in the source repository
        Invoke-GitCommand "tag -a v$Version -m `"$tagMessage`"" -WorkingDirectory $ProjectRoot
        Write-StepSuccess "Created tag in source repository: v$Version"
    }
    catch {
        Write-StepError "Failed to create tag: $_"
    }
    
    # Step 10: Cleanup
    Write-StepHeader "Step 10: Cleanup"
    
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force
        Write-StepSuccess "Cleaned up temporary directory"
    }
    
    # Success summary
    Write-StepHeader "Release Process Completed Successfully!"
    Write-Information "Version: $Version"
    Write-Information "Feature Branch: $featureBranch"
    Write-Information "Tag: v$Version"
    Write-Information "Public Repository: $PublicRepoUrl"
    
    if (-not $skipPR) {
        Write-Information "Pull Request: Created automatically"
    } else {
        Write-Information "Pull Request: Manual creation required"
    }
    
}
catch {
    Write-StepError "Release process failed: $_"
    
    # Cleanup on error
    if (Test-Path $TempDir) {
        Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    exit 1
}

#endregion