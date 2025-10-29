/**
 * Redis storage backend for RecCall
 * Provides enterprise-grade storage with persistence and scalability
 */

import type { IContextStorage, ShortcutId, Shortcut } from '../core/interfaces.js';
import type { Redis } from 'ioredis';

export interface RedisStorageConfig {
  client?: Redis;
  url?: string;
  keyPrefix?: string;
  ttl?: number;
}

export class RedisStorage implements IContextStorage {
  private client: Redis;
  private keyPrefix: string;
  private ttl: number | undefined;

  constructor(config: RedisStorageConfig) {
    if (config.client) {
      this.client = config.client;
    } else if (config.url) {
      // Lazy import to avoid requiring ioredis if not used
      const Redis = require('ioredis').default;
      this.client = new Redis(config.url);
    } else {
      throw new Error('Redis storage requires either a client instance or connection URL');
    }

    this.keyPrefix = config.keyPrefix || 'reccall:shortcuts:';
    this.ttl = config.ttl;
  }

  private getKey(shortcut: ShortcutId): string {
    return `${this.keyPrefix}${shortcut}`;
  }

  private getIndexKey(): string {
    return `${this.keyPrefix}index`;
  }

  async record(shortcut: ShortcutId, context: string, options?: Record<string, any>): Promise<void> {
    const key = this.getKey(shortcut);
    const now = new Date();
    const shortcutData: any = {
      id: shortcut,
      context,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      category: options?.category,
      description: options?.description,
    };

    const pipeline = this.client.pipeline();
    pipeline.set(key, JSON.stringify(shortcutData));

    if (this.ttl) {
      pipeline.expire(key, this.ttl);
    }

    // Add to index
    pipeline.sadd(this.getIndexKey(), shortcut);

    await pipeline.exec();
  }

  async get(shortcut: ShortcutId): Promise<Shortcut | null> {
    const key = this.getKey(shortcut);
    const data = await this.client.get(key);

    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data) as any;
    return {
      id: parsed.id || parsed.shortcut,
      context: parsed.context,
      createdAt: parsed.createdAt ? new Date(parsed.createdAt) : new Date(),
      updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
      category: parsed.category,
      description: parsed.description,
    } as Shortcut;
  }

  async list(): Promise<Shortcut[]> {
    const indexKey = this.getIndexKey();
    const shortcuts = await this.client.smembers(indexKey);

    if (shortcuts.length === 0) {
      return [];
    }

    const pipeline = this.client.pipeline();
    shortcuts.forEach((shortcut) => {
      pipeline.get(this.getKey(shortcut as ShortcutId));
    });

    const results = await pipeline.exec();
    const shortcutList: Shortcut[] = [];

    if (results) {
      for (const result of results) {
        if (result && result[1]) {
          try {
            shortcutList.push(JSON.parse(result[1] as string) as Shortcut);
          } catch (error) {
            // Skip invalid entries
          }
        }
      }
    }

    return shortcutList;
  }

  async update(shortcut: ShortcutId, context: string, options?: Record<string, any>): Promise<void> {
    const existing = await this.get(shortcut);
    if (!existing) {
      throw new Error(`Shortcut '${shortcut}' not found`);
    }

    const key = this.getKey(shortcut);
    const now = new Date();
    const shortcutData: any = {
      id: shortcut,
      context,
      createdAt: existing.createdAt.toISOString(),
      updatedAt: now.toISOString(),
      category: options?.category ?? existing.category,
      description: options?.description ?? existing.description,
    };

    const pipeline = this.client.pipeline();
    pipeline.set(key, JSON.stringify(shortcutData));

    if (this.ttl) {
      pipeline.expire(key, this.ttl);
    }

    await pipeline.exec();
  }

  async delete(shortcut: ShortcutId): Promise<void> {
    const key = this.getKey(shortcut);
    const indexKey = this.getIndexKey();

    const pipeline = this.client.pipeline();
    pipeline.del(key);
    pipeline.srem(indexKey, shortcut);

    await pipeline.exec();
  }

  async purge(): Promise<void> {
    const indexKey = this.getIndexKey();
    const shortcuts = await this.client.smembers(indexKey);

    if (shortcuts.length > 0) {
      const pipeline = this.client.pipeline();
      shortcuts.forEach((shortcut) => {
        pipeline.del(this.getKey(shortcut as ShortcutId));
      });
      pipeline.del(indexKey);
      await pipeline.exec();
    }
  }

  async exists(shortcut: ShortcutId): Promise<boolean> {
    const key = this.getKey(shortcut);
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  async getByCategory(category: string): Promise<Shortcut[]> {
    const allShortcuts = await this.list();
    return allShortcuts.filter((s) => (s as any).category === category);
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.client.quit();
  }

  /**
   * Get Redis client instance
   */
  getClient(): Redis {
    return this.client;
  }
}
