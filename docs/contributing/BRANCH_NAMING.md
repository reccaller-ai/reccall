# 🌿 Branch Naming Convention

This document outlines the standardized branch naming convention for the RecCall project.

## 📋 Naming Pattern

All branches must follow this pattern:
```
<type>/[JIRA-123]-<short-description>
```

## 🏷️ Branch Types

| Type | Description | Example |
|------|-------------|---------|
| `feature` | New features or enhancements | `feature/RC-001-add-user-authentication` |
| `bugfix` | Bug fixes | `bugfix/RC-002-fix-login-validation` |
| `hotfix` | Critical production fixes | `hotfix/RC-003-security-patch` |
| `release` | Release preparation | `release/v1.2.0` |
| `docs` | Documentation updates | `docs/RC-004-update-api-documentation` |
| `refactor` | Code refactoring | `refactor/RC-005-improve-error-handling` |
| `test` | Adding or updating tests | `test/RC-006-add-unit-tests` |
| `chore` | Maintenance tasks | `chore/RC-007-update-dependencies` |

## 📝 Guidelines

### ✅ Good Examples
- `feature/RC-001-add-user-authentication`
- `bugfix/RC-002-fix-login-validation`
- `hotfix/RC-003-security-patch`
- `docs/RC-004-update-api-documentation`
- `refactor/RC-005-improve-error-handling`
- `test/RC-006-add-unit-tests`
- `chore/RC-007-update-dependencies`

### ❌ Bad Examples
- `new-feature` (missing type prefix)
- `fix-bug` (missing type prefix)
- `feature/add-auth` (missing JIRA ticket)
- `feature/RC-001` (missing description)
- `feature/RC-001-Add-User-Authentication` (uppercase in description)

## 🔧 Creating Branches

### Using Git CLI
```bash
# Create and switch to new feature branch
git checkout -b feature/RC-001-add-user-authentication

# Create branch from specific commit
git checkout -b bugfix/RC-002-fix-login-validation <commit-hash>
```

### Using GitHub CLI
```bash
# Create branch and switch to it
gh repo create-branch feature/RC-001-add-user-authentication
```

## 🚫 Branch Protection

The `main` branch is protected with the following rules:
- ❌ No direct pushes allowed
- ✅ Requires pull request reviews
- ✅ Requires status checks to pass
- ✅ Requires up-to-date branches
- ✅ Requires linear history

## 🔄 Workflow

1. **Create branch** following naming convention
2. **Make changes** and commit with conventional commits
3. **Push branch** to remote repository
4. **Create pull request** with proper description
5. **Get approval** from code owners
6. **Merge** after all checks pass

## 📚 Related Documentation

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [Pull Request Template](.github/pull_request_template.md)
