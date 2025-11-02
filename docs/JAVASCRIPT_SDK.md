# JavaScript SDK Guide

## Overview

RecCall provides an official JavaScript SDK for Node.js and browser environments. The SDK provides a clean, type-safe wrapper around RecCall's REST API endpoints, making it easy to integrate RecCall into your applications.

## Installation

```bash
npm install reccall
```

## Quick Start

```typescript
import { ReccallSDK } from 'reccall/sdk';

// Initialize SDK
const client = new ReccallSDK({
  baseUrl: 'http://localhost:3000/api/reccall',
  apiKey: 'your-api-key' // Optional
});

// Create a context
const context = await client.createContext({
  name: 'react-patterns',
  content: 'Always use TypeScript for React components. Use functional components with hooks.',
  source: 'global',
  tags: ['react', 'typescript', 'frontend']
});

// Search contexts
const results = await client.searchContexts('React', {
  type: 'static',
  source: 'global'
});
```

## Configuration

### Basic Configuration

```typescript
const client = new ReccallSDK({
  baseUrl: 'http://localhost:3000/api/reccall', // Default
  apiKey: 'your-api-key', // Optional
  timeout: 30000 // Request timeout in ms (default: 30000)
});
```

### Environment Variables

The SDK automatically reads `RECCALL_API_KEY` from environment variables:

```bash
export RECCALL_API_KEY=your-api-key
```

```typescript
const client = new ReccallSDK({
  baseUrl: 'http://localhost:3000/api/reccall'
  // apiKey will be read from RECCALL_API_KEY env var
});
```

### Node.js Usage

```typescript
import { ReccallSDK } from 'reccall/sdk';

const client = new ReccallSDK({
  baseUrl: 'http://localhost:3000/api/reccall',
  // fetch is available in Node.js 18+
  // For older versions, install node-fetch
});
```

### Browser Usage

```typescript
import { ReccallSDK } from 'reccall/sdk';

const client = new ReccallSDK({
  baseUrl: 'https://api.yourdomain.com/api/reccall',
  apiKey: 'your-api-key'
});
```

## API Reference

### Shortcut Methods

#### `listShortcuts(): Promise<Shortcut[]>`

List all shortcuts.

```typescript
const shortcuts = await client.listShortcuts();
// [
//   { id: 'react-component', context: '...', createdAt: '...', updatedAt: '...' },
//   { id: 'api-endpoint', context: '...', createdAt: '...', updatedAt: '...' }
// ]
```

#### `getShortcut(id: string): Promise<Shortcut | null>`

Get a specific shortcut by ID.

```typescript
const shortcut = await client.getShortcut('react-component');
if (shortcut) {
  console.log(shortcut.context);
}
```

#### `createShortcut(id: string, context: string): Promise<void>`

Create a new shortcut.

```typescript
await client.createShortcut('my-shortcut', 'This is my context');
```

#### `updateShortcut(id: string, context: string): Promise<void>`

Update an existing shortcut.

```typescript
await client.updateShortcut('my-shortcut', 'Updated context');
```

#### `deleteShortcut(id: string): Promise<void>`

Delete a shortcut.

```typescript
await client.deleteShortcut('my-shortcut');
```

#### `searchShortcuts(query: string): Promise<Shortcut[]>`

Search shortcuts by query.

```typescript
const results = await client.searchShortcuts('React');
```

#### `purgeShortcuts(): Promise<void>`

Delete all shortcuts.

```typescript
await client.purgeShortcuts();
```

### Context Methods (Universal Context System)

#### `createContext(params: CreateStaticContextParams): Promise<Context>`

Create a static context.

```typescript
const context = await client.createContext({
  name: 'api-patterns',
  content: 'Always validate input...',
  source: 'global',
  tags: ['api', 'backend'],
  category: 'development',
  description: 'API development patterns'
});
```

#### `createContextFromConversation(params: CreateDynamicContextParams): Promise<Context>`

Create a dynamic context from conversation (ML-powered).

```typescript
const context = await client.createContextFromConversation({
  name: 'debugging-session',
  messages: [
    { role: 'user', content: 'How do I debug this?', timestamp: new Date() },
    { role: 'assistant', content: 'Use console.log...', timestamp: new Date() }
  ],
  source: 'local',
  tags: ['debugging', 'troubleshooting']
});
```

#### `getContext(identifier: string): Promise<Context | null>`

Get a context by ID or name.

```typescript
const context = await client.getContext('api-patterns');
if (context) {
  console.log(context.content);
  console.log(context.type); // 'static' | 'dynamic' | 'hybrid'
  console.log(context.usageCount);
}
```

#### `listContexts(filters?: ContextSearchFilters): Promise<Context[]>`

List all contexts with optional filters.

```typescript
// List all contexts
const all = await client.listContexts();

// Filter by source
const local = await client.listContexts({ source: 'local' });

// Filter by type
const staticContexts = await client.listContexts({ type: 'static' });

// Combined filters
const filtered = await client.listContexts({
  source: 'global',
  type: 'dynamic'
});
```

#### `searchContexts(query: string, filters?: ContextSearchFilters): Promise<Context[]>`

Search contexts using hybrid search (keyword + semantic).

```typescript
// Simple search
const results = await client.searchContexts('authentication');

// Search with filters
const results = await client.searchContexts('React', {
  type: 'static',
  source: 'global'
});
```

#### `updateContext(id: string, updates: Partial<CreateStaticContextParams>): Promise<Context>`

Update a context.

```typescript
const updated = await client.updateContext('api-patterns', {
  content: 'Updated content...',
  tags: ['api', 'backend', 'patterns']
});
```

#### `deleteContext(id: string): Promise<void>`

Delete a context.

```typescript
await client.deleteContext('api-patterns');
```

#### `getContextStats(contextId: string): Promise<ContextStats>`

Get usage statistics for a context.

```typescript
const stats = await client.getContextStats('api-patterns');
console.log(`Used ${stats.usageCount} times`);
console.log(`Last used: ${stats.lastUsedAt}`);
```

### Utility Methods

#### `getStats(): Promise<Stats>`

Get engine statistics.

```typescript
const stats = await client.getStats();
console.log(`Shortcuts: ${stats.shortcutsCount}`);
console.log(`Contexts: ${stats.contextsCount}`);
console.log(`Cache hit rate: ${stats.cacheStats.hitRate * 100}%`);
```

#### `healthCheck(): Promise<{ status: string; timestamp: string }>`

Check API server health.

```typescript
const health = await client.healthCheck();
console.log(health.status); // 'ok'
```

## Type Definitions

```typescript
interface Shortcut {
  id: string;
  context: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Context {
  id: string;
  name: string;
  content: string;
  type: 'static' | 'dynamic' | 'hybrid';
  source: 'local' | 'global' | 'remote';
  description?: string;
  tags?: string[];
  category?: string;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  lastUsedAt?: string;
}

interface CreateStaticContextParams {
  name: string;
  content: string;
  source: 'local' | 'global';
  tags?: string[];
  category?: string;
  description?: string;
  repository?: string;
}

interface CreateDynamicContextParams {
  name: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date | string;
  }>;
  source: 'local' | 'global';
  tags?: string[];
}

interface ContextSearchFilters {
  source?: 'local' | 'global' | 'remote' | 'all';
  type?: 'static' | 'dynamic' | 'hybrid' | 'all';
}
```

## Error Handling

```typescript
try {
  const context = await client.getContext('non-existent');
  if (!context) {
    console.log('Context not found');
  }
} catch (error) {
  if (error instanceof Error) {
    console.error('SDK Error:', error.message);
  }
}
```

## Examples

### Example: Creating and Using Contexts

```typescript
import { ReccallSDK } from 'reccall/sdk';

const client = new ReccallSDK({
  baseUrl: 'http://localhost:3000/api/reccall'
});

// Create a static context
const context = await client.createContext({
  name: 'react-best-practices',
  content: 'Always use TypeScript for React components. Use functional components with hooks.',
  source: 'global',
  tags: ['react', 'typescript']
});

// Later, retrieve and use it
const retrieved = await client.getContext(context.id);
console.log(retrieved.content);

// Search for related contexts
const similar = await client.searchContexts('React TypeScript');
```

### Example: Creating Dynamic Contexts from Conversations

```typescript
const context = await client.createContextFromConversation({
  name: 'api-design-session',
  messages: [
    {
      role: 'user',
      content: 'How should I design REST APIs?',
      timestamp: new Date()
    },
    {
      role: 'assistant',
      content: 'Use RESTful conventions, include versioning, implement pagination...',
      timestamp: new Date()
    }
  ],
  source: 'local',
  tags: ['api', 'design']
});

// The context will be automatically processed by ML to extract:
// - Summary
// - Topics
// - Code references
// - Embeddings for semantic search
```

### Example: Integration with Express.js

```typescript
import express from 'express';
import { ReccallSDK } from 'reccall/sdk';

const app = express();
const reccall = new ReccallSDK({
  baseUrl: process.env.RECCALL_API_URL || 'http://localhost:3000/api/reccall',
  apiKey: process.env.RECCALL_API_KEY
});

app.get('/api/my-contexts', async (req, res) => {
  try {
    const contexts = await reccall.listContexts({ source: 'global' });
    res.json(contexts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contexts' });
  }
});

app.listen(3001);
```

## Next Steps

- See [REST API Documentation](./ENTERPRISE_API_SERVER.md) for API endpoint details
- See [Universal Context System](./UNIVERSAL_CONTEXT_SYSTEM.md) for context features
- See [API Reference](./API_REFERENCE.md) for complete API documentation

