/**
 * CLI adapter for RecCall core engine
 */

import { Command } from 'commander';
import type { ICoreEngine, ShortcutId, RepositoryUrl } from '../../core/interfaces.js';
import type { ContextEngine } from '../../core/context-engine.js';
import { RecCallError } from '../../types.js';

export class CLIAdapter {
  private engine: ICoreEngine;
  private contextEngine?: ContextEngine;

  constructor(engine: ICoreEngine, contextEngine?: ContextEngine) {
    this.engine = engine;
    if (contextEngine !== undefined) {
      this.contextEngine = contextEngine;
    }
  }

  async initialize(): Promise<void> {
    await this.engine.initialize();
    if (this.contextEngine) {
      await this.contextEngine.initialize();
    }
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

    // Context commands (Universal Context System)
    if (this.contextEngine) {
      // Context create command
      program
        .command('context create <name>')
        .description('Create a static context')
        .option('-c, --content <content>', 'Context content')
        .option('-f, --file <file>', 'Read content from file')
        .option('-s, --source <source>', 'Source: local or global', 'global')
        .option('-t, --tags <tags...>', 'Tags')
        .option('--category <category>', 'Category')
        .option('--description <description>', 'Description')
        .option('--repository <repository>', 'Repository name')
        .action(async (name: string, options) => {
          try {
            let content = options.content;

            if (options.file) {
              const fs = await import('fs/promises');
              content = await fs.readFile(options.file, 'utf-8');
            }

            if (!content) {
              console.error('❌ Error: Content or file required');
              process.exit(1);
            }

            const context = await this.contextEngine!.createStatic({
              name,
              content,
              source: options.source,
              tags: options.tags,
              category: options.category,
              description: options.description,
              repository: options.repository,
            });

            console.log(`✅ Context '${context.name}' created successfully (ID: ${context.id})`);
          } catch (error) {
            this.handleError(error);
          }
        });

      // Context get command
      program
        .command('context get <identifier>')
        .description('Get a context by name or ID')
        .action(async (identifier: string) => {
          try {
            const context = await this.contextEngine!.use(identifier, 'cli');
            if (!context) {
              console.error(`❌ Context '${identifier}' not found`);
              process.exit(1);
            }
            console.log(context.content);
          } catch (error) {
            this.handleError(error);
          }
        });

      // Context search command
      program
        .command('context search <query>')
        .description('Search contexts')
        .option('-s, --source <source>', 'Filter by source')
        .option('-t, --type <type>', 'Filter by type')
        .action(async (query: string, options) => {
          try {
            const filters: any = {};
            if (options.source) {
              filters.source = options.source;
            }
            if (options.type) {
              filters.type = options.type;
            }
            const results = await this.contextEngine!.search(query, filters);

            if (results.length === 0) {
              console.log('No contexts found');
              return;
            }

            console.log(`Found ${results.length} context(s):\n`);
            results.forEach(ctx => {
              console.log(`  ${ctx.name} (${ctx.id})`);
              console.log(`    Type: ${ctx.type}, Source: ${ctx.source}`);
              if (ctx.description) {
                console.log(`    ${ctx.description}`);
              }
              console.log();
            });
          } catch (error) {
            this.handleError(error);
          }
        });

      // Context list command
      program
        .command('context list')
        .description('List all contexts')
        .option('-s, --source <source>', 'Filter by source')
        .option('-t, --type <type>', 'Filter by type')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
          try {
            const filters: any = {};
            if (options.source) {
              filters.source = options.source;
            }
            if (options.type) {
              filters.type = options.type;
            }
            const contexts = await this.contextEngine!.list(filters);

            if (options.json) {
              console.log(JSON.stringify(contexts, null, 2));
              return;
            }

            console.log(`Total: ${contexts.length} context(s)\n`);
            contexts.forEach(ctx => {
              console.log(`  ${ctx.name} (${ctx.id})`);
              console.log(`    Type: ${ctx.type}, Source: ${ctx.source}`);
              console.log(`    Used: ${ctx.usageCount} times`);
              if (ctx.tags.length > 0) {
                console.log(`    Tags: ${ctx.tags.join(', ')}`);
              }
              console.log();
            });
          } catch (error) {
            this.handleError(error);
          }
        });

      // Context delete command
      program
        .command('context delete <id>')
        .description('Delete a context')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id: string, options) => {
          try {
            if (!options.force) {
              const context = await this.contextEngine!.get(id);
              if (!context) {
                console.error(`❌ Context '${id}' not found`);
                process.exit(1);
              }
              console.log(`Delete context '${context.name}' (${context.id})?`);
              console.log('Use --force flag to confirm');
              return;
            }

            await this.contextEngine!.delete(id);
            console.log('✅ Context deleted successfully');
          } catch (error) {
            this.handleError(error);
          }
        });

      // Context stats command
      program
        .command('context stats [id]')
        .description('Show context statistics')
        .action(async (id?: string) => {
          try {
            const stats = await this.contextEngine!.getStats(id);
            if (id && 'id' in stats) {
              // Context-specific stats
              console.log(`Context: ${stats.name}`);
              console.log(`  ID: ${stats.id}`);
              console.log(`  Usage count: ${stats.usageCount}`);
              if (stats.lastUsedAt) {
                console.log(`  Last used: ${stats.lastUsedAt.toLocaleString()}`);
              }
              if (stats.platforms.length > 0) {
                console.log(`  Platforms: ${stats.platforms.join(', ')}`);
              }
            } else if (!id && 'totalContexts' in stats) {
              // System-wide stats
              console.log('Overall Statistics:');
              console.log(`  Total contexts: ${stats.totalContexts}`);
              console.log(`  By type:`);
              Object.entries(stats.byType).forEach(([type, count]) => {
                console.log(`    ${type}: ${count}`);
              });
              console.log(`  By source:`);
              Object.entries(stats.bySource).forEach(([source, count]) => {
                console.log(`    ${source}: ${count}`);
              });
            }
          } catch (error) {
            this.handleError(error);
          }
        });
    }

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
