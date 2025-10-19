# RecCall Starter Pack

This directory contains common development recipes and shortcuts that are automatically loaded when RecCall is installed.

## 📁 Structure

```
starter-pack/
├── manifest.json              # Starter pack configuration
├── README.md                  # This file
├── development/               # Development-related shortcuts
│   ├── component-development.json
│   ├── api-testing.json
│   ├── documentation.json
│   ├── error-handling.json
│   └── performance-optimization.json
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
├── code-review/               # Code review shortcuts
│   ├── code-review.json
│   └── security-review.json
├── testing/                   # Testing shortcuts
│   ├── unit-tests.json
│   ├── integration-tests.json
│   └── test-coverage.json
├── database/                  # Database shortcuts
│   ├── migrations.json
│   └── query-optimization.json
├── security/                  # Security shortcuts
│   ├── authentication.json
│   └── authorization.json
├── devops/                    # DevOps shortcuts
│   ├── monitoring.json
│   └── logging.json
├── frontend/                  # Frontend shortcuts
│   ├── ui-components.json
│   └── accessibility.json
├── backend/                   # Backend shortcuts
│   ├── api-design.json
│   └── microservices.json
└── project-management/        # Project management shortcuts
    ├── estimation.json
    └── communication.json
```

## 🎯 Categories

### Development
- **component-development**: Generic component development best practices
- **api-testing**: Comprehensive API testing guidelines
- **documentation**: Documentation writing best practices
- **error-handling**: Generic error handling best practices
- **performance-optimization**: Generic performance optimization guidelines

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

### Testing
- **unit-tests**: Write comprehensive unit tests with proper coverage
- **integration-tests**: Create integration tests for component interactions
- **test-coverage**: Analyze and improve test coverage

### Database
- **migrations**: Create and manage database migrations safely
- **query-optimization**: Optimize database queries for performance

### Security
- **authentication**: Implement secure authentication mechanisms
- **authorization**: Implement proper authorization and access control

### DevOps
- **monitoring**: Set up comprehensive monitoring and alerting
- **logging**: Implement comprehensive logging strategies

### Frontend
- **ui-components**: Create reusable and accessible UI components
- **accessibility**: Implement web accessibility (a11y) best practices

### Backend
- **api-design**: Design and implement RESTful APIs with best practices
- **microservices**: Design and implement microservices architecture

### Project Management
- **estimation**: Provide accurate project and task estimation
- **communication**: Facilitate effective team communication

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
