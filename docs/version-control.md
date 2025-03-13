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

On each Git commit:
1. The pre-commit hook runs the version increment script
2. The PATCH version is automatically incremented by 1
3. The version.json file is updated and staged
4. The commit message is prefixed with the new version and a synopsis ([v0.0.2 - Added new feature])

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
- `scripts/setup-version-control.js` - Setup script

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
