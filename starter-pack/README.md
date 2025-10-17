# RecCall Starter Pack

This directory contains common development recipes and shortcuts that are automatically loaded when RecCall is installed.

## 📁 Structure

```
starter-pack/
├── manifest.json              # Starter pack configuration
├── README.md                  # This file
├── development/               # Development-related shortcuts
│   ├── react-component.json
│   ├── api-testing.json
│   └── documentation.json
├── git/                       # Git workflow shortcuts
│   ├── cleanup-branches.json
│   ├── sync-main.json
│   └── create-feature-branch.json
├── deployment/                # Deployment shortcuts
│   ├── deploy.json
│   └── pre-deploy-check.json
├── debugging/                 # Debugging shortcuts
│   ├── debug.json
│   └── performance-debug.json
└── code-review/               # Code review shortcuts
    ├── code-review.json
    └── security-review.json
```

## 🎯 Categories

### Development
- **react-component**: Create React components with TypeScript best practices
- **api-testing**: Comprehensive API testing guidelines
- **documentation**: Documentation writing best practices

### Git
- **cleanup-branches**: Clean up merged branches
- **sync-main**: Sync main branch with remote
- **create-feature-branch**: Create feature branches with proper naming

### Deployment
- **deploy**: Complete deployment checklist
- **pre-deploy-check**: Pre-deployment safety checks

### Debugging
- **debug**: Systematic debugging approach
- **performance-debug**: Performance debugging guidelines

### Code Review
- **code-review**: Comprehensive code review checklist
- **security-review**: Security-focused code review

## 🚀 Usage

These shortcuts are automatically loaded when you first install RecCall. You can:

1. **List all shortcuts**: `rec_list`
2. **Use a shortcut**: `call <shortcut-name>`
3. **Update a shortcut**: `rec_update <shortcut-name> <new-context>`
4. **Delete a shortcut**: `rec_delete <shortcut-name>`

## 🔧 Customization

You can modify these recipes or add your own by editing the JSON files in the respective category directories. The manifest.json file lists all available recipes.

## 📝 Recipe Format

Each recipe file follows this format:

```json
{
  "shortcut": "shortcut-name",
  "context": "The context or instruction text",
  "category": "category-name",
  "description": "Human-readable description"
}
```
