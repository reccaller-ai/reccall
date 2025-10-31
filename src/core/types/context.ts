/**
 * Core Context type definitions for Universal Context Management System
 * 
 * This defines the unified Context entity that replaces the Shortcut model.
 * Contexts can be static (hand-written), dynamic (ML-generated), or hybrid.
 */

import { z } from 'zod';
import type { MLArtifacts } from './ml.js';
import type { ConversationMessage } from './conversation.js';

/**
 * Context type: static (hand-written), dynamic (ML-generated), or hybrid (template + ML)
 */
export type ContextType = 'static' | 'dynamic' | 'hybrid';

/**
 * Context source: local (project-specific), global (user-wide), or remote (synced from repo)
 */
export type ContextSource = 'local' | 'global' | 'remote';

/**
 * Sync status of a context
 */
export type SyncStatus = 'local' | 'synced' | 'pending' | 'conflict';

/**
 * Version history entry for a context
 */
export interface ContextVersion {
  version: string;
  createdAt: Date;
  changes: string; // Description of what changed
  content: string; // Content snapshot at this version
}

/**
 * Zod schema for ContextVersion
 */
export const ContextVersionSchema = z.object({
  version: z.string(),
  createdAt: z.date(),
  changes: z.string(),
  content: z.string(),
});

/**
 * The main Context entity - unified model for all contexts
 */
export interface Context {
  // Identity
  id: string; // ctx_ prefix (e.g., ctx_abc123)
  name: string; // Human-readable name (e.g., api-testing-guide)
  
  // Content
  content: string; // The actual context content (markdown)
  
  // Origin & Type
  type: ContextType;
  source: ContextSource;
  
  // ML Artifacts (optional, for dynamic/hybrid contexts)
  ml?: MLArtifacts;
  
  // Metadata
  description?: string;
  category?: string;
  tags: string[];
  version: string; // Semantic version (e.g., 1.0.0)
  
  // Repository sync
  repository?: string; // Remote repo name/URL
  syncStatus: SyncStatus;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  
  // Usage tracking
  usageCount: number;
  platforms: string[]; // Platforms where context was used (e.g., ['cursor', 'cli'])
  
  // Version history (optional, for contexts with multiple versions)
  versionHistory?: ContextVersion[];
}

/**
 * Zod schema for Context (with date transformations)
 */
export const ContextSchema = z.object({
  id: z.string(),
  name: z.string(),
  content: z.string(),
  type: z.enum(['static', 'dynamic', 'hybrid']),
  source: z.enum(['local', 'global', 'remote']),
  ml: z.any().optional(), // Import MLArtifactsSchema dynamically to avoid circular deps
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()),
  version: z.string(),
  repository: z.string().optional(),
  syncStatus: z.enum(['local', 'synced', 'pending', 'conflict']),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastUsedAt: z.date().optional(),
  usageCount: z.number(),
  platforms: z.array(z.string()),
  versionHistory: z.array(ContextVersionSchema).optional(),
});

/**
 * Parameters for creating a static context
 */
export interface CreateStaticContextParams {
  name: string;
  content: string;
  source: 'local' | 'global';
  tags?: string[];
  category?: string;
  description?: string;
  repository?: string;
}

/**
 * Zod schema for CreateStaticContextParams
 */
export const CreateStaticContextParamsSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
  source: z.enum(['local', 'global']),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  repository: z.string().optional(),
});

/**
 * Parameters for creating a dynamic context from conversation
 */
export interface CreateDynamicContextParams {
  name: string;
  messages: ConversationMessage[];
  source: 'local' | 'global';
  tags?: string[];
  category?: string;
  repository?: string;
  mlOptions?: {
    summarize?: boolean;
    extractTopics?: boolean;
    extractCode?: boolean;
  };
}

/**
 * Zod schema for CreateDynamicContextParams
 */
export const CreateDynamicContextParamsSchema = z.object({
  name: z.string().min(1),
  messages: z.array(z.any()), // Use ConversationMessageSchema dynamically
  source: z.enum(['local', 'global']),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  repository: z.string().optional(),
  mlOptions: z.object({
    summarize: z.boolean().optional(),
    extractTopics: z.boolean().optional(),
    extractCode: z.boolean().optional(),
  }).optional(),
});

/**
 * Parameters for creating a hybrid context (enhance template with ML)
 */
export interface CreateHybridContextParams {
  templateName: string; // Base static context to enhance
  messages: ConversationMessage[]; // Conversation to enhance with
  name: string; // New context name
  source?: 'local' | 'global';
  tags?: string[];
  category?: string;
}

/**
 * Zod schema for CreateHybridContextParams
 */
export const CreateHybridContextParamsSchema = z.object({
  templateName: z.string().min(1),
  messages: z.array(z.any()),
  name: z.string().min(1),
  source: z.enum(['local', 'global']).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
});

/**
 * Search filters for context queries
 */
export interface SearchFilters {
  source?: ContextSource | 'all';
  type?: ContextType | 'all';
  tags?: string[];
  category?: string;
  limit?: number;
}

/**
 * Context statistics (analytics)
 */
export interface ContextStats {
  id: string;
  name: string;
  usageCount: number;
  lastUsedAt?: Date;
  platforms: string[];
  syncStatus: SyncStatus;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * System-wide statistics
 */
export interface SystemStats {
  totalContexts: number;
  byType: {
    static: number;
    dynamic: number;
    hybrid: number;
  };
  bySource: {
    local: number;
    global: number;
    remote: number;
  };
  byCategory: Record<string, number>;
  byRepository: Record<string, number>;
  mostUsed: Array<{
    id: string;
    name: string;
    usageCount: number;
  }>;
  platformDistribution: Record<string, number>;
}

/**
 * Validate a Context object
 */
export function validateContext(context: unknown): Context {
  const parsed = ContextSchema.parse(context);
  return {
    ...parsed,
    description: parsed.description ?? undefined,
    category: parsed.category ?? undefined,
    repository: parsed.repository ?? undefined,
    lastUsedAt: parsed.lastUsedAt ?? undefined,
    ml: parsed.ml ?? undefined,
    versionHistory: parsed.versionHistory ?? undefined,
  };
}

/**
 * Validate CreateStaticContextParams
 */
export function validateCreateStaticParams(params: unknown): CreateStaticContextParams {
  const parsed = CreateStaticContextParamsSchema.parse(params);
  return {
    ...parsed,
    tags: parsed.tags ?? undefined,
    category: parsed.category ?? undefined,
    description: parsed.description ?? undefined,
    repository: parsed.repository ?? undefined,
  };
}

/**
 * Validate CreateDynamicContextParams
 */
export function validateCreateDynamicParams(params: unknown): CreateDynamicContextParams {
  const parsed = CreateDynamicContextParamsSchema.parse(params);
  return {
    ...parsed,
    tags: parsed.tags ?? undefined,
    category: parsed.category ?? undefined,
    repository: parsed.repository ?? undefined,
    mlOptions: parsed.mlOptions ?? undefined,
  };
}

/**
 * Validate CreateHybridContextParams
 */
export function validateCreateHybridParams(params: unknown): CreateHybridContextParams {
  const parsed = CreateHybridContextParamsSchema.parse(params);
  return {
    ...parsed,
    source: parsed.source ?? undefined,
    tags: parsed.tags ?? undefined,
    category: parsed.category ?? undefined,
  };
}

