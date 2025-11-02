# Cursor MCP Integration Test Guide

## Prerequisites
- ✅ Cursor IDE installed
- ✅ RecCall MCP server configured in `~/.cursor/mcp.json`
- ✅ Node.js installed and `reccall-mcp` command available

## Quick Test Commands for Cursor Chat

### 1. Test Static Context Creation
**In Cursor Chat, ask:**
```
Create a static context called "react-best-practices" with the content:
"Always use TypeScript for React components. Use functional components with hooks.
Include PropTypes or TypeScript interfaces. Implement error boundaries."
```

**Expected Result:**
- Context created successfully
- Response shows context ID
- Can retrieve it later

### 2. Test Dynamic Context from Conversation (ML)
**In Cursor Chat, say:**
```
Create a context from our conversation about form validation and React components.
Save it as "react-forms-conversation"
```

**Expected Result:**
- Dynamic context created
- ML artifacts generated (summary, topics, code refs, embeddings)
- Context type: dynamic
- Can be searched semantically

### 3. Test Context Search
**In Cursor Chat, ask:**
```
Search for contexts about React
```

**Expected Result:**
- Returns relevant contexts (hybrid search)
- Finds both keyword matches and semantic matches
- Shows context names and descriptions

### 4. Test Context Listing
**In Cursor Chat, ask:**
```
List all my contexts
Show me contexts of type dynamic
Show me contexts with tag "react"
```

**Expected Result:**
- Lists all contexts
- Filters work correctly
- Shows context metadata

### 5. Test Context Usage
**In Cursor Chat, ask:**
```
Get the context "react-best-practices"
```

**Expected Result:**
- Context content returned
- Usage count incremented
- Stats updated

## MCP Tools Available in Cursor

The following tools should be discoverable by Cursor:

### Context Management (Universal System)
- `rec_context_create` - Create static context
- `rec_context_get` - Get context by ID/name  
- `rec_context_search` - Search contexts (hybrid)
- `rec_context_list` - List contexts
- `rec_context_delete` - Delete context
- `rec_context_stats` - Get statistics
- `rec_context_from_conversation` - Create dynamic context (ML)

### Legacy Shortcuts (v1.0)
- `rec` - Record shortcut
- `call` - Call shortcut
- `rec_list` - List shortcuts
- `rec_search` - Search shortcuts
- `rec_update` - Update shortcut

## Verification Steps

1. **Check MCP Connection**:
   - Open Cursor IDE
   - Check MCP panel (should show "reccall" server)
   - Verify no connection errors

2. **Test Tool Discovery**:
   - Ask Cursor: "What RecCall tools are available?"
   - Should list all registered tools

3. **Test Basic Operations**:
   - Create a context
   - Search for it
   - Retrieve it
   - Check stats

4. **Test ML Features**:
   - Create dynamic context from conversation
   - Verify ML artifacts are present
   - Test semantic search

## Troubleshooting

**If MCP server not connecting:**
1. Check `~/.cursor/mcp.json` exists
2. Verify path to `dist/index.js` is correct
3. Test MCP server manually: `node dist/index.js`
4. Check Cursor logs for errors

**If tools not available:**
1. Restart Cursor IDE
2. Verify MCP server is running
3. Check server startup logs

**If ML features not working:**
1. Verify context type is "dynamic" or "hybrid"
2. Check for `ml` property in context
3. Verify embeddings are generated (384 dimensions)

