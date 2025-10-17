#!/bin/bash

# Update Branch Protection Script
# This script updates the GitHub repository's branch protection rules to match the new CI workflow structure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Updating GitHub Branch Protection Rules${NC}"
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed. Please install it first.${NC}"
    echo -e "${YELLOW}   Visit: https://cli.github.com/${NC}"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not authenticated with GitHub CLI. Please run 'gh auth login' first.${NC}"
    exit 1
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
echo -e "${BLUE}📋 Repository: $REPO${NC}"

# Update branch protection for main branch
echo -e "${BLUE}🔄 Updating branch protection for 'main' branch...${NC}"

# Create temporary file for branch protection config
cat > /tmp/branch-protection.json << EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Quick PR Check"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true,
  "allow_squash_merge": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": true
}
EOF

# Apply branch protection rules
if gh api repos/$REPO/branches/main/protection --method PUT --input /tmp/branch-protection.json; then
    echo -e "${GREEN}✅ Branch protection updated successfully!${NC}"
else
    echo -e "${RED}❌ Failed to update branch protection. You may need admin permissions.${NC}"
    echo -e "${YELLOW}   Please update manually in GitHub repository settings.${NC}"
    echo ""
    echo -e "${BLUE}Required status checks should be:${NC}"
    echo -e "  - Quick PR Check"
    echo ""
    echo -e "${BLUE}To update manually:${NC}"
    echo -e "  1. Go to: https://github.com/$REPO/settings/branches"
    echo -e "  2. Click 'Edit' on the main branch rule"
    echo -e "  3. Update 'Required status checks' to include: Quick PR Check"
    echo -e "  4. Save changes"
    exit 1
fi

# Clean up
rm -f /tmp/branch-protection.json

echo ""
echo -e "${GREEN}🎉 Branch protection update completed!${NC}"
echo ""
echo -e "${BLUE}📋 Summary of changes:${NC}"
echo -e "  • Updated required status checks to: Quick PR Check"
echo -e "  • Disabled 'require_last_push_approval' to allow admin self-approval"
echo -e "  • Disabled 'require_code_owner_reviews' for simpler workflow"
echo -e "  • PRs will now only wait for the fast 'Quick PR Check' workflow"
echo ""
echo -e "${YELLOW}💡 Note: Comprehensive security scans now run on main branch and daily schedule${NC}"
echo -e "${GREEN}✅ Admins can now self-approve their own PRs!${NC}"
