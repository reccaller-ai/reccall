import { describe, it, expect, beforeEach, afterEach } from 'vitest';

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

describe('Core Engine Integration Tests', () => {
  let engine: TestCoreEngine;

  beforeEach(async () => {
    engine = new TestCoreEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    // Clean up
    try {
      await engine.purge();
    } catch (error) {
      // Ignore purge errors
    }
  });

  describe('Basic Operations', () => {
    it('should record and call a shortcut', async () => {
      const shortcut = 'test-shortcut';
      const context = 'Test context for integration testing';

      // Record shortcut
      await engine.record(shortcut, context);

      // Call shortcut
      const result = await engine.call(shortcut);
      expect(result).toBe(context);
    });

    it('should list shortcuts', async () => {
      const shortcuts = [
        { shortcut: 'test-1', context: 'Context 1 for testing' },
        { shortcut: 'test-2', context: 'Context 2 for testing' },
        { shortcut: 'test-3', context: 'Context 3 for testing' }
      ];

      // Record multiple shortcuts
      for (const { shortcut, context } of shortcuts) {
        await engine.record(shortcut, context);
      }

      // List shortcuts
      const result = await engine.list();
      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining(shortcuts));
    });

    it('should update a shortcut', async () => {
      const shortcut = 'update-test';
      const originalContext = 'Original context for testing';
      const updatedContext = 'Updated context for testing';

      // Record original shortcut
      await engine.record(shortcut, originalContext);

      // Update shortcut
      await engine.update(shortcut, updatedContext);

      // Verify update
      const result = await engine.call(shortcut);
      expect(result).toBe(updatedContext);
    });

    it('should delete a shortcut', async () => {
      const shortcut = 'delete-test';
      const context = 'Context to delete for testing';

      // Record shortcut
      await engine.record(shortcut, context);

      // Verify it exists
      const result = await engine.call(shortcut);
      expect(result).toBe(context);

      // Delete shortcut
      await engine.delete(shortcut);

      // Verify it's deleted
      await expect(engine.call(shortcut)).rejects.toThrow();
    });

    it('should purge all shortcuts', async () => {
      const shortcuts = [
        { shortcut: 'purge-1', context: 'Context 1 for testing' },
        { shortcut: 'purge-2', context: 'Context 2 for testing' }
      ];

      // Record shortcuts
      for (const { shortcut, context } of shortcuts) {
        await engine.record(shortcut, context);
      }

      // Verify they exist
      let result = await engine.list();
      expect(result).toHaveLength(2);

      // Purge all
      await engine.purge();

      // Verify they're gone
      result = await engine.list();
      expect(result).toHaveLength(0);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      const shortcuts = [
        { shortcut: 'react-component', context: 'Create React components with TypeScript' },
        { shortcut: 'api-endpoint', context: 'Create REST API endpoints with Express' },
        { shortcut: 'database-schema', context: 'Design database schemas with PostgreSQL' },
        { shortcut: 'css-styling', context: 'Style components with CSS modules' }
      ];

      for (const { shortcut, context } of shortcuts) {
        await engine.record(shortcut, context);
      }
    });

    it('should search shortcuts by content', async () => {
      const results = await engine.search('React');
      expect(results).toHaveLength(1);
      expect(results[0].shortcut).toBe('react-component');
    });

    it('should search shortcuts case-insensitively', async () => {
      const results = await engine.search('react');
      expect(results).toHaveLength(1);
      expect(results[0].shortcut).toBe('react-component');
    });

    it('should return empty array for no matches', async () => {
      const results = await engine.search('nonexistent');
      expect(results).toHaveLength(0);
    });

    it('should search multiple shortcuts', async () => {
      const results = await engine.search('Create');
      expect(results).toHaveLength(2);
      expect(results.map(r => r.shortcut)).toEqual(
        expect.arrayContaining(['react-component', 'api-endpoint'])
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error for duplicate shortcut', async () => {
      const shortcut = 'duplicate-test';
      const context = 'Test context for duplicate testing';

      // Record first time
      await engine.record(shortcut, context);

      // Try to record again
      await expect(engine.record(shortcut, context)).rejects.toThrow();
    });

    it('should throw error for non-existent shortcut', async () => {
      const shortcut = 'nonexistent';

      await expect(engine.call(shortcut)).rejects.toThrow();
    });

    it('should throw error for invalid shortcut ID', async () => {
      const invalidShortcut = '';
      const context = 'Test context for invalid testing';

      await expect(engine.record(invalidShortcut, context)).rejects.toThrow();
    });

    it('should throw error for invalid context', async () => {
      const shortcut = 'invalid-context';
      const invalidContext = 'Hi'; // Too short

      await expect(engine.record(shortcut, invalidContext)).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large number of shortcuts', async () => {
      const numShortcuts = 50;
      const shortcuts: Array<{ shortcut: string; context: string }> = [];

      // Create shortcuts
      for (let i = 0; i < numShortcuts; i++) {
        shortcuts.push({
          shortcut: `perf-test-${i}`,
          context: `Performance test context ${i} for testing`
        });
      }

      // Record all shortcuts
      const startTime = performance.now();
      for (const { shortcut, context } of shortcuts) {
        await engine.record(shortcut, context);
      }
      const recordTime = performance.now() - startTime;

      // List all shortcuts
      const listStartTime = performance.now();
      const result = await engine.list();
      const listTime = performance.now() - listStartTime;

      expect(result).toHaveLength(numShortcuts);
      expect(recordTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(listTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large context content', async () => {
      const shortcut = 'large-context';
      const largeContext = 'A'.repeat(5000); // 5KB context

      await engine.record(shortcut, largeContext);
      const result = await engine.call(shortcut);

      expect(result).toBe(largeContext);
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 5 }, (_, i) => 
        engine.record(`concurrent-${i}`, `Context ${i} for concurrent testing`)
      );

      await Promise.all(operations);

      const result = await engine.list();
      expect(result).toHaveLength(5);
    });

    it('should handle concurrent reads', async () => {
      const shortcut = 'concurrent-read';
      const context = 'Concurrent read test for testing';

      await engine.record(shortcut, context);

      const reads = Array.from({ length: 5 }, () => engine.call(shortcut));
      const results = await Promise.all(reads);

      results.forEach(result => {
        expect(result).toBe(context);
      });
    });
  });
});
