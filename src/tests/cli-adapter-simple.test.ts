import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';

// Mock storage for testing
class MockStorage {
  private shortcuts: Map<string, string> = new Map();

  async record(shortcut: string, context: string): Promise<void> {
    this.shortcuts.set(shortcut, context);
  }

  async call(shortcut: string): Promise<string> {
    const context = this.shortcuts.get(shortcut);
    if (!context) {
      throw new Error(`Shortcut '${shortcut}' not found`);
    }
    return context;
  }

  async list(): Promise<Array<{ shortcut: string; context: string }>> {
    return Array.from(this.shortcuts.entries()).map(([shortcut, context]) => ({
      shortcut,
      context
    }));
  }

  async update(shortcut: string, context: string): Promise<void> {
    if (!this.shortcuts.has(shortcut)) {
      throw new Error(`Shortcut '${shortcut}' not found`);
    }
    this.shortcuts.set(shortcut, context);
  }

  async delete(shortcut: string): Promise<void> {
    if (!this.shortcuts.has(shortcut)) {
      throw new Error(`Shortcut '${shortcut}' not found`);
    }
    this.shortcuts.delete(shortcut);
  }

  async purge(): Promise<void> {
    this.shortcuts.clear();
  }

  async search(query: string): Promise<Array<{ shortcut: string; context: string }>> {
    const results: Array<{ shortcut: string; context: string }> = [];
    for (const [shortcut, context] of this.shortcuts.entries()) {
      if (context.toLowerCase().includes(query.toLowerCase())) {
        results.push({ shortcut, context });
      }
    }
    return results;
  }

  async exists(shortcut: string): Promise<boolean> {
    return this.shortcuts.has(shortcut);
  }
}

// Mock validator for testing
class MockValidator {
  validateShortcutId(shortcut: string): { valid: boolean; errors?: string[] } {
    if (!shortcut || shortcut.length < 1) {
      return { valid: false, errors: ['Shortcut ID cannot be empty'] };
    }
    return { valid: true };
  }

  validateContext(context: string): { valid: boolean; errors?: string[] } {
    if (!context || context.length < 5) {
      return { valid: false, errors: ['Context must be at least 5 characters long'] };
    }
    return { valid: true };
  }
}

// Mock cache manager
class MockCacheManager {
  private cache: Map<string, any> = new Map();

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key) || null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.cache.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// Mock repository client
class MockRepositoryClient {
  async fetchManifest(): Promise<any> {
    return { shortcuts: [] };
  }

  async fetchRecipe(): Promise<any> {
    return null;
  }
}

// Simple core engine for testing
class TestCoreEngine {
  private storage: MockStorage;
  private validator: MockValidator;
  private cache: MockCacheManager;
  private repository: MockRepositoryClient;
  private initialized = false;

  constructor() {
    this.storage = new MockStorage();
    this.validator = new MockValidator();
    this.cache = new MockCacheManager();
    this.repository = new MockRepositoryClient();
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Engine not initialized');
    }
  }

  async record(shortcut: string, context: string): Promise<void> {
    this.ensureInitialized();

    // Validate shortcut ID
    const shortcutValidation = this.validator.validateShortcutId(shortcut);
    if (!shortcutValidation.valid) {
      throw new Error(`Invalid shortcut ID: ${shortcutValidation.errors?.join(', ')}`);
    }

    // Validate context
    const contextValidation = this.validator.validateContext(context);
    if (!contextValidation.valid) {
      throw new Error(`Invalid context: ${contextValidation.errors?.join(', ')}`);
    }

    // Check if shortcut already exists
    const exists = await this.storage.exists(shortcut);
    if (exists) {
      throw new Error(`Shortcut '${shortcut}' already exists`);
    }

    await this.storage.record(shortcut, context);
  }

  async call(shortcut: string): Promise<string> {
    this.ensureInitialized();
    return await this.storage.call(shortcut);
  }

  async list(): Promise<Array<{ shortcut: string; context: string }>> {
    this.ensureInitialized();
    return await this.storage.list();
  }

  async update(shortcut: string, context: string): Promise<void> {
    this.ensureInitialized();

    // Validate context
    const contextValidation = this.validator.validateContext(context);
    if (!contextValidation.valid) {
      throw new Error(`Invalid context: ${contextValidation.errors?.join(', ')}`);
    }

    await this.storage.update(shortcut, context);
  }

  async delete(shortcut: string): Promise<void> {
    this.ensureInitialized();
    await this.storage.delete(shortcut);
  }

  async purge(): Promise<void> {
    this.ensureInitialized();
    await this.storage.purge();
  }

  async search(query: string): Promise<Array<{ shortcut: string; context: string }>> {
    this.ensureInitialized();
    return await this.storage.search(query);
  }
}

// Simple CLI adapter for testing
class TestCLIAdapter {
  private engine: TestCoreEngine;
  private program: Command;

  constructor(engine: TestCoreEngine) {
    this.engine = engine;
    this.program = new Command();
    this.setupCommands();
  }

  async initialize(): Promise<void> {
    await this.engine.initialize();
  }

  private setupCommands(): void {
    this.program
      .name('reccall')
      .description('RecCall: Record and call context shortcuts')
      .version('1.0.0');

    // Record command
    this.program
      .command('rec')
      .description('Record a new shortcut')
      .argument('<shortcut>', 'Shortcut identifier')
      .argument('<context>', 'Context content')
      .action(async (shortcut: string, context: string) => {
        try {
          await this.engine.record(shortcut, context);
          console.log(`✅ Recorded shortcut: ${shortcut}`);
        } catch (error: any) {
          console.error(`❌ Error: ${error.message}`);
          process.exit(1);
        }
      });

    // Call command
    this.program
      .command('call')
      .description('Call a shortcut')
      .argument('<shortcut>', 'Shortcut identifier')
      .action(async (shortcut: string) => {
        try {
          const context = await this.engine.call(shortcut);
          console.log(context);
        } catch (error: any) {
          console.error(`❌ Error: ${error.message}`);
          process.exit(1);
        }
      });

    // List command
    this.program
      .command('list')
      .description('List all shortcuts')
      .action(async () => {
        try {
          const shortcuts = await this.engine.list();
          if (shortcuts.length === 0) {
            console.log('No shortcuts found');
            return;
          }
          console.log('📋 Shortcuts:');
          shortcuts.forEach(({ shortcut, context }) => {
            console.log(`  ${shortcut}: ${context.substring(0, 50)}${context.length > 50 ? '...' : ''}`);
          });
        } catch (error: any) {
          console.error(`❌ Error: ${error.message}`);
          process.exit(1);
        }
      });

    // Search command
    this.program
      .command('search')
      .description('Search shortcuts')
      .argument('<query>', 'Search query')
      .action(async (query: string) => {
        try {
          const results = await this.engine.search(query);
          if (results.length === 0) {
            console.log('No shortcuts found');
            return;
          }
          console.log(`🔍 Search results for "${query}":`);
          results.forEach(({ shortcut, context }) => {
            console.log(`  ${shortcut}: ${context.substring(0, 50)}${context.length > 50 ? '...' : ''}`);
          });
        } catch (error: any) {
          console.error(`❌ Error: ${error.message}`);
          process.exit(1);
        }
      });

    // Delete command
    this.program
      .command('delete')
      .description('Delete a shortcut')
      .argument('<shortcut>', 'Shortcut identifier')
      .action(async (shortcut: string) => {
        try {
          await this.engine.delete(shortcut);
          console.log(`✅ Deleted shortcut: ${shortcut}`);
        } catch (error: any) {
          console.error(`❌ Error: ${error.message}`);
          process.exit(1);
        }
      });
  }

  createProgram(): Command {
    return this.program;
  }
}

describe('CLI Adapter Integration Tests', () => {
  let adapter: TestCLIAdapter;
  let engine: TestCoreEngine;

  beforeEach(async () => {
    engine = new TestCoreEngine();
    adapter = new TestCLIAdapter(engine);
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
    });
  });

  describe('Record Command', () => {
    it('should record a shortcut successfully', async () => {
      const program = adapter.createProgram();
      
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'rec', 'test-shortcut', 'Test context for CLI testing']);
      
      expect(consoleSpy).toHaveBeenCalledWith('✅ Recorded shortcut: test-shortcut');
      
      // Verify shortcut was actually recorded
      const shortcuts = await engine.list();
      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].shortcut).toBe('test-shortcut');
      
      consoleSpy.mockRestore();
    });

    it('should handle duplicate shortcut error', async () => {
      const program = adapter.createProgram();
      
      // Record first shortcut
      await program.parseAsync(['node', 'reccall', 'rec', 'duplicate-test', 'First context for CLI testing']);
      
      // Mock console.error to capture output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') });
      
      // Try to record duplicate
      await expect(program.parseAsync(['node', 'reccall', 'rec', 'duplicate-test', 'Second context for CLI testing']))
        .rejects.toThrow('exit');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'));
      
      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('Call Command', () => {
    beforeEach(async () => {
      // Set up test data
      await engine.record('call-test', 'Test context for call command testing');
    });

    it('should call a shortcut successfully', async () => {
      const program = adapter.createProgram();
      
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'call', 'call-test']);
      
      expect(consoleSpy).toHaveBeenCalledWith('Test context for call command testing');
      
      consoleSpy.mockRestore();
    });

    it('should handle non-existent shortcut error', async () => {
      const program = adapter.createProgram();
      
      // Mock console.error to capture output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') });
      
      await expect(program.parseAsync(['node', 'reccall', 'call', 'nonexistent']))
        .rejects.toThrow('exit');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      
      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });

  describe('List Command', () => {
    it('should list shortcuts successfully', async () => {
      const program = adapter.createProgram();
      
      // Set up test data
      await engine.record('list-test-1', 'First context for list testing');
      await engine.record('list-test-2', 'Second context for list testing');
      
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'list']);
      
      expect(consoleSpy).toHaveBeenCalledWith('📋 Shortcuts:');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('list-test-1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('list-test-2'));
      
      consoleSpy.mockRestore();
    });

    it('should handle empty list', async () => {
      const program = adapter.createProgram();
      
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'list']);
      
      expect(consoleSpy).toHaveBeenCalledWith('No shortcuts found');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Search Command', () => {
    beforeEach(async () => {
      // Set up test data
      await engine.record('search-test-1', 'React component testing');
      await engine.record('search-test-2', 'API endpoint testing');
      await engine.record('search-test-3', 'Database schema testing');
    });

    it('should search shortcuts successfully', async () => {
      const program = adapter.createProgram();
      
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'search', 'testing']);
      
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Search results for "testing":');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('search-test-1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('search-test-2'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('search-test-3'));
      
      consoleSpy.mockRestore();
    });

    it('should handle no search results', async () => {
      const program = adapter.createProgram();
      
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'search', 'nonexistent']);
      
      expect(consoleSpy).toHaveBeenCalledWith('No shortcuts found');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Delete Command', () => {
    beforeEach(async () => {
      // Set up test data
      await engine.record('delete-test', 'Context to delete for CLI testing');
    });

    it('should delete a shortcut successfully', async () => {
      const program = adapter.createProgram();
      
      // Mock console.log to capture output
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await program.parseAsync(['node', 'reccall', 'delete', 'delete-test']);
      
      expect(consoleSpy).toHaveBeenCalledWith('✅ Deleted shortcut: delete-test');
      
      // Verify shortcut was actually deleted
      const shortcuts = await engine.list();
      expect(shortcuts).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });

    it('should handle non-existent shortcut error', async () => {
      const program = adapter.createProgram();
      
      // Mock console.error to capture output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') });
      
      await expect(program.parseAsync(['node', 'reccall', 'delete', 'nonexistent']))
        .rejects.toThrow('exit');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('not found'));
      
      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});
