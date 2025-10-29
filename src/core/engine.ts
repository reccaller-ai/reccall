/**
 * Core RecCall engine implementation
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { 
  ICoreEngine, 
  IContextStorage, 
  IRepositoryClient, 
  ICacheManager, 
  IRecipeValidator,
  Shortcut,
  Recipe,
  RepositoryUrl,
  CoreConfig
} from './interfaces.js';
import { RecCallError } from '../types.js';
import type { ShortcutId } from '../types.js';
import { Injectable, Inject } from './container.js';
import { TOKENS } from './container.js';
import { configManager } from './config.js';
import { telemetryManager, Performance, LogErrors } from './telemetry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CoreEngine implements ICoreEngine {
  private initialized = false;
  private starterPackDir: string;

  constructor(
    private storage: IContextStorage,
    private repository: IRepositoryClient,
    private cache: ICacheManager,
    private validator: IRecipeValidator
  ) {
    this.starterPackDir = path.join(__dirname, '..', '..', 'starter-pack');
  }

  @Performance('engine.initialize')
  @LogErrors({ operation: 'initialize' })
  async initialize(config?: Partial<CoreConfig>): Promise<void> {
    if (this.initialized) return;

    // Initialize configuration
    await configManager.initialize(config);

    // Load starter pack if no shortcuts exist
    const shortcuts = await this.storage.list();
    if (shortcuts.length === 0) {
      await this.loadStarterPack();
    }

    // Update metrics
    telemetryManager.updateMetrics({
      shortcutsCount: shortcuts.length,
      repositoryEnabled: configManager.isRepositoryEnabled(),
    });

    this.initialized = true;
    
    telemetryManager.logEvent({
      event: 'engine.initialized',
      timestamp: Date.now(),
      properties: { shortcutsCount: shortcuts.length },
    });
  }

  @Performance('engine.record')
  @LogErrors({ operation: 'record' })
  async record(shortcut: ShortcutId, context: string): Promise<void> {
    this.ensureInitialized();

    // Validate shortcut ID
    const shortcutValidation = this.validator.validateShortcutId(shortcut);
    if (!shortcutValidation.valid) {
      throw new RecCallError(
        `Invalid shortcut: ${shortcutValidation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    // Validate context
    const contextValidation = this.validator.validateContext(context);
    if (!contextValidation.valid) {
      throw new RecCallError(
        `Invalid context: ${contextValidation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    // Check if shortcut already exists
    const exists = await this.storage.exists(shortcut);
    if (exists) {
      throw new RecCallError(
        `Shortcut '${shortcut}' already exists. Use update() to modify it.`,
        'DUPLICATE_ERROR'
      );
    }

    await this.storage.record(shortcut, context);
    
    // Update metrics
    const shortcuts = await this.storage.list();
    telemetryManager.updateMetrics({ shortcutsCount: shortcuts.length });
    
    telemetryManager.logEvent({
      event: 'shortcut.recorded',
      timestamp: Date.now(),
      properties: { shortcut },
    });
  }

  async call(shortcut: ShortcutId): Promise<string> {
    this.ensureInitialized();

    const shortcutData = await this.storage.get(shortcut);
    if (!shortcutData) {
      throw new RecCallError(
        `Shortcut '${shortcut}' not found`,
        'NOT_FOUND_ERROR'
      );
    }

    return shortcutData.context;
  }

  async list(): Promise<Shortcut[]> {
    this.ensureInitialized();
    return await this.storage.list();
  }

  async update(shortcut: ShortcutId, context: string): Promise<void> {
    this.ensureInitialized();

    // Validate context
    const contextValidation = this.validator.validateContext(context);
    if (!contextValidation.valid) {
      throw new RecCallError(
        `Invalid context: ${contextValidation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    await this.storage.update(shortcut, context);
  }

  async delete(shortcut: ShortcutId): Promise<void> {
    this.ensureInitialized();
    await this.storage.delete(shortcut);
  }

  async purge(): Promise<void> {
    this.ensureInitialized();
    await this.storage.purge();
  }

  async search(query: string): Promise<Shortcut[]> {
    this.ensureInitialized();

    const shortcuts = await this.storage.list();
    const lowerQuery = query.toLowerCase();

    return shortcuts.filter(shortcut =>
      shortcut.id.toLowerCase().includes(lowerQuery) ||
      shortcut.context.toLowerCase().includes(lowerQuery) ||
      shortcut.description?.toLowerCase().includes(lowerQuery) ||
      shortcut.category?.toLowerCase().includes(lowerQuery)
    );
  }

  async installRecipe(repoUrl: RepositoryUrl, shortcut: ShortcutId): Promise<void> {
    this.ensureInitialized();

    if (!configManager.isRepositoryEnabled()) {
      throw new RecCallError(
        'Repository features are disabled',
        'REPOSITORY_DISABLED_ERROR'
      );
    }

    // Validate repository
    const isValidRepo = await this.repository.validateRepository(repoUrl);
    if (!isValidRepo) {
      throw new RecCallError(
        `Invalid repository: ${repoUrl}`,
        'REPOSITORY_ERROR'
      );
    }

    // Fetch and validate recipe
    const recipes = await this.repository.fetchAllRecipes(repoUrl);
    const recipe = recipes.find((r) => r.shortcut === shortcut);

    if (!recipe) {
      throw new RecCallError(
        `Recipe '${shortcut}' not found in repository`,
        'NOT_FOUND_ERROR'
      );
    }

    // Validate recipe
    const validation = this.validator.validate(recipe);
    if (!validation.valid) {
      throw new RecCallError(
        `Invalid recipe: ${validation.errors.join(', ')}`,
        'VALIDATION_ERROR'
      );
    }

    // Sanitize and install
    const sanitizedRecipe = this.validator.sanitize(recipe);
    await this.storage.record(sanitizedRecipe.shortcut, sanitizedRecipe.context, {
      category: sanitizedRecipe.category,
      description: sanitizedRecipe.description
    });
  }

  async listRecipes(repoUrl?: RepositoryUrl): Promise<Recipe[]> {
    this.ensureInitialized();

    if (!configManager.isRepositoryEnabled()) {
      throw new RecCallError(
        'Repository features are disabled',
        'REPOSITORY_DISABLED_ERROR'
      );
    }

    const targetRepo = repoUrl || configManager.getDefaultRepository();
    
    // Try cache first
    const cacheKey = `recipes:${targetRepo}`;
    const cachedRecipes = await this.cache.get<Recipe[]>(cacheKey);
    if (cachedRecipes) {
      return cachedRecipes;
    }

    // Fetch from repository
    const recipes = await this.repository.fetchAllRecipes(targetRepo);
    
    // Cache the results
    await this.cache.set(cacheKey, recipes);

    return recipes;
  }

  async searchRecipes(query: string, repoUrl?: RepositoryUrl): Promise<Recipe[]> {
    this.ensureInitialized();

    if (!configManager.isRepositoryEnabled()) {
      throw new RecCallError(
        'Repository features are disabled',
        'REPOSITORY_DISABLED_ERROR'
      );
    }

    const targetRepo = repoUrl || configManager.getDefaultRepository();
    return await this.repository.searchRecipes(targetRepo, query);
  }

  async reloadStarterPack(): Promise<void> {
    this.ensureInitialized();
    await this.loadStarterPack();
  }

  async getStats(): Promise<{
    shortcutsCount: number;
    cacheStats: any;
    repositoryStats: any;
  }> {
    this.ensureInitialized();

    const shortcuts = await this.storage.list();
    const cacheStats = await this.cache.getStats();

    return {
      shortcutsCount: shortcuts.length,
      cacheStats,
      repositoryStats: {
        enabled: configManager.isRepositoryEnabled(),
        defaultRepo: configManager.getDefaultRepository()
      }
    };
  }

  async shutdown(): Promise<void> {
    // Cleanup resources if needed
    this.initialized = false;
  }

  /**
   * Load starter pack recipes
   */
  private async loadStarterPack(): Promise<void> {
    try {
      const manifestPath = path.join(this.starterPackDir, 'manifest.json');
      const manifestData = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestData);

      for (const recipeInfo of manifest.recipes || []) {
        try {
          const recipePath = path.join(this.starterPackDir, recipeInfo.file);
          const recipeData = await fs.readFile(recipePath, 'utf-8');
          const recipeObj = JSON.parse(recipeData);

          // Validate and sanitize recipe
          const recipe: Recipe = {
            shortcut: recipeObj.shortcut as ShortcutId,
            context: recipeObj.context,
            category: recipeObj.category || 'general',
            description: recipeObj.description || '',
            name: recipeInfo.name
          };

          const validation = this.validator.validate(recipe);
          if (validation.valid) {
            const sanitizedRecipe = this.validator.sanitize(recipe);
            await this.storage.record(sanitizedRecipe.shortcut, sanitizedRecipe.context, {
              category: sanitizedRecipe.category,
              description: sanitizedRecipe.description
            });
          }
        } catch (error) {
          console.warn(`Failed to load recipe ${recipeInfo.file}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to load starter pack:', error);
    }
  }

  /**
   * Ensure engine is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new RecCallError(
        'Core engine not initialized. Call initialize() first.',
        'NOT_INITIALIZED_ERROR'
      );
    }
  }
}
