# MCP HTTP Transport Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solutions**:
```bash
# Option 1: Use different port
reccall-mcp --http-port 3001

# Option 2: Kill process on port 3000
lsof -ti:3000 | xargs kill

# Option 3: Find and kill manually
lsof -i:3000
kill <PID>
```

### Issue 2: Server Won't Start

**Error**: Server fails to start or crashes immediately

**Solutions**:
1. **Check Node.js version**: Requires Node.js >= 18.0.0
   ```bash
   node --version
   ```

2. **Verify build**: Ensure project is built
   ```bash
   npm run build
   ```

3. **Check dependencies**: Ensure all dependencies installed
   ```bash
   npm install
   ```

4. **Check permissions**: Ensure write permissions for storage directory

### Issue 3: HTTP Requests Return 406 Not Acceptable

**Error**: `406 Not Acceptable: Client must accept both application/json and text/event-stream`

**Solution**: Add required Accept header:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

**For Browser Clients**: The `BrowserMCPClient` automatically sets correct headers.

### Issue 4: Connection Refused

**Error**: Browser/client can't connect to `http://localhost:3000/mcp`

**Solutions**:
1. **Verify server is running**:
   ```bash
   curl http://localhost:3000/mcp
   # Should return error (method not allowed for GET) but confirms server is up
   ```

2. **Check firewall**: Ensure localhost connections are allowed

3. **Verify URL**: Check server URL matches client configuration
   - Default: `http://localhost:3000/mcp`
   - Custom: `http://localhost:<PORT>/mcp`

4. **Check server logs**: Look for startup errors

### Issue 5: Concurrent Request Conflicts

**Error**: Multiple requests fail or return incorrect responses

**Solution**: This shouldn't happen - HTTP transport uses stateless mode. If it does:
1. Verify server is using stateless mode (`sessionIdGenerator: undefined`)
2. Check server logs for transport errors
3. Ensure separate server instance for HTTP (not sharing with stdio transport)

### Issue 6: Tool Calls Fail

**Error**: Tool calls return errors or timeouts

**Solutions**:
1. **Verify tools are available**:
   ```bash
   curl -X POST http://localhost:3000/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
   ```

2. **Check parameters**: Verify tool arguments match schema

3. **Check core engine**: Ensure core engine initialized properly
   ```bash
   # Server should log: "RecCall MCP HTTP server running..."
   ```

4. **Check context engine**: Some tools require context engine
   ```bash
   # Verify context engine is initialized in server logs
   ```

### Issue 7: Browser Extension Can't Connect

**Error**: Extension shows connection errors

**Solutions**:
1. **Verify MCP server running**: Server must be running before extension connects
   ```bash
   reccall-mcp
   ```

2. **Check server URL**: Extension defaults to `http://localhost:3000/mcp`
   - Verify server is on correct port
   - Check browser console for connection errors

3. **Check CORS**: Should not be an issue for localhost, but verify no CORS errors in console

4. **Check extension permissions**: Ensure extension has required permissions

5. **Verify BrowserMCPClient**: Check extension uses `BrowserMCPClient` correctly

### Issue 8: Slow Performance

**Symptom**: Requests are slow or timeout

**Solutions**:
1. **Increase timeout**:
   ```typescript
   const client = new BrowserMCPClient({
     timeout: 60000 // 60 seconds
   });
   ```

2. **Check server resources**: Ensure server has sufficient resources

3. **Check network**: Verify no network issues between client and server

4. **Check for blocking operations**: Ensure tools don't block for too long

### Issue 9: stdio Transport Conflicts

**Error**: HTTP requests fail when stdio transport is active

**Solution**: Should not happen - HTTP uses separate server instance. If it does:
1. Verify separate server instances: `this.server` (stdio) and `this.httpServerInstance` (HTTP)
2. Check server initialization logs
3. Restart server if needed

### Issue 10: Graceful Shutdown Fails

**Error**: Server doesn't shut down cleanly

**Solutions**:
1. **Send SIGTERM or SIGINT**: Server handles these signals
   ```bash
   kill -TERM <PID>
   # or Ctrl+C in terminal
   ```

2. **Force kill if needed**:
   ```bash
   kill -9 <PID>
   ```

3. **Check for hanging connections**: Close all HTTP connections before shutdown

## Debugging Tips

### Enable Verbose Logging

Check server stderr for detailed logs:
```bash
reccall-mcp 2>&1 | tee mcp-server.log
```

### Test with curl

Use curl to verify HTTP endpoint:
```bash
# Test tools/list
curl -v -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Test tool call
curl -v -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"rec_list","arguments":{}}}'
```

### Check Server Status

```bash
# Check if server is listening
lsof -i:3000

# Test connectivity
telnet localhost 3000
```

### Browser Developer Tools

1. Open browser DevTools (F12)
2. Check Network tab for HTTP requests
3. Check Console for errors
4. Verify request/response format

## Getting Help

If issues persist:

1. **Check documentation**: `docs/MCP_HTTP_TRANSPORT.md`
2. **Review logs**: Server logs and browser console
3. **Verify setup**: Follow setup instructions carefully
4. **Test with minimal setup**: Start with HTTP-only mode
5. **Report issue**: Include logs, error messages, and steps to reproduce

## Prevention

1. **Always verify server is running** before using browser extensions
2. **Use consistent ports** to avoid configuration mismatches
3. **Keep dependencies updated**: `npm update`
4. **Test after changes**: Run tests after modifications
5. **Check logs regularly**: Monitor for warnings or errors

