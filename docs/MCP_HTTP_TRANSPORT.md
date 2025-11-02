# MCP HTTP Transport Documentation

## Overview

RecCall's MCP server now supports **HTTP transport** in addition to stdio, enabling browser extensions (Perplexity, Sora) to connect via HTTP while maintaining stdio support for Cursor IDE.

## Architecture

```
RecCall Core Engine
    │
    ├─ MCP Server (stdio) → Cursor IDE ✅
    └─ MCP Server (HTTP) → Browser Extensions ✅ NEW
```

## Server Configuration

### Default Behavior

By default, the MCP server starts **both transports simultaneously**:
- **stdio** on stdin/stdout (for Cursor)
- **HTTP** on `http://localhost:3000/mcp` (for browser extensions)

### CLI Options

```bash
# Default: both stdio and HTTP enabled
reccall-mcp

# Custom HTTP port
reccall-mcp --http-port 8080

# Only HTTP (for testing browser clients)
reccall-mcp --http-only

# Only stdio (Cursor only, no HTTP server)
reccall-mcp --stdio-only

# Disable HTTP
reccall-mcp --no-http

# Disable stdio
reccall-mcp --no-stdio
```

## HTTP Endpoint

### Base URL

**Default**: `http://localhost:3000/mcp`

**Custom Port**: `http://localhost:<PORT>/mcp`

### Protocol

The HTTP endpoint implements the [MCP Streamable HTTP specification](https://modelcontextprotocol.io/specification/latest/transport/streamable-http).

**Transport Mode**: Stateless (no session ID) for concurrent request handling.

**Response Format**: JSON (not SSE) for simpler browser integration.

## Testing

### Manual Testing with curl

```bash
# 1. Start MCP server
reccall-mcp --http-only --http-port 3000

# 2. Test tools/list
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# 3. Test tool call (rec_list)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "rec_list",
      "arguments": {}
    }
  }'
```

### Automated Testing

```bash
# Run E2E test
node tests/e2e/test-http-mcp-transport.js
```

## Browser Client Integration

### Using BrowserMCPClient

```typescript
import { BrowserMCPClient } from 'reccall/adapters/browser/mcp-client';

const client = new BrowserMCPClient({
  serverUrl: 'http://localhost:3000/mcp',
  timeout: 30000
});

// Connect
await client.connect();

// Call tools
await client.recordShortcut('my-shortcut', 'My context');
await client.callShortcut('my-shortcut');
await client.listShortcuts();

// Context operations
await client.createContext('my-context', '# Content', 'local');
await client.getContext('my-context');
await client.searchContexts('query');
```

### Client API

#### Methods

- `connect()`: Connect to MCP server
- `disconnect()`: Disconnect from server
- `isConnected()`: Check connection status
- `callTool(name, args)`: Call any MCP tool
- `listTools()`: List available tools

#### Convenience Methods

- `recordShortcut(shortcut, context)`
- `callShortcut(shortcut)`
- `listShortcuts()`
- `searchShortcuts(query)`
- `createContext(name, content, source, options?)`
- `getContext(identifier)`
- `searchContexts(query, filters?)`

## Implementation Details

### Server Instance

The HTTP transport uses a **separate MCP Server instance** from stdio to avoid transport conflicts:
- `this.server` → stdio transport
- `this.httpServerInstance` → HTTP transport

Both instances share the same handlers and core engine.

### Transport Lifecycle

1. **Per-Request Transport**: Each HTTP request creates a new `StreamableHTTPServerTransport` instance
2. **Stateless Mode**: Uses `sessionIdGenerator: undefined` for concurrent requests
3. **Auto-Cleanup**: Transport closed when HTTP response closes

### Error Handling

- HTTP errors return JSON-RPC error responses
- Timeout errors handled via fetch AbortController
- Connection errors propagate to client

## Troubleshooting

### Server Won't Start

**Issue**: Port already in use

**Solution**:
```bash
# Use different port
reccall-mcp --http-port 3001

# Or kill process on port 3000
lsof -ti:3000 | xargs kill
```

### Connection Refused

**Issue**: Browser client can't connect to server

**Solution**:
1. Verify server is running: `curl http://localhost:3000/mcp`
2. Check firewall settings
3. Verify server URL in client config

### CORS Issues

**Issue**: Browser blocks requests due to CORS

**Solution**: 
- HTTP server runs on `localhost` which is allowed by browsers
- No CORS headers needed for localhost connections

### Request Timeout

**Issue**: Client requests timeout

**Solution**:
```typescript
const client = new BrowserMCPClient({
  timeout: 60000 // Increase timeout to 60 seconds
});
```

## Security Considerations

### Localhost Only

The HTTP server binds to `localhost` by default, which:
- ✅ Prevents external access
- ✅ Safe for local development
- ✅ No authentication needed for local use

### Production Deployment

For production use:
- Use reverse proxy (nginx, Caddy)
- Add authentication layer
- Configure CORS properly
- Use HTTPS

## Related Documentation

- `docs/MCP_UNIFIED_INTEGRATION_FEASIBILITY.md` - Complete design
- `docs/MCP_UNIFICATION_SUMMARY.md` - Executive summary
- `README.md` - Quick start guide

