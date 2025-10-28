/**
 * Cache manager implementation with multi-layer caching
 */

import fs from 'fs/promises';
import path from 'path';
import type { ICacheManager, CacheEntry } from './interfaces.js';
import { configManager } from './config.js';

export class MultiLayerCacheManager implements ICacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private hitCount = 0;
  private missCount = 0;

  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      this.hitCount++;
      return memoryEntry.data as T;
    }

    // Try disk cache
    try {
      const diskEntry = await this.getFromDisk(key);
      if (diskEntry && this.isValid(diskEntry)) {
        // Update memory cache
        this.memoryCache.set(key, diskEntry);
        this.hitCount++;
        return diskEntry.data as T;
      }
    } catch (error) {
      // Disk cache error, continue
    }

    this.missCount++;
    return null;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || configManager.getCacheTtl()
    };

    // Set in memory cache
    this.memoryCache.set(key, entry);

    // Set in disk cache
    try {
      await this.setToDisk(key, entry);
    } catch (error) {
      // Disk cache error, but memory cache is still valid
      console.warn('Failed to write to disk cache:', error);
    }
  }

  async delete(key: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);

    // Remove from disk cache
    try {
      await this.deleteFromDisk(key);
    } catch (error) {
      // Disk cache error, but memory cache is cleared
      console.warn('Failed to delete from disk cache:', error);
    }
  }

  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear disk cache
    try {
      const cacheDir = configManager.getCacheDirectory();
      const files = await fs.readdir(cacheDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(cacheDir, file));
        }
      }
    } catch (error) {
      console.warn('Failed to clear disk cache:', error);
    }
  }

  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  async getStats(): Promise<{ size: number; hitRate: number; missRate: number }> {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? this.hitCount / total : 0;
    const missRate = total > 0 ? this.missCount / total : 0;

    return {
      size: this.memoryCache.size,
      hitRate,
      missRate
    };
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get entry from disk cache
   */
  private async getFromDisk(key: string): Promise<CacheEntry | null> {
    try {
      const cacheDir = configManager.getCacheDirectory();
      const cacheFile = path.join(cacheDir, `${this.encodeKey(key)}.json`);
      const data = await fs.readFile(cacheFile, 'utf-8');
      return JSON.parse(data) as CacheEntry;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set entry to disk cache
   */
  private async setToDisk(key: string, entry: CacheEntry): Promise<void> {
    const cacheDir = configManager.getCacheDirectory();
    const cacheFile = path.join(cacheDir, `${this.encodeKey(key)}.json`);
    await fs.writeFile(cacheFile, JSON.stringify(entry, null, 2));
  }

  /**
   * Delete entry from disk cache
   */
  private async deleteFromDisk(key: string): Promise<void> {
    try {
      const cacheDir = configManager.getCacheDirectory();
      const cacheFile = path.join(cacheDir, `${this.encodeKey(key)}.json`);
      await fs.unlink(cacheFile);
    } catch (error) {
      // File might not exist, ignore error
    }
  }

  /**
   * Encode key for filesystem use
   */
  private encodeKey(key: string): string {
    return Buffer.from(key).toString('base64').replace(/[/+=]/g, '_');
  }
}
