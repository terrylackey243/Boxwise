# Version Control System

## Overview

Boxwise includes an automated version control system that:

1. Displays the current software version on the Admin Dashboard
2. Automatically increments the version number with each Git commit
3. Adds the version number to commit messages

The version follows semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR** version: Incompatible API changes
- **MINOR** version: New features in a backward-compatible manner
- **PATCH** version: Backward-compatible bug fixes (auto-incremented)

## Setup

To set up the version control system:

```bash
npm run setup:version
```

This script will:
- Make the necessary scripts executable
- Install the pre-commit Git hook
- Backup any existing pre-commit hook (if present)

## How It Works

### Version Display

The version is displayed as a badge next to the Admin Dashboard title. The version information is stored in `client/src/version.json`.

### Automatic Version Incrementing

The system uses three Git hooks working together:

#### Pre-commit Hook
1. Runs before changes are committed
2. Executes the version management script
3. If needed, increments the PATCH version by 1
4. Updates and stages the version.json file

#### Prepare-commit-msg Hook
1. Runs when Git is preparing the commit message template
2. Available as a fallback mechanism for version stamping

#### Commit-msg Hook
1. Runs after the commit message is entered but before the commit is finalized
2. Reads the current version from version.json
3. Prepends the version number to your commit message
4. Formats the commit message as: "v0.0.2: Added new feature"

This multi-hook approach ensures:
- The version number is always incremented appropriately
- Manual version updates (for major/minor releases) are respected
- The commit message always starts with the exact version number
- The original commit message is preserved intact
- The displayed version on the dashboard is always in sync with the commit version

### Manual Version Updates

For MAJOR and MINOR version updates, manually edit the `client/src/version.json` file:

```json
{
  "version": "1.2.0",
  "major": 1,
  "minor": 2,
  "patch": 0
}
```

Make sure to update all three fields:
- The combined version string
- The individual major, minor, and patch values

## Files

- `client/src/version.json` - Stores the current version number
- `scripts/increment-version.js` - Script that increments the version
- `scripts/hooks/pre-commit` - Git hook that runs the increment script
- `scripts/hooks/prepare-commit-msg` - Git hook for message preparation
- `scripts/hooks/commit-msg` - Git hook that formats commit messages with version info
- `scripts/setup-version-control.js` - Setup script that installs all hooks

## Troubleshooting

If version incrementing stops working:

1. Ensure the pre-commit hook is installed and executable:
   ```bash
   ls -la .git/hooks/pre-commit
   ```

2. If the hook is missing, re-run the setup:
   ```bash
   npm run setup:version
   ```

3. Check for errors in the version.json file
