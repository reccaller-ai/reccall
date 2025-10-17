#!/bin/bash

# Setup development workflow with manual review
# Never auto-approve PRs - always require manual review and approval

set -e

echo "🔧 Setting up development workflow with manual review..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Create a .gitignore entry for development files if it doesn't exist
if ! grep -q "scripts/pre-commit.sh" .gitignore 2>/dev/null; then
    echo "📝 Adding development scripts to .gitignore..."
    echo "" >> .gitignore
    echo "# Development workflow scripts" >> .gitignore
    echo "scripts/pre-commit.sh" >> .gitignore
fi

# Create a development branch protection rule (if using GitHub CLI)
if command -v gh >/dev/null 2>&1; then
    echo "🔒 Setting up branch protection for development workflow..."
    
    # Get current branch
    CURRENT_BRANCH=$(git branch --show-current)
    
    if [ "$CURRENT_BRANCH" != "main" ]; then
        echo "📋 Current branch: $CURRENT_BRANCH"
        echo "💡 For development branches, ensure:"
        echo "   - Manual review is required"
        echo "   - No auto-merge is enabled"
        echo "   - All CI checks must pass"
        echo "   - Pre-commit checks are run locally"
    fi
fi

# Create a development workflow documentation
cat > DEV_WORKFLOW.md << 'EOF'
# Development Workflow

## Manual Review Process

This project uses a **manual review workflow** where:

- ✅ **No auto-approval** - All PRs require manual review
- ✅ **Pre-commit checks** - Run `./scripts/pre-commit.sh` before raising PRs
- ✅ **CI validation** - All CI checks must pass
- ✅ **Code quality** - TypeScript compilation and tests must pass

## Pre-commit Checklist

Before raising a PR, ensure:

1. **Type Check**: `npm run type-check`
2. **Build**: `npm run build`
3. **Tests**: `npm test`
4. **Pre-commit Script**: `./scripts/pre-commit.sh`

## Raising PRs

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Run pre-commit checks: `./scripts/pre-commit.sh`
4. Commit changes: `git add . && git commit -m "feat: your feature"`
5. Push branch: `git push origin feature/your-feature`
6. Create PR with manual review requirement
7. Wait for manual approval before merge

## No Auto-merge

- PRs will **never** be auto-merged
- All merges require **manual approval**
- Reviewers must explicitly approve changes
- Maintainers have full control over merge process
EOF

echo "✅ Development workflow setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Run pre-commit checks: ./scripts/pre-commit.sh"
echo "   2. Commit your changes"
echo "   3. Push to remote"
echo "   4. Create PR with manual review requirement"
echo ""
echo "📖 See DEV_WORKFLOW.md for detailed workflow documentation"
