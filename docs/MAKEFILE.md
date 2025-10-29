# Makefile Usage Guide

## Quick Start

```bash
# Show all available commands
make help

# Install dependencies
make install

# Run all checks (validation + tests)
make check

# Run CI pipeline locally
make ci-all
```

## Local Development

### Basic Commands
```bash
make install       # Install dependencies
make build         # Build the project
make dev           # Run in watch mode
make test          # Run tests
make test-watch    # Run tests in watch mode
make lint          # Check code style
make lint-fix      # Auto-fix linting issues
make format        # Format code
make type-check    # TypeScript type checking
```

### Validation
```bash
make validate      # Run all validation (type-check + lint + format-check)
make quick-check   # Quick validation (no tests)
make quick-fix     # Auto-fix linting and formatting
make pre-commit    # Run pre-commit checks (lint-fix + format + type-check + test)
```

### Testing
```bash
make test              # Run all tests
make test-watch        # Run tests in watch mode
make test-coverage     # Generate coverage report
make test-ui           # Open test UI
make test-unit         # Run only unit tests
make test-integration  # Run only integration tests
```

## CI/CD Commands

### Individual CI Steps
```bash
make ci-deps        # Install dependencies (frozen lockfile)
make ci-type-check  # Type checking
make ci-lint        # Linting (no auto-fix)
make ci-format-check # Format checking
make ci-test        # Run tests with coverage
make ci-security    # Security audit
make ci-build       # Build project
```

### Full CI Pipeline
```bash
make ci             # Run all CI checks
make ci-all         # Complete CI pipeline (recommended)
```

## Security

```bash
make security       # Run security audit
make security-fix   # Fix security vulnerabilities (interactive)
```

## Maintenance

### Dependencies
```bash
make deps-check     # Check for outdated dependencies
make deps-update    # Update dependencies (interactive)
```

### Cleanup
```bash
make clean          # Clean build artifacts and cache
make clean-all      # Clean everything including node_modules
```

## Utilities

```bash
make info           # Show project and environment information
make verify         # Full verification suite (validate + test + security)
make setup-hooks    # Set up git hooks for pre-commit
make coverage       # Generate and view coverage report
make benchmark      # Run performance benchmarks
```

## Version Management

```bash
make version-patch  # Bump patch version (1.0.0 -> 1.0.1)
make version-minor  # Bump minor version (1.0.0 -> 1.1.0)
make version-major  # Bump major version (1.0.0 -> 2.0.0)
```

## Docker

```bash
make docker-build   # Build Docker image
make docker-test    # Run tests in Docker container
```

## Package Manager Support

The Makefile automatically detects and uses your package manager:
- **npm** (default)
- **yarn**
- **pnpm**

Commands automatically adapt to your chosen package manager.

## CI/CD Integration

GitHub Actions workflows use these Makefile commands:

```yaml
- name: Install dependencies
  run: make ci-deps || npm ci

- name: Type check
  run: make ci-type-check || npm run type-check

- name: Build project
  run: make ci-build || npm run build

- name: Run tests
  run: make ci-test || npm test

- name: Run linting
  run: make ci-lint || npm run lint

- name: Security audit
  run: make ci-security || npm audit
```

## Pre-commit Hooks

Set up git hooks to automatically run checks before commits:

```bash
make setup-hooks
```

This installs a pre-commit hook that runs:
- `make lint-fix`
- `make format`
- `make type-check`
- `make test`

## Examples

### Before committing
```bash
make pre-commit
```

### Before pushing
```bash
make verify
```

### Full CI locally
```bash
make ci-all
```

### Quick development cycle
```bash
make watch  # Runs dev + test-watch in parallel
```

## Troubleshooting

### Make not found
- **macOS**: `xcode-select --install`
- **Linux**: `sudo apt-get install build-essential`
- **Windows**: Use WSL or Git Bash

### Package manager issues
The Makefile falls back to direct npm commands if make fails, ensuring compatibility.
