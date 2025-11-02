# Manual Testing Guide for HTTP MCP Transport

## Prerequisites

1. Build the project: `npm run build`
2. Ensure no process is running on port 3000

## Test 1: Start Server with Both Transports (Default)

```bash
# Terminal 1: Start server
npm run build
node dist/index.js

# Expected output:
# RecCall MCP Server running on stdio (Cursor)
# RecCall MCP HTTP server running on http://localhost:3000/mcp
```

## Test 2: Start Server HTTP-Only

```bash
# Terminal 1: Start HTTP-only server
node dist/index.js --http-only

# Expected output:
# RecCall MCP HTTP server running on http://localhost:3000/mcp
```

## Test 3: Test HTTP Endpoint with curl

```bash
# Terminal 2: Test tools/list
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# Expected: JSON response with tools array
```

## Test 4: Test Tool Call

```bash
# Terminal 2: Call rec_list tool
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

# Expected: JSON response with shortcuts list
```

## Test 5: Test Context Creation

```bash
# Terminal 2: Create a context
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "rec_context_create",
      "arguments": {
        "name": "test-context",
        "content": "# Test Context\n\nThis is a test.",
        "source": "local"
      }
    }
  }'

# Expected: Success response with context ID
```

## Test 6: Verify Server Handles Multiple Requests

```bash
# Terminal 2: Run multiple requests in parallel
for i in {1..5}; do
  curl -X POST http://localhost:3000/mcp \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":$i,\"method\":\"tools/list\",\"params\":{}}" &
done
wait

# Expected: All requests should succeed (stateless mode handles concurrent requests)
```

## Test 7: Custom Port

```bash
# Terminal 1: Start on custom port
node dist/index.js --http-port 8080

# Terminal 2: Test on custom port
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Test 8: Graceful Shutdown

```bash
# Terminal 1: Start server
node dist/index.js --http-only

# Terminal 2: Make a request
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Terminal 1: Press Ctrl+C
# Expected: Server shuts down gracefully, no errors
```

## Validation Checklist

- [ ] Server starts with both transports by default
- [ ] HTTP endpoint responds to requests
- [ ] tools/list returns correct tools
- [ ] Tool calls work (rec_list, rec_context_create, etc.)
- [ ] Multiple concurrent requests work
- [ ] Custom port configuration works
- [ ] Graceful shutdown works
- [ ] No errors in server logs
- [ ] stdio transport still works (test with Cursor if available)

## Troubleshooting

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill
```

### Connection Refused
- Verify server is running
- Check port number
- Verify firewall settings

### Invalid Response
- Check JSON format
- Verify method name
- Check required parameters

