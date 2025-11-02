# MCP Unified Integration Feasibility Analysis

## Executive Summary

This document analyzes the feasibility of unifying all RecCall integrations (Cursor, Perplexity, Sora) under the Model Context Protocol (MCP) for architectural consistency and design unity.

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

## Proposed Unified Architecture

### Option 1: MCP Server with Browser Bridge (Recommended)

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
│ MCP Server   │  │ HTTP MCP  │  │ WebSocket  │
│ (Stdio)      │  │ Bridge    │  │ MCP Bridge │
│              │  │           │  │            │
└───────┬──────┘  └─────┬─────┘  └─────┬──────┘
        │               │               │
    ┌───▼───┐      ┌────▼────┐    ┌────▼────┐
    │Cursor │      │Browser  │    │Browser  │
    │(MCP)  │      │Extension│    │Extension│
    └───────┘      │(HTTP)   │    │(WS)     │
                   └─────────┘    └─────────┘
                   Perplexity      Sora
```

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

#### 4. Native Messaging Alternative

For tighter integration, use Chrome Native Messaging:

```json
// Browser Extension manifest.json
{
  "nativeMessaging": "reccall-mcp-native",
  "permissions": ["nativeMessaging"]
}
```

```typescript
// Native host that bridges extension → MCP server
// src/adapters/browser/native-host.ts
const mcpServer = spawn('reccall-mcp', [], { stdio: ['pipe', 'pipe', 'inherit'] });

chrome.runtime.onConnectNative.addListener((port) => {
  port.onMessage.addListener((message) => {
    mcpServer.stdin.write(JSON.stringify(message) + '\n');
  });
  
  mcpServer.stdout.on('data', (data) => {
    port.postMessage(JSON.parse(data.toString()));
  });
});
```

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
   - Add support for starting HTTP transport alongside stdio
   - Use existing `StreamableHTTPServerTransport` from SDK

2. **Update index.ts Entry Point**
   - Support `--http-port` flag for HTTP server
   - Start both stdio (for Cursor) and HTTP (for extensions) simultaneously

3. **Add Express Dependency**
   - Required for `StreamableHTTPServerTransport`
   - Add to `package.json` dependencies

### Phase 2: Browser Extension MCP Clients (Week 2-3)

1. **Perplexity MCP Client**
   - Replace direct storage with MCP client calls
   - Connect to HTTP/WebSocket MCP bridge
   - Maintain existing UI injection functionality

2. **Sora MCP Client**
   - Replace direct storage with MCP client calls
   - Connect to HTTP/WebSocket MCP bridge
   - Maintain clipboard detection features

3. **Unified Extension Base**
   - Create shared MCP client library for extensions
   - `src/adapters/browser/mcp-client.ts`

### Phase 3: Migration & Testing (Week 3-4)

1. **Migrate Existing Extensions**
   - Update Perplexity extension to use MCP
   - Update Sora extension to use MCP
   - Maintain backward compatibility during transition

2. **Testing**
   - E2E tests for all platforms
   - Verify core engine integration
   - Performance testing

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

#### Challenge 4: Migration Path

**Problem**: Existing users have data in browser storage.

**Solution**:
- Migration utility to sync browser storage → core engine
- Dual-mode support during transition
- Clear migration instructions

## Recommended Approach

### Primary: HTTP MCP Transport + Extension Clients ✅ RECOMMENDED

**Why**:
- ✅ **Built-in support** - MCP SDK already provides `StreamableHTTPServerTransport`
- ✅ Simpler implementation (no custom code needed)
- ✅ No native code required
- ✅ Works across all browsers
- ✅ Easy to debug and test
- ✅ Server-Sent Events (SSE) for real-time updates
- ✅ Can run on different ports for multiple instances

**Implementation**:

```typescript
// Enhanced MCPAdapter supporting multiple transports
export class MCPAdapter {
  private server: Server;
  private stdioTransport?: StdioServerTransport;
  private httpTransport?: StreamableHTTPServerTransport;

  async start(options: {
    stdio?: boolean;
    http?: { port: number; expressApp?: any };
  }) {
    if (options.stdio) {
      this.stdioTransport = new StdioServerTransport();
      await this.server.connect(this.stdioTransport);
    }
    
    if (options.http) {
      const app = options.expressApp || express();
      this.httpTransport = new StreamableHTTPServerTransport({
        server: app,
        path: '/mcp'
      });
      await this.server.connect(this.httpTransport);
      
      if (!options.expressApp) {
        app.listen(options.http.port, () => {
          console.log(`MCP HTTP server on http://localhost:${options.http.port}/mcp`);
        });
      }
    }
  }
}
```

**Usage**:
```bash
# Start with both stdio (Cursor) and HTTP (browser extensions)
reccall-mcp --http-port 3000
```

**Browser Extension Integration**:

```typescript
// Perplexity extension
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

## Next Steps

1. Create HTTP/WebSocket transport implementations
2. Enhance MCPAdapter to support multiple transports
3. Update browser extensions to use MCP clients
4. Add migration utilities for existing browser storage
5. Update documentation and create PR

