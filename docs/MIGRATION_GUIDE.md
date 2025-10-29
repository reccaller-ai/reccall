# Migration Guide

This guide helps existing RecCall users migrate to the new plugin-based architecture with enterprise features.

## Overview

RecCall has been refactored from a monolithic implementation to a universal AI context engine with plugin architecture. This migration brings significant improvements while maintaining backward compatibility for core functionality.

## What's New

### ✅ **New Features**
- **Plugin Architecture**: Easy development of new platform integrations
- **Dependency Injection**: Enterprise-ready IoC container
- **Telemetry**: Structured logging and performance monitoring
- **Browser Extensions**: Perplexity and Sora integrations
- **Enhanced Security**: Input validation, encryption, and audit logging
- **Performance**: Multi-layer caching and atomic operations

### ⚠️ **Breaking Changes**
- **New Import Paths**: Core engine now uses DI container
- **Async Initialization**: All adapters require async initialization
- **Enhanced Error Handling**: Typed error classes with specific codes
- **Configuration Changes**: New configuration schema with validation

## Migration Steps

### 1. Update Installation

#### Option A: Fresh Installation (Recommended)
```bash
# Remove old installation
rm -rf ~/.reccall

# Install new version
curl -sfL https://reccaller.ai/install.sh | sh -
```

#### Option B: Update Existing Installation
```bash
cd ~/.reccall
git pull origin main
npm install
npm run build
```

### 2. Update CLI Usage

#### Before (Old CLI)
```bash
# Old commands still work
reccall rec my-shortcut "My context"
reccall call my-shortcut
reccall list
```

#### After (New CLI)
```bash
# Same commands, enhanced functionality
reccall rec my-shortcut "My context"
reccall call my-shortcut
reccall list

# New commands available
reccall search "react"
reccall install sync-main
reccall list-repo
```

### 3. Update MCP Configuration

#### Before (Old MCP)
```json
{
  "mcpServers": {
    "reccall": {
      "command": "node",
      "args": ["/path/to/reccall/dist/index.js"]
    }
  }
}
```

#### After (New MCP)
```json
{
  "mcpServers": {
    "reccall": {
      "command": "node",
      "args": ["/path/to/reccall/dist/index.js"]
    }
  }
}
```

**Note**: MCP configuration remains the same, but the server now has enhanced capabilities.

### 4. Update VSCode Extension

#### Before (Old Extension)
- Extension automatically updates
- No manual configuration required

#### After (New Extension)
- Extension automatically updates
- New features available in Command Palette
- Enhanced error handling and telemetry

### 5. Update Warp Integration

#### Before (Old Warp)
```bash
# Old integration script
source ~/.warp/reccall-warp.sh
```

#### After (New Warp)
```bash
# Same integration script, enhanced functionality
source ~/.warp/reccall-warp.sh
```

## Code Migration

### 1. Custom Integrations

#### Before (Old Integration)
```typescript
import { CoreEngine } from 'reccall/core';

const engine = new CoreEngine();
await engine.initialize();
```

#### After (New Integration)
```typescript
import { createCoreEngine } from 'reccall/core';

const engine = await createCoreEngine();
// Engine is already initialized
```

### 2. Custom Storage Backends

#### Before (Old Storage)
```typescript
class CustomStorage {
  async record(shortcut: string, context: string): Promise<void> {
    // Implementation
  }
}
```

#### After (New Storage)
```typescript
import { IContextStorage, ShortcutId } from 'reccall/core';

class CustomStorage implements IContextStorage {
  async record(shortcut: ShortcutId, context: string): Promise<void> {
    // Implementation with type safety
  }
  
  // Implement all required methods
  async call(shortcut: ShortcutId): Promise<string> { /* ... */ }
  async list(): Promise<Shortcut[]> { /* ... */ }
  async update(shortcut: ShortcutId, context: string): Promise<void> { /* ... */ }
  async delete(shortcut: ShortcutId): Promise<void> { /* ... */ }
  async purge(): Promise<void> { /* ... */ }
  async search(query: string): Promise<Shortcut[]> { /* ... */ }
}

// Register with DI container
import { diContainer, TOKENS } from 'reccall/core';
diContainer.register(TOKENS.CONTEXT_STORAGE, CustomStorage);
```

### 3. Custom Platform Adapters

#### Before (Old Adapter)
```typescript
class CustomAdapter {
  async recordShortcut(): Promise<void> {
    // Implementation
  }
}
```

#### After (New Adapter)
```typescript
import { IPlatformAdapter, PlatformContext, PlatformCapabilities } from 'reccall/core';

class CustomAdapter implements IPlatformAdapter {
  readonly platform = 'custom-platform';
  readonly capabilities: PlatformCapabilities = {
    canRecord: true,
    canCall: true,
    canList: true,
    canUpdate: true,
    canDelete: true,
    canPurge: true,
    supportsRepository: true
  };

  async initialize(context: PlatformContext): Promise<void> {
    // Platform-specific initialization
  }

  async recordShortcut(): Promise<{ shortcut: ShortcutId; context: string } | null> {
    // Implementation with proper return type
  }

  // Implement all required methods
  async callShortcut(shortcut: ShortcutId): Promise<void> { /* ... */ }
  async listShortcuts(): Promise<void> { /* ... */ }
  async updateShortcut(shortcut: ShortcutId): Promise<void> { /* ... */ }
  async deleteShortcut(shortcut: ShortcutId): Promise<void> { /* ... */ }
  async purgeShortcuts(): Promise<void> { /* ... */ }
  async installRecipe(repositoryUrl: RepositoryUrl, shortcut: ShortcutId): Promise<void> { /* ... */ }
  async listRecipes(repositoryUrl: RepositoryUrl): Promise<void> { /* ... */ }
  async searchRecipes(repositoryUrl: RepositoryUrl, query: string): Promise<void> { /* ... */ }
  async reloadStarterPack(): Promise<void> { /* ... */ }
}
```

## Configuration Migration

### 1. Environment Variables

#### Before (Old Config)
```bash
# Old environment variables
RECCALL_STORAGE_PATH=~/.reccall.json
RECCALL_REPO_URL=https://contexts.reccaller.ai
```

#### After (New Config)
```bash
# New environment variables
RECCALL_STORAGE_PATH=~/.reccall.json
RECCALL_REPO_URL=https://contexts.reccaller.ai
RECCALL_CACHE_TTL=3600
RECCALL_CACHE_DIRECTORY=~/.reccall/cache
RECCALL_ENABLE_TELEMETRY=true
RECCALL_ENABLE_REPOSITORY=true
```

### 2. Configuration File

#### Before (Old Config)
```json
{
  "storagePath": "~/.reccall.json",
  "repositoryUrl": "https://contexts.reccaller.ai"
}
```

#### After (New Config)
```json
{
  "storagePath": "~/.reccall.json",
  "repositoryUrl": "https://contexts.reccaller.ai",
  "cacheTtl": 3600,
  "cacheDirectory": "~/.reccall/cache",
  "enableTelemetry": true,
  "enableRepository": true
}
```

## Browser Extensions

### 1. Perplexity Extension

#### Installation
1. Download the extension from `src/adapters/perplexity/extension/`
2. Load unpacked extension in Chrome/Firefox
3. Visit Perplexity AI website
4. Look for the RecCall button

#### Usage
- Click the RecCall button to open shortcuts panel
- Use existing shortcuts or create new ones
- Inject context into AI search queries

### 2. Sora Extension

#### Installation
1. Download the extension from `src/adapters/sora/extension/`
2. Load unpacked extension in Chrome/Firefox
3. Visit OpenAI Sora website
4. Look for the RecCall button

#### Usage
- Click the RecCall button to open video context panel
- Use video generation prompt shortcuts
- Copy context to clipboard for easy pasting

## Troubleshooting

### 1. Common Issues

#### Issue: "Module not found" errors
**Solution**: Update import paths to use new module structure
```typescript
// Old
import { CoreEngine } from 'reccall/core';

// New
import { createCoreEngine } from 'reccall/core';
```

#### Issue: "Async initialization required" errors
**Solution**: Use factory functions instead of direct instantiation
```typescript
// Old
const engine = new CoreEngine();
await engine.initialize();

// New
const engine = await createCoreEngine();
```

#### Issue: Type errors with ShortcutId
**Solution**: Use branded types for type safety
```typescript
// Old
const shortcut: string = 'my-shortcut';

// New
const shortcut: ShortcutId = 'my-shortcut' as ShortcutId;
```

### 2. Data Migration

#### Shortcuts Data
- Existing shortcuts are automatically migrated
- No data loss during migration
- Enhanced validation applied to existing data

#### Configuration Data
- Old configuration is automatically upgraded
- New configuration options use defaults
- Manual configuration update recommended

### 3. Performance Issues

#### Issue: Slower startup time
**Solution**: This is expected due to enhanced initialization
- First startup may be slower
- Subsequent startups use caching
- Performance monitoring helps identify bottlenecks

#### Issue: Higher memory usage
**Solution**: Enhanced caching uses more memory
- Multi-layer caching improves performance
- Memory usage is optimized for enterprise use
- Can be configured via environment variables

## Rollback Plan

### 1. Emergency Rollback

If you need to rollback to the previous version:

```bash
# Backup current data
cp ~/.reccall.json ~/.reccall.json.backup

# Revert to previous version
cd ~/.reccall
git checkout v0.9.0
npm install
npm run build
```

### 2. Data Recovery

If you need to recover data from the new version:

```bash
# Restore from backup
cp ~/.reccall.json.backup ~/.reccall.json

# Verify data integrity
reccall list
```

## Support

### 1. Migration Support

- **Documentation**: [Migration Guide](./MIGRATION_GUIDE.md)
- **API Reference**: [API Reference](./API_REFERENCE.md)
- **Plugin Development**: [Plugin Development Guide](./PLUGIN_DEVELOPMENT.md)

### 2. Community Support

- **GitHub Issues**: [Report Issues](https://github.com/reccaller-ai/reccall/issues)
- **Discord**: [Community Support](https://discord.gg/reccall)
- **Email**: support@reccaller.ai

### 3. Enterprise Support

- **Enterprise Documentation**: [Enterprise Deployment Guide](./ENTERPRISE_DEPLOYMENT.md)
- **Security Guide**: [Security Best Practices](./SECURITY.md)
- **Enterprise Email**: enterprise@reccaller.ai

## Migration Checklist

### Pre-Migration
- [ ] Backup existing shortcuts data
- [ ] Backup configuration files
- [ ] Review breaking changes
- [ ] Plan migration timeline

### Migration
- [ ] Update installation
- [ ] Update CLI usage
- [ ] Update MCP configuration
- [ ] Update VSCode extension
- [ ] Update Warp integration
- [ ] Test all functionality

### Post-Migration
- [ ] Verify data integrity
- [ ] Test new features
- [ ] Update documentation
- [ ] Train team members
- [ ] Monitor performance
- [ ] Report issues

## Benefits of Migration

### 1. Enhanced Functionality
- **Plugin Architecture**: Easy extension development
- **Enterprise Features**: Production-ready deployment
- **Browser Extensions**: AI tool integrations
- **Performance**: Sub-millisecond operations

### 2. Better Developer Experience
- **Type Safety**: Branded types prevent errors
- **Error Handling**: Comprehensive error classes
- **Telemetry**: Performance monitoring
- **Testing**: Enhanced testability

### 3. Enterprise Readiness
- **Security**: Input validation and encryption
- **Compliance**: GDPR and SOC2 support
- **Monitoring**: Comprehensive observability
- **Scalability**: Multi-tenant architecture

## Next Steps

After successful migration:

1. **Explore New Features**: Try browser extensions and new commands
2. **Develop Plugins**: Create custom platform integrations
3. **Enterprise Deployment**: Deploy with Docker/Kubernetes
4. **Contribute**: Help improve the platform
5. **Stay Updated**: Follow releases for new features

---

**Migration completed successfully!** Welcome to RecCall's universal AI context engine with enterprise-grade plugin architecture.
