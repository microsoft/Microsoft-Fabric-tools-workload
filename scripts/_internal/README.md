# Internal Scripts Directory

This directory contains internal scripts and tools used by the Microsoft team for managing the Fabric Extensibility Toolkit project. These scripts are **excluded from public releases** and are only used in the staging/internal repository.

## Scripts

### CreateRelease.ps1

Automates the release process for publishing changes from the staging repository to the public repository.

#### Purpose
- Validates version numbers and release notes
- Syncs changes from staging to public repository
- Creates Pull Requests for releases
- Updates main README.md with latest release link
- Tags versions for tracking

#### Usage

```powershell
# Basic release with version check
.\CreateRelease.ps1 -Version "2025.11.1"

# Release with custom repository
.\CreateRelease.ps1 -Version "2025.11.1" -PublicRepoUrl "https://github.com/microsoft/fabric-extensibility-toolkit.git"

# Force release without confirmations
.\CreateRelease.ps1 -Version "2025.11.1" -Force
```

#### Parameters

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| `-Version` | Version number (YYYY.MM or YYYY.MM.P format) | - | ✅ |
| `-PublicRepoUrl` | URL of public repository | Auto-detected | ❌ |
| `-PublicRepoOwner` | GitHub repository owner | `microsoft` | ❌ |
| `-PublicRepoName` | GitHub repository name | `fabric-extensibility-toolkit` | ❌ |
| `-SourceBranch` | Source branch to sync from | `main` | ❌ |
| `-TargetBranch` | Target branch in public repo | `main` | ❌ |
| `-Force` | Skip confirmation prompts | `false` | ❌ |

#### Prerequisites

1. **Git Repository**: Must be run from within the staging repository
2. **Release Notes**: File must exist at `docs/ReleaseNotes/{YYYY}/v{VERSION}.md` (e.g., `docs/ReleaseNotes/2025/v2025.11.md`)
3. **GitHub CLI** (optional): For automatic PR creation
4. **Git Access**: Push permissions to public repository

#### Process Flow

1. **Validation**
   - Checks version format (YYYY.MM or YYYY.MM.P)
   - Verifies release notes exist
   - Validates git repository status
   - Confirms GitHub CLI authentication

2. **Preparation**
   - Creates temporary working directory
   - Clones public repository
   - Creates feature branch (`release/v{VERSION}`)

3. **Synchronization**
   - Copies files from staging repository
   - Applies exclusion patterns (see below)
   - Preserves git history in target

4. **Publication**
   - Commits changes with release message
   - Pushes feature branch to public repository
   - Creates Pull Request (if GitHub CLI available)
   - Updates main README.md with latest release link
   - Creates and pushes version tag

5. **Cleanup**
   - Removes temporary directories
   - Reports completion status

#### Exclusion Patterns

The following files and directories are **excluded** from public releases:

```
scripts/_internal/*     # Internal scripts (this directory)
Workload/node_modules/* # Node.js dependencies
.git/*                  # Git internal files
.vs/*                   # Visual Studio files
.vscode/*               # VS Code settings
*.tmp                   # Temporary files
*.log                   # Log files
build/*                 # Build artifacts
release/*               # Release artifacts
.env.*                  # Environment files
```

#### Version Format

Versions must follow the **YYYY.MM** or **YYYY.MM.P** format:

- **YYYY**: 4-digit year (e.g., 2025)
- **MM**: 1-2 digit month (e.g., 11)
- **P**: Optional patch/fix number (e.g., 1)

Examples:
- ✅ `2025.11` (monthly release)
- ✅ `2025.11.1` (first patch of November 2025)
- ✅ `2025.1.15` (15th patch of January 2025)
- ✅ `2024.12` (December 2024 release)
- ❌ `v2025.11.1` (no prefix)
- ❌ `2025` (missing month)
- ❌ `25.11.1` (2-digit year)

#### Release Notes Format

Release notes must be placed in `docs/ReleaseNotes/{YYYY}/v{VERSION}.md` and should follow this structure:

The script automatically creates year folders (e.g., `2025/`, `2026/`) based on the version number.

```markdown
# Release Notes - v{VERSION}

## Overview
Brief description of the release.

## 🚀 New Features
### Feature Category
- Feature description
- Another feature

## 🔧 Technical Improvements
### Improvement Category  
- Technical improvement
- Another improvement

## 🐛 Bug Fixes
### Bug Category
- Bug fix description
- Another bug fix

## 💥 Breaking Changes
- Breaking change description
- Migration instructions

## 📖 Documentation Updates
- Documentation changes

## 🔄 Migration Guide
Step-by-step upgrade instructions.
```

#### Error Handling

Common issues and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid version format" | Version doesn't match YYYY.MM or YYYY.MM.P | Use correct format |
| "Release notes not found" | Missing release notes file | Create file at expected path (docs/ReleaseNotes/{YYYY}/v{VERSION}.md) |
| "Git command failed" | Git repository issues | Check git status and permissions |
| "GitHub CLI not authenticated" | gh not logged in | Run `gh auth login` |
| "Robocopy failed" | File copy issues | Check file permissions |

#### Security Considerations

- Internal scripts are excluded from public releases
- Environment files with secrets are excluded
- Only curated changes are synchronized
- All commits are reviewed via Pull Request process

## Directory Structure

```
scripts/_internal/
├── README.md               # This file
├── CreateRelease.ps1       # Main release script
└── [future scripts]        # Additional internal tools
```

## Best Practices

### Before Running Release Script

1. **Verify Changes**: Ensure all desired changes are committed
2. **Test Locally**: Run full build and test suite  
3. **Update Documentation**: Update relevant docs and README files
4. **Create Release Notes**: Write comprehensive release notes
5. **Check Dependencies**: Verify no internal dependencies leak

### Version Management

- Use semantic versioning principles within YYYY.MM[.P] format
- Use YYYY.MM for monthly feature releases
- Use YYYY.MM.P for patches and hotfixes within a month
- Increment month for feature releases
- Use year boundary for major releases

### Release Notes Guidelines

- Write for external users (not internal team)
- Include migration instructions for breaking changes
- Highlight new features and improvements
- Document known issues and workarounds
- Provide clear upgrade paths

## Contributing

These scripts are maintained by the Microsoft Fabric Extensibility team. For suggestions or issues:

1. Create internal work items for improvements
2. Test changes thoroughly before committing
3. Update documentation for any script modifications
4. Follow PowerShell best practices and error handling

---

**Note**: This directory and its contents are automatically excluded from public repository synchronization.