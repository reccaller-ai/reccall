# Enterprise API Server Guide

## Overview

RecCall provides enterprise-grade REST API servers for team deployments using Express.js and Fastify frameworks. These API servers enable centralized shortcut management, multi-user access, and integration with existing enterprise infrastructure.

## Express.js Integration

### Installation

```bash
npm install express @types/express
```

### Basic Setup

```typescript
import express from 'express';
import { createCoreEngine } from '@reccaller-ai/core';
import { createReccallMiddleware } from '@reccaller-ai/adapters/api/express';

const app = express();
app.use(express.json());

const engine = await createCoreEngine();
await engine.initialize();

// Setup RecCall API routes
createReccallMiddleware({
  engine,
  basePath: '/api/reccall',
}).then((middleware) => {
  app.use(middleware);
});

app.listen(3000, () => {
  console.log('RecCall API server running on http://localhost:3000');
});
```

### Authentication

```typescript
import { createReccallMiddleware } from '@reccaller-ai/adapters/api/express';

const middleware = await createReccallMiddleware({
  engine,
  basePath: '/api/reccall',
  authenticate: async (req) => {
    // Custom authentication logic
    const token = req.headers.authorization?.replace('Bearer ', '');
    return await validateToken(token);
  },
});
```

### API Endpoints

#### `GET /api/reccall/shortcuts`
List all shortcuts.

**Response:**
```json
{
  "shortcuts": [
    {
      "shortcut": "example-shortcut",
      "context": "Example context",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### `GET /api/reccall/shortcuts/:id`
Get a specific shortcut by ID.

**Response:**
```json
{
  "shortcut": "example-shortcut",
  "context": "Example context"
}
```

#### `POST /api/reccall/shortcuts`
Create a new shortcut.

**Request:**
```json
{
  "shortcut": "new-shortcut",
  "context": "New context content"
}
```

#### `PUT /api/reccall/shortcuts/:id`
Update an existing shortcut.

**Request:**
```json
{
  "context": "Updated context content"
}
```

#### `DELETE /api/reccall/shortcuts/:id`
Delete a shortcut.

#### `DELETE /api/reccall/shortcuts`
Purge all shortcuts.

#### `GET /api/reccall/search?q=query`
Search shortcuts by query.

#### `GET /api/reccall/recipes?repo=url`
List available recipes from repository.

#### `POST /api/reccall/recipes/:id/install`
Install a recipe from repository.

**Request:**
```json
{
  "repoUrl": "https://contexts.reccaller.ai"
}
```

#### `GET /api/reccall/stats`
Get engine statistics.

#### `GET /api/reccall/health`
Health check endpoint.

## Fastify Integration

### Installation

```bash
npm install fastify
```

### Basic Setup

```typescript
import Fastify from 'fastify';
import { createCoreEngine } from '@reccaller-ai/core';
import reccallFastifyPlugin from '@reccaller-ai/adapters/api/fastify';

const fastify = Fastify({ logger: true });

const engine = await createCoreEngine();
await engine.initialize();

await fastify.register(reccallFastifyPlugin, {
  engine,
  basePath: '/api/reccall',
});

await fastify.listen({ port: 3000 });
```

### Authentication

```typescript
await fastify.register(reccallFastifyPlugin, {
  engine,
  basePath: '/api/reccall',
  authenticate: async (request) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    return await validateToken(token);
  },
});
```

## Docker Deployment

### Dockerfile Example

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY dist ./dist
COPY starter-pack ./starter-pack

EXPOSE 3000

CMD ["node", "dist/server.js"]
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  reccall-api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - POSTGRES_URL=postgresql://postgres:password@postgres:5432/reccall
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=reccall
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    ports:
      - "5432:5432"
```

## Kubernetes Deployment

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: reccall-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: reccall-api
  template:
    metadata:
      labels:
        app: reccall-api
    spec:
      containers:
      - name: reccall-api
        image: reccall/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: reccall-secrets
              key: redis-url
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: reccall-secrets
              key: postgres-url
---
apiVersion: v1
kind: Service
metadata:
  name: reccall-api
spec:
  selector:
    app: reccall-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Enterprise Features

### Redis Storage Backend

```typescript
import { RedisStorage } from '@reccaller-ai/storage-backends/redis';
import { createCoreEngine } from '@reccaller-ai/core';

const redisStorage = new RedisStorage({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

const engine = await createCoreEngine({
  storage: redisStorage,
});
```

### PostgreSQL Storage Backend

```typescript
import { PostgresStorage } from '@reccaller-ai/storage-backends/postgres';
import { createCoreEngine } from '@reccaller-ai/core';

const postgresStorage = new PostgresStorage({
  connectionString: process.env.POSTGRES_URL,
});

await postgresStorage.initialize();

const engine = await createCoreEngine({
  storage: postgresStorage,
});
```

### Webhook Support

```typescript
import { WebhookManager } from '@reccaller-ai/core/webhooks';

const webhookManager = new WebhookManager(true);

webhookManager.register('slack-notifications', {
  url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  secret: process.env.WEBHOOK_SECRET,
  events: ['shortcut.recorded', 'shortcut.deleted'],
});

// Trigger webhook
await webhookManager.trigger('shortcut.recorded', {
  shortcut: 'example',
  context: 'Example context',
});
```

### Prometheus Metrics

```typescript
import { telemetryManager } from '@reccaller-ai/core/telemetry';
import express from 'express';

const app = express();

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(telemetryManager.exportPrometheusMetrics());
});
```

## Security Best Practices

1. **Authentication**: Always implement authentication middleware
2. **HTTPS**: Use HTTPS for all API endpoints
3. **Rate Limiting**: Implement rate limiting for public APIs
4. **Input Validation**: Validate all input data
5. **Secret Management**: Use environment variables or secret management services
6. **CORS**: Configure CORS appropriately for your use case

## Monitoring

### Health Checks

The API server provides a health check endpoint at `/api/reccall/health` that returns:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Metrics

Use the Prometheus metrics endpoint for monitoring:

- `reccall_shortcuts_count`: Total number of shortcuts
- `reccall_cache_hit_rate`: Cache hit rate (0-1)
- `reccall_cache_size`: Current cache size
- `reccall_repository_enabled`: Whether repository is enabled
- `reccall_last_activity_timestamp`: Last activity timestamp

## Performance Optimization

1. **Connection Pooling**: Use connection pooling for database backends
2. **Caching**: Enable Redis caching for frequently accessed shortcuts
3. **Load Balancing**: Deploy multiple instances behind a load balancer
4. **CDN**: Use CDN for static assets if applicable

## Troubleshooting

### Common Issues

1. **Connection Errors**: Check database/Redis connection strings
2. **Authentication Failures**: Verify token validation logic
3. **Performance Issues**: Enable caching and connection pooling
4. **Memory Leaks**: Monitor memory usage and implement proper cleanup

## Additional Resources

- [Enterprise Deployment Guide](../ENTERPRISE_DEPLOYMENT.md)
- [Security Best Practices](../SECURITY.md)
- [API Reference](../API_REFERENCE.md)
