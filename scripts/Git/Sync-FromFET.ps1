<#
.SYNOPSIS
    Syncs changes from the official Microsoft Fabric Extensibility Toolkit repository.

.DESCRIPTION
    This script fetches and merges changes from the main branch of the official
    fabric-extensibility-toolkit repository while excluding specific files and directories
    that are customized for this community tools workload.

.PARAMETER Excluded
    Array of paths to exclude from the sync. Defaults to docs/, *.md files, and LICENSE.

.EXAMPLE
    .\Sync-FromFET.ps1
    Syncs changes using default exclusions.

.EXAMPLE
    .\Sync-FromFET.ps1 -Excluded @('docs/', '*.md', 'LICENSE', 'custom-folder/')
    Syncs changes with custom exclusions.

.NOTES
    This script requires git to be installed and available in PATH.
    Run this script from the root of the repository.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string[]]$Excluded = @(
        'docs/',
        '*.md',
        'LICENSE'
    )
)

# Configuration
$UpstreamRepoUrl = 'https://github.com/microsoft/fabric-extensibility-toolkit.git'
$UpstreamRemoteName = 'upstream-fet'
$UpstreamBranch = 'main'

# Color output helpers
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-ErrorMsg { param($Message) Write-Host $Message -ForegroundColor Red }

# Ensure we're in a git repository
if (-not (Test-Path .git)) {
    Write-ErrorMsg "Error: Not in a git repository root. Please run this script from the repository root."
    exit 1
}

# Check for uncommitted changes
Write-Info "Checking for uncommitted changes..."
$status = git status --porcelain
if ($status) {
    Write-ErrorMsg "Error: You have uncommitted changes. Please commit or stash them before syncing."
    git status --short
    exit 1
}

# Get current branch
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Info "Current branch: $currentBranch"

# Check if upstream remote exists
Write-Info "Checking upstream remote..."
$remotes = git remote
if ($remotes -notcontains $UpstreamRemoteName) {
    Write-Info "Adding upstream remote: $UpstreamRepoUrl"
    git remote add $UpstreamRemoteName $UpstreamRepoUrl
    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Failed to add upstream remote."
        exit 1
    }
} else {
    Write-Info "Upstream remote already exists."
}

# Fetch latest changes from upstream
Write-Info "Fetching latest changes from $UpstreamRemoteName/$UpstreamBranch..."
git fetch $UpstreamRemoteName $UpstreamBranch
if ($LASTEXITCODE -ne 0) {
    Write-ErrorMsg "Failed to fetch from upstream."
    exit 1
}

Write-Success "Fetch completed successfully."

# Show what will be excluded
Write-Info "`nExcluded paths:"
foreach ($path in $Excluded) {
    Write-Host "  - $path" -ForegroundColor Yellow
}

# Create merge strategy
Write-Info "`nMerging changes from $UpstreamRemoteName/$UpstreamBranch..."
Write-Warning "Note: This will merge changes. You may need to resolve conflicts."

# Perform the merge
git merge "$UpstreamRemoteName/$UpstreamBranch" --no-commit --no-ff
$mergeExitCode = $LASTEXITCODE

if ($mergeExitCode -eq 0) {
    # Merge successful, now reset excluded files
    Write-Info "`nRestoring excluded files to their current state..."
    
    foreach ($path in $Excluded) {
        Write-Info "  Restoring: $path"
        git reset HEAD $path 2>$null
        git checkout -- $path 2>$null
    }
    
    Write-Success "`nMerge prepared successfully!"
    Write-Info "Excluded files have been restored to their pre-merge state."
    Write-Info "`nNext steps:"
    Write-Host "  1. Review the changes: " -NoNewline
    Write-Host "git status" -ForegroundColor Cyan
    Write-Host "  2. Review diffs: " -NoNewline
    Write-Host "git diff --cached" -ForegroundColor Cyan
    Write-Host "  3. Commit the merge: " -NoNewline
    Write-Host "git commit -m 'Sync from FET main'" -ForegroundColor Cyan
    Write-Host "  4. Or abort the merge: " -NoNewline
    Write-Host "git merge --abort" -ForegroundColor Cyan
    
} elseif ($mergeExitCode -eq 1) {
    # Merge conflicts
    Write-Warning "`nMerge conflicts detected!"
    Write-Info "Restoring excluded files to their current state..."
    
    foreach ($path in $Excluded) {
        Write-Info "  Restoring: $path"
        git reset HEAD $path 2>$null
        git checkout -- $path 2>$null
    }
    
    Write-Info "`nConflicted files:"
    git diff --name-only --diff-filter=U | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor Yellow
    }
    
    Write-Info "`nNext steps:"
    Write-Host "  1. Resolve conflicts in the files listed above" -ForegroundColor Cyan
    Write-Host "  2. Stage resolved files: " -NoNewline
    Write-Host "git add <file>" -ForegroundColor Cyan
    Write-Host "  3. Complete the merge: " -NoNewline
    Write-Host "git commit" -ForegroundColor Cyan
    Write-Host "  4. Or abort the merge: " -NoNewline
    Write-Host "git merge --abort" -ForegroundColor Cyan
    
} else {
    Write-ErrorMsg "Merge failed with exit code $mergeExitCode"
    Write-Info "You may need to abort the merge: git merge --abort"
    exit $mergeExitCode
}
