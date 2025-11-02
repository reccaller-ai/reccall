# MCP Unified Integration Feasibility Analysis

## Executive Summary

This document analyzes the feasibility of unifying all RecCall integrations (Cursor, Perplexity, Sora) under the Model Context Protocol (MCP) for architectural consistency and design unity.

## 🎯 Simplified Approach (Updated)

**Since we're in early development with no client usage, we can take a simpler, breaking-change-friendly approach:**

- ✅ **MCP as Default Path** - Primary integration method for all platforms
- ✅ **Browser Extensions as Optional** - Keep browser extensions but as alternative, not default
- ✅ **No Bridge Needed** - Direct MCP support for Perplexity and Sora via HTTP transport
- ✅ **Breaking Changes OK** - We can simplify without backward compatibility concerns

## Current State

### Integration Methods

1. **Cursor IDE**: ✅ MCP Server (stdio transport)
   - Status: Working
   - Transport: `StdioServerTransport`
   - Communication: Standard input/output
   - Configuration: Cursor's MCP config

2. **Perplexity AI**: ⚠️ Browser Extension
   - Status: Working
   - Method: Chrome Extension API
   - Storage: Browser local storage (Chrome storage API)
   - Communication: DOM injection + content scripts
   - **Does NOT use core engine or MCP**

3. **Sora (OpenAI)**: ⚠️ Browser Extension
   - Status: Working
   - Method: Chrome Extension API
   - Storage: Browser local storage (Chrome storage API)
   - Communication: DOM injection + content scripts
   - **Does NOT use core engine or MCP**

## Feasibility Assessment

### ✅ Highly Feasible: MCP-Based Architecture

**Conclusion**: It is **highly feasible** to unify all integrations under MCP with the following approach.

## Proposed Unified Architecture (Simplified)

### MCP-First Approach (Recommended for Dev Phase)

```
┌─────────────────────────────────────────────────────────┐
│              RecCall Core Engine                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ Storage  │ │ Repository│ │  Cache   │              │
│  └──────────┘ └──────────┘ └──────────┘              │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐  ┌────▼──────┐  ┌─────▼──────┐
│ MCP Server   │  │ MCP HTTP  │  │ Browser    │
│ (Stdio)      │  │ Transport │  │ Extension  │
│              │  │ (SSE)     │  │ (Optional) │
└───────┬──────┘  └─────┬─────┘  └─────┬──────┘
        │               │               │
    ┌───▼───┐      ┌────▼────┐    ┌────▼────┐
    │Cursor │      │Perplexity│   │  Sora   │
    │(MCP)  │      │(MCP HTTP)│   │(MCP HTTP)│
    └───────┘      └──────────┘    └─────────┘
      Primary         Primary       Primary
```

**Key Changes**:
- ✅ MCP HTTP transport is **primary path** for Perplexity/Sora
- ✅ Browser extensions remain as **optional alternative**
- ✅ No bridge needed - direct MCP connection
- ✅ Simpler architecture

### Implementation Strategy

#### 1. Enhanced MCP Server (Base)
**Current**: `index.ts` uses `StdioServerTransport`
**Enhancement**: Support multiple transports using existing MCP SDK

**✅ GOOD NEWS**: The MCP SDK (`@modelcontextprotocol/sdk`) already includes `StreamableHTTPServerTransport`!

```typescript
// src/adapters/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export class UnifiedMCPServer {
  private server: Server;
  private transports: Map<string, Transport> = new Map();

  async addStdioTransport(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.transports.set('stdio', transport);
  }

  async addHTTPTransport(options: { port: number; expressApp?: any }): Promise<void> {
    // Use built-in StreamableHTTPServerTransport from MCP SDK
    const transport = new StreamableHTTPServerTransport({
      server: options.expressApp,
      path: '/mcp'
    });
    await this.server.connect(transport);
    this.transports.set('http', transport);
  }
}
```

#### 2. HTTP MCP Bridge Server

**✅ SIMPLIFIED**: Use built-in `StreamableHTTPServerTransport` - no custom bridge needed!

The MCP SDK provides `StreamableHTTPServerTransport` which handles HTTP/SSE automatically:

```typescript
// src/adapters/mcp/http-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';

export async function startMCPHTTPServer(port: number = 3000): Promise<void> {
  const app = express();
  app.use(express.json());

  // Create MCP server
  const server = new Server({
    name: 'reccall',
    version: '2.1.0'
  }, {
    capabilities: { tools: {} }
  });

  // Use StreamableHTTPServerTransport - handles HTTP/SSE automatically
  const transport = new StreamableHTTPServerTransport({
    server: app,
    path: '/mcp'  // All MCP requests go to /mcp endpoint
  });

  await server.connect(transport);
  
  app.listen(port, () => {
    console.log(`RecCall MCP HTTP server running on http://localhost:${port}/mcp`);
  });

  return server;
}
```

**Browser extensions connect directly to `/mcp` endpoint** - MCP SDK handles protocol translation!

#### 3. Browser Extension MCP Client

Replace direct storage with MCP client using MCP SDK's client:

```typescript
// src/adapters/browser/mcp-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export class BrowserMCPClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;

  async connect(serverUrl: string = 'http://localhost:3000/mcp'): Promise<void> {
    this.transport = new StreamableHTTPClientTransport({
      fetch: window.fetch.bind(window),
      url: serverUrl
    });
    
    this.client = new Client({
      name: 'reccall-browser-extension',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await this.client.connect(this.transport);
  }

  async callTool(name: string, args: any): Promise<any> {
    return await this.client.callTool({
      name,
      arguments: args
    });
  }

  async listTools(): Promise<any[]> {
    const { tools } = await this.client.listTools();
    return tools;
  }
}
```

**Usage in extensions**:
```typescript
// Perplexity extension
import { BrowserMCPClient } from './mcp-client';

const client = await new BrowserMCPClient();
await client.connect();

// Use MCP tools instead of chrome.storage
await client.callTool('rec_context_create', {
  name: 'context-name',
  content: '...',
  tags: ['tag1']
});
```

#### 4. Browser Extensions (Optional Alternative)

Keep browser extensions as **optional alternative** for users who prefer direct browser integration:

**Browser Extension (Optional Path)**:
- Uses `chrome.storage.local` (standalone)
- Direct DOM injection
- No MCP server required
- Simpler setup for basic use cases

**MCP Path (Default/Recommended)**:
- Connects to RecCall MCP server via HTTP
- Full core engine features
- ML-powered contexts
- Unified storage

**User Choice**:
- Power users → MCP (full features)
- Casual users → Browser extension (simpler)

## Comparison: Current vs Proposed

### Current State

| Platform | Method | Core Engine | MCP | Storage |
|----------|--------|-------------|-----|---------|
| Cursor   | MCP    | ✅ Yes      | ✅  | Core    |
| Perplexity | Extension | ❌ No    | ❌  | Browser |
| Sora     | Extension | ❌ No    | ❌  | Browser |

**Issues**:
- Inconsistent storage (browser extensions don't use core engine)
- No unified API
- Browser extensions are isolated from core features
- Duplicate code/logic

### Proposed Unified State

| Platform | Method | Core Engine | MCP | Storage |
|----------|--------|-------------|-----|---------|
| Cursor   | MCP (stdio) | ✅ Yes      | ✅  | Core    |
| Perplexity | MCP (HTTP/WS) | ✅ Yes | ✅  | Core    |
| Sora     | MCP (HTTP/WS) | ✅ Yes | ✅  | Core    |

**Benefits**:
- ✅ Unified architecture
- ✅ All platforms use core engine
- ✅ Consistent API across all integrations
- ✅ Shared storage and caching
- ✅ Single source of truth
- ✅ Better feature parity

## Implementation Plan

### Phase 1: HTTP MCP Transport (Week 1) ✅ SIMPLIFIED

**✅ GOOD NEWS**: No custom transport needed - MCP SDK already provides `StreamableHTTPServerTransport`!

1. **Enhance MCPAdapter for Multiple Transports**
   - File: `src/adapters/mcp/index.ts`
   - Add support for HTTP transport alongside stdio
   - Use existing `StreamableHTTPServerTransport` from SDK
   - Default: start both stdio and HTTP simultaneously

2. **Update index.ts Entry Point**
   - Default: start HTTP server on port 3000
   - Support `--http-port` flag for customization
   - Support `--no-http` to disable HTTP (stdio-only mode)

3. **Add Express Dependency**
   - Required for `StreamableHTTPServerTransport`
   - Add to `package.json` dependencies

### Phase 2: Perplexity/Sora MCP Clients (Week 1-2)

1. **Create MCP Client Library**
   - File: `src/adapters/browser/mcp-client.ts`
   - Use MCP SDK's `StreamableHTTPClientTransport`
   - Shared library for both Perplexity and Sora

2. **Update Perplexity Integration**
   - **Primary**: MCP client connecting to HTTP server
   - **Optional**: Keep browser extension as alternative
   - Maintain UI injection functionality

3. **Update Sora Integration**
   - **Primary**: MCP client connecting to HTTP server
   - **Optional**: Keep browser extension as alternative
   - Maintain clipboard detection features

### Phase 3: Documentation & Testing (Week 2)

1. **Update Documentation**
   - MCP as default integration method
   - Browser extensions as optional alternative
   - Setup instructions for both paths

2. **Testing**
   - E2E tests for MCP path
   - Verify core engine integration
   - Performance testing
   - Test both MCP and browser extension paths

## Technical Considerations

### Advantages of MCP Unification

1. **Architectural Unity**
   - Single protocol for all integrations
   - Consistent API across platforms
   - Easier maintenance and testing

2. **Feature Parity**
   - All platforms get ML-powered contexts
   - Unified search capabilities
   - Consistent caching and performance

3. **Core Engine Benefits**
   - Browser extensions get full core engine features
   - Shared storage and synchronization
   - Better telemetry and analytics

4. **Extensibility**
   - New platforms easier to add (just implement MCP client)
   - Core features automatically available
   - Future-proof architecture

### Challenges & Solutions

#### Challenge 1: Browser Extension → MCP Communication

**Problem**: Browser extensions can't directly use stdio MCP servers.

**Solutions**:
1. ✅ **HTTP Bridge** (Recommended): Lightweight HTTP wrapper
2. ✅ **WebSocket Bridge**: Real-time communication
3. ✅ **Native Messaging**: Chrome native host → MCP server

#### Challenge 2: Network Security (CORS)

**Problem**: Browser extensions making HTTP requests to localhost.

**Solution**: 
- Use `localhost` (allowed by browser)
- Configure proper CORS headers
- Optionally use native messaging (no CORS issues)

#### Challenge 3: Server Lifecycle

**Problem**: MCP server needs to run when extensions are active.

**Solutions**:
1. **Background Service**: Always-running daemon (via `npm install -g reccall`)
2. **Auto-start**: Extension launches server if not running
3. **Lazy start**: Start server on first use

#### Challenge 4: Breaking Changes

**Problem**: Moving to MCP-first breaks existing browser extension usage.

**Solution**:
- ✅ **Acceptable** - We're in dev phase with no production clients
- ✅ **Cleaner** - No migration complexity needed
- ✅ **Future-proof** - MCP is the standard path
- Keep browser extensions as optional alternative for basic use cases

## Recommended Approach (Simplified)

### MCP-First Architecture ✅ SIMPLIFIED APPROACH

**Since we're in dev phase with no clients, we can make breaking changes and simplify:**

1. **MCP as Default** - All platforms primarily use MCP
2. **HTTP Transport** - Perplexity and Sora connect via HTTP/SSE MCP transport
3. **Browser Extensions Optional** - Keep as alternative path, not default
4. **No Bridge** - Direct MCP integration, no compatibility layer needed

**Why This Approach**:
- ✅ **Simpler** - No bridge code, no migration complexity
- ✅ **Unified** - All platforms use MCP by default
- ✅ **Clean Architecture** - Single integration method
- ✅ **Future-Proof** - MCP is the standard protocol
- ✅ **Dev-Friendly** - Breaking changes are acceptable

**Implementation**:

```typescript
// Enhanced MCPAdapter - supports stdio and HTTP simultaneously
export class MCPAdapter {
  private server: Server;
  private stdioTransport?: StdioServerTransport;
  private httpTransport?: StreamableHTTPServerTransport;

  async start(options: {
    stdio?: boolean;  // For Cursor
    http?: { port: number };  // For Perplexity/Sora (optional, but default for web)
  } = { stdio: true, http: { port: 3000 } }) {
    // Always start stdio for Cursor
    if (options.stdio !== false) {
      this.stdioTransport = new StdioServerTransport();
      await this.server.connect(this.stdioTransport);
    }
    
    // Start HTTP for Perplexity/Sora (default on)
    if (options.http) {
      const app = express();
      this.httpTransport = new StreamableHTTPServerTransport({
        server: app,
        path: '/mcp'
      });
      await this.server.connect(this.httpTransport);
      
      app.listen(options.http.port, () => {
        console.log(`RecCall MCP HTTP server: http://localhost:${options.http.port}/mcp`);
      });
    }
  }
}
```

**Usage**:
```bash
# Default: stdio (Cursor) + HTTP (Perplexity/Sora)
reccall-mcp

# Or configure ports
reccall-mcp --http-port 3000
```

**Perplexity/Sora Integration (MCP-First)**:

```typescript
// Perplexity/Sora connect via MCP HTTP client
import { MCPClient } from './mcp-client';

const client = new MCPClient('http://localhost:3000/mcp');

// Instead of chrome.storage.local
await client.callTool('rec_context_create', {
  name: 'context-name',
  content: '...',
  tags: ['tag1']
});
```

## Migration Steps

### Step 1: Build HTTP/WebSocket MCP Transport
```bash
# Create transport implementations
src/adapters/mcp/transports/
  ├── http-transport.ts
  ├── ws-transport.ts
  └── transport-base.ts
```

### Step 2: Enhance MCPAdapter
```typescript
// Support multiple transports
await mcpAdapter.start({
  stdio: true,        // For Cursor
  http: { port: 3000 }, // For browser extensions
  ws: { port: 3001 }   // Alternative for extensions
});
```

### Step 3: Update Browser Extensions
- Replace `chrome.storage.local` with MCP client calls
- Connect to HTTP/WebSocket bridge
- Maintain UI injection (content scripts)

### Step 4: Update Documentation
- New setup instructions
- Migration guide for existing users
- Architecture diagrams

## Benefits Summary

### Before (Current)
- ❌ Inconsistent integration methods
- ❌ Browser extensions isolated from core engine
- ❌ Duplicate storage and logic
- ❌ No ML features in browser extensions
- ❌ Manual synchronization needed

### After (Unified MCP)
- ✅ Single unified architecture
- ✅ All platforms use core engine
- ✅ Consistent API and features
- ✅ Automatic ML-powered contexts
- ✅ Unified storage and caching
- ✅ Better maintainability
- ✅ Easier to add new platforms

## Recommendation

**✅ PROCEED with MCP unification**

**Implementation Priority**:
1. **High**: HTTP MCP Bridge (enables browser extensions)
2. **Medium**: WebSocket transport (optional enhancement)
3. **Medium**: Native messaging (advanced alternative)
4. **Low**: Migration tools for existing users

**Timeline**: 3-4 weeks for complete implementation

**Risk Level**: Low - Can maintain backward compatibility during migration

## Next Steps (Simplified)

1. ✅ Enhance MCPAdapter to support HTTP transport (using SDK's StreamableHTTPServerTransport)
2. ✅ Create MCP client library for Perplexity/Sora
3. ✅ Update Perplexity/Sora to use MCP as primary path
4. ✅ Keep browser extensions as optional alternative (no removal)
5. ✅ Update documentation (MCP-first, browser extensions optional)
6. ✅ Create PR

**No migration needed** - breaking changes acceptable in dev phase.

