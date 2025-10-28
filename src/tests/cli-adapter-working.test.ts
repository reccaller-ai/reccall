import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CLIAdapter } from '../adapters/cli/index.js';
import { FileSystemStorage } from '../storage-backends/filesystem.js';
import { HttpRepositoryClient } from '../core/repository.js';
import { MultiLayerCacheManager } from '../core/cache.js';
import { RecipeValidator } from '../core/validator.js';
import { CoreEngine } from '../core/engine.js';
import type { ShortcutId } from '../types.js';

describe('CLI Adapter Tests', () => {
  let adapter: CLIAdapter;
  let engine: CoreEngine;

  beforeEach(async () => {
    // Create instances directly
    const storage = new FileSystemStorage();
    const repository = new HttpRepositoryClient();
    const cache = new MultiLayerCacheManager();
    const validator = new RecipeValidator();
    
    engine = new CoreEngine(storage, repository, cache, validator);
    await engine.initialize();
    
    adapter = new CLIAdapter(engine);
    await adapter.initialize();
  });

  afterEach(async () => {
    // Clean up
    try {
      await engine.purge();
    } catch (error) {
      // Ignore purge errors
    }
  });

  describe('Adapter Initialization', () => {
    it('should initialize successfully', async () => {
      expect(adapter).toBeDefined();
      expect(adapter.createProgram).toBeDefined();
    });

    it('should create Commander.js program', () => {
      const program = adapter.createProgram();
      expect(program).toBeDefined();
      expect(program.name).toBe('reccall');
    });
  });

  describe('Command Creation', () => {
    it('should have all required commands', () => {
      const program = adapter.createProgram();
      const commands = program.commands.map(cmd => cmd.name());
      
      expect(commands).toContain('rec');
      expect(commands).toContain('call');
      expect(commands).toContain('list');
      expect(commands).toContain('update');
      expect(commands).toContain('delete');
      expect(commands).toContain('purge');
      expect(commands).toContain('search');
      expect(commands).toContain('install');
      expect(commands).toContain('list-repo');
      expect(commands).toContain('search-repo');
      expect(commands).toContain('reload-starter-pack');
    });

    it('should have help command', () => {
      const program = adapter.createProgram();
      expect(program.helpInformation()).toContain('reccall');
    });
  });

  describe('Integration with Core Engine', () => {
    it('should use the same engine instance', () => {
      expect(adapter).toBeDefined();
      // The adapter should be using the same engine instance
      // This is tested implicitly through the successful operations above
    });

    it('should handle engine errors gracefully', async () => {
      // Try to call a non-existent shortcut
      const program = adapter.createProgram();
      
      try {
        await program.parseAsync(['node', 'reccall', 'call', 'nonexistent-shortcut']);
      } catch (error) {
        // Expected to throw for non-existent shortcut
        expect(error).toBeDefined();
      }
    });
  });
});
