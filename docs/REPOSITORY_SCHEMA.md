# RecCall Repository Schema

This document defines the schema for RecCall recipe repositories.

## Repository Structure

A RecCall repository should be hosted as a static website with the following structure:

```
repository-root/
├── manifest.json          # Repository manifest
├── recipes/
│   ├── recipe1.json       # Individual recipe files
│   ├── recipe2.json
│   └── ...
└── README.md              # Repository documentation
```

## Manifest Schema

The `manifest.json` file defines the repository metadata and lists all available recipes:

```json
{
  "name": "Repository Name",
  "description": "Repository description",
  "version": "1.0.0",
  "author": "Repository author",
  "url": "https://reccaller.repo.ai",
  "recipes": [
    {
      "name": "Recipe Display Name",
      "shortcut": "recipe-shortcut",
      "description": "Recipe description",
      "file": "recipes/recipe1.json",
      "category": "development",
      "tags": ["git", "branch", "feature"],
      "version": "1.0.0"
    }
  ]
}
```

## Recipe Schema

Each recipe file should contain:

```json
{
  "shortcut": "recipe-shortcut",
  "context": "The actual context/instruction content",
  "name": "Recipe Display Name",
  "description": "Recipe description",
  "category": "development",
  "tags": ["git", "branch", "feature"],
  "version": "1.0.0",
  "author": "Recipe author",
  "created": "2024-01-01T00:00:00Z",
  "updated": "2024-01-01T00:00:00Z"
}
```

## Field Descriptions

### Manifest Fields
- `name`: Human-readable repository name
- `description`: Repository description
- `version`: Repository version (semantic versioning)
- `author`: Repository author/owner
- `url`: Repository URL
- `recipes`: Array of recipe metadata

### Recipe Fields
- `shortcut`: Unique identifier for the recipe (used in CLI)
- `context`: The actual instruction/context content
- `name`: Human-readable recipe name
- `description`: Recipe description
- `category`: Recipe category (e.g., "development", "git", "deployment")
- `tags`: Array of tags for searching/filtering
- `version`: Recipe version (semantic versioning)
- `author`: Recipe author
- `created`: ISO 8601 creation timestamp
- `updated`: ISO 8601 last update timestamp

## Categories

Standard categories for recipes:
- `development`: Development workflow recipes
- `git`: Git-related recipes
- `deployment`: Deployment and DevOps recipes
- `testing`: Testing-related recipes
- `documentation`: Documentation recipes
- `debugging`: Debugging and troubleshooting recipes
- `security`: Security-related recipes
- `performance`: Performance optimization recipes

## Example Repository

See the `starter-pack/` directory in this repository for examples of recipe files.
