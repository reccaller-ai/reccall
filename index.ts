#!/usr/bin/env node

/**
 * RecCall MCP Server - Refactored to use core engine with DI
 * Supports both stdio (Cursor) and HTTP (Perplexity/Sora) transports
 */

import 'reflect-metadata';
import { createMCPAdapter } from './src/core/container.js';
import type { MCPStartOptions } from './src/adapters/mcp/index.js';

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options: MCPStartOptions = {
    stdio: true, // Default: enable stdio for Cursor
    http: { port: 3000 }, // Default: enable HTTP on port 3000
  };

  // Parse --http-port flag
  const httpPortIndex = args.indexOf('--http-port');
  if (httpPortIndex !== -1) {
    const portStr = args[httpPortIndex + 1];
    if (portStr) {
      const port = parseInt(portStr, 10);
      if (!isNaN(port)) {
        options.http = { port };
      }
    }
  }

  // Parse --no-http flag (disable HTTP transport)
  if (args.includes('--no-http')) {
    options.http = false;
  }

  // Parse --no-stdio flag (disable stdio transport)
  if (args.includes('--no-stdio')) {
    options.stdio = false;
  }

  // Parse --stdio-only flag (only stdio, no HTTP)
  if (args.includes('--stdio-only')) {
    options.stdio = true;
    options.http = false;
  }

  // Parse --http-only flag (only HTTP, no stdio)
  if (args.includes('--http-only')) {
    options.stdio = false;
    const currentPort = typeof options.http === 'object' && options.http !== null ? options.http.port : undefined;
    options.http = { port: currentPort ?? 3000 };
  }

  const adapter = await createMCPAdapter();
  await adapter.initialize();
  await adapter.start(options);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('\nShutting down RecCall MCP Server...');
    await adapter.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('\nShutting down RecCall MCP Server...');
    await adapter.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});