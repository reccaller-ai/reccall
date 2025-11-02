# E2E Tests for RecCall

This directory contains end-to-end tests for validating RecCall's features across all platforms.

## Structure

```
tests/e2e/
├── README.md                    # This file
├── test-dynamic-context.js      # Test dynamic context creation with ML
├── test-hybrid-context.js       # Test hybrid context enhancement
├── test-mcp-tools.js            # Validate MCP tools availability
└── test-static-context.sh       # Test static context via CLI
```

## Running Tests

### Prerequisites

```bash
# Build the project
npm run build

# Ensure you're in the project root
cd /path/to/reccall
```

### Run Individual Tests

```bash
# Test dynamic context creation (ML-powered)
node tests/e2e/test-dynamic-context.js

# Test hybrid context enhancement
node tests/e2e/test-hybrid-context.js

# Test MCP tools registration
node tests/e2e/test-mcp-tools.js
```

### Run All E2E Tests

```bash
# Run all E2E tests sequentially
npm run test:e2e

# Or run manually:
for test in tests/e2e/test-*.js; do
  echo "Running $test..."
  node "$test"
done
```

## Test Coverage

### ✅ Core Features

- **Static Context Creation**: Via CLI and MCP
- **Dynamic Context Creation**: ML-powered from conversations
- **Hybrid Context Enhancement**: Template + ML insights
- **Hybrid Search**: Keyword + semantic search
- **Usage Tracking**: Statistics and analytics

### ✅ ML Components

- **Summarization**: Conversation summaries
- **Topic Extraction**: Keyword and theme extraction
- **Code Extraction**: Code block and file reference extraction
- **Embeddings**: 384-dimensional vector generation

### ✅ Platform Integration

- **CLI**: All commands tested
- **MCP**: Tools validated and registered
- **VSCode**: Extension built (requires manual testing)

## Expected Output

Each test script provides:
- ✅ Pass/Fail status
- 📊 ML artifacts verification
- 📝 Context creation confirmation
- 🔍 Search result validation

## Troubleshooting

### "Cannot find module" errors
```bash
# Ensure project is built
npm run build

# Run from project root
cd /path/to/reccall
node tests/e2e/test-*.js
```

### "Context not found" errors
```bash
# Clean test contexts
reccall context delete <test-context-id> --force
```

### MCP server not found
```bash
# Check MCP configuration
cat ~/.cursor/mcp.json

# Verify MCP server path exists
ls -la $(jq -r '.mcpServers.reccall.args[0]' ~/.cursor/mcp.json)
```

## Integration with CI/CD

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run E2E Tests
  run: |
    npm run build
    npm run test:e2e
```

## Manual Testing Guides

For manual testing in Cursor and VSCode, see:
- `docs/e2e/CURSOR_MCP_TEST_GUIDE.md` - Step-by-step Cursor testing
- `docs/e2e/WEBSITE_CLAIMS_VALIDATION.md` - Full validation report

