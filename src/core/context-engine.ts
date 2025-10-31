/**
 * Core Context Engine for Universal Context Management System
 * Provides CRUD operations and usage tracking for contexts
 */

import type {
  Context,
  CreateStaticContextParams,
  CreateDynamicContextParams,
  CreateHybridContextParams,
  SearchFilters,
  ContextStats,
  SystemStats,
} from './types/context.js';
import type { IContextStorage } from './interfaces/context-storage.js';
import { ContextStore } from './storage/context-store.js';
import { StorageError } from '../types.js';

export class ContextEngine {
  private store: IContextStorage;

  constructor(store?: IContextStorage) {
    this.store = store || new ContextStore();
  }

  /**
   * Initialize the context engine
   */
  async initialize(): Promise<void> {
    await this.store.initialize();
  }

  /**
   * Create a static context
   */
  async createStatic(params: CreateStaticContextParams): Promise<Context> {
    const context: Context = {
      id: this.generateId(),
      name: params.name,
      content: params.content,
      type: 'static',
      source: params.source,
      tags: params.tags || [],
      version: '1.0.0',
      syncStatus: params.repository ? 'pending' : 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      platforms: [],
    };
    if (params.category !== undefined) {
      context.category = params.category;
    }
    if (params.description !== undefined) {
      context.description = params.description;
    }
    if (params.repository !== undefined) {
      context.repository = params.repository;
    }

    await this.store.save(context);
    return context;
  }

  /**
   * Create a dynamic context from conversation (stub for Phase 2)
   * Will be enhanced with ML processing in Phase 2
   */
  async createFromConversation(params: CreateDynamicContextParams): Promise<Context> {
    // For Phase 1, create a basic dynamic context
    // Phase 2 will add ML processing (summarization, embeddings, etc.)
    const context: Context = {
      id: this.generateId(),
      name: params.name,
      content: this.formatConversationAsContent(params.messages),
      type: 'dynamic',
      source: params.source,
      tags: params.tags || [],
      version: '1.0.0',
      syncStatus: params.repository ? 'pending' : 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      platforms: [],
      // ML artifacts will be added in Phase 2
    };
    if (params.category !== undefined) {
      context.category = params.category;
    }
    if (params.repository !== undefined) {
      context.repository = params.repository;
    }

    await this.store.save(context);
    return context;
  }

  /**
   * Create a hybrid context (stub for Phase 2)
   * Will enhance a static template with ML insights from conversation
   */
  async enhanceContext(params: CreateHybridContextParams): Promise<Context> {
    // Load the template
    const template = await this.get(params.templateName);
    if (!template || template.type !== 'static') {
      throw new StorageError(`Template '${params.templateName}' not found or not a static context`);
    }

    // For Phase 1, simply merge template with conversation
    // Phase 2 will add ML processing
    const context: Context = {
      id: this.generateId(),
      name: params.name,
      content: `${template.content}\n\n## Enhanced with Conversation\n\n${this.formatConversationAsContent(params.messages)}`,
      type: 'hybrid',
      source: params.source || template.source,
      tags: [...(template.tags || []), ...(params.tags || [])],
      version: '1.0.0',
      syncStatus: template.syncStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      platforms: [],
      // ML artifacts will be added in Phase 2
    };
    if (params.category !== undefined) {
      context.category = params.category;
    } else if (template.category !== undefined) {
      context.category = template.category;
    }
    if (template.description !== undefined) {
      context.description = template.description;
    }
    if (template.repository !== undefined) {
      context.repository = template.repository;
    }

    await this.store.save(context);
    return context;
  }

  /**
   * Get a context by ID or name
   */
  async get(identifier: string): Promise<Context | null> {
    // Try ID first
    let context = await this.store.getById(identifier);

    // Try name if not found
    if (!context) {
      context = await this.store.getByName(identifier);
    }

    return context;
  }

  /**
   * Search contexts (keyword-based in Phase 1, hybrid in Phase 2)
   */
  async search(query: string, filters?: SearchFilters): Promise<Context[]> {
    return await this.store.search(query, filters);
  }

  /**
   * List contexts with optional filters
   */
  async list(filters?: SearchFilters): Promise<Context[]> {
    return await this.store.list(filters);
  }

  /**
   * Update context
   */
  async update(id: string, updates: Partial<Context>): Promise<Context> {
    const context = await this.get(id);
    if (!context) {
      throw new StorageError(`Context '${id}' not found`);
    }

    // Merge updates
    const updated: Context = {
      ...context,
      ...updates,
      id: context.id, // Prevent ID changes
      updatedAt: new Date(),
    };

    await this.store.update(updated);
    return updated;
  }

  /**
   * Delete context
   */
  async delete(id: string): Promise<void> {
    await this.store.delete(id);
  }

  /**
   * Use a context (tracks usage)
   */
  async use(id: string, platform: string): Promise<Context> {
    const context = await this.get(id);
    if (!context) {
      throw new StorageError(`Context '${id}' not found`);
    }

    // Update usage tracking
    context.usageCount++;
    context.lastUsedAt = new Date();

    if (!context.platforms.includes(platform)) {
      context.platforms.push(platform);
    }

    await this.store.update(context);
    return context;
  }

  /**
   * Create new version of context (stub for Phase 4)
   */
  async version(id: string, changes: string): Promise<Context> {
    const context = await this.get(id);
    if (!context) {
      throw new StorageError(`Context '${id}' not found`);
    }

    // Increment version (simple increment for now)
    const versionParts = context.version.split('.');
    const patch = parseInt(versionParts[2] || '0', 10) + 1;
    const newVersion = `${versionParts[0]}.${versionParts[1] || '0'}.${patch}`;

    // Store version history
    const versionHistory = context.versionHistory || [];
    versionHistory.push({
      version: context.version,
      createdAt: context.updatedAt,
      changes,
      content: context.content,
    });

    const updated: Context = {
      ...context,
      version: newVersion,
      updatedAt: new Date(),
      versionHistory,
    };

    await this.store.update(updated);
    return updated;
  }

  /**
   * Get statistics for a context or system-wide
   */
  async getStats(id?: string): Promise<ContextStats | SystemStats> {
    if (id) {
      // Context-specific stats
      const context = await this.get(id);
      if (!context) {
        throw new StorageError(`Context '${id}' not found`);
      }

      const stats: ContextStats = {
        id: context.id,
        name: context.name,
        usageCount: context.usageCount,
        platforms: context.platforms,
        syncStatus: context.syncStatus,
        version: context.version,
        createdAt: context.createdAt,
        updatedAt: context.updatedAt,
      };
      if (context.lastUsedAt !== undefined) {
        stats.lastUsedAt = context.lastUsedAt;
      }
      return stats;
    } else {
      // System-wide stats
      const contexts = await this.list();

      const byType = {
        static: 0,
        dynamic: 0,
        hybrid: 0,
      };

      const bySource = {
        local: 0,
        global: 0,
        remote: 0,
      };

      const byCategory: Record<string, number> = {};
      const byRepository: Record<string, number> = {};
      const platformDistribution: Record<string, number> = {};

      for (const ctx of contexts) {
        byType[ctx.type]++;
        bySource[ctx.source]++;

        if (ctx.category) {
          byCategory[ctx.category] = (byCategory[ctx.category] || 0) + 1;
        }

        if (ctx.repository) {
          byRepository[ctx.repository] = (byRepository[ctx.repository] || 0) + 1;
        }

        for (const platform of ctx.platforms) {
          platformDistribution[platform] = (platformDistribution[platform] || 0) + 1;
        }
      }

      const mostUsed = contexts
        .map(ctx => ({
          id: ctx.id,
          name: ctx.name,
          usageCount: ctx.usageCount,
        }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10);

      return {
        totalContexts: contexts.length,
        byType,
        bySource,
        byCategory,
        byRepository,
        mostUsed,
        platformDistribution,
      };
    }
  }

  /**
   * Generate a unique context ID
   */
  private generateId(): string {
    return 'ctx_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Format conversation messages as content (simple version for Phase 1)
   */
  private formatConversationAsContent(messages: Array<{ role: string; content: string }>): string {
    return messages
      .map(msg => `## ${msg.role === 'user' ? 'User' : 'Assistant'}\n\n${msg.content}`)
      .join('\n\n---\n\n');
  }
}

