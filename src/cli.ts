#!/usr/bin/env node

/**
 * RecCall CLI - Refactored to use core engine
 */

import { CLIAdapter } from './adapters/cli/index.js';

async function main() {
  const adapter = new CLIAdapter();
  await adapter.initialize();
  
  const program = adapter.createProgram();
  await program.parseAsync();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
      process.exit(1);
  });