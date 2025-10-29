/**
 * Shared test utilities and mocks for RecCall tests
 */

import type { IContextStorage, ICacheManager, IRecipeValidator, IRepositoryClient, Shortcut } from '../core/interfaces.js';
import type { ShortcutId } from '../types.js';

/**
 * Mock storage implementation for testing
 */
export class MockStorage implements IContextStorage {
  private shortcuts: Map<string, Shortcut> = new Map();

  async record(shortcut: ShortcutId, context: string, options?: Record<string, any>): Promise<void> {
    const now = new Date();
    const shortcutData: Shortcut = {
      id: shortcut,
      context,
      createdAt: now,
      updatedAt: now,
      category: options?.category,
      description: options?.description,
    };
    this.shortcuts.set(shortcut, shortcutData);
  }

  async get(shortcut: ShortcutId): Promise<Shortcut | null> {
    return this.shortcuts.get(shortcut) || null;
  }

  async list(): Promise<Shortcut[]> {
    return Array.from(this.shortcuts.values());
  }

  async update(shortcut: ShortcutId, context: string, options?: Record<string, any>): Promise<void> {
    const existing = this.shortcuts.get(shortcut);
    if (!existing) {
      throw new Error(`Shortcut '${shortcut}' not found`);
    }
    const updated: Shortcut = {
      ...existing,
      context,
      updatedAt: new Date(),
      category: options?.category ?? existing.category,
      description: options?.description ?? existing.description,
    };
    this.shortcuts.set(shortcut, updated);
  }

  async delete(shortcut: ShortcutId): Promise<void> {
    if (!this.shortcuts.has(shortcut)) {
      throw new Error(`Shortcut '${shortcut}' not found`);
    }
    this.shortcuts.delete(shortcut);
  }

  async purge(): Promise<void> {
    this.shortcuts.clear();
  }

  async exists(shortcut: ShortcutId): Promise<boolean> {
    return this.shortcuts.has(shortcut);
  }

  async getByCategory(category: string): Promise<Shortcut[]> {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }
}

/**
 * Mock cache manager implementation
 */
export class MockCacheManager implements ICacheManager {
  private cache: Map<string, { data: any; expires?: number }> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: { data: T; expires?: number } = { data };
    if (ttl !== undefined) {
      entry.expires = Date.now() + ttl * 1000;
    }
    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  async getStats(): Promise<{ size: number; hitRate: number; missRate: number }> {
    return {
      size: this.cache.size,
      hitRate: 0.8, // Mock value
      missRate: 0.2, // Mock value
    };
  }
}

/**
 * Mock validator implementation
 */
export class MockValidator implements IRecipeValidator {
  validate(recipe: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!recipe.shortcut || recipe.shortcut.length < 1) {
      errors.push('Shortcut ID is required');
    }
    if (!recipe.context || recipe.context.length < 5) {
      errors.push('Context must be at least 5 characters');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateShortcutId(shortcut: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!shortcut || shortcut.length < 1) {
      errors.push('Shortcut ID cannot be empty');
    }
    if (shortcut.length > 100) {
      errors.push('Shortcut ID too long');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateContext(context: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!context || context.length < 5) {
      errors.push('Context must be at least 5 characters');
    }
    if (context.length > 10000) {
      errors.push('Context too long');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  sanitize(recipe: any): any {
    return {
      ...recipe,
      shortcut: recipe.shortcut?.trim().toLowerCase(),
      context: recipe.context?.trim(),
    };
  }
}

/**
 * Mock repository client implementation
 */
export class MockRepositoryClient implements IRepositoryClient {
  private manifest: any = {
    name: 'Test Repository',
    description: 'Test',
    version: '1.0.0',
    url: 'https://test.reccaller.ai',
    recipes: [],
  };

  private recipes: Map<string, any> = new Map();

  setManifest(manifest: any): void {
    this.manifest = manifest;
  }

  setRecipe(shortcut: string, recipe: any): void {
    this.recipes.set(shortcut, recipe);
    this.manifest.recipes.push({
      name: recipe.name || shortcut,
      shortcut,
      description: recipe.description || '',
      file: `recipes/${shortcut}.json`,
      category: recipe.category || 'general',
    });
  }

  async fetchManifest(repoUrl?: any): Promise<any> {
    return this.manifest;
  }

  async fetchRecipe(repoUrl: any, recipeFile: string): Promise<any> {
    const shortcut = recipeFile.replace('recipes/', '').replace('.json', '');
    return this.recipes.get(shortcut) || null;
  }

  async fetchAllRecipes(repoUrl: any): Promise<any[]> {
    return Array.from(this.recipes.values());
  }

  async searchRecipes(repoUrl: any, query: string): Promise<any[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.recipes.values()).filter(
      (recipe) =>
        recipe.name?.toLowerCase().includes(lowerQuery) ||
        recipe.description?.toLowerCase().includes(lowerQuery) ||
        recipe.context?.toLowerCase().includes(lowerQuery)
    );
  }

  async installRecipe(repoUrl: any, shortcut: ShortcutId): Promise<void> {
    // Mock implementation
  }

  async validateRepository(repoUrl: any): Promise<boolean> {
    return true;
  }
}
