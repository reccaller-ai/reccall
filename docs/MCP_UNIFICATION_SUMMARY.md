# MCP Unification - Executive Summary

## 🎯 Feasibility: ✅ HIGHLY FEASIBLE (Simplified Approach)

Unifying all integrations (Cursor, Perplexity, Sora) under MCP is **highly feasible** and recommended for architectural unity.

## 🎯 Simplified Strategy (Updated)

**Since we're in dev phase with no clients, we can make breaking changes:**

- ✅ **MCP as Default** - Primary integration path for all platforms
- ✅ **No Bridge Needed** - Direct MCP support via HTTP transport
- ✅ **Browser Extensions Optional** - Keep as alternative, not default
- ✅ **Breaking Changes OK** - Simpler without backward compatibility

## 🔑 Key Discovery

**The MCP SDK already supports HTTP transport!**

- ✅ `StreamableHTTPServerTransport` is built into `@modelcontextprotocol/sdk`
- ✅ No custom transport code needed
- ✅ HTTP/SSE support ready to use
- ✅ Works with Express.js

## 📊 Current vs Proposed

### Current Architecture (Inconsistent)

```
Cursor → MCP (stdio) → Core Engine ✅
Perplexity → Browser Extension → chrome.storage ❌
Sora → Browser Extension → chrome.storage ❌
```

**Problems**:
- Browser extensions isolated from core engine
- No ML features in extensions
- Duplicate storage/logic
- Inconsistent API

### Proposed Architecture (Unified - MCP-First)

```
Cursor → MCP (stdio) → Core Engine ✅
Perplexity → MCP (HTTP) → Core Engine ✅ (Primary)
         → Browser Extension (Optional) ⚙️
Sora → MCP (HTTP) → Core Engine ✅ (Primary)
    → Browser Extension (Optional) ⚙️
```

**Benefits**:
- ✅ All platforms use core engine (MCP path)
- ✅ ML-powered contexts everywhere
- ✅ Unified storage and caching
- ✅ Consistent API
- ✅ Single source of truth
- ✅ Browser extensions remain as simple alternative

## 🛠️ Implementation Approach

### Step 1: Enhanced MCP Server (Week 1)

Enhance existing `MCPAdapter` to support multiple transports:

```typescript
// Start both stdio (Cursor) and HTTP (extensions)
await mcpAdapter.start({
  stdio: true,           // For Cursor
  http: { port: 3000 }   // For browser extensions
});
```

### Step 2: Browser Extension MCP Clients (Week 2-3)

Replace `chrome.storage.local` with MCP client:

```typescript
// Use MCP SDK's client
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Client(...);
await client.connect(new StreamableHTTPClientTransport({
  url: 'http://localhost:3000/mcp'
}));

// Call MCP tools instead of chrome.storage
await client.callTool('rec_context_create', {...});
```

### Step 3: Migration (Week 3-4)

- Sync browser storage → core engine
- Dual-mode support during transition
- Update documentation

## ✅ Benefits Summary

| Aspect | Before | After |
|--------|--------|-------|
| Architecture | Mixed (MCP + Extensions) | Unified (MCP only) |
| Core Engine | Cursor only | All platforms |
| ML Features | Cursor only | All platforms |
| Storage | Mixed | Unified |
| API | Inconsistent | Consistent |
| Maintenance | Complex | Simple |

## ⚠️ Challenges & Solutions

### Challenge 1: Browser → MCP Communication
**Solution**: ✅ Use `StreamableHTTPServerTransport` (already in SDK)

### Challenge 2: Server Lifecycle
**Solution**: Start HTTP server when extensions active, or always-running daemon

### Challenge 3: Breaking Changes
**Solution**: ✅ Acceptable in dev phase - no migration needed

## 📈 Recommendation

**✅ PROCEED with MCP unification (Simplified)**

**Priority**: High
**Timeline**: 2 weeks (simplified, no migration)
**Risk**: Very Low (breaking changes acceptable, no production clients)

## 🚀 Quick Start Implementation (Simplified)

1. **Add Express dependency**: `npm install express @types/express`
2. **Enhance MCPAdapter**: Support HTTP transport alongside stdio (default on)
3. **Update entry point**: Default HTTP on port 3000, `--http-port` for custom
4. **Create browser MCP client**: Shared library for Perplexity/Sora
5. **Update Perplexity/Sora**: Use MCP as primary, keep browser extension optional
6. **No migration needed** - breaking changes OK in dev phase

## 📚 Full Documentation

See `docs/MCP_UNIFIED_INTEGRATION_FEASIBILITY.md` for:
- Complete analysis
- Architecture diagrams
- Code examples
- Migration plan
- Implementation timeline

