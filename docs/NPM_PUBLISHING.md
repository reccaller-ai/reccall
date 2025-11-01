# NPM Publishing Guide

This guide explains how to publish RecCall to npm and set up automated publishing.

## Prerequisites

1. **NPM Account**: Create an account at https://www.npmjs.com/signup
2. **NPM Access Token**: Generate a token with publish permissions
   - Go to https://www.npmjs.com/settings/<username>/tokens
   - Create a new "Automation" token (classic)
   - Copy the token (you'll only see it once)

## Setting Up GitHub Secret

1. Go to your repository: https://github.com/reccaller-ai/reccall
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm access token
6. Click **Add secret**

## Publishing Methods

### Method 1: Automated Publishing (Recommended)

#### Option A: Create a GitHub Release

1. Go to https://github.com/reccaller-ai/reccall/releases
2. Click **Draft a new release**
3. Choose a tag (create new if needed, e.g., `v1.0.0`)
4. Fill in release title and description
5. Click **Publish release**
6. The GitHub Actions workflow will automatically:
   - Build the package
   - Run tests
   - Publish to npm
   - Use the tag version (e.g., `v1.0.0` becomes `1.0.0`)

#### Option B: Manual Workflow Dispatch

1. Go to https://github.com/reccaller-ai/reccall/actions/workflows/publish-npm.yml
2. Click **Run workflow**
3. Choose options:
   - **Version**: `patch`, `minor`, `major`, or specific version like `1.0.1`
   - **Dry run**: Check to test without publishing
4. Click **Run workflow**
5. The workflow will:
   - Bump version automatically
   - Create git tag
   - Publish to npm
   - Push changes to main

### Method 2: Manual Publishing (Local)

```bash
# Ensure you're logged in to npm
npm login

# Bump version (patch, minor, or major)
npm version patch  # or minor, or major

# Build and publish
npm run build
npm publish --access public

# Push version changes and tags
git push origin main --follow-tags
```

## Version Strategy

- **Patch** (1.0.0 → 1.0.1): Bug fixes, minor updates
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Major** (1.0.0 → 2.0.0): Breaking changes

## Verifying Publication

After publishing, verify the package is available:

```bash
# Check package info
npm view reccall

# Try installing
npm install -g reccall

# Verify installation
reccall --help
```

## Troubleshooting

### Error: "Not found" when installing

- Package hasn't been published yet
- Run the publish workflow or publish manually

### Error: "NPM_TOKEN secret is not set"

- Add the `NPM_TOKEN` secret in GitHub repository settings
- See "Setting Up GitHub Secret" above

### Error: "You do not have permission to publish"

- Verify you're logged in: `npm whoami`
- Check package name is available: `npm view reccall`
- If package exists, verify you have publish access
- If package doesn't exist, you can publish the first version

### Package name already taken

If `reccall` is taken on npm, you can:
1. Use a scoped package: `@reccaller-ai/reccall`
   - Update `package.json`: `"name": "@reccaller-ai/reccall"`
   - Publish: `npm publish --access public`
   - Install: `npm install -g @reccaller-ai/reccall`
2. Choose a different name

## Workflow Details

The `.github/workflows/publish-npm.yml` workflow:

1. **Triggers**:
   - GitHub Release published
   - Manual workflow dispatch

2. **Steps**:
   - Checks out code
   - Sets up Node.js
   - Installs dependencies
   - Determines version (from release tag or input)
   - Builds package
   - Runs tests
   - Publishes to npm (if not dry run)
   - Creates git tag and commits (if not from release)

3. **Security**:
   - Uses `NPM_TOKEN` secret for authentication
   - Uses GitHub's `GITHUB_TOKEN` for git operations
   - Never exposes tokens in logs

## Best Practices

1. **Always test locally first**:
   ```bash
   npm pack --dry-run  # See what will be published
   npm pack            # Create tarball locally
   ```

2. **Use semantic versioning**: Follow semver.org guidelines

3. **Update CHANGELOG**: Document changes before publishing

4. **Create releases**: Use GitHub Releases to trigger automated publishing

5. **Test installation**: After publishing, test the global installation

## First Time Publishing

1. Verify package.json is correct:
   ```bash
   npm run publish:dry-run
   ```

2. Ensure you have npm account and token

3. Test local publish (without pushing to registry):
   ```bash
   npm pack
   tar -tzf reccall-*.tgz  # List contents
   ```

4. Publish to npm:
   - Use GitHub Actions workflow (recommended)
   - Or publish manually: `npm publish --access public`

5. Verify installation:
   ```bash
   npm install -g reccall
   reccall --help
   ```

