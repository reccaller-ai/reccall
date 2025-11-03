#!/bin/bash
# Detect branch naming convention from repository configuration files
# This script helps make contexts generic across repositories

detect_branch_types() {
    local repo_root="${1:-.}"
    local types=""

    # 1. Check GitHub workflow for regex pattern (highest priority)
    local workflow_file="$repo_root/.github/workflows/pr-check.yml"
    if [ -f "$workflow_file" ]; then
        # Extract regex pattern: ^(feature|bugfix|hotfix|...)/.+
        types=$(grep -A 10 "Branch naming check" "$workflow_file" 2>/dev/null | \
            grep -oE "\^(\([^)]+\))/" | \
            sed 's/^(//' | sed 's/)$//' | \
            tr '|' '\n' | \
            sort -u)
        
        if [ -n "$types" ]; then
            echo "$types"
            return 0
        fi
    fi

    # 2. Check branch protection YAML
    local branch_protection="$repo_root/.github/branch-protection.yml"
    if [ -f "$branch_protection" ]; then
        types=$(awk '/^branch_naming:/{flag=1; next} /^[^ ]/ && flag{flag=0} flag && /^[ ]{2}[a-z]+:/{print $1}' "$branch_protection" | \
            sed 's/:$//' | sort -u)
        
        if [ -n "$types" ]; then
            echo "$types"
            return 0
        fi
    fi

    # 3. Check documentation
    local docs_file="$repo_root/docs/contributing/BRANCH_NAMING.md"
    if [ -f "$docs_file" ]; then
        types=$(grep -E "\`(feature|bugfix|hotfix|release|docs|refactor|test|chore)\`" "$docs_file" 2>/dev/null | \
            grep -oE "\`[a-z]+\`" | \
            sed 's/`//g' | sort -u)
        
        if [ -n "$types" ]; then
            echo "$types"
            return 0
        fi
    fi

    # 4. Fallback: Check workflow regex directly
    if [ -f "$workflow_file" ]; then
        types=$(grep -oE "\(feature\|bugfix\|hotfix\|release\|docs\|refactor\|test\|chore\)" "$workflow_file" 2>/dev/null | \
            head -1 | \
            sed 's/^(//' | \
            sed 's/)$//' | \
            tr '|' '\n' | \
            sort -u)
        
        if [ -n "$types" ]; then
            echo "$types"
            return 0
        fi
    fi

    return 1
}

# Main
if [ "$1" = "--json" ]; then
    TYPES=$(detect_branch_types)
    if [ -n "$TYPES" ]; then
        echo "[$(echo "$TYPES" | sed 's/^/"/' | sed 's/$/"/' | tr '\n' ',' | sed 's/,$//')]"
    else
        echo "[]"
    fi
else
    TYPES=$(detect_branch_types)
    if [ -n "$TYPES" ]; then
        echo "$TYPES"
    else
        echo "feature" >&2
        echo "bugfix" >&2
        echo "hotfix" >&2
        echo "release" >&2
        echo "docs" >&2
        echo "refactor" >&2
        echo "test" >&2
        echo "chore" >&2
        exit 1
    fi
fi
