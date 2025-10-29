# Plugin Development Guide

This guide explains how to create custom platform adapters and extensions for RecCall's universal AI context engine.

## Overview

RecCall uses a plugin-based architecture where platform-specific integrations are implemented as adapters over a core engine. This allows for:

- **Universal Context Engine**: Core business logic shared across all platforms
- **Platform-Specific UI**: Each platform can have its own user interface
- **Easy Extension**: Add new AI tools and platforms without modifying core
- **Enterprise Ready**: Dependency injection, telemetry, and testing support

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Core Engine                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   Storage   │ │ Repository  │ │   Cache     │            │
│  │   Manager   │ │   Client    │ │   Manager   │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │  Validator  │ │ Telemetry   │ │     DI     │            │
│  │             │ │   Manager   │ │ Container  │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
            ┌───────▼──────┐ ┌──▼──┐ ┌─────▼─────┐
            │ CLI Adapter  │ │ MCP │ │ Platform  │
            │              │ │     │ │ Adapters  │
            └──────────────┘ └─────┘ └───────────┘
```

## Creating a Platform Adapter

### 1. Define Platform Interface

```typescript
import type { IPlatformAdapter, PlatformContext, PlatformCapabilities } from 'reccall/core';

export class MyPlatformAdapter implements IPlatformAdapter {
  readonly platform = 'my-platform';
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
    console.log(`Initializing ${this.platform} adapter`);
  }

  async recordShortcut(): Promise<{ shortcut: ShortcutId; context: string } | null> {
    // Platform-specific UI for recording shortcuts
    const shortcut = await this.showRecordDialog();
    const context = await this.showContextDialog();
    
    if (shortcut && context) {
      return { shortcut, context };
    }
    return null;
  }

  async callShortcut(shortcut: ShortcutId): Promise<void> {
    // Platform-specific UI for calling shortcuts
    await this.showShortcut(shortcut);
  }

  async listShortcuts(): Promise<void> {
    // Platform-specific UI for listing shortcuts
    const shortcuts = await this.getShortcuts();
    this.displayShortcuts(shortcuts);
  }

  async updateShortcut(shortcut: ShortcutId): Promise<void> {
    // Platform-specific UI for updating shortcuts
    const newContext = await this.showUpdateDialog(shortcut);
    if (newContext) {
      await this.updateShortcutContext(shortcut, newContext);
    }
  }

  async deleteShortcut(shortcut: ShortcutId): Promise<void> {
    // Platform-specific UI for deleting shortcuts
    const confirmed = await this.showDeleteConfirmation(shortcut);
    if (confirmed) {
      await this.removeShortcut(shortcut);
    }
  }

  async purgeShortcuts(): Promise<void> {
    // Platform-specific UI for purging all shortcuts
    const confirmed = await this.showPurgeConfirmation();
    if (confirmed) {
      await this.removeAllShortcuts();
    }
  }

  async installRecipe(repositoryUrl: RepositoryUrl, shortcut: ShortcutId): Promise<void> {
    // Platform-specific UI for installing recipes
    await this.showInstallDialog(repositoryUrl, shortcut);
  }

  async listRecipes(repositoryUrl: RepositoryUrl): Promise<void> {
    // Platform-specific UI for listing recipes
    const recipes = await this.fetchRecipes(repositoryUrl);
    this.displayRecipes(recipes);
  }

  async searchRecipes(repositoryUrl: RepositoryUrl, query: string): Promise<void> {
    // Platform-specific UI for searching recipes
    const results = await this.searchRecipes(repositoryUrl, query);
    this.displaySearchResults(results);
  }

  async reloadStarterPack(): Promise<void> {
    // Platform-specific UI for reloading starter pack
    await this.showReloadDialog();
  }

  // Private helper methods
  private async showRecordDialog(): Promise<string | null> {
    // Implement platform-specific dialog
    return null;
  }

  private async showContextDialog(): Promise<string | null> {
    // Implement platform-specific dialog
    return null;
  }

  private async showShortcut(shortcut: ShortcutId): Promise<void> {
    // Implement platform-specific display
  }

  private async getShortcuts(): Promise<Shortcut[]> {
    // Implement platform-specific data retrieval
    return [];
  }

  private displayShortcuts(shortcuts: Shortcut[]): void {
    // Implement platform-specific display
  }

  private async showUpdateDialog(shortcut: ShortcutId): Promise<string | null> {
    // Implement platform-specific dialog
    return null;
  }

  private async updateShortcutContext(shortcut: ShortcutId, context: string): Promise<void> {
    // Implement platform-specific update
  }

  private async showDeleteConfirmation(shortcut: ShortcutId): Promise<boolean> {
    // Implement platform-specific confirmation
    return false;
  }

  private async removeShortcut(shortcut: ShortcutId): Promise<void> {
    // Implement platform-specific removal
  }

  private async showPurgeConfirmation(): Promise<boolean> {
    // Implement platform-specific confirmation
    return false;
  }

  private async removeAllShortcuts(): Promise<void> {
    // Implement platform-specific removal
  }

  private async showInstallDialog(repositoryUrl: RepositoryUrl, shortcut: ShortcutId): Promise<void> {
    // Implement platform-specific dialog
  }

  private async fetchRecipes(repositoryUrl: RepositoryUrl): Promise<Recipe[]> {
    // Implement platform-specific fetching
    return [];
  }

  private displayRecipes(recipes: Recipe[]): void {
    // Implement platform-specific display
  }

  private async searchRecipes(repositoryUrl: RepositoryUrl, query: string): Promise<Recipe[]> {
    // Implement platform-specific search
    return [];
  }

  private displaySearchResults(results: Recipe[]): void {
    // Implement platform-specific display
  }

  private async showReloadDialog(): Promise<void> {
    // Implement platform-specific dialog
  }
}
```

### 2. Register with Dependency Injection

```typescript
import { diContainer, TOKENS } from 'reccall/core';

// Register your adapter
diContainer.register(TOKENS.PLATFORM_ADAPTER, MyPlatformAdapter);

// Or register with a custom token
diContainer.register('MY_PLATFORM_ADAPTER', MyPlatformAdapter);
```

### 3. Create Factory Function

```typescript
import { createCoreEngine } from 'reccall/core';

export async function createMyPlatformAdapter() {
  const engine = await createCoreEngine();
  const adapter = new MyPlatformAdapter();
  
  // Initialize the adapter
  await adapter.initialize({
    platform: 'my-platform',
    capabilities: adapter.capabilities,
    config: {}
  });
  
  return adapter;
}
```

## Browser Extension Development

### 1. Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "RecCall for MyPlatform",
  "version": "1.0.0",
  "description": "Record and call context shortcuts in MyPlatform",
  "permissions": [
    "activeTab",
    "storage",
    "nativeMessaging"
  ],
  "host_permissions": [
    "https://myplatform.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://myplatform.com/*"],
      "js": ["content.js"],
      "css": ["styles.css"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "RecCall"
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

### 2. Content Script

```javascript
class MyPlatformRecCall {
  constructor() {
    this.shortcuts = {};
    this.init();
  }

  async init() {
    await this.loadShortcuts();
    this.injectUI();
    this.setupEventListeners();
  }

  async loadShortcuts() {
    const result = await chrome.storage.local.get(['reccall_shortcuts']);
    this.shortcuts = result.reccall_shortcuts || {};
  }

  async saveShortcuts() {
    await chrome.storage.local.set({ reccall_shortcuts: this.shortcuts });
  }

  injectUI() {
    // Inject RecCall button and panel into MyPlatform UI
    const button = document.createElement('button');
    button.id = 'reccall-button';
    button.innerHTML = '🎯 RecCall';
    button.className = 'reccall-btn';

    // Find appropriate location in MyPlatform UI
    const targetElement = document.querySelector('#my-platform-input');
    if (targetElement) {
      targetElement.parentElement.appendChild(button);
    }
  }

  setupEventListeners() {
    const button = document.getElementById('reccall-button');
    if (button) {
      button.addEventListener('click', () => this.toggleShortcutsPanel());
    }
  }

  toggleShortcutsPanel() {
    // Show/hide shortcuts panel
  }

  async callShortcut(shortcut) {
    const context = this.shortcuts[shortcut];
    if (!context) return;

    // Inject context into MyPlatform input
    const inputField = document.querySelector('#my-platform-input');
    if (inputField) {
      inputField.value = context;
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new MyPlatformRecCall());
} else {
  new MyPlatformRecCall();
}
```

## Testing Your Plugin

### 1. Unit Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyPlatformAdapter } from './my-platform-adapter';
import { createCoreEngine } from 'reccall/core';

describe('MyPlatformAdapter', () => {
  let adapter: MyPlatformAdapter;
  let engine: ICoreEngine;

  beforeEach(async () => {
    engine = await createCoreEngine();
    adapter = new MyPlatformAdapter();
    await adapter.initialize({
      platform: 'my-platform',
      capabilities: adapter.capabilities,
      config: {}
    });
  });

  it('should initialize correctly', () => {
    expect(adapter.platform).toBe('my-platform');
    expect(adapter.capabilities.canRecord).toBe(true);
  });

  it('should handle record shortcut', async () => {
    // Mock platform-specific UI methods
    const result = await adapter.recordShortcut();
    expect(result).toBeDefined();
  });

  it('should handle call shortcut', async () => {
    await expect(adapter.callShortcut('test-shortcut' as ShortcutId)).resolves.not.toThrow();
  });
});
```

### 2. Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createCoreEngine } from 'reccall/core';

describe('Plugin Integration', () => {
  it('should work with core engine', async () => {
    const engine = await createCoreEngine();
    
    // Test recording
    await engine.record('test-shortcut' as ShortcutId, 'Test context');
    
    // Test calling
    const context = await engine.call('test-shortcut' as ShortcutId);
    expect(context).toBe('Test context');
    
    // Test listing
    const shortcuts = await engine.list();
    expect(shortcuts).toContainEqual({
      shortcut: 'test-shortcut',
      context: 'Test context'
    });
  });
});
```

## Best Practices

### 1. Error Handling

```typescript
export class MyPlatformAdapter implements IPlatformAdapter {
  async recordShortcut(): Promise<{ shortcut: ShortcutId; context: string } | null> {
    try {
      const shortcut = await this.showRecordDialog();
      const context = await this.showContextDialog();
      
      if (!shortcut || !context) {
        return null;
      }
      
      return { shortcut, context };
    } catch (error) {
      console.error('Failed to record shortcut:', error);
      this.showError('Failed to record shortcut');
      return null;
    }
  }
}
```

### 2. Telemetry Integration

```typescript
import { telemetryManager, Performance, LogErrors } from 'reccall/core';

export class MyPlatformAdapter implements IPlatformAdapter {
  @Performance('platform.record')
  @LogErrors({ operation: 'record' })
  async recordShortcut(): Promise<{ shortcut: ShortcutId; context: string } | null> {
    // Implementation with automatic performance monitoring
  }
}
```

### 3. Configuration Management

```typescript
import { configManager } from 'reccall/core';

export class MyPlatformAdapter implements IPlatformAdapter {
  async initialize(context: PlatformContext): Promise<void> {
    // Use centralized configuration
    const config = await configManager.getConfig();
    
    // Platform-specific configuration
    this.platformConfig = {
      ...config,
      ...context.config
    };
  }
}
```

## Publishing Your Plugin

### 1. Package Structure

```
my-reccall-plugin/
├── src/
│   ├── adapter.ts          # Main adapter implementation
│   ├── ui/                 # Platform-specific UI components
│   └── tests/              # Test files
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### 2. Package.json

```json
{
  "name": "@reccaller-ai/my-platform",
  "version": "1.0.0",
  "description": "RecCall adapter for MyPlatform",
  "main": "dist/adapter.js",
  "types": "dist/adapter.d.ts",
  "dependencies": {
    "@reccaller-ai/core": "^1.0.0"
  },
  "peerDependencies": {
    "reccall": "^1.0.0"
  }
}
```

### 3. Publishing

```bash
npm publish
```

## Examples

- **CLI Adapter**: See `src/adapters/cli/index.ts`
- **MCP Adapter**: See `src/adapters/mcp/index.ts`
- **Perplexity Extension**: See `src/adapters/perplexity/extension/`
- **Sora Extension**: See `src/adapters/sora/extension/`

## Support

- **Documentation**: [API Reference](./API_REFERENCE.md)
- **Issues**: [GitHub Issues](https://github.com/reccaller-ai/reccall/issues)
- **Discussions**: [GitHub Discussions](https://github.com/reccaller-ai/reccall/discussions)
- **Discord**: [RecCall Community](https://discord.gg/reccall)
