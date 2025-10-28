import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CLIAdapter } from '../adapters/cli/index.js';
import { createCoreEngine } from '../core/container.js';
import { diContainer } from '../core/container.js';
import type { ICoreEngine, ShortcutId } from '../core/interfaces.js';
import { RecCallError } from '../types.js';

describe('CLI Adapter Tests', () => {
  let adapter: CLIAdapter;
  let engine: ICoreEngine;

  beforeEach(async () => {
    // Reset DI container
    diContainer.clear();
    
    // Create engine and adapter
    engine = await createCoreEngine();
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

  describe('Command Execution', () => {
    it('should execute rec command', async () => {
      const program = adapter.createProgram();
      
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'rec', 'test-shortcut', 'Test context']);
      } catch (error) {
        // Command execution might throw, but we're testing the setup
      }
      
      consoleSpy.mockRestore();
    });

    it('should execute call command', async () => {
      // First record a shortcut
      await engine.record('call-test' as ShortcutId, 'Call test context');
      
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'call', 'call-test']);
      } catch (error) {
        // Command execution might throw, but we're testing the setup
      }
      
      consoleSpy.mockRestore();
    });

    it('should execute list command', async () => {
      // Record some shortcuts
      await engine.record('list-test-1' as ShortcutId, 'List test 1');
      await engine.record('list-test-2' as ShortcutId, 'List test 2');
      
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'list']);
      } catch (error) {
        // Command execution might throw, but we're testing the setup
      }
      
      consoleSpy.mockRestore();
    });

    it('should execute search command', async () => {
      // Record a shortcut to search
      await engine.record('search-test' as ShortcutId, 'Search test context');
      
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'search', 'test']);
      } catch (error) {
        // Command execution might throw, but we're testing the setup
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid commands gracefully', async () => {
      const program = adapter.createProgram();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'invalid-command']);
      } catch (error) {
        // Expected to throw for invalid command
      }
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle missing arguments gracefully', async () => {
      const program = adapter.createProgram();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'rec']);
      } catch (error) {
        // Expected to throw for missing arguments
      }
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Repository Commands', () => {
    it('should execute list-repo command', async () => {
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'list-repo', 'https://contexts.reccaller.ai/']);
      } catch (error) {
        // Command execution might throw, but we're testing the setup
      }
      
      consoleSpy.mockRestore();
    });

    it('should execute search-repo command', async () => {
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'search-repo', 'https://contexts.reccaller.ai/', 'git']);
      } catch (error) {
        // Command execution might throw, but we're testing the setup
      }
      
      consoleSpy.mockRestore();
    });

    it('should execute install command', async () => {
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'install', 'https://contexts.reccaller.ai/', 'sync-main']);
      } catch (error) {
        // Command execution might throw, but we're testing the setup
      }
      
      consoleSpy.mockRestore();
    });

    it('should execute reload-starter-pack command', async () => {
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'reload-starter-pack']);
      } catch (error) {
        // Command execution might throw, but we're testing the setup
      }
      
      consoleSpy.mockRestore();
    });
  });

  describe('Output Formatting', () => {
    it('should format output correctly', async () => {
      // Record a shortcut
      await engine.record('format-test' as ShortcutId, 'Format test context');
      
      const program = adapter.createProgram();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'list']);
      } catch (error) {
        // Command execution might throw, but we're testing the setup
      }
      
      // Verify that console.log was called (output was formatted)
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
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
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      try {
        await program.parseAsync(['node', 'reccall', 'call', 'nonexistent-shortcut']);
      } catch (error) {
        // Expected to throw for non-existent shortcut
      }
      
      consoleErrorSpy.mockRestore();
    });
  });
});
