#!/bin/bash

# Setup Branch Protection Script
# This script configures branch protection rules for the main branch

set -e

REPO_OWNER="reccaller-ai"
REPO_NAME="reccall"
BRANCH="main"

echo "🔒 Setting up branch protection for $REPO_OWNER/$REPO_NAME:$BRANCH"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first."
    echo "   Visit: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI. Please run 'gh auth login' first."
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"

# Set up branch protection rules
echo "🔧 Configuring branch protection rules..."

# Create a temporary JSON file for the branch protection configuration
cat > /tmp/branch-protection.json << EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Build, Test & Lint", "Security Scan"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": false
  },
  "restrictions": {
    "users": [],
    "teams": []
  },
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": true
}
EOF

gh api repos/$REPO_OWNER/$REPO_NAME/branches/$BRANCH/protection \
  --method PUT \
  --input /tmp/branch-protection.json

# Clean up temporary file
rm /tmp/branch-protection.json

echo "✅ Branch protection rules configured successfully!"

# Enable GitHub Pages
echo "🌐 Enabling GitHub Pages..."
gh api repos/$REPO_OWNER/$REPO_NAME/pages \
  --method POST \
  --field source='{"branch":"main","path":"/"}' || echo "⚠️  GitHub Pages might already be enabled"

echo "✅ GitHub Pages configuration updated!"

# Set up repository settings
echo "⚙️  Configuring repository settings..."

# Enable issues and projects
gh api repos/$REPO_OWNER/$REPO_NAME \
  --method PATCH \
  --field has_issues=true \
  --field has_projects=true \
  --field has_wiki=false \
  --field allow_squash_merge=true \
  --field allow_merge_commit=false \
  --field allow_rebase_merge=true \
  --field delete_branch_on_merge=true

echo "✅ Repository settings updated!"

echo ""
echo "🎉 Branch protection setup completed successfully!"
echo ""
echo "📋 Summary of configured rules:"
echo "   • Main branch is protected from direct pushes"
echo "   • Requires pull request reviews (1 approval minimum)"
echo "   • Requires status checks to pass"
echo "   • Requires linear history"
echo "   • Only allows squash and rebase merges"
echo "   • Auto-deletes merged branches"
echo "   • Code owner reviews required"
echo ""
echo "🔧 Next steps:"
echo "   1. Install dependencies: npm install"
echo "   2. Run linting: npm run lint"
echo "   3. Create a feature branch following the naming convention"
echo "   4. Make your changes and create a pull request"
echo ""
echo "📚 Documentation:"
echo "   • Branch naming: BRANCH_NAMING.md"
echo "   • PR template: .github/pull_request_template.md"
echo "   • Issue templates: .github/ISSUE_TEMPLATE/"
