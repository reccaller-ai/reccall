/**
 * Context storage interface for Universal Context Management System
 */

import type {
  Context,
  CreateStaticContextParams,
  CreateDynamicContextParams,
  CreateHybridContextParams,
  SearchFilters,
} from '../types/context.js';

/**
 * Interface for context storage operations
 */
export interface IContextStorage {
  /**
   * Initialize storage (create directories, load index)
   */
  initialize(): Promise<void>;

  /**
   * Save a context
   */
  save(context: Context): Promise<void>;

  /**
   * Get context by ID
   */
  getById(id: string): Promise<Context | null>;

  /**
   * Get context by name
   */
  getByName(name: string): Promise<Context | null>;

  /**
   * Search contexts
   */
  search(query: string, filters?: SearchFilters): Promise<Context[]>;

  /**
   * List all contexts
   */
  list(filters?: SearchFilters): Promise<Context[]>;

  /**
   * Update context
   */
  update(context: Context): Promise<void>;

  /**
   * Delete context
   */
  delete(id: string): Promise<void>;
}

