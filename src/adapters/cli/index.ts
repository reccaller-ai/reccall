/**
 * CLI adapter for RecCall core engine
 */

import { Command } from 'commander';
import type { ICoreEngine, ShortcutId, RepositoryUrl } from '../../core/interfaces.js';
import { RecCallError } from '../../types.js';

export class CLIAdapter {
  private engine: ICoreEngine;

  constructor(engine: ICoreEngine) {
    this.engine = engine;
  }

  async initialize(): Promise<void> {
    await this.engine.initialize();
  }

  createProgram(): Command {
    const program = new Command();

    program
      .name('reccall')
      .description('RecCall: Record and call context shortcuts across AI IDEs')
      .version('1.0.0');

    // Record command
    program
      .command('rec <shortcut> <context>')
      .description('Record a new context shortcut')
      .action(async (shortcut: string, context: string) => {
        try {
          await this.engine.record(shortcut as ShortcutId, context);
          console.log(`✅ Shortcut '${shortcut}' recorded successfully!`);
        } catch (error) {
          this.handleError(error);
        }
      });

    // Call command
    program
      .command('call <shortcut>')
      .description('Call a stored context shortcut')
      .action(async (shortcut: string) => {
        try {
          const context = await this.engine.call(shortcut as ShortcutId);
          console.log(`EXECUTE THESE INSTRUCTIONS: ${context}`);
          console.log('\nPlease follow and execute the above instructions immediately.');
        } catch (error) {
          this.handleError(error);
        }
      });

    // List command
    program
      .command('list')
      .description('List all stored shortcuts')
      .action(async () => {
        try {
          const shortcuts = await this.engine.list();
          
          if (shortcuts.length === 0) {
            console.log('No shortcuts stored yet. Use \'reccall rec <shortcut> <context>\' to create your first shortcut.');
            return;
          }

          console.log(`📋 Stored shortcuts (${shortcuts.length}):`);
          console.log();
          
          shortcuts.forEach((shortcut) => {
            const preview = shortcut.context.length > 100 
              ? shortcut.context.substring(0, 100) + '...' 
              : shortcut.context;
            console.log(`• ${shortcut.id}: ${preview}`);
            if (shortcut.description) {
              console.log(`  ${shortcut.description}`);
            }
            console.log();
          });
        } catch (error) {
          this.handleError(error);
        }
      });

    // Update command
    program
      .command('update <shortcut> <context>')
      .description('Update an existing shortcut')
      .action(async (shortcut: string, context: string) => {
        try {
          await this.engine.update(shortcut as ShortcutId, context);
          console.log(`✅ Shortcut '${shortcut}' updated successfully!`);
        } catch (error) {
          this.handleError(error);
        }
      });

    // Delete command
    program
      .command('delete <shortcut>')
      .description('Delete a shortcut')
      .action(async (shortcut: string) => {
        try {
          await this.engine.delete(shortcut as ShortcutId);
          console.log(`✅ Shortcut '${shortcut}' deleted successfully!`);
        } catch (error) {
          this.handleError(error);
        }
      });

    // Purge command
    program
      .command('purge')
      .description('Purge all shortcuts')
      .option('-y, --yes', 'Skip confirmation')
      .action(async (options) => {
        try {
          if (!options.yes) {
            console.log('⚠️  This will delete ALL stored shortcuts permanently.');
            console.log('Use --yes flag to confirm, or run without the flag to cancel.');
            return;
          }

          await this.engine.purge();
          console.log('✅ All shortcuts have been purged successfully!');
        } catch (error) {
          this.handleError(error);
        }
      });

    // Search command
    program
      .command('search <query>')
      .description('Search shortcuts by content')
      .action(async (query: string) => {
        try {
          const shortcuts = await this.engine.search(query);
          
          if (shortcuts.length === 0) {
            console.log(`No shortcuts found matching "${query}"`);
            return;
          }

          console.log(`🔍 Found ${shortcuts.length} shortcut(s) matching "${query}":`);
          console.log();
          
          shortcuts.forEach((shortcut) => {
            const preview = shortcut.context.length > 100 
              ? shortcut.context.substring(0, 100) + '...' 
              : shortcut.context;
            console.log(`• ${shortcut.id}: ${preview}`);
            console.log();
          });
        } catch (error) {
          this.handleError(error);
        }
      });

    // Repository commands
    program
      .command('install <shortcut>')
      .description('Install a recipe from the repository')
      .option('-r, --repo <url>', 'Repository URL')
      .action(async (shortcut: string, options) => {
        try {
          const repoUrl = options.repo || 'https://contexts.reccaller.ai/' as RepositoryUrl;
          await this.engine.installRecipe(repoUrl, shortcut as ShortcutId);
          console.log(`✅ Recipe '${shortcut}' installed successfully!`);
        } catch (error) {
          this.handleError(error);
        }
      });

    program
      .command('list-repo')
      .description('List available recipes from repository')
      .option('-r, --repo <url>', 'Repository URL')
      .action(async (options) => {
        try {
          const repoUrl = options.repo || 'https://contexts.reccaller.ai/' as RepositoryUrl;
          const recipes = await this.engine.listRecipes(repoUrl);
          
          if (recipes.length === 0) {
            console.log('No recipes found in repository.');
            return;
          }

          console.log(`📋 Available recipes (${recipes.length}):`);
          console.log();
          
          recipes.forEach((recipe) => {
            console.log(`• ${recipe.shortcut}: ${recipe.name || recipe.shortcut}`);
            if (recipe.description) {
              console.log(`  ${recipe.description}`);
            }
            console.log();
          });
        } catch (error) {
          this.handleError(error);
        }
      });

    program
      .command('search-repo <query>')
      .description('Search recipes in repository')
      .option('-r, --repo <url>', 'Repository URL')
      .action(async (query: string, options) => {
        try {
          const repoUrl = options.repo || 'https://contexts.reccaller.ai/' as RepositoryUrl;
          const recipes = await this.engine.searchRecipes(query, repoUrl);
          
          if (recipes.length === 0) {
            console.log(`No recipes found matching "${query}"`);
            return;
          }

          console.log(`🔍 Found ${recipes.length} recipe(s) matching "${query}":`);
          console.log();
          
          recipes.forEach((recipe) => {
            console.log(`• ${recipe.shortcut}: ${recipe.name || recipe.shortcut}`);
            if (recipe.description) {
              console.log(`  ${recipe.description}`);
            }
            console.log();
          });
        } catch (error) {
          this.handleError(error);
        }
      });

    // Reload starter pack
    program
      .command('reload-starter-pack')
      .description('Reload starter pack recipes')
      .option('-y, --yes', 'Skip confirmation')
      .action(async (options) => {
        try {
          if (!options.yes) {
            console.log('⚠️  This will overwrite ALL existing shortcuts with starter pack recipes.');
            console.log('Use --yes flag to confirm, or run without the flag to cancel.');
            return;
          }

          await this.engine.reloadStarterPack();
          console.log('✅ Starter pack reloaded successfully!');
        } catch (error) {
          this.handleError(error);
        }
      });

    // Stats command
    program
      .command('stats')
      .description('Show engine statistics')
      .action(async () => {
        try {
          const stats = await this.engine.getStats();
          
          console.log('📊 RecCall Engine Statistics:');
          console.log();
          console.log(`Shortcuts: ${stats.shortcutsCount}`);
          console.log(`Cache Hit Rate: ${(stats.cacheStats.hitRate * 100).toFixed(1)}%`);
          console.log(`Cache Size: ${stats.cacheStats.size} entries`);
          console.log(`Repository: ${stats.repositoryStats.enabled ? 'Enabled' : 'Disabled'}`);
          if (stats.repositoryStats.enabled) {
            console.log(`Default Repo: ${stats.repositoryStats.defaultRepo}`);
          }
        } catch (error) {
          this.handleError(error);
        }
      });

    return program;
  }

  /**
   * Handle errors in CLI-specific way
   */
  private handleError(error: unknown): void {
    if (error instanceof RecCallError) {
      console.error(`❌ ${error.message}`);
      process.exit(1);
    } else if (error instanceof Error) {
      console.error(`❌ Unexpected error: ${error.message}`);
      process.exit(1);
    } else {
      console.error('❌ Unknown error occurred');
      process.exit(1);
    }
  }
}
