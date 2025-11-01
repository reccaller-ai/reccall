#!/usr/bin/env node

/**
 * RecCall CLI - Refactored to use core engine with DI
 */

import 'reflect-metadata';
import { createCLIAdapter } from './core/container.js';

async function main() {
  const adapter = await createCLIAdapter();
  await adapter.initialize();
  
  const program = adapter.createProgram();
  await program.parseAsync();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});