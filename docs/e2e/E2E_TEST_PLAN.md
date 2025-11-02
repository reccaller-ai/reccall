# E2E Test Plan for RecCall Features

## Test Environment Setup

### Prerequisites
- ✅ RecCall built and installed
- ✅ Cursor MCP configuration exists
- ✅ Node.js v24.8.0 available

## Test Scenarios

### 1. Cursor MCP Integration Tests

#### Test 1.1: Static Context Creation
**Expected**: Create a static context via MCP
**MCP Tool**: `rec_context_create`
**Steps**:
1. Use MCP tool to create a static context
2. Verify context is stored
3. Verify can retrieve via `rec_context_get`

#### Test 1.2: Dynamic Context from Conversation (ML-Powered)
**Expected**: Create dynamic context from conversation messages with ML processing
**MCP Tool**: `rec_context_from_conversation`
**Steps**:
1. Provide conversation messages
2. System should:
   - Generate summary
   - Extract topics
   - Extract code references
   - Generate embeddings
3. Verify ML artifacts are present

#### Test 1.3: Hybrid Context Enhancement
**Expected**: Enhance static template with ML insights
**Steps**:
1. Create static template
2. Enhance with conversation
3. Verify enhanced content includes both template and ML insights

#### Test 1.4: Hybrid Search
**Expected**: Search works with both keyword and semantic matching
**MCP Tool**: `rec_context_search`
**Steps**:
1. Search with keyword
2. Search with semantic query
3. Verify combined results

#### Test 1.5: Context Usage Tracking
**Expected**: Usage stats are tracked when contexts are accessed
**Steps**:
1. Use a context
2. Check stats via `rec_context_stats`
3. Verify usage count increased

### 2. CLI Tests (Validation)

#### Test 2.1: Static Context via CLI
```bash
reccall context create test-static \
  --content "Test static context content" \
  --source local \
  --tags test \
  --category testing
```

#### Test 2.2: Context Search via CLI
```bash
reccall context search "test"
```

#### Test 2.3: Context Stats via CLI
```bash
reccall context stats
```

### 3. VSCode Extension Tests

#### Test 3.1: Extension Installation
- Verify extension installs correctly
- Verify commands are available in command palette

#### Test 3.2: Context Creation via Extension
- Use extension to create context
- Verify it appears in list

#### Test 3.3: Context Usage via Extension
- Call context from extension
- Verify content is retrieved correctly

## Validation Checklist

- [ ] All MCP tools are accessible in Cursor
- [ ] Static contexts can be created and retrieved
- [ ] Dynamic contexts include ML artifacts (summary, topics, codeRefs, embeddings)
- [ ] Hybrid contexts combine template + ML insights
- [ ] Search finds contexts via keyword and semantic matching
- [ ] Usage tracking works correctly
- [ ] All CLI commands work
- [ ] VSCode extension functions correctly
- [ ] Website claims match actual functionality

