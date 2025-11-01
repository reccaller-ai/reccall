# First Time NPM Publishing - Quick Start

## Current Status

❌ **Package not published yet** - That's why you're getting the 404 error.

The package is configured and ready, but needs to be published to npm for the first time.

## Quick Steps to Publish

### 1. Create npm Account (if needed)

- Go to: https://www.npmjs.com/signup
- Create account with your email

### 2. Generate Access Token

- Go to: https://www.npmjs.com/settings/<your-username>/tokens
- Click "Generate New Token"
- Choose "Automation" (classic token)
- Copy the token (starts with `npm_`)

### 3. Add GitHub Secret

- Go to: https://github.com/reccaller-ai/reccall/settings/secrets/actions
- Click "New repository secret"
- **Name**: `NPM_TOKEN`
- **Value**: Paste your npm token
- Click "Add secret"

### 4. Publish the Package

#### Option A: Create GitHub Release (Easiest)

1. Go to: https://github.com/reccaller-ai/reccall/releases
2. Click "Draft a new release"
3. **Tag**: `v1.0.0` (select "Create new tag")
4. **Release title**: `v1.0.0 - Initial Release`
5. **Description**: Describe the release
6. Click "Publish release"
7. ✅ The workflow will automatically publish to npm!

#### Option B: Manual Workflow

1. Go to: https://github.com/reccaller-ai/reccall/actions/workflows/publish-npm.yml
2. Click "Run workflow"
3. **Version**: `1.0.0` (specific version)
4. **Dry run**: Leave unchecked
5. Click "Run workflow"
6. ✅ Wait for workflow to complete and publish!

#### Option C: Manual CLI (Local)

```bash
# Login to npm
npm login

# Publish
cd /path/to/reccall
npm publish --access public

# Verify
npm view reccall
```

### 5. Verify Publication

```bash
# Check if package exists
npm view reccall

# Try installing
npm install -g reccall

# Verify it works
reccall --help
```

## What Gets Published?

- ✅ Compiled JavaScript in `dist/`
- ✅ TypeScript definitions (`.d.ts` files)
- ✅ Starter pack templates
- ✅ README.md and LICENSE
- ✅ Binaries: `reccall` and `reccall-mcp` commands

## After First Publish

Once published, future releases can be done via:
- Creating GitHub Releases (automated)
- Manual workflow dispatch (automated)
- Local npm publish (manual)

## Troubleshooting

### "NPM_TOKEN secret is not set"
- Make sure you added the secret in GitHub Settings → Secrets

### "You do not have permission"
- Verify you're logged in: `npm whoami`
- Check the token has publish permissions
- Verify package name isn't taken (it should be available)

### "Package name already taken"
- Check: `npm view reccall`
- If taken, consider scoped package: `@reccaller-ai/reccall`

## Need Help?

See the full guide: [NPM_PUBLISHING.md](./NPM_PUBLISHING.md)

