/**
 * Comprehensive tests for CLIAdapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CLIAdapter } from '../adapters/cli/index.js';
import { CoreEngine } from '../core/engine.js';
import type { ICoreEngine } from '../core/interfaces.js';
import { MockStorage, MockCacheManager, MockValidator, MockRepositoryClient } from './test-utils.js';
import { configManager } from '../core/config.js';
import { telemetryManager } from '../core/telemetry.js';

vi.mock('../core/config.js', () => ({
  configManager: {
    initialize: vi.fn(),
    isRepositoryEnabled: vi.fn(() => true),
  },
}));

vi.mock('../core/telemetry.js', () => ({
  telemetryManager: {
    updateMetrics: vi.fn(),
    logEvent: vi.fn(),
    logError: vi.fn(),
  },
  Performance: () => () => {},
  LogErrors: () => () => {},
}));

describe('CLIAdapter', () => {
  let adapter: CLIAdapter;
  let engine: ICoreEngine;

  beforeEach(async () => {
    const storage = new MockStorage();
    const cache = new MockCacheManager();
    const validator = new MockValidator();
    const repository = new MockRepositoryClient();
    engine = new CoreEngine(storage, repository, cache, validator);
    await engine.initialize();
    
    adapter = new CLIAdapter(engine);
    await adapter.initialize();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Command Setup', () => {
    it('should create program with correct name', () => {
      const program = adapter.createProgram();
      expect(program.name()).toBe('reccall');
    });

    it('should have all required commands', () => {
      const program = adapter.createProgram();
      const commands = program.commands.map(cmd => cmd.name());
      
      expect(commands).toContain('rec');
      expect(commands).toContain('call');
      expect(commands).toContain('list');
      expect(commands).toContain('search');
      expect(commands).toContain('delete');
      expect(commands).toContain('update');
      expect(commands).toContain('purge');
    });
  });

  describe('Record Command', () => {
    it('should record a shortcut successfully', async () => {
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'rec', 'test-shortcut', 'Test context for CLI testing']);
      
      expect(consoleSpy).toHaveBeenCalledWith('✅ Recorded shortcut: test-shortcut');
      
      const shortcuts = await engine.list();
      expect(shortcuts.some(s => s.id === 'test-shortcut')).toBe(true);
      
      consoleSpy.mockRestore();
    });

    it('should handle duplicate shortcut error', async () => {
      const program = adapter.createProgram();
      await program.parseAsync(['node', 'reccall', 'rec', 'duplicate-test', 'First context']);
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') });
      
      await expect(
        program.parseAsync(['node', 'reccall', 'rec', 'duplicate-test', 'Second context'])
      ).rejects.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('Call Command', () => {
    beforeEach(async () => {
      await engine.record('call-test' as any, 'Test context for call command testing');
    });

    it('should call a shortcut successfully', async () => {
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'call', 'call-test']);
      
      expect(consoleSpy).toHaveBeenCalledWith('Test context for call command testing');
      
      consoleSpy.mockRestore();
    });

    it('should handle non-existent shortcut error', async () => {
      const program = adapter.createProgram();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') });
      
      await expect(program.parseAsync(['node', 'reccall', 'call', 'nonexistent'])).rejects.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('List Command', () => {
    beforeEach(async () => {
      await engine.record('list-test-1' as any, 'First context for list testing');
      await engine.record('list-test-2' as any, 'Second context for list testing');
    });

    it('should list shortcuts successfully', async () => {
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'list']);
      
      expect(consoleSpy).toHaveBeenCalledWith('📋 Shortcuts:');
      
      consoleSpy.mockRestore();
    });

    it('should handle empty list', async () => {
      await engine.purge();
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'list']);
      
      expect(consoleSpy).toHaveBeenCalledWith('No shortcuts found');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Search Command', () => {
    beforeEach(async () => {
      await engine.record('search-test-1' as any, 'React component testing');
      await engine.record('search-test-2' as any, 'API endpoint testing');
    });

    it('should search shortcuts successfully', async () => {
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'search', 'testing']);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔍 Search results'));
      
      consoleSpy.mockRestore();
    });

    it('should handle no search results', async () => {
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'search', 'nonexistent']);
      
      expect(consoleSpy).toHaveBeenCalledWith('No shortcuts found');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Delete Command', () => {
    beforeEach(async () => {
      await engine.record('delete-test' as any, 'Context to delete for CLI testing');
    });

    it('should delete a shortcut successfully', async () => {
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'delete', 'delete-test']);
      
      expect(consoleSpy).toHaveBeenCalledWith('✅ Deleted shortcut: delete-test');
      
      const shortcuts = await engine.list();
      expect(shortcuts.some(s => s.id === 'delete-test')).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Update Command', () => {
    beforeEach(async () => {
      await engine.record('update-test' as any, 'Original context');
    });

    it('should update a shortcut successfully', async () => {
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'update', 'update-test', 'Updated context']);
      
      expect(consoleSpy).toHaveBeenCalledWith('✅ Updated shortcut: update-test');
      
      const result = await engine.call('update-test' as any);
      expect(result).toBe('Updated context');
      
      consoleSpy.mockRestore();
    });
  });
});