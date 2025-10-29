/**
 * Repository client implementation
 */

import type { 
  IRepositoryClient, 
  Recipe, 
  RepositoryManifest, 
  RepositoryUrl
} from './interfaces.js';
import { RepositoryError } from '../types.js';
import type { ShortcutId } from '../types.js';
import { configManager } from './config.js';

export class HttpRepositoryClient implements IRepositoryClient {
  async fetchManifest(repoUrl: RepositoryUrl): Promise<RepositoryManifest> {
    try {
      const manifestUrl = `${repoUrl}/manifest.json`;
      const response = await fetch(manifestUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const manifest = await response.json();
      
      // Validate manifest structure
      if (!manifest.name || !manifest.recipes || !Array.isArray(manifest.recipes)) {
        throw new Error('Invalid manifest format');
      }
      
      return manifest as RepositoryManifest;
    } catch (error) {
      throw new RepositoryError(`Failed to fetch manifest from ${repoUrl}: ${error}`, error as Error);
    }
  }

  async fetchRecipe(repoUrl: RepositoryUrl, recipeFile: string): Promise<Recipe> {
    try {
      const recipeUrl = `${repoUrl}/${recipeFile}`;
      const response = await fetch(recipeUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const recipeData = await response.json();
      
      // Validate recipe structure
      if (!recipeData.shortcut || !recipeData.context) {
        throw new Error('Invalid recipe format');
      }
      
      return {
        shortcut: recipeData.shortcut as ShortcutId,
        context: recipeData.context,
        category: recipeData.category || 'general',
        description: recipeData.description || '',
        name: recipeData.name
      };
    } catch (error) {
      throw new RepositoryError(`Failed to fetch recipe ${recipeFile}: ${error}`, error as Error);
    }
  }

  async fetchAllRecipes(repoUrl: RepositoryUrl): Promise<Recipe[]> {
    try {
      const manifest = await this.fetchManifest(repoUrl);
      const recipes: Recipe[] = [];
      
      for (const recipeInfo of manifest.recipes) {
        try {
          const recipe = await this.fetchRecipe(repoUrl, recipeInfo.file);
          recipes.push(recipe);
        } catch (error) {
          console.warn(`Failed to load recipe ${recipeInfo.file}:`, error);
        }
      }
      
      return recipes;
    } catch (error) {
      throw new RepositoryError(`Failed to fetch all recipes from ${repoUrl}: ${error}`, error as Error);
    }
  }

  async searchRecipes(repoUrl: RepositoryUrl, query: string): Promise<Recipe[]> {
    try {
      const recipes = await this.fetchAllRecipes(repoUrl);
      const lowerQuery = query.toLowerCase();
      
      return recipes.filter(recipe => 
        recipe.shortcut.toLowerCase().includes(lowerQuery) ||
        recipe.context.toLowerCase().includes(lowerQuery) ||
        recipe.description.toLowerCase().includes(lowerQuery) ||
        recipe.category.toLowerCase().includes(lowerQuery) ||
        (recipe.name && recipe.name.toLowerCase().includes(lowerQuery))
      );
    } catch (error) {
      throw new RepositoryError(`Failed to search recipes in ${repoUrl}: ${error}`, error as Error);
    }
  }

  async installRecipe(repoUrl: RepositoryUrl, shortcut: ShortcutId): Promise<void> {
    try {
      const recipes = await this.fetchAllRecipes(repoUrl);
      const recipe = recipes.find(r => r.shortcut === shortcut);
      
      if (!recipe) {
        throw new Error(`Recipe '${shortcut}' not found in repository`);
      }
      
      // This will be handled by the core engine
      // We just validate that the recipe exists
    } catch (error) {
      throw new RepositoryError(`Failed to install recipe ${shortcut}: ${error}`, error as Error);
    }
  }

  async validateRepository(repoUrl: RepositoryUrl): Promise<boolean> {
    try {
      await this.fetchManifest(repoUrl);
      return true;
    } catch (error) {
      return false;
    }
  }
}
