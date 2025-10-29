/**
 * MCP adapter for RecCall core engine
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { ICoreEngine } from '../../core/interfaces.js';
import { RecCallError } from '../../types.js';
import type { ShortcutId } from '../../types.js';

export class MCPAdapter {
  private engine: ICoreEngine;
  private server: Server;
  private toolsCache: any = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache for tools list

  constructor(engine: ICoreEngine) {
    this.engine = engine;
    this.server = new Server(
      {
        name: 'reccall',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
  }

  async initialize(): Promise<void> {
    await this.engine.initialize();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools (cached for performance)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Cache tools list to reduce overhead
      const now = Date.now();
      if (this.toolsCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
        return this.toolsCache;
      }

      const toolsResponse = {
        tools: [
          {
            name: 'rec',
            description: 'Record a new context shortcut with instructions',
            inputSchema: {
              type: 'object',
              properties: {
                shortcut: {
                  type: 'string',
                  description: 'The shortcut name/alias',
                },
                context: {
                  type: 'string',
                  description: 'The context or instruction to store',
                },
              },
              required: ['shortcut', 'context'],
            },
          },
          {
            name: 'rec_list',
            description: 'List all stored context shortcuts (equivalent to rec -l)',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'rec_update',
            description: 'Update/replace an existing context shortcut (equivalent to rec -u <shortcut> <context>)',
            inputSchema: {
              type: 'object',
              properties: {
                shortcut: {
                  type: 'string',
                  description: 'The shortcut name/alias to update',
                },
                context: {
                  type: 'string',
                  description: 'The new context or instruction to store',
                },
              },
              required: ['shortcut', 'context'],
            },
          },
          {
            name: 'rec_delete',
            description: 'Delete a context shortcut if it exists (idempotent operation)',
            inputSchema: {
              type: 'object',
              properties: {
                shortcut: {
                  type: 'string',
                  description: 'The shortcut name/alias to delete',
                },
              },
              required: ['shortcut'],
            },
          },
          {
            name: 'rec_purge',
            description: 'Purge all stored shortcuts (requires confirmation)',
            inputSchema: {
              type: 'object',
              properties: {
                confirm: {
                  type: 'boolean',
                  description: 'Confirmation to proceed with purging all shortcuts',
                },
              },
              required: ['confirm'],
            },
          },
          {
            name: 'call',
            description: 'Call a stored context shortcut and execute the instructions immediately',
            inputSchema: {
              type: 'object',
              properties: {
                shortcut: {
                  type: 'string',
                  description: 'The shortcut name/alias to recall',
                },
              },
              required: ['shortcut'],
            },
          },
          {
            name: 'rec_reload_starter_pack',
            description: 'Reload the starter pack recipes (overwrites existing shortcuts)',
            inputSchema: {
              type: 'object',
              properties: {
                confirm: {
                  type: 'boolean',
                  description: 'Confirmation to reload starter pack (this will overwrite existing shortcuts)',
                },
              },
              required: ['confirm'],
            },
          },
          {
            name: 'rec_search',
            description: 'Search shortcuts by content',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'rec_install',
            description: 'Install a recipe from the repository',
            inputSchema: {
              type: 'object',
              properties: {
                shortcut: {
                  type: 'string',
                  description: 'The shortcut name to install',
                },
                repo: {
                  type: 'string',
                  description: 'Repository URL (optional)',
                },
              },
              required: ['shortcut'],
            },
          },
          {
            name: 'rec_list_repo',
            description: 'List available recipes from repository',
            inputSchema: {
              type: 'object',
              properties: {
                repo: {
                  type: 'string',
                  description: 'Repository URL (optional)',
                },
              },
              required: [],
            },
          },
          {
            name: 'rec_stats',
            description: 'Get engine statistics',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
        ],
      };
      
      // Cache the response
      this.toolsCache = toolsResponse;
      this.cacheTimestamp = now;
      
      return toolsResponse;
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'rec': {
            const { shortcut, context } = args as { shortcut: string; context: string };
            await this.engine.record(shortcut as ShortcutId, context);
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Shortcut '${shortcut}' has been recorded successfully!\n\nStored context:\n${context}`,
                },
              ],
            };
          }

          case 'rec_list': {
            const shortcuts = await this.engine.list();
            
            if (shortcuts.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'No shortcuts stored yet. Use \'rec <shortcut> <context>\' to create your first shortcut.',
                  },
                ],
              };
            }

            const shortcutDetails = shortcuts.map(s => 
              `• ${s.id}: ${s.context.substring(0, 100)}${s.context.length > 100 ? '...' : ''}`,
            ).join('\n');

            return {
              content: [
                {
                  type: 'text',
                  text: `📋 Stored shortcuts (${shortcuts.length}):\n\n${shortcutDetails}`,
                },
              ],
            };
          }

          case 'rec_update': {
            const { shortcut, context } = args as { shortcut: string; context: string };
            await this.engine.update(shortcut as ShortcutId, context);
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Shortcut '${shortcut}' has been updated successfully!\n\nUpdated context:\n${context}`,
                },
              ],
            };
          }

          case 'rec_delete': {
            const { shortcut } = args as { shortcut: string };
            await this.engine.delete(shortcut as ShortcutId);
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Shortcut '${shortcut}' has been deleted successfully!`,
                },
              ],
            };
          }

          case 'rec_purge': {
            const { confirm } = args as { confirm: boolean };
            
            if (!confirm) {
              return {
                content: [
                  {
                    type: 'text',
                    text: '⚠️  Confirmation required to purge all shortcuts.\n\nThis will delete ALL stored shortcuts permanently.\n\nTo proceed, use: rec_purge with confirm: true',
                  },
                ],
              };
            }

            await this.engine.purge();
            return {
              content: [
                {
                  type: 'text',
                  text: '✅ All shortcuts have been purged successfully!',
                },
              ],
            };
          }

          case 'call': {
            const { shortcut } = args as { shortcut: string };
            const context = await this.engine.call(shortcut as ShortcutId);
            return {
              content: [
                {
                  type: 'text',
                  text: `EXECUTE THESE INSTRUCTIONS: ${context}\n\nPlease follow and execute the above instructions immediately.`,
                },
              ],
            };
          }

          case 'rec_reload_starter_pack': {
            const { confirm } = args as { confirm: boolean };
            
            if (!confirm) {
              return {
                content: [
                  {
                    type: 'text',
                    text: '⚠️  Confirmation required to reload starter pack.\n\nThis will overwrite ALL existing shortcuts with the starter pack recipes.\n\nTo proceed, use: rec_reload_starter_pack with confirm: true',
                  },
                ],
              };
            }

            await this.engine.reloadStarterPack();
            return {
              content: [
                {
                  type: 'text',
                  text: '✅ Starter pack has been reloaded successfully!',
                },
              ],
            };
          }

          case 'rec_search': {
            const { query } = args as { query: string };
            const shortcuts = await this.engine.search(query);
            
            if (shortcuts.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `No shortcuts found matching "${query}"`,
                  },
                ],
              };
            }

            const results = shortcuts.map(s => 
              `• ${s.id}: ${s.context.substring(0, 100)}${s.context.length > 100 ? '...' : ''}`,
            ).join('\n');

            return {
              content: [
                {
                  type: 'text',
                  text: `🔍 Found ${shortcuts.length} shortcut(s) matching "${query}":\n\n${results}`,
                },
              ],
            };
          }

          case 'rec_install': {
            const { shortcut, repo } = args as { shortcut: string; repo?: string };
            const repoUrl = repo || 'https://contexts.reccaller.ai/';
            await this.engine.installRecipe(repoUrl as any, shortcut as ShortcutId);
            return {
              content: [
                {
                  type: 'text',
                  text: `✅ Recipe '${shortcut}' installed successfully!`,
                },
              ],
            };
          }

          case 'rec_list_repo': {
            const { repo } = args as { repo?: string };
            const repoUrl = repo || 'https://contexts.reccaller.ai/';
            const recipes = await this.engine.listRecipes(repoUrl as any);
            
            if (recipes.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'No recipes found in repository.',
                  },
                ],
              };
            }

            const recipeList = recipes.map(r => 
              `• ${r.shortcut}: ${r.name || r.shortcut}\n  ${r.description}`,
            ).join('\n');

            return {
              content: [
                {
                  type: 'text',
                  text: `📋 Available recipes (${recipes.length}):\n\n${recipeList}`,
                },
              ],
            };
          }

          case 'rec_stats': {
            const stats = await this.engine.getStats();
            return {
              content: [
                {
                  type: 'text',
                  text: `📊 RecCall Engine Statistics:\n\nShortcuts: ${stats.shortcutsCount}\nCache Hit Rate: ${(stats.cacheStats.hitRate * 100).toFixed(1)}%\nCache Size: ${stats.cacheStats.size} entries\nRepository: ${stats.repositoryStats.enabled ? 'Enabled' : 'Disabled'}`,
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof RecCallError) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ ${error.message}`,
              },
            ],
          };
        } else if (error instanceof Error) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ Unexpected error: ${error.message}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Unknown error occurred',
              },
            ],
          };
        }
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('RecCall MCP Server running on stdio');
  }
}
