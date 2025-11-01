/**
 * Comprehensive tests for MultiLayerCacheManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultiLayerCacheManager } from '../core/cache.js';
import { configManager } from '../core/config.js';
import { vi } from 'vitest';

vi.mock('../core/config.js', () => ({
  configManager: {
    getCacheTtl: vi.fn(() => 3600 * 1000), // 1 hour in milliseconds
    getMemoryTtl: vi.fn(() => 5 * 1000), // 5 seconds in milliseconds
    getCacheDirectory: vi.fn(() => '/tmp/reccall-cache'),
  },
}));

describe('MultiLayerCacheManager', () => {
  let cache: MultiLayerCacheManager;

  beforeEach(async () => {
    // Ensure cache directory exists
    const fs = await import('fs/promises');
    const cacheDir = '/tmp/reccall-cache';
    await fs.mkdir(cacheDir, { recursive: true });
    
    cache = new MultiLayerCacheManager();
    await cache.clear();
  });

  describe('get and set', () => {
    it('should store and retrieve data', async () => {
      await cache.set('test-key', { data: 'test-value' });
      const result = await cache.get('test-key');
      expect(result).toEqual({ data: 'test-value' });
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should respect TTL', async () => {
      await cache.set('ttl-key', 'value', 1); // 1 second TTL
      const result1 = await cache.get('ttl-key');
      expect(result1).toBe('value');
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      const result2 = await cache.get('ttl-key');
      expect(result2).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete cached data', async () => {
      await cache.set('delete-key', 'value');
      await cache.delete('delete-key');
      const result = await cache.get('delete-key');
      expect(result).toBeNull();
    });

    it('should handle deleting non-existent key', async () => {
      await expect(cache.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all cached data', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await cache.set('has-key', 'value');
      expect(await cache.has('has-key')).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      expect(await cache.has('non-existent')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await cache.set('stats-key', 'value');
      const stats = await cache.getStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('missRate');
      expect(typeof stats.size).toBe('number');
    });
  });
});
