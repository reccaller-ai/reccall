#!/bin/bash

# Pre-commit script for dev-setup workflow
# Ensures lint and test cases are always passing locally before raising PR

set -e

echo "🔍 Running pre-commit checks for dev-setup workflow..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Run type checking
echo "📝 Running TypeScript type check..."
npm run type-check

# Run build
echo "🔨 Running build..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm test

# Check if there are any uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   Consider committing your changes before raising a PR"
fi

echo "✅ All pre-commit checks passed!"
echo "🎯 Ready to raise PR with manual review workflow"
