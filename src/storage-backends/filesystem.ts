/**
 * Context storage implementation using filesystem
 */

import 'reflect-metadata';
import { injectable } from 'tsyringe';
import fs from 'fs/promises';
import path from 'path';
import type { IContextStorage, Shortcut } from '../core/interfaces.js';
import { StorageError } from '../types.js';
import type { ShortcutId } from '../types.js';
import { configManager } from '../core/config.js';

@injectable()
export class FileSystemStorage implements IContextStorage {
  private shortcutsCache: Record<string, Shortcut> | null = null;
  private cacheTimestamp: number = 0;
  private readonly memoryTtl: number;
  private writeQueue: Array<() => Promise<void>> = [];
  private isWriting = false;
  private pendingWrite: NodeJS.Timeout | null = null;

  constructor() {
    this.memoryTtl = configManager.getMemoryTtl();
  }

  async record(shortcut: ShortcutId, context: string, options?: Record<string, any>): Promise<void> {
    const shortcuts = await this.loadShortcutsCached();
    
    const now = new Date();
    shortcuts[shortcut] = {
      id: shortcut,
      context,
      createdAt: shortcuts[shortcut]?.createdAt || now,
      updatedAt: now,
      category: options?.category,
      description: options?.description
    };

    await this.saveShortcuts(shortcuts);
  }

  async get(shortcut: ShortcutId): Promise<Shortcut | null> {
    const shortcuts = await this.loadShortcutsCached();
    return shortcuts[shortcut] || null;
  }

  async list(): Promise<Shortcut[]> {
    const shortcuts = await this.loadShortcutsCached();
    return Object.values(shortcuts);
  }

  async update(shortcut: ShortcutId, context: string, options?: Record<string, any>): Promise<void> {
    const shortcuts = await this.loadShortcutsCached();
    
    if (!shortcuts[shortcut]) {
      throw new StorageError(`Shortcut '${shortcut}' does not exist`);
    }

    shortcuts[shortcut] = {
      ...shortcuts[shortcut],
      context,
      updatedAt: new Date(),
      category: options?.category ?? shortcuts[shortcut].category,
      description: options?.description ?? shortcuts[shortcut].description
    };

    await this.saveShortcuts(shortcuts);
  }

  async delete(shortcut: ShortcutId): Promise<void> {
    const shortcuts = await this.loadShortcutsCached();
    
    if (!shortcuts[shortcut]) {
      return; // Idempotent operation
    }

    delete shortcuts[shortcut];
    await this.saveShortcuts(shortcuts);
  }

  async purge(): Promise<void> {
    await this.saveShortcuts({});
  }

  async exists(shortcut: ShortcutId): Promise<boolean> {
    const shortcuts = await this.loadShortcutsCached();
    return shortcut in shortcuts;
  }

  async getByCategory(category: string): Promise<Shortcut[]> {
    const shortcuts = await this.loadShortcutsCached();
    return Object.values(shortcuts).filter(s => s.category === category);
  }

  /**
   * Load shortcuts from storage with caching
   */
  private async loadShortcutsCached(): Promise<Record<string, Shortcut>> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.shortcutsCache && (now - this.cacheTimestamp) < this.memoryTtl) {
      return this.shortcutsCache;
    }
    
    // Load from file and cache
    this.shortcutsCache = await this.loadShortcuts();
    this.cacheTimestamp = now;
    return this.shortcutsCache;
  }

  /**
   * Load shortcuts from storage file
   */
  private async loadShortcuts(): Promise<Record<string, Shortcut>> {
    try {
      const storagePath = configManager.getStoragePath();
      const data = await fs.readFile(storagePath, 'utf-8');
      const rawShortcuts = JSON.parse(data);
      
      // Convert legacy format to new format
      const shortcuts: Record<string, Shortcut> = {};
      for (const [key, value] of Object.entries(rawShortcuts)) {
        if (typeof value === 'string') {
          // Legacy format: { shortcut: context }
          shortcuts[key] = {
            id: key as ShortcutId,
            context: value as string,
            createdAt: new Date(),
            updatedAt: new Date()
          };
        } else if (typeof value === 'object' && value !== null) {
          // New format: { shortcut: Shortcut }
          shortcuts[key] = value as Shortcut;
        }
      }
      
      return shortcuts;
    } catch (error) {
      // File doesn't exist or is invalid, return empty object
      return {};
    }
  }

  /**
   * Save shortcuts to storage with atomic write and batching
   * Batches multiple writes within a short time window to reduce I/O
   */
  private async saveShortcuts(shortcuts: Record<string, Shortcut>): Promise<void> {
    // Update cache immediately
    this.shortcutsCache = shortcuts;
    this.cacheTimestamp = Date.now();

    // Queue the write operation for batching
    return new Promise((resolve, reject) => {
      this.writeQueue.push(async () => {
        try {
          const storagePath = configManager.getStoragePath();
          const tempFile = storagePath + '.tmp';
          
          // Use atomic write to prevent corruption
          await fs.writeFile(tempFile, JSON.stringify(shortcuts, null, 2), 'utf8');
          await fs.rename(tempFile, storagePath);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      // Batch writes: if no write is pending, schedule one
      if (!this.isWriting && !this.pendingWrite) {
        this.pendingWrite = setTimeout(() => {
          this.flushWriteQueue().catch(reject);
        }, 50); // Batch writes within 50ms window
      }
    });
  }

  /**
   * Flush all pending writes in the queue
   */
  private async flushWriteQueue(): Promise<void> {
    if (this.isWriting || this.writeQueue.length === 0) {
      return;
    }

    this.isWriting = true;
    if (this.pendingWrite) {
      clearTimeout(this.pendingWrite);
      this.pendingWrite = null;
    }

    // Get the latest write (most recent shortcuts data)
    const latestWrite = this.writeQueue[this.writeQueue.length - 1];
    if (!latestWrite) {
      this.isWriting = false;
      return;
    }
    
    this.writeQueue = [];

    try {
      await latestWrite();
    } catch (error) {
      throw new StorageError(`Failed to save shortcuts: ${error}`, error as Error);
    } finally {
      this.isWriting = false;
    }
  }

  /**
   * Ensure all writes are flushed before shutdown
   */
  async flush(): Promise<void> {
    if (this.pendingWrite) {
      clearTimeout(this.pendingWrite);
      this.pendingWrite = null;
    }
    await this.flushWriteQueue();
  }
}
