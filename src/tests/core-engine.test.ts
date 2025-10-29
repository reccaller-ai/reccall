/**
 * Comprehensive tests for CoreEngine
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CoreEngine } from '../core/engine.js';
import type { ShortcutId } from '../types.js';
import { RecCallError } from '../types.js';
import { MockStorage, MockCacheManager, MockValidator, MockRepositoryClient } from './test-utils.js';
import { configManager } from '../core/config.js';
import { telemetryManager } from '../core/telemetry.js';

// Mock config and telemetry
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

describe('CoreEngine', () => {
  let engine: CoreEngine;
  let storage: MockStorage;
  let cache: MockCacheManager;
  let validator: MockValidator;
  let repository: MockRepositoryClient;

  beforeEach(() => {
    storage = new MockStorage();
    cache = new MockCacheManager();
    validator = new MockValidator();
    repository = new MockRepositoryClient();
    engine = new CoreEngine(storage, repository, cache, validator);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await engine.initialize();
      expect(configManager.initialize).toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      await engine.initialize();
      await engine.initialize();
      expect(configManager.initialize).toHaveBeenCalledTimes(1);
    });

    it('should initialize with custom config', async () => {
      await engine.initialize({ repository: { enabled: false } });
      expect(configManager.initialize).toHaveBeenCalledWith({ repository: { enabled: false } });
    });
  });

  describe('Record Operations', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should record a shortcut successfully', async () => {
      const shortcut = 'test-shortcut' as ShortcutId;
      const context = 'Test context for integration testing';

      await engine.record(shortcut, context);

      const result = await engine.call(shortcut);
      expect(result).toBe(context);
    });

    it('should throw error for duplicate shortcut', async () => {
      const shortcut = 'duplicate-test' as ShortcutId;
      const context = 'Test context for duplicate testing';

      await engine.record(shortcut, context);

      await expect(engine.record(shortcut, context)).rejects.toThrow(RecCallError);
      await expect(engine.record(shortcut, context)).rejects.toThrow('already exists');
    });

    it('should throw error for invalid shortcut ID', async () => {
      const invalidShortcut = '' as ShortcutId;
      const context = 'Test context for invalid testing';

      await expect(engine.record(invalidShortcut, context)).rejects.toThrow(RecCallError);
      await expect(engine.record(invalidShortcut, context)).rejects.toThrow('Invalid shortcut');
    });

    it('should throw error for invalid context', async () => {
      const shortcut = 'invalid-context' as ShortcutId;
      const invalidContext = 'Hi'; // Too short

      await expect(engine.record(shortcut, invalidContext)).rejects.toThrow(RecCallError);
      await expect(engine.record(shortcut, invalidContext)).rejects.toThrow('Invalid context');
    });

    it('should update metrics after recording', async () => {
      const shortcut = 'metrics-test' as ShortcutId;
      const context = 'Test context for metrics testing';

      await engine.record(shortcut, context);

      expect(telemetryManager.updateMetrics).toHaveBeenCalledWith(
        expect.objectContaining({ shortcutsCount: expect.any(Number) })
      );
      expect(telemetryManager.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'shortcut.recorded' })
      );
    });
  });

  describe('Call Operations', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.record('call-test' as ShortcutId, 'Test context for call testing');
    });

    it('should call a shortcut successfully', async () => {
      const result = await engine.call('call-test' as ShortcutId);
      expect(result).toBe('Test context for call testing');
    });

    it('should throw error for non-existent shortcut', async () => {
      await expect(engine.call('nonexistent' as ShortcutId)).rejects.toThrow(RecCallError);
      await expect(engine.call('nonexistent' as ShortcutId)).rejects.toThrow('not found');
    });
  });

  describe('List Operations', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.record('list-1' as ShortcutId, 'Context 1 for list testing');
      await engine.record('list-2' as ShortcutId, 'Context 2 for list testing');
      await engine.record('list-3' as ShortcutId, 'Context 3 for list testing');
    });

    it('should list all shortcuts', async () => {
      const shortcuts = await engine.list();
      expect(shortcuts.length).toBeGreaterThanOrEqual(3);
      expect(shortcuts.some(s => s.id === 'list-1')).toBe(true);
      expect(shortcuts.some(s => s.id === 'list-2')).toBe(true);
      expect(shortcuts.some(s => s.id === 'list-3')).toBe(true);
    });
  });

  describe('Update Operations', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.record('update-test' as ShortcutId, 'Original context for testing');
    });

    it('should update a shortcut successfully', async () => {
      const updatedContext = 'Updated context for testing';
      await engine.update('update-test' as ShortcutId, updatedContext);

      const result = await engine.call('update-test' as ShortcutId);
      expect(result).toBe(updatedContext);
    });

    it('should throw error for non-existent shortcut update', async () => {
      await expect(engine.update('nonexistent' as ShortcutId, 'Context')).rejects.toThrow();
    });

    it('should throw error for invalid context in update', async () => {
      await expect(engine.update('update-test' as ShortcutId, 'Hi')).rejects.toThrow(RecCallError);
    });
  });

  describe('Delete Operations', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.record('delete-test' as ShortcutId, 'Context to delete for testing');
    });

    it('should delete a shortcut successfully', async () => {
      await engine.delete('delete-test' as ShortcutId);
      await expect(engine.call('delete-test' as ShortcutId)).rejects.toThrow();
    });

    it('should throw error for non-existent shortcut deletion', async () => {
      await expect(engine.delete('nonexistent' as ShortcutId)).rejects.toThrow();
    });
  });

  describe('Purge Operations', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.record('purge-1' as ShortcutId, 'Context 1 for purge testing');
      await engine.record('purge-2' as ShortcutId, 'Context 2 for purge testing');
    });

    it('should purge all shortcuts', async () => {
      await engine.purge();
      const shortcuts = await engine.list();
      expect(shortcuts.length).toBe(0);
    });
  });

  describe('Search Operations', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.record('react-component' as ShortcutId, 'Create React components with TypeScript');
      await engine.record('api-endpoint' as ShortcutId, 'Create REST API endpoints with Express');
      await engine.record('database-schema' as ShortcutId, 'Design database schemas with PostgreSQL');
    });

    it('should search shortcuts by content', async () => {
      const results = await engine.search('React');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('react-component');
    });

    it('should search case-insensitively', async () => {
      const results = await engine.search('react');
      expect(results.length).toBe(1);
    });

    it('should return empty array for no matches', async () => {
      const results = await engine.search('nonexistent');
      expect(results.length).toBe(0);
    });

    it('should search multiple shortcuts', async () => {
      const results = await engine.search('Create');
      expect(results.length).toBe(2);
    });
  });

  describe('Recipe Operations', () => {
    beforeEach(async () => {
      await engine.initialize();
      repository.setRecipe('test-recipe', {
        shortcut: 'test-recipe' as ShortcutId,
        context: 'Test recipe context',
        name: 'Test Recipe',
        description: 'A test recipe',
        category: 'testing',
      });
    });

    it('should list recipes from repository', async () => {
      const recipes = await engine.listRecipes();
      expect(Array.isArray(recipes)).toBe(true);
    });

    it('should search recipes in repository', async () => {
      const results = await engine.searchRecipes('test');
      expect(Array.isArray(results)).toBe(true);
    });

    it('should install recipe from repository', async () => {
      repository.setRecipe('install-test', {
        shortcut: 'install-test' as ShortcutId,
        context: 'Installed recipe context',
        name: 'Install Test',
      });

      await engine.installRecipe('https://test.reccaller.ai' as any, 'install-test' as ShortcutId);
      
      const result = await engine.call('install-test' as ShortcutId);
      expect(result).toBe('Installed recipe context');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await engine.initialize();
      await engine.record('stats-1' as ShortcutId, 'Context 1 for stats testing');
      await engine.record('stats-2' as ShortcutId, 'Context 2 for stats testing');
    });

    it('should return statistics', async () => {
      const stats = await engine.getStats();
      expect(stats).toHaveProperty('shortcutsCount');
      expect(stats).toHaveProperty('cacheStats');
      expect(stats).toHaveProperty('repositoryStats');
      expect(stats.shortcutsCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when not initialized', async () => {
      await expect(engine.record('test' as ShortcutId, 'Context')).rejects.toThrow();
    });

    it('should handle storage errors gracefully', async () => {
      await engine.initialize();
      
      // Mock storage to throw error
      vi.spyOn(storage, 'record').mockRejectedValueOnce(new Error('Storage error'));

      await expect(engine.record('error-test' as ShortcutId, 'Context')).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle very long context', async () => {
      const longContext = 'A'.repeat(5000);
      await engine.record('long-context' as ShortcutId, longContext);
      
      const result = await engine.call('long-context' as ShortcutId);
      expect(result.length).toBe(5000);
    });

    it('should handle special characters in shortcut', async () => {
      const shortcut = 'test-shortcut-123' as ShortcutId;
      await engine.record(shortcut, 'Context');
      
      const result = await engine.call(shortcut);
      expect(result).toBe('Context');
    });
  });
});