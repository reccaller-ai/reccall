# RecCall Repository Commands

This document describes the new repository commands added to RecCall for managing recipes from remote repositories.

## Overview

RecCall now supports installing and managing recipes from remote repositories. The default repository is `https://reccaller.repo.ai`, but you can configure custom repositories.

## Repository Commands

### `reccall repo-list`

List all available recipes from the configured repository.

```bash
reccall repo-list
reccall repo-list -r https://custom-repo.example.com
```

**Options:**
- `-r, --repo <url>`: Override the default repository URL

### `reccall repo-install <shortcut>`

Install a specific recipe from the repository.

```bash
reccall repo-install sync-main
reccall repo-install create-feature-branch -r https://custom-repo.example.com
```

**Options:**
- `-r, --repo <url>`: Override the default repository URL

### `reccall repo-search <query>`

Search for recipes in the repository by name, description, or shortcut.

```bash
reccall repo-search git
reccall repo-search "feature branch" -r https://custom-repo.example.com
```

**Options:**
- `-r, --repo <url>`: Override the default repository URL

### `reccall repo-config`

Configure repository settings.

```bash
# Set a custom default repository
reccall repo-config --set-repo https://my-repo.example.com

# Disable repository features
reccall repo-config --disable

# Enable repository features
reccall repo-config --enable

# Show current configuration
reccall repo-config
```

**Options:**
- `-s, --set-repo <url>`: Set the default repository URL
- `-d, --disable`: Disable repository features
- `-e, --enable`: Enable repository features

### `reccall repo-cache-clear`

Clear the local repository cache to force fresh downloads.

```bash
reccall repo-cache-clear
```

## Configuration

Repository configuration is stored in `~/.reccall-repo.json`:

```json
{
  "defaultRepo": "https://reccaller.repo.ai",
  "cacheDir": "/Users/username/.reccall-cache",
  "enabled": true
}
```

## Caching

RecCall automatically caches repository data for 1 hour to improve performance. Use `repo-cache-clear` to force fresh downloads.

## Repository Format

Repositories should follow the schema defined in `REPOSITORY_SCHEMA.md`. The repository should be hosted as a static website with:

- `manifest.json` - Repository metadata and recipe list
- Individual recipe files in JSON format

## Examples

### Basic Usage

```bash
# List available recipes
reccall repo-list

# Install a recipe
reccall repo-install sync-main

# Search for recipes
reccall repo-search git

# Clear cache
reccall repo-cache-clear
```

### Custom Repository

```bash
# Configure custom repository
reccall repo-config --set-repo https://my-company.repo.ai

# List recipes from custom repository
reccall repo-list -r https://my-company.repo.ai

# Install from custom repository
reccall repo-install company-workflow -r https://my-company.repo.ai
```

## Error Handling

- Network errors are handled gracefully with informative messages
- Recipe validation ensures only valid recipes are installed
- Cache errors are handled transparently (falls back to fresh downloads)
- Invalid repository URLs or formats are reported clearly

## Integration with Existing Commands

Repository commands work alongside existing RecCall commands:

- Installed recipes appear in `reccall list`
- Installed recipes can be called with `reccall call <shortcut>`
- Installed recipes can be updated with `reccall update <shortcut> <new-context>`
- Installed recipes can be deleted with `reccall delete <shortcut>`
