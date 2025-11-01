/**
 * Context storage implementation for Universal Context Management System
 * Stores contexts in filesystem with index for fast lookups
 */

import 'reflect-metadata';
import { injectable } from 'tsyringe';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Context, ContextSource, ContextType } from '../types/context.js';
import { validateContext } from '../types/context.js';
import { StorageError } from '../../types.js';
import { configManager } from '../config.js';

interface ContextIndex {
  version: string;
  contexts: Array<{
    id: string;
    name: string;
    type: ContextType;
    source: ContextSource;
    tags: string[];
    category?: string;
    description?: string;
    updatedAt: Date;
  }>;
}

@injectable()
export class ContextStore {
  private basePath: string;
  private index: Map<string, Context> = new Map();
  private indexLoaded = false;

  constructor(basePath?: string) {
    this.basePath = basePath || path.join(os.homedir(), '.reccall', 'contexts');
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    const dirs = [
      this.basePath,
      path.join(this.basePath, 'local'),
      path.join(this.basePath, 'global'),
      path.join(this.basePath, 'remote'),
    ];

    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        throw new StorageError(`Failed to create directory ${dir}`, error as Error);
      }
    }

    await this.loadIndex();
  }

  /**
   * Save a context
   */
  async save(context: Context): Promise<void> {
    // Validate context
    this.validate(context);

    // Determine storage path
    const storagePath = this.getStoragePath(context);
    const dirPath = path.dirname(storagePath);

    // Ensure directory exists
    await fs.mkdir(dirPath, { recursive: true });

    // Serialize to JSON
    const json = JSON.stringify(context, null, 2);

    // Write file atomically (write to temp then rename)
    const tempPath = `${storagePath}.tmp`;
    try {
      await fs.writeFile(tempPath, json, 'utf-8');
      await fs.rename(tempPath, storagePath);
    } catch (error) {
      // Clean up temp file if rename fails
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw new StorageError(`Failed to save context ${context.id}`, error as Error);
    }

    // Update index
    this.index.set(context.id, context);
    await this.saveIndex();
  }

  /**
   * Get context by ID
   */
  async getById(id: string): Promise<Context | null> {
    // Check index first
    const meta = this.index.get(id);
    if (meta) {
      return await this.loadContext(meta);
    }

    // Not found in index, try searching files
    return null;
  }

  /**
   * Get context by name
   */
  async getByName(name: string): Promise<Context | null> {
    // Search index
    for (const context of this.index.values()) {
      if (context.name === name) {
        return await this.loadContext(context);
      }
    }

    return null;
  }

  /**
   * Search contexts (keyword-based)
   */
  async search(query: string, filters?: {
    source?: ContextSource | 'all';
    type?: ContextType | 'all';
    tags?: string[];
    category?: string;
  }): Promise<Context[]> {
    const results: Context[] = [];
    const keywords = query.toLowerCase().split(/\s+/);

    for (const meta of this.index.values()) {
      // Apply filters
      if (filters?.source && filters.source !== 'all' && meta.source !== filters.source) {
        continue;
      }
      if (filters?.type && filters.type !== 'all' && meta.type !== filters.type) {
        continue;
      }
      if (filters?.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some(tag => meta.tags.includes(tag));
        if (!hasTag) continue;
      }
      if (filters?.category && meta.category !== filters.category) {
        continue;
      }

      // Keyword matching
      const searchableText = [
        meta.name,
        meta.description || '',
        ...meta.tags,
        meta.category || '',
      ].join(' ').toLowerCase();

      const matches = keywords.every(kw => searchableText.includes(kw));

      if (matches) {
        const context = await this.loadContext(meta);
        if (context) {
          results.push(context);
        }
      }
    }

    return results;
  }

  /**
   * List all contexts
   */
  async list(filters?: {
    source?: ContextSource | 'all';
    type?: ContextType | 'all';
    tags?: string[];
    category?: string;
  }): Promise<Context[]> {
    const results: Context[] = [];

    for (const meta of this.index.values()) {
      // Apply filters
      if (filters?.source && filters.source !== 'all' && meta.source !== filters.source) {
        continue;
      }
      if (filters?.type && filters.type !== 'all' && meta.type !== filters.type) {
        continue;
      }
      if (filters?.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some(tag => meta.tags.includes(tag));
        if (!hasTag) continue;
      }
      if (filters?.category && meta.category !== filters.category) {
        continue;
      }

      const context = await this.loadContext(meta);
      if (context) {
        results.push(context);
      }
    }

    return results;
  }

  /**
   * Update context
   */
  async update(context: Context): Promise<void> {
    context.updatedAt = new Date();
    await this.save(context);
  }

  /**
   * Delete context
   */
  async delete(id: string): Promise<void> {
    const context = await this.getById(id);
    if (!context) {
      return; // Idempotent operation
    }

    const storagePath = this.getStoragePath(context);
    try {
      await fs.unlink(storagePath);
    } catch (error) {
      // File might not exist, continue anyway
    }

    this.index.delete(id);
    await this.saveIndex();
  }

  /**
   * Get storage path for a context
   */
  private getStoragePath(context: Context): string {
    return path.join(
      this.basePath,
      context.source,
      `${context.id}.json`
    );
  }

  /**
   * Load context from file
   */
  private async loadContext(meta: Context): Promise<Context | null> {
    try {
      const storagePath = this.getStoragePath(meta);
      const json = await fs.readFile(storagePath, 'utf-8');
      const data = JSON.parse(json);
      
      // Convert date strings back to Date objects
      const context: Context = {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        lastUsedAt: data.lastUsedAt ? new Date(data.lastUsedAt) : undefined,
      };

      return validateContext(context);
    } catch (error) {
      console.error(`Failed to load context ${meta.id}:`, error);
      return null;
    }
  }

  /**
   * Load index from disk
   */
  private async loadIndex(): Promise<void> {
    const indexPath = path.join(this.basePath, 'index.json');

    try {
      const json = await fs.readFile(indexPath, 'utf-8');
      const data: ContextIndex = JSON.parse(json);

      // Clear current index
      this.index.clear();

      // Load metadata into index (lightweight)
      for (const ctxMeta of data.contexts) {
        // Create minimal context object for index
        const context: Context = {
          id: ctxMeta.id,
          name: ctxMeta.name,
          content: '', // Not stored in index
          type: ctxMeta.type,
          source: ctxMeta.source,
          tags: ctxMeta.tags,
          version: '1.0.0', // Default, will be loaded from file
          syncStatus: 'local', // Default
          createdAt: ctxMeta.updatedAt, // Approximate
          updatedAt: ctxMeta.updatedAt,
          usageCount: 0,
          platforms: [],
        };
        if (ctxMeta.category !== undefined) {
          context.category = ctxMeta.category;
        }
        if (ctxMeta.description !== undefined) {
          context.description = ctxMeta.description;
        }

        this.index.set(ctxMeta.id, context);
      }

      this.indexLoaded = true;
    } catch (error) {
      // Index doesn't exist yet, will be created on first save
      this.indexLoaded = true;
    }
  }

  /**
   * Save index to disk
   */
  private async saveIndex(): Promise<void> {
    const indexPath = path.join(this.basePath, 'index.json');

    const data: ContextIndex = {
      version: '1.0.0',
      contexts: Array.from(this.index.values()).map(ctx => {
        const item: ContextIndex['contexts'][0] = {
          id: ctx.id,
          name: ctx.name,
          type: ctx.type,
          source: ctx.source,
          tags: ctx.tags,
          updatedAt: ctx.updatedAt,
        };
        if (ctx.category !== undefined) {
          item.category = ctx.category;
        }
        if (ctx.description !== undefined) {
          item.description = ctx.description;
        }
        return item;
      }),
    };

    const json = JSON.stringify(data, null, 2);

    // Write atomically
    const tempPath = `${indexPath}.tmp`;
    try {
      await fs.writeFile(tempPath, json, 'utf-8');
      await fs.rename(tempPath, indexPath);
    } catch (error) {
      // Clean up temp file
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw new StorageError('Failed to save index', error as Error);
    }
  }

  /**
   * Validate context before saving
   */
  private validate(context: Context): void {
    if (!context.id || !context.id.startsWith('ctx_')) {
      throw new StorageError('Context ID must start with ctx_');
    }
    if (!context.name || context.name.trim().length === 0) {
      throw new StorageError('Context name is required');
    }
    if (!context.content || context.content.trim().length === 0) {
      throw new StorageError('Context content is required');
    }
  }
}

