#!/usr/bin/env node

/**
 * RecCall MCP Server - Refactored to use core engine with DI
 */

import 'reflect-metadata';
import { createMCPAdapter } from './src/core/container.js';

async function main() {
  const adapter = await createMCPAdapter();
  await adapter.initialize();
  await adapter.start();
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});