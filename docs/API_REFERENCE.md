# API Reference

Complete API documentation for RecCall's universal AI context engine.

## Core Engine API

### CoreEngine

The main engine class that orchestrates all RecCall operations.

```typescript
import { CoreEngine } from 'reccall/core';

const engine = new CoreEngine();
await engine.initialize();
```

#### Methods

##### `initialize(config?: Partial<CoreConfig>): Promise<void>`

Initialize the core engine with optional configuration.

**Parameters:**
- `config` (optional): Partial configuration object

**Example:**
```typescript
await engine.initialize({
  storagePath: '/custom/path',
  repositoryUrl: 'https://custom-repo.com',
  cacheTtl: 3600
});
```

##### `record(shortcut: ShortcutId, context: string): Promise<void>`

Record a new shortcut with context.

**Parameters:**
- `shortcut`: Unique identifier for the shortcut
- `context`: Context/instructions to store

**Throws:**
- `RecCallError` with code `DUPLICATE_ERROR` if shortcut already exists
- `RecCallError` with code `VALIDATION_ERROR` if shortcut ID is invalid

**Example:**
```typescript
await engine.record('react-component' as ShortcutId, 'Create React components with TypeScript');
```

##### `call(shortcut: ShortcutId): Promise<string>`

Retrieve context for a shortcut.

**Parameters:**
- `shortcut`: Shortcut identifier

**Returns:**
- `Promise<string>`: The stored context

**Throws:**
- `RecCallError` with code `NOT_FOUND_ERROR` if shortcut doesn't exist

**Example:**
```typescript
const context = await engine.call('react-component' as ShortcutId);
console.log(context); // "Create React components with TypeScript"
```

##### `list(): Promise<Shortcut[]>`

List all stored shortcuts.

**Returns:**
- `Promise<Shortcut[]>`: Array of shortcut objects

**Example:**
```typescript
const shortcuts = await engine.list();
console.log(shortcuts);
// [
//   { shortcut: 'react-component', context: 'Create React components...' },
//   { shortcut: 'api-endpoint', context: 'Create REST API endpoints...' }
// ]
```

##### `update(shortcut: ShortcutId, context: string): Promise<void>`

Update an existing shortcut's context.

**Parameters:**
- `shortcut`: Shortcut identifier
- `context`: New context/instructions

**Throws:**
- `RecCallError` with code `NOT_FOUND_ERROR` if shortcut doesn't exist

**Example:**
```typescript
await engine.update('react-component' as ShortcutId, 'Updated React component instructions');
```

##### `delete(shortcut: ShortcutId): Promise<void>`

Delete a shortcut (idempotent operation).

**Parameters:**
- `shortcut`: Shortcut identifier

**Example:**
```typescript
await engine.delete('react-component' as ShortcutId);
```

##### `purge(): Promise<void>`

Delete all shortcuts with confirmation.

**Example:**
```typescript
await engine.purge();
```

##### `search(query: string): Promise<Shortcut[]>`

Search shortcuts by content.

**Parameters:**
- `query`: Search query string

**Returns:**
- `Promise<Shortcut[]>`: Matching shortcuts

**Example:**
```typescript
const results = await engine.search('react');
console.log(results); // All shortcuts containing 'react'
```

##### `installRecipe(repositoryUrl: RepositoryUrl, shortcut: ShortcutId): Promise<void>`

Install a recipe from a repository.

**Parameters:**
- `repositoryUrl`: Repository URL
- `shortcut`: Recipe shortcut identifier

**Throws:**
- `RecCallError` with code `REPOSITORY_ERROR` if repository is unavailable
- `RecCallError` with code `NOT_FOUND_ERROR` if recipe doesn't exist

**Example:**
```typescript
await engine.installRecipe('https://contexts.reccaller.ai/' as RepositoryUrl, 'sync-main' as ShortcutId);
```

##### `listRecipes(repositoryUrl: RepositoryUrl): Promise<Recipe[]>`

List available recipes from a repository.

**Parameters:**
- `repositoryUrl`: Repository URL

**Returns:**
- `Promise<Recipe[]>`: Available recipes

**Example:**
```typescript
const recipes = await engine.listRecipes('https://contexts.reccaller.ai/' as RepositoryUrl);
console.log(recipes);
```

##### `searchRecipes(repositoryUrl: RepositoryUrl, query: string): Promise<Recipe[]>`

Search recipes in a repository.

**Parameters:**
- `repositoryUrl`: Repository URL
- `query`: Search query

**Returns:**
- `Promise<Recipe[]>`: Matching recipes

**Example:**
```typescript
const results = await engine.searchRecipes('https://contexts.reccaller.ai/' as RepositoryUrl, 'git');
```

##### `reloadStarterPack(): Promise<void>`

Reload starter pack recipes.

**Example:**
```typescript
await engine.reloadStarterPack();
```

## Dependency Injection API

### DIContainer

Dependency injection container for managing services.

```typescript
import { diContainer, TOKENS } from 'reccall/core';
```

#### Methods

##### `initialize(): Promise<void>`

Initialize the container with all dependencies.

**Example:**
```typescript
await diContainer.initialize();
```

##### `get<T>(token: string): T`

Get a service from the container.

**Parameters:**
- `token`: Service token

**Returns:**
- Service instance

**Example:**
```typescript
const engine = diContainer.get<ICoreEngine>(TOKENS.CORE_ENGINE);
```

##### `register<T>(token: string, implementation: new (...args: any[]) => T): void`

Register a custom service.

**Parameters:**
- `token`: Service token
- `implementation`: Service implementation class

**Example:**
```typescript
diContainer.register(TOKENS.CONTEXT_STORAGE, RedisStorage);
```

##### `registerInstance<T>(token: string, instance: T): void`

Register a custom instance.

**Parameters:**
- `token`: Service token
- `instance`: Service instance

**Example:**
```typescript
diContainer.registerInstance(TOKENS.CACHE_MANAGER, customCacheManager);
```

### Service Tokens

```typescript
export const TOKENS = {
  CORE_ENGINE: 'ICoreEngine',
  CONTEXT_STORAGE: 'IContextStorage',
  REPOSITORY_CLIENT: 'IRepositoryClient',
  CACHE_MANAGER: 'ICacheManager',
  RECIPE_VALIDATOR: 'IRecipeValidator',
} as const;
```

### Factory Functions

#### `createCoreEngine(): Promise<ICoreEngine>`

Create a core engine instance with dependency injection.

**Returns:**
- `Promise<ICoreEngine>`: Configured core engine

**Example:**
```typescript
const engine = await createCoreEngine();
```

#### `createCLIAdapter(): Promise<CLIAdapter>`

Create a CLI adapter instance.

**Returns:**
- `Promise<CLIAdapter>`: Configured CLI adapter

**Example:**
```typescript
const adapter = await createCLIAdapter();
```

#### `createMCPAdapter(): Promise<MCPAdapter>`

Create an MCP adapter instance.

**Returns:**
- `Promise<MCPAdapter>`: Configured MCP adapter

**Example:**
```typescript
const adapter = await createMCPAdapter();
```

## Telemetry API

### TelemetryManager

Structured logging and performance monitoring.

```typescript
import { telemetryManager } from 'reccall/core';
```

#### Methods

##### `logEvent(event: TelemetryEvent): void`

Log a custom event.

**Parameters:**
- `event`: Event object with timestamp, properties, etc.

**Example:**
```typescript
telemetryManager.logEvent({
  event: 'custom.operation',
  timestamp: Date.now(),
  properties: { userId: '123', action: 'create' }
});
```

##### `logError(error: Error, context?: Record<string, any>): void`

Log an error with context.

**Parameters:**
- `error`: Error object
- `context`: Additional context

**Example:**
```typescript
telemetryManager.logError(error, { operation: 'record', shortcut: 'test' });
```

##### `logPerformance(operation: string, duration: number, properties?: Record<string, any>): void`

Log performance metrics.

**Parameters:**
- `operation`: Operation name
- `duration`: Duration in milliseconds
- `properties`: Additional properties

**Example:**
```typescript
telemetryManager.logPerformance('shortcut.record', 150, { shortcutCount: 10 });
```

##### `updateMetrics(metrics: Partial<Metrics>): void`

Update current metrics.

**Parameters:**
- `metrics`: Partial metrics object

**Example:**
```typescript
telemetryManager.updateMetrics({
  shortcutsCount: 25,
  cacheHitRate: 0.85
});
```

##### `getMetrics(): Metrics`

Get current metrics.

**Returns:**
- `Metrics`: Current metrics object

**Example:**
```typescript
const metrics = telemetryManager.getMetrics();
console.log(metrics.shortcutsCount);
```

### Decorators

#### `@Performance(operation: string)`

Automatically monitor method performance.

**Example:**
```typescript
@Performance('my-operation')
async myMethod() {
  // Method execution is automatically timed
}
```

#### `@LogErrors(context?: Record<string, any>)`

Automatically log method errors.

**Example:**
```typescript
@LogErrors({ operation: 'record' })
async recordShortcut() {
  // Errors are automatically logged with context
}
```

## Configuration API

### ConfigManager

Centralized configuration management.

```typescript
import { configManager } from 'reccall/core';
```

#### Methods

##### `initialize(config?: Partial<CoreConfig>): Promise<void>`

Initialize configuration with optional overrides.

**Parameters:**
- `config`: Partial configuration object

**Example:**
```typescript
await configManager.initialize({
  storagePath: '/custom/path',
  repositoryUrl: 'https://custom-repo.com'
});
```

##### `getConfig(): CoreConfig`

Get current configuration.

**Returns:**
- `CoreConfig`: Current configuration

**Example:**
```typescript
const config = configManager.getConfig();
console.log(config.storagePath);
```

##### `isRepositoryEnabled(): boolean`

Check if repository is enabled.

**Returns:**
- `boolean`: Repository enabled status

**Example:**
```typescript
if (configManager.isRepositoryEnabled()) {
  await engine.listRecipes(repositoryUrl);
}
```

##### `isTelemetryEnabled(): boolean`

Check if telemetry is enabled.

**Returns:**
- `boolean`: Telemetry enabled status

**Example:**
```typescript
if (configManager.isTelemetryEnabled()) {
  telemetryManager.logEvent({ event: 'test' });
}
```

## Types

### Core Types

```typescript
// Branded types for type safety
export type ShortcutId = string & { readonly __brand: 'ShortcutId' };
export type RepositoryUrl = string & { readonly __brand: 'RepositoryUrl' };

// Core data structures
export interface Shortcut {
  shortcut: ShortcutId;
  context: string;
}

export interface Recipe {
  name: string;
  shortcut: ShortcutId;
  description: string;
  file: string;
  category: string;
}

export interface RepositoryManifest {
  shortcuts: Recipe[];
}

export interface CoreConfig {
  storagePath: string;
  repositoryUrl: RepositoryUrl;
  cacheTtl: number;
  cacheDirectory: string;
  enableTelemetry: boolean;
  enableRepository: boolean;
}

export interface PlatformContext {
  platform: string;
  capabilities: PlatformCapabilities;
  config: Record<string, any>;
}

export interface PlatformCapabilities {
  canRecord: boolean;
  canCall: boolean;
  canList: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPurge: boolean;
  supportsRepository: boolean;
}
```

### Error Types

```typescript
export class RecCallError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'RecCallError';
  }
}

export class StorageError extends RecCallError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR');
    this.name = 'StorageError';
  }
}

export class RepositoryError extends RecCallError {
  constructor(message: string) {
    super(message, 'REPOSITORY_ERROR');
    this.name = 'RepositoryError';
  }
}

export class ValidationError extends RecCallError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
```

## CLI API

### CLIAdapter

Command-line interface adapter.

```typescript
import { CLIAdapter } from 'reccall/adapters/cli';
```

#### Methods

##### `initialize(): Promise<void>`

Initialize the CLI adapter.

**Example:**
```typescript
const adapter = new CLIAdapter(engine);
await adapter.initialize();
```

##### `createProgram(): Command`

Create Commander.js program with all commands.

**Returns:**
- `Command`: Configured Commander.js program

**Example:**
```typescript
const program = adapter.createProgram();
await program.parseAsync();
```

## MCP API

### MCPAdapter

Model Context Protocol server adapter.

```typescript
import { MCPAdapter } from 'reccall/adapters/mcp';
```

#### Methods

##### `initialize(): Promise<void>`

Initialize the MCP adapter.

**Example:**
```typescript
const adapter = new MCPAdapter(engine);
await adapter.initialize();
```

##### `start(): Promise<void>`

Start the MCP server.

**Example:**
```typescript
await adapter.start();
```

#### MCP Tools

The MCP adapter provides the following tools:

- `reccall_rec`: Record a shortcut
- `reccall_call`: Call a shortcut
- `reccall_list`: List shortcuts
- `reccall_update`: Update a shortcut
- `reccall_delete`: Delete a shortcut
- `reccall_purge`: Purge all shortcuts
- `reccall_search`: Search shortcuts
- `reccall_install`: Install a recipe
- `reccall_list_repo`: List repository recipes
- `reccall_search_repo`: Search repository recipes
- `reccall_reload_starter_pack`: Reload starter pack

## Browser Extension API

### Perplexity Extension

```typescript
// Content script API
class PerplexityRecCall {
  async callShortcut(shortcut: string): Promise<void>
  async recordShortcut(shortcut: string, context: string): Promise<void>
  async deleteShortcut(shortcut: string): Promise<void>
  async loadShortcuts(): Promise<void>
  async saveShortcuts(): Promise<void>
}
```

### Sora Extension

```typescript
// Content script API
class SoraRecCall {
  async callShortcut(shortcut: string): Promise<void>
  async recordShortcut(shortcut: string, context: string): Promise<void>
  async copyToClipboard(text: string): Promise<void>
  async saveClipboardAsShortcut(text: string): Promise<void>
}
```

## Examples

### Basic Usage

```typescript
import { createCoreEngine } from 'reccall/core';

async function main() {
  const engine = await createCoreEngine();
  await engine.initialize();
  
  // Record a shortcut
  await engine.record('react-component' as ShortcutId, 'Create React components with TypeScript');
  
  // Call a shortcut
  const context = await engine.call('react-component' as ShortcutId);
  console.log(context);
  
  // List all shortcuts
  const shortcuts = await engine.list();
  console.log(shortcuts);
}
```

### Custom Storage Backend

```typescript
import { IContextStorage, ShortcutId } from 'reccall/core';

export class RedisStorage implements IContextStorage {
  async record(shortcut: ShortcutId, context: string): Promise<void> {
    // Redis implementation
  }
  
  async call(shortcut: ShortcutId): Promise<string> {
    // Redis implementation
  }
  
  // ... other methods
}

// Register with DI container
diContainer.register(TOKENS.CONTEXT_STORAGE, RedisStorage);
```

### Custom Platform Adapter

```typescript
import { IPlatformAdapter } from 'reccall/core';

export class MyPlatformAdapter implements IPlatformAdapter {
  readonly platform = 'my-platform';
  readonly capabilities = {
    canRecord: true,
    canCall: true,
    canList: true,
    canUpdate: true,
    canDelete: true,
    canPurge: true,
    supportsRepository: true
  };
  
  // ... implement all methods
}
```

## Error Handling

All API methods throw typed errors that extend `RecCallError`:

```typescript
try {
  await engine.record('test' as ShortcutId, 'context');
} catch (error) {
  if (error instanceof RecCallError) {
    console.error(`RecCall Error [${error.code}]: ${error.message}`);
  }
}
```

## Performance Considerations

- **Caching**: All operations use multi-layer caching (memory + disk)
- **Atomic Operations**: File operations are atomic to prevent corruption
- **Lazy Loading**: Components are loaded on-demand
- **Telemetry**: Performance is automatically monitored with decorators

## Security

- **Input Validation**: All inputs are validated and sanitized
- **Type Safety**: Branded types prevent type confusion
- **Error Handling**: Comprehensive error handling prevents information leakage
- **Recipe Validation**: Repository recipes are validated for security
