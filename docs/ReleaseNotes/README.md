# Release Notes

This directory contains release notes for the Microsoft Fabric Extensibility Toolkit, organized by year for easy navigation and maintenance.

## Folder Structure

```text
docs/ReleaseNotes/
├── README.md (this file)
├── 2025/
│   ├── v2025.11.md
│   └── v2025.12.md (future)
├── 2026/
│   └── v2026.01.md (future)
└── ...
```

## Release Note Format

Each release note file follows the naming convention: `v{YYYY}.{MM}[.{P}].md`

- **YYYY**: 4-digit year
- **MM**: 2-digit month (01-12)
- **P**: Optional patch number (1, 2, 3...)

### Examples

- `v2025.11.md` - November 2025 release
- `v2025.11.1.md` - November 2025 patch release 1
- `v2026.01.md` - January 2026 release

## Automated Release Process

Release notes are automatically processed by the `scripts/_internal/CreateRelease.ps1` script, which:

1. **Validates** version format (YYYY.MM or YYYY.MM.P)
2. **Extracts** year from version for proper folder placement
3. **Creates** year subfolder if it doesn't exist
4. **Locates** release notes at: `docs/ReleaseNotes/{YYYY}/v{VERSION}.md`
5. **Syncs** content to public repository with proper structure

## Creating New Releases

To add a new release:

1. **Create the year folder** (if new year): `docs/ReleaseNotes/YYYY/`
2. **Create release notes file**: `docs/ReleaseNotes/YYYY/vYYYY.MM[.P].md`
3. **Follow the template** structure from existing release notes
4. **Run the release script**: `.\scripts\_internal\CreateRelease.ps1 -Version "YYYY.MM"`

## Release Note Template

Each release note should include:

- **Version and Date** header
- **Overview** of changes
- **Breaking Changes** (if any)
- **New Features** with examples
- **Bug Fixes** and improvements
- **Developer Experience** enhancements
- **Documentation** updates
- **Migration Guide** (if needed)

## Latest Releases

- **[v2025.11](2025/v2025.11.md)** - Major toolkit enhancement with standardized base controls and SCSS architecture

---

For questions about the release process, see the internal documentation in `scripts/_internal/README.md`.
