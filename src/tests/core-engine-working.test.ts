import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemStorage } from '../storage-backends/filesystem.js';
import { HttpRepositoryClient } from '../core/repository.js';
import { MultiLayerCacheManager } from '../core/cache.js';
import { RecipeValidator } from '../core/validator.js';
import { CoreEngine } from '../core/engine.js';
import type { ShortcutId } from '../types.js';

describe('Core Engine Integration Tests', () => {
  let engine: CoreEngine;
  let storage: FileSystemStorage;
  let repository: HttpRepositoryClient;
  let cache: MultiLayerCacheManager;
  let validator: RecipeValidator;

  beforeEach(async () => {
    // Create instances directly without DI container
    storage = new FileSystemStorage();
    repository = new HttpRepositoryClient();
    cache = new MultiLayerCacheManager();
    validator = new RecipeValidator();
    
    engine = new CoreEngine(storage, repository, cache, validator);
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
      const shortcut = 'test-shortcut' as ShortcutId;
      const context = 'Test context for integration testing';

      // Record shortcut
      await engine.record(shortcut, context);

      // Call shortcut
      const result = await engine.call(shortcut);
      expect(result).toBe(context);
    });

    it('should list shortcuts', async () => {
      const shortcuts = [
        { shortcut: 'test-1' as ShortcutId, context: 'Context 1' },
        { shortcut: 'test-2' as ShortcutId, context: 'Context 2' },
        { shortcut: 'test-3' as ShortcutId, context: 'Context 3' }
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
      const shortcut = 'update-test' as ShortcutId;
      const originalContext = 'Original context';
      const updatedContext = 'Updated context';

      // Record original shortcut
      await engine.record(shortcut, originalContext);

      // Update shortcut
      await engine.update(shortcut, updatedContext);

      // Verify update
      const result = await engine.call(shortcut);
      expect(result).toBe(updatedContext);
    });

    it('should delete a shortcut', async () => {
      const shortcut = 'delete-test' as ShortcutId;
      const context = 'Context to delete';

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
        { shortcut: 'purge-1' as ShortcutId, context: 'Context 1' },
        { shortcut: 'purge-2' as ShortcutId, context: 'Context 2' }
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
        { shortcut: 'react-component' as ShortcutId, context: 'Create React components with TypeScript' },
        { shortcut: 'api-endpoint' as ShortcutId, context: 'Create REST API endpoints with Express' },
        { shortcut: 'database-schema' as ShortcutId, context: 'Design database schemas with PostgreSQL' },
        { shortcut: 'css-styling' as ShortcutId, context: 'Style components with CSS modules' }
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
      const shortcut = 'duplicate-test' as ShortcutId;
      const context = 'Test context';

      // Record first time
      await engine.record(shortcut, context);

      // Try to record again
      await expect(engine.record(shortcut, context)).rejects.toThrow();
    });

    it('should throw error for non-existent shortcut', async () => {
      const shortcut = 'nonexistent' as ShortcutId;

      await expect(engine.call(shortcut)).rejects.toThrow();
    });

    it('should throw error for invalid shortcut ID', async () => {
      const invalidShortcut = '' as ShortcutId;
      const context = 'Test context';

      await expect(engine.record(invalidShortcut, context)).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large number of shortcuts', async () => {
      const numShortcuts = 50; // Reduced for faster tests
      const shortcuts: Array<{ shortcut: ShortcutId; context: string }> = [];

      // Create shortcuts
      for (let i = 0; i < numShortcuts; i++) {
        shortcuts.push({
          shortcut: `perf-test-${i}` as ShortcutId,
          context: `Performance test context ${i}`
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
      const shortcut = 'large-context' as ShortcutId;
      const largeContext = 'A'.repeat(5000); // 5KB context

      await engine.record(shortcut, largeContext);
      const result = await engine.call(shortcut);

      expect(result).toBe(largeContext);
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent operations', async () => {
      const operations = Array.from({ length: 5 }, (_, i) => 
        engine.record(`concurrent-${i}` as ShortcutId, `Context ${i}`)
      );

      await Promise.all(operations);

      const result = await engine.list();
      expect(result).toHaveLength(5);
    });

    it('should handle concurrent reads', async () => {
      const shortcut = 'concurrent-read' as ShortcutId;
      const context = 'Concurrent read test';

      await engine.record(shortcut, context);

      const reads = Array.from({ length: 5 }, () => engine.call(shortcut));
      const results = await Promise.all(reads);

      results.forEach(result => {
        expect(result).toBe(context);
      });
    });
  });
});
