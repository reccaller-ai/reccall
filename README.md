# RecCall: Universal AI Context Engine

**Rec**ord and **Call** context shortcuts across AI IDEs and environments with enterprise-grade plugin architecture.

## 🏗️ Architecture

RecCall has been refactored into a modular plugin-based architecture:

- **Core Engine**: Business logic, storage, repository management, caching
- **Platform Adapters**: CLI, MCP, VSCode, Warp, Perplexity, Sora
- **Dependency Injection**: Enterprise-ready IoC container
- **Telemetry**: Structured logging and performance monitoring

## 🚀 Features

### Universal Commands
- **rec**: Record a shortcut with context/instructions
- **call**: Call (retrieve) stored context by shortcut name
- **list**: List all stored shortcuts
- **update**: Update an existing shortcut
- **delete**: Delete a shortcut (idempotent operation)
- **purge**: Purge all shortcuts (with confirmation)
- **search**: Search shortcuts by content

### Repository Commands
- **install**: Install a recipe from the repository
- **list-repo**: List available recipes from repository
- **search-repo**: Search recipes in repository
- **reload-starter-pack**: Reload starter pack recipes

### Multi-Platform Support
- **🖥️ Cursor IDE**: MCP server integration
- **💻 VSCode**: Native extension with Command Palette
- **⚡ Warp Terminal**: Shell integration with colored output
- **🔧 CLI**: Command-line interface for any terminal
- **🌐 Perplexity**: Browser extension for AI search
- **🎬 Sora**: Browser extension for video generation

### Enterprise Features
- **Type Safety**: Strict TypeScript with branded types
- **Dependency Injection**: IoC container with tsyringe
- **Telemetry**: Structured logging with pino + Prometheus metrics
- **Performance**: Multi-layer caching with TTL
- **Validation**: Recipe validation with security checks
- **Error Handling**: Comprehensive error classes
- **Storage Backends**: Redis and PostgreSQL support for scalable deployments
- **API Servers**: Express.js and Fastify middleware for team API servers
- **Webhooks**: Event-driven integrations for external monitoring systems

## 📦 Installation

### Quick Setup
```bash
curl -sfL https://reccaller.ai/install.sh | sh -
```

### Manual Installation
   ```bash
npm install -g reccall
```

## 🎯 Usage

### CLI
```bash
# Record a shortcut
reccall rec react-component "Create React components with TypeScript, proper props, and hooks"

# Call a shortcut
reccall call react-component

# List all shortcuts
reccall list

# Install from repository
reccall install sync-main
```

### MCP (Cursor IDE)
```json
{
  "mcpServers": {
    "reccall": {
      "command": "reccall-mcp",
      "args": []
    }
  }
}
```

### Browser Extensions
- **Perplexity**: Inject context into AI search queries
- **Sora**: Use video generation prompts with context shortcuts

## 🔧 Core Engine API

```typescript
import { createCoreEngine } from 'reccall/core';

const engine = await createCoreEngine();
await engine.initialize();

// Record a shortcut
await engine.record('my-shortcut' as ShortcutId, 'My context instructions');

// Call a shortcut
const context = await engine.call('my-shortcut' as ShortcutId);

// List shortcuts
const shortcuts = await engine.list();

// Install from repository
await engine.installRecipe('https://contexts.reccaller.ai/' as RepositoryUrl, 'sync-main' as ShortcutId);
```

## 🏢 Enterprise Features

### Dependency Injection
```typescript
import { diContainer, TOKENS } from 'reccall/core';

// Register custom storage backend
diContainer.register(TOKENS.CONTEXT_STORAGE, RedisStorage);

// Get service
const engine = diContainer.get<ICoreEngine>(TOKENS.CORE_ENGINE);
```

### Telemetry
```typescript
import { telemetryManager } from 'reccall/core';

// Log custom events
telemetryManager.logEvent({
  event: 'custom.operation',
  timestamp: Date.now(),
  properties: { userId: '123' }
});

// Performance monitoring
@Performance('my-operation')
async myOperation() {
  // Method automatically monitored
}
```

### Storage Backends

#### Redis Storage
```typescript
import { RedisStorage } from 'reccall/storage-backends/redis';

const storage = new RedisStorage({
  url: 'redis://localhost:6379',
  keyPrefix: 'reccall:shortcuts:',
  ttl: 3600 // Optional TTL in seconds
});

const engine = await createCoreEngine({ storage });
await engine.initialize();
```

#### PostgreSQL Storage
```typescript
import { PostgresStorage } from 'reccall/storage-backends/postgres';

const storage = new PostgresStorage({
  connectionString: 'postgresql://user:pass@localhost/reccall'
});

await storage.initialize(); // Creates schema
const engine = await createCoreEngine({ storage });
await engine.initialize();
```

### API Servers

#### Express.js Middleware
```typescript
import express from 'express';
import { createReccallMiddleware } from 'reccall/adapters/api/express';

const app = express();
app.use(express.json());

const middleware = await createReccallMiddleware({
  engine,
  basePath: '/api/reccall',
  authenticate: async (req) => {
    // Your authentication logic
    return await validateToken(req.headers.authorization);
  }
});

app.use(middleware);
app.listen(3000);
```

#### Fastify Plugin
```typescript
import Fastify from 'fastify';
import reccallFastifyPlugin from 'reccall/adapters/api/fastify';

const fastify = Fastify({ logger: true });

await fastify.register(reccallFastifyPlugin, {
  engine,
  basePath: '/api/reccall',
  authenticate: async (request) => {
    return await validateToken(request.headers.authorization);
  }
});

await fastify.listen({ port: 3000 });
```

### Webhooks
```typescript
import { WebhookManager } from 'reccall/core/webhooks';

const webhookManager = new WebhookManager(true);

// Register webhook
webhookManager.register('slack-notifications', {
  url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  secret: process.env.WEBHOOK_SECRET,
  events: ['shortcut.recorded', 'shortcut.deleted'],
  retries: 3,
  timeout: 5000
});

// Trigger webhook (automatically called by engine)
await engine.record('my-shortcut' as ShortcutId, 'Context');
// Webhook fires automatically: shortcut.recorded event
```

### Prometheus Metrics
```typescript
import { telemetryManager } from 'reccall/core/telemetry';
import express from 'express';

const app = express();

// Export Prometheus metrics
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(telemetryManager.exportPrometheusMetrics());
});
```

## 🔌 Plugin Development

### Creating a Platform Adapter
```typescript
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

  async initialize(context: PlatformContext): Promise<void> {
    // Platform-specific initialization
  }

  async recordShortcut(): Promise<{ shortcut: ShortcutId; context: string } | null> {
    // Platform-specific UI for recording
  }

  // ... other methods
}
```

## 📊 Performance

- **Sub-millisecond** shortcut retrieval with in-memory caching
- **Atomic file operations** prevent corruption
- **Multi-layer caching** (memory + disk) with configurable TTL
- **Performance monitoring** with automatic instrumentation
- **Structured logging** for debugging and analytics

## 🔒 Security

- **Recipe validation** with security checks for malicious content
- **Branded types** prevent type confusion
- **Input sanitization** for all user inputs
- **Reserved keyword detection** prevents conflicts

## 📈 Monitoring

### Metrics
- Shortcuts count
- Cache hit rate
- Repository status
- Performance metrics

### Logging
- Structured JSON logs
- Performance timing
- Error tracking
- Event auditing

## 🛠️ Development

### Prerequisites
- Node.js 18+
- TypeScript 5.6+
- npm or yarn

### Setup
```bash
git clone https://github.com/reccaller-ai/reccall.git
cd reccall
npm install
npm run build
```

### Testing
```bash
npm test
npm run test:watch
```

### Linting
```bash
npm run lint
npm run lint:fix
```

## 📚 Documentation

- [Plugin Development Guide](./docs/PLUGIN_DEVELOPMENT.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Enterprise Deployment](./docs/ENTERPRISE_DEPLOYMENT.md)
- [Enterprise API Server Guide](./docs/ENTERPRISE_API_SERVER.md)
- [Security Best Practices](./docs/SECURITY.md)
- [Migration Guide](./docs/MIGRATION_GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- **Main Site**: https://reccaller.ai
- **Repository**: https://github.com/reccaller-ai/reccall
- **Contexts**: https://contexts.reccaller.ai
- **Issues**: https://github.com/reccaller-ai/reccall/issues

---

**RecCall** - Universal AI Context Engine for the modern developer.