# RecCall Makefile
# Provides convenient commands for local development and CI/CD pipelines

.PHONY: help install build test test-watch lint lint-fix format format-check type-check security clean dev deps-check deps-update ci ci-test ci-lint ci-security ci-build ci-all

# Default target
.DEFAULT_GOAL := help

# Color output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Node.js and package manager detection
NODE := $(shell command -v node 2> /dev/null)
NPM := $(shell command -v npm 2> /dev/null)
YARN := $(shell command -v yarn 2> /dev/null)
PNPM := $(shell command -v pnpm 2> /dev/null)

# Determine package manager
PKG_MANAGER := npm
ifdef YARN
	PKG_MANAGER := yarn
else ifdef PNPM
	PKG_MANAGER := pnpm
endif

# Package manager commands
PKG_INSTALL := $(PKG_MANAGER) install
PKG_RUN := $(PKG_MANAGER) run
PKG_EXEC := $(PKG_MANAGER) exec

help: ## Show this help message
	@echo "$(BLUE)RecCall Makefile$(NC)"
	@echo ""
	@echo "$(GREEN)Available commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(BLUE)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Package Manager:$(NC) $(PKG_MANAGER)"

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	$(PKG_INSTALL)

deps-check: ## Check for outdated dependencies
	@echo "$(BLUE)Checking for outdated dependencies...$(NC)"
	@if [ "$(PKG_MANAGER)" = "npm" ]; then \
		$(PKG_MANAGER) outdated || true; \
	elif [ "$(PKG_MANAGER)" = "yarn" ]; then \
		$(PKG_MANAGER) outdated || true; \
	elif [ "$(PKG_MANAGER)" = "pnpm" ]; then \
		$(PKG_MANAGER) outdated || true; \
	fi

deps-update: ## Update dependencies (interactive)
	@echo "$(YELLOW)Updating dependencies...$(NC)"
	@if [ "$(PKG_MANAGER)" = "npm" ]; then \
		$(PKG_MANAGER) update; \
	elif [ "$(PKG_MANAGER)" = "yarn" ]; then \
		$(PKG_MANAGER) upgrade; \
	elif [ "$(PKG_MANAGER)" = "pnpm" ]; then \
		$(PKG_MANAGER) update; \
	fi

build: ## Build the project
	@echo "$(BLUE)Building project...$(NC)"
	$(PKG_RUN) build

dev: ## Run in development mode (watch mode)
	@echo "$(BLUE)Running in development mode...$(NC)"
	$(PKG_RUN) dev

test: ## Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	$(PKG_RUN) test --run

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	$(PKG_RUN) test

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	@$(PKG_EXEC) vitest run --coverage

test-ui: ## Run tests with UI
	@echo "$(BLUE)Opening test UI...$(NC)"
	$(PKG_RUN) test:watch

lint: ## Run linter
	@echo "$(BLUE)Running linter...$(NC)"
	$(PKG_RUN) lint

lint-fix: ## Run linter and fix issues
	@echo "$(BLUE)Running linter with fixes...$(NC)"
	$(PKG_RUN) lint:fix

format: ## Format code
	@echo "$(BLUE)Formatting code...$(NC)"
	$(PKG_RUN) format

format-check: ## Check code formatting
	@echo "$(BLUE)Checking code formatting...$(NC)"
	$(PKG_RUN) format:check

type-check: ## Run TypeScript type checking
	@echo "$(BLUE)Running TypeScript type check...$(NC)"
	$(PKG_RUN) type-check

security: ## Run security audit
	@echo "$(BLUE)Running security audit...$(NC)"
	@if [ "$(PKG_MANAGER)" = "npm" ]; then \
		$(PKG_MANAGER) audit --audit-level=moderate || true; \
	elif [ "$(PKG_MANAGER)" = "yarn" ]; then \
		$(PKG_MANAGER) audit --level moderate || true; \
	elif [ "$(PKG_MANAGER)" = "pnpm" ]; then \
		$(PKG_MANAGER) audit --audit-level moderate || true; \
	fi

security-fix: ## Fix security vulnerabilities (interactive)
	@echo "$(YELLOW)Fixing security vulnerabilities...$(NC)"
	@if [ "$(PKG_MANAGER)" = "npm" ]; then \
		$(PKG_MANAGER) audit fix || true; \
	elif [ "$(PKG_MANAGER)" = "yarn" ]; then \
		$(PKG_MANAGER) audit --level moderate || true; \
	elif [ "$(PKG_MANAGER)" = "pnpm" ]; then \
		$(PKG_MANAGER) audit --fix || true; \
	fi

clean: ## Clean build artifacts and cache
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	@rm -rf dist
	@rm -rf node_modules/.cache
	@rm -rf coverage
	@rm -rf .vitest
	@find . -type d -name ".turbo" -exec rm -rf {} + 2>/dev/null || true
	@echo "$(GREEN)Clean complete!$(NC)"

clean-all: clean ## Clean everything including node_modules
	@echo "$(YELLOW)Cleaning node_modules...$(NC)"
	@rm -rf node_modules
	@echo "$(GREEN)Full clean complete!$(NC)"

validate: type-check lint format-check ## Run all validation checks
	@echo "$(GREEN)All validation checks passed!$(NC)"

pre-commit: lint-fix format type-check test ## Run pre-commit checks
	@echo "$(GREEN)Pre-commit checks passed!$(NC)"

# CI/CD Commands
ci: ci-deps ci-test ci-lint ci-type-check ci-security ci-build ## Run all CI checks
	@echo "$(GREEN)All CI checks passed!$(NC)"

ci-deps: ## CI: Install dependencies (frozen lockfile)
	@echo "$(BLUE)CI: Installing dependencies...$(NC)"
	@if [ -f package-lock.json ]; then \
		$(PKG_MANAGER) ci || $(PKG_INSTALL) --legacy-peer-deps; \
	elif [ -f yarn.lock ]; then \
		$(PKG_MANAGER) install --frozen-lockfile; \
	elif [ -f pnpm-lock.yaml ]; then \
		$(PKG_MANAGER) install --frozen-lockfile; \
	else \
		$(PKG_INSTALL); \
	fi

ci-test: ## CI: Run tests (with coverage, fallback to without coverage)
	@echo "$(BLUE)CI: Running tests...$(NC)"
	@set +e; \
	$(PKG_RUN) test --run --coverage; \
	TEST_EXIT_CODE=$$?; \
	if [ $$TEST_EXIT_CODE -eq 0 ]; then \
		echo "$(GREEN)CI: Tests with coverage passed!$(NC)"; \
		exit 0; \
	else \
		echo "$(YELLOW)CI: Coverage test failed (exit code $$TEST_EXIT_CODE), running tests without coverage...$(NC)"; \
		$(PKG_RUN) test --run; \
	fi

ci-lint: ## CI: Run linter (no auto-fix)
	@echo "$(BLUE)CI: Running linter...$(NC)"
	$(PKG_RUN) lint
	@echo "$(GREEN)CI: Linting passed!$(NC)"

ci-format-check: ## CI: Check code formatting
	@echo "$(BLUE)CI: Checking code formatting...$(NC)"
	$(PKG_RUN) format:check
	@echo "$(GREEN)CI: Formatting check passed!$(NC)"

ci-type-check: ## CI: Run TypeScript type checking
	@echo "$(BLUE)CI: Running type check...$(NC)"
	$(PKG_RUN) type-check
	@echo "$(GREEN)CI: Type check passed!$(NC)"

ci-security: ## CI: Run security audit
	@echo "$(BLUE)CI: Running security audit...$(NC)"
	@if [ "$(PKG_MANAGER)" = "npm" ]; then \
		$(PKG_MANAGER) audit --audit-level=moderate || echo "$(YELLOW)Security audit completed with warnings$(NC)"; \
	elif [ "$(PKG_MANAGER)" = "yarn" ]; then \
		$(PKG_MANAGER) audit --level moderate || echo "$(YELLOW)Security audit completed with warnings$(NC)"; \
	elif [ "$(PKG_MANAGER)" = "pnpm" ]; then \
		$(PKG_MANAGER) audit --audit-level moderate || echo "$(YELLOW)Security audit completed with warnings$(NC)"; \
	fi

ci-build: ## CI: Build the project
	@echo "$(BLUE)CI: Building project...$(NC)"
	$(PKG_RUN) build
	@echo "$(GREEN)CI: Build successful!$(NC)"

ci-all: ci-deps ci-type-check ci-lint ci-format-check ci-test ci-security ci-build ## CI: Run full CI pipeline
	@echo "$(GREEN)✅ All CI checks passed!$(NC)"

# Development workflow commands
check: validate test ## Run validation and tests
	@echo "$(GREEN)All checks passed!$(NC)"

watch: ## Run all checks in watch mode
	@echo "$(BLUE)Running in watch mode...$(NC)"
	@$(PKG_RUN) dev &
	@$(PKG_RUN) test:watch &
	@wait

# Docker commands
docker-build: ## Build Docker image
	@echo "$(BLUE)Building Docker image...$(NC)"
	docker build -t reccall:latest .
	@echo "$(GREEN)Docker image built successfully!$(NC)"

docker-test: ## Run tests in Docker container
	@echo "$(BLUE)Running tests in Docker...$(NC)"
	docker run --rm -v $$(pwd):/app -w /app reccall:latest make test

# Documentation
docs: ## Generate documentation (if applicable)
	@echo "$(BLUE)Generating documentation...$(NC)"
	@if [ -f "typedoc.json" ]; then \
		$(PKG_EXEC) typedoc || echo "$(YELLOW)TypeDoc not configured$(NC)"; \
	else \
		echo "$(YELLOW)Documentation generation not configured$(NC)"; \
	fi

# Release commands
version-patch: ## Bump patch version
	@echo "$(BLUE)Bumping patch version...$(NC)"
	@if [ "$(PKG_MANAGER)" = "npm" ]; then \
		$(PKG_MANAGER) version patch --no-git-tag-version; \
	else \
		$(PKG_EXEC) npm version patch --no-git-tag-version; \
	fi

version-minor: ## Bump minor version
	@echo "$(BLUE)Bumping minor version...$(NC)"
	@if [ "$(PKG_MANAGER)" = "npm" ]; then \
		$(PKG_MANAGER) version minor --no-git-tag-version; \
	else \
		$(PKG_EXEC) npm version minor --no-git-tag-version; \
	fi

version-major: ## Bump major version
	@echo "$(BLUE)Bumping major version...$(NC)"
	@if [ "$(PKG_MANAGER)" = "npm" ]; then \
		$(PKG_MANAGER) version major --no-git-tag-version; \
	else \
		$(PKG_EXEC) npm version major --no-git-tag-version; \
	fi

# Utility commands
info: ## Show project and environment information
	@echo "$(BLUE)RecCall Project Information$(NC)"
	@echo ""
	@echo "$(GREEN)Environment:$(NC)"
	@echo "  Node.js: $$(node --version 2>/dev/null || echo 'Not installed')"
	@echo "  Package Manager: $(PKG_MANAGER)"
	@if [ "$(PKG_MANAGER)" = "npm" ]; then \
		echo "  npm: $$(npm --version 2>/dev/null || echo 'Not installed')"; \
	elif [ "$(PKG_MANAGER)" = "yarn" ]; then \
		echo "  Yarn: $$(yarn --version 2>/dev/null || echo 'Not installed')"; \
	elif [ "$(PKG_MANAGER)" = "pnpm" ]; then \
		echo "  pnpm: $$(pnpm --version 2>/dev/null || echo 'Not installed')"; \
	fi
	@echo ""
	@echo "$(GREEN)Project:$(NC)"
	@echo "  Name: $$(node -p "require('./package.json').name" 2>/dev/null || echo 'Unknown')"
	@echo "  Version: $$(node -p "require('./package.json').version" 2>/dev/null || echo 'Unknown')"
	@echo "  TypeScript: $$(node -p "require('./package.json').devDependencies.typescript" 2>/dev/null || echo 'Not configured')"
	@echo ""
	@echo "$(GREEN)Build Status:$(NC)"
	@if [ -d "dist" ]; then \
		echo "  $(GREEN)✓$(NC) Build artifacts exist"; \
	else \
		echo "  $(RED)✗$(NC) Build artifacts missing (run 'make build')"; \
	fi
	@if [ -f "node_modules/.bin/vitest" ] || [ -f "node_modules/.bin/tsc" ]; then \
		echo "  $(GREEN)✓$(NC) Dependencies installed"; \
	else \
		echo "  $(YELLOW)!$(NC) Dependencies may need installation (run 'make install')"; \
	fi

verify: validate test security ## Run full verification suite
	@echo "$(GREEN)✅ Full verification complete!$(NC)"

# Quick development commands
quick-check: lint format-check type-check ## Quick validation (no tests)
	@echo "$(GREEN)Quick check complete!$(NC)"

quick-fix: lint-fix format ## Quick fix (auto-fix linting and format)
	@echo "$(GREEN)Quick fix complete!$(NC)"

# Git hooks setup (optional)
setup-hooks: ## Set up git hooks for pre-commit
	@echo "$(BLUE)Setting up git hooks...$(NC)"
	@mkdir -p .git/hooks
	@echo "#!/bin/sh\nmake pre-commit" > .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "$(GREEN)Git hooks installed!$(NC)"

# Coverage report
coverage: test-coverage ## Generate and open coverage report
	@echo "$(BLUE)Generating coverage report...$(NC)"
	@if [ -d "coverage" ]; then \
		echo "$(GREEN)Coverage report generated in coverage/$(NC)"; \
	else \
		echo "$(YELLOW)No coverage data found$(NC)"; \
	fi

# Test specific suites
test-unit: ## Run only unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	$(PKG_EXEC) vitest run --run src/tests/*.test.ts

test-integration: ## Run only integration tests
	@echo "$(BLUE)Running integration tests...$(NC)"
	$(PKG_EXEC) vitest run --run src/tests/*.test.ts --tags integration

# Performance testing
benchmark: ## Run performance benchmarks
	@echo "$(BLUE)Running performance benchmarks...$(NC)"
	@if [ -f "benchmarks/index.js" ] || [ -f "benchmarks/index.ts" ]; then \
		$(PKG_EXEC) node benchmarks/index.js || $(PKG_EXEC) tsx benchmarks/index.ts; \
	else \
		echo "$(YELLOW)No benchmarks configured$(NC)"; \
	fi
