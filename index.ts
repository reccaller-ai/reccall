#!/usr/bin/env node

/**
 * RecCall MCP Server - Refactored to use core engine
 */

import { MCPAdapter } from './src/adapters/mcp/index.js';

async function main() {
  const adapter = new MCPAdapter();
  await adapter.initialize();
  await adapter.start();
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});