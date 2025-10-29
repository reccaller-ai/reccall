/**
 * Core interfaces for RecCall engine
 */

import type {
  Shortcut,
  ShortcutId,
  Recipe,
  RepositoryManifest,
  ValidationResult,
  CacheEntry,
  CoreConfig,
  PlatformContext,
  PlatformCapabilities,
  RepositoryUrl
} from '../types.js';

// Re-export types for convenience
export type {
  Shortcut,
  ShortcutId,
  Recipe,
  RepositoryManifest,
  ValidationResult,
  CacheEntry,
  CoreConfig,
  PlatformContext,
  PlatformCapabilities,
  RepositoryUrl
};

/**
 * Context storage interface for CRUD operations on shortcuts
 */
export interface IContextStorage {
  /**
   * Record a new shortcut
   */
  record(shortcut: ShortcutId, context: string, options?: Record<string, any>): Promise<void>;

  /**
   * Retrieve a shortcut by ID
   */
  get(shortcut: ShortcutId): Promise<Shortcut | null>;

  /**
   * List all shortcuts
   */
  list(): Promise<Shortcut[]>;

  /**
   * Update an existing shortcut
   */
  update(shortcut: ShortcutId, context: string, options?: Record<string, any>): Promise<void>;

  /**
   * Delete a shortcut
   */
  delete(shortcut: ShortcutId): Promise<void>;

  /**
   * Purge all shortcuts
   */
  purge(): Promise<void>;

  /**
   * Check if a shortcut exists
   */
  exists(shortcut: ShortcutId): Promise<boolean>;

  /**
   * Get shortcuts by category
   */
  getByCategory(category: string): Promise<Shortcut[]>;
}

/**
 * Repository client interface for fetching recipes from remote sources
 */
export interface IRepositoryClient {
  /**
   * Fetch manifest from repository
   */
  fetchManifest(repoUrl: RepositoryUrl): Promise<RepositoryManifest>;

  /**
   * Fetch a specific recipe
   */
  fetchRecipe(repoUrl: RepositoryUrl, recipeFile: string): Promise<Recipe>;

  /**
   * Fetch all recipes from repository
   */
  fetchAllRecipes(repoUrl: RepositoryUrl): Promise<Recipe[]>;

  /**
   * Search recipes in repository
   */
  searchRecipes(repoUrl: RepositoryUrl, query: string): Promise<Recipe[]>;

  /**
   * Install a recipe from repository
   */
  installRecipe(repoUrl: RepositoryUrl, shortcut: ShortcutId): Promise<void>;

  /**
   * Validate repository URL
   */
  validateRepository(repoUrl: RepositoryUrl): Promise<boolean>;
}

/**
 * Cache manager interface for TTL-based caching
 */
export interface ICacheManager {
  /**
   * Get cached data
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set cached data with TTL
   */
  set<T>(key: string, data: T, ttl?: number): Promise<void>;

  /**
   * Delete cached data
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cache
   */
  clear(): Promise<void>;

  /**
   * Check if key exists in cache
   */
  has(key: string): Promise<boolean>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<{
    size: number;
    hitRate: number;
    missRate: number;
  }>;
}

/**
 * Recipe validator interface
 */
export interface IRecipeValidator {
  /**
   * Validate recipe format and content
   */
  validate(recipe: Recipe): ValidationResult;

  /**
   * Validate shortcut ID format
   */
  validateShortcutId(shortcut: string): ValidationResult;

  /**
   * Validate context content
   */
  validateContext(context: string): ValidationResult;

  /**
   * Sanitize recipe data
   */
  sanitize(recipe: Recipe): Recipe;
}

/**
 * Platform adapter interface for platform-specific integrations
 */
export interface IPlatformAdapter {
  /**
   * Platform identifier
   */
  readonly platform: string;

  /**
   * Platform capabilities
   */
  readonly capabilities: PlatformCapabilities;

  /**
   * Initialize the adapter
   */
  initialize(context: PlatformContext): Promise<void>;

  /**
   * Record a shortcut (platform-specific UI)
   */
  recordShortcut(): Promise<{ shortcut: ShortcutId; context: string } | null>;

  /**
   * Call a shortcut (platform-specific execution)
   */
  callShortcut(shortcut: ShortcutId): Promise<void>;

  /**
   * List shortcuts (platform-specific display)
   */
  listShortcuts(): Promise<void>;

  /**
   * Update a shortcut (platform-specific UI)
   */
  updateShortcut(shortcut: ShortcutId): Promise<{ context: string } | null>;

  /**
   * Delete a shortcut (platform-specific confirmation)
   */
  deleteShortcut(shortcut: ShortcutId): Promise<boolean>;

  /**
   * Purge all shortcuts (platform-specific confirmation)
   */
  purgeShortcuts(): Promise<boolean>;

  /**
   * Handle errors in platform-specific way
   */
  handleError(error: Error): void;

  /**
   * Show success message in platform-specific way
   */
  showSuccess(message: string): void;

  /**
   * Show warning message in platform-specific way
   */
  showWarning(message: string): void;

  /**
   * Show info message in platform-specific way
   */
  showInfo(message: string): void;
}

/**
 * Core engine interface
 */
export interface ICoreEngine {
  /**
   * Initialize the engine
   */
  initialize(config?: Partial<CoreConfig>): Promise<void>;

  /**
   * Record a shortcut
   */
  record(shortcut: ShortcutId, context: string): Promise<void>;

  /**
   * Call a shortcut
   */
  call(shortcut: ShortcutId): Promise<string>;

  /**
   * List all shortcuts
   */
  list(): Promise<Shortcut[]>;

  /**
   * Update a shortcut
   */
  update(shortcut: ShortcutId, context: string): Promise<void>;

  /**
   * Delete a shortcut
   */
  delete(shortcut: ShortcutId): Promise<void>;

  /**
   * Purge all shortcuts
   */
  purge(): Promise<void>;

  /**
   * Search shortcuts
   */
  search(query: string): Promise<Shortcut[]>;

  /**
   * Install recipe from repository
   */
  installRecipe(repoUrl: RepositoryUrl, shortcut: ShortcutId): Promise<void>;

  /**
   * List available recipes from repository
   */
  listRecipes(repoUrl?: RepositoryUrl): Promise<Recipe[]>;

  /**
   * Search recipes in repository
   */
  searchRecipes(query: string, repoUrl?: RepositoryUrl): Promise<Recipe[]>;

  /**
   * Reload starter pack
   */
  reloadStarterPack(): Promise<void>;

  /**
   * Get engine statistics
   */
  getStats(): Promise<{
    shortcutsCount: number;
    cacheStats: any;
    repositoryStats: any;
  }>;

  /**
   * Shutdown the engine
   */
  shutdown(): Promise<void>;
}
