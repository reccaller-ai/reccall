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
import { ConversationSummarizer } from '../ml/summarizer.js';
import { CodeExtractor } from '../ml/code-extractor.js';
import { EmbeddingModel } from '../ml/embedder.js';
import { TopicExtractor } from '../ml/topic-extractor.js';
import type { MLArtifacts } from './types/ml.js';
import { SearchEngine } from './search-engine.js';

export class ContextEngine {
  private store: IContextStorage;
  private searchEngine: SearchEngine;
  private summarizer: ConversationSummarizer;
  private embedder: EmbeddingModel;
  private codeExtractor: CodeExtractor;
  private topicExtractor: TopicExtractor;

  constructor(store?: IContextStorage) {
    this.store = store || new ContextStore();
    this.searchEngine = new SearchEngine(this.store);
    this.summarizer = new ConversationSummarizer();
    this.embedder = new EmbeddingModel();
    this.codeExtractor = new CodeExtractor();
    this.topicExtractor = new TopicExtractor();
  }

  /**
   * Initialize the context engine
   */
  async initialize(): Promise<void> {
    await this.store.initialize();
    
    // Index existing contexts for semantic search
    const contexts = await this.store.list();
    for (const context of contexts) {
      await this.searchEngine.indexContext(context);
    }
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
    
    // Index for semantic search
    await this.searchEngine.indexContext(context);
    
    return context;
  }

  /**
   * Create a dynamic context from conversation with ML processing
   */
  async createFromConversation(params: CreateDynamicContextParams): Promise<Context> {
    // Generate ML artifacts
    const summary = await this.summarizer.summarize(params.messages);
    const codeRefs = await this.codeExtractor.extract(params.messages);
    const topics = this.topicExtractor.extractTopics(params.messages);

    // Generate content
    const content = await this.summarizer.generateContextContent(
      params.messages,
      summary,
      codeRefs
    );

    // Generate embedding
    const embedding = await this.embedder.embed(content);

    const mlArtifacts: MLArtifacts = {
      embedding,
      summary,
      topics,
      codeRefs,
      originalMessages: params.messages,
    };

    const context: Context = {
      id: this.generateId(),
      name: params.name,
      content,
      type: 'dynamic',
      source: params.source,
      tags: params.tags || [],
      version: '1.0.0',
      syncStatus: params.repository ? 'pending' : 'local',
      ml: mlArtifacts,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      platforms: [],
    };
    if (params.category !== undefined) {
      context.category = params.category;
    }
    if (params.repository !== undefined) {
      context.repository = params.repository;
    }

    await this.store.save(context);
    
    // Index for semantic search
    await this.searchEngine.indexContext(context);
    
    return context;
  }

  /**
   * Create a hybrid context - enhance static template with ML insights
   */
  async enhanceContext(params: CreateHybridContextParams): Promise<Context> {
    // Load the template
    const template = await this.get(params.templateName);
    if (!template || template.type !== 'static') {
      throw new StorageError(`Template '${params.templateName}' not found or not a static context`);
    }

    // Generate ML artifacts from conversation
    const summary = await this.summarizer.summarize(params.messages);
    const codeRefs = await this.codeExtractor.extract(params.messages);
    const topics = this.topicExtractor.extractTopics(params.messages);

    // Merge template content with ML-generated insights
    const enhancedContent = `${template.content}\n\n## Enhanced with Conversation Insights\n\n### Summary\n${summary}\n\n### Key Topics\n${topics.map(t => `- ${t}`).join('\n')}\n\n### Conversation Details\n${this.formatConversationAsContent(params.messages)}`;

    // Generate embedding for hybrid content
    const embedding = await this.embedder.embed(enhancedContent);

    const mlArtifacts: MLArtifacts = {
      embedding,
      summary,
      topics,
      codeRefs,
      originalMessages: params.messages,
    };

    const context: Context = {
      id: this.generateId(),
      name: params.name,
      content: enhancedContent,
      type: 'hybrid',
      source: params.source || template.source,
      tags: [...(template.tags || []), ...(params.tags || [])],
      version: '1.0.0',
      syncStatus: template.syncStatus,
      ml: mlArtifacts,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      platforms: [],
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
    
    // Index for semantic search
    await this.searchEngine.indexContext(context);
    
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
   * Search contexts (hybrid: keyword + semantic)
   */
  async search(query: string, filters?: SearchFilters): Promise<Context[]> {
    return await this.searchEngine.search(query, filters);
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
    await this.searchEngine.removeFromIndex(id);
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

