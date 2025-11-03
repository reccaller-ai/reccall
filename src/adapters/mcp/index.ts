/**
 * MCP adapter for RecCall core engine
 * Supports both stdio (Cursor) and HTTP (Perplexity/Sora) transports
 */

import { randomUUID } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express, { type Express } from "express";
import type { ContextEngine } from "../../core/context-engine.js";
import type { ICoreEngine } from "../../core/interfaces.js";
import { RecCallError } from "../../types.js";
import type { ShortcutId } from "../../types.js";

export interface MCPStartOptions {
	stdio?: boolean; // Start stdio transport for Cursor (default: true)
	http?:
		| {
				port?: number; // HTTP server port (default: 3000)
				expressApp?: Express; // Optional existing Express app
		  }
		| false; // Set to false to disable HTTP transport
}

export class MCPAdapter {
	private engine: ICoreEngine;
	private contextEngine?: ContextEngine;
	private server: Server;
	private toolsCache: any = null;
	private cacheTimestamp = 0;
	private readonly CACHE_TTL = 60000; // 1 minute cache for tools list

	// Transport instances
	private stdioTransport?: StdioServerTransport;
	private httpServer?: ReturnType<Express["listen"]>;
	private httpServerInstance?: Server; // Separate server instance for HTTP to avoid transport conflicts

	/**
	 * Get the underlying MCP Server instance (for testing)
	 */
	getServer(): Server {
		return this.server;
	}

	constructor(engine: ICoreEngine, contextEngine?: ContextEngine) {
		this.engine = engine;
		if (contextEngine !== undefined) {
			this.contextEngine = contextEngine;
		}
		this.server = new Server(
			{
				name: "reccall",
				version: "1.0.0",
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

	/**
	 * Setup handlers on a server instance (used for both stdio and HTTP servers)
	 */
	private setupHandlersOnServer(server: Server): void {
		this.setupHandlersForServer(server);
	}

	private setupHandlers(): void {
		this.setupHandlersForServer(this.server);
	}

	/**
	 * Setup handlers on a specific server instance
	 * This allows us to have separate server instances for stdio and HTTP
	 */
	private setupHandlersForServer(server: Server): void {
		// List available tools (cached for performance)
		server.setRequestHandler(ListToolsRequestSchema, async () => {
			// Cache tools list to reduce overhead
			const now = Date.now();
			if (this.toolsCache && now - this.cacheTimestamp < this.CACHE_TTL) {
				return this.toolsCache;
			}

			const toolsResponse = {
				tools: [
					{
						name: "rec",
						description: "Record a new context shortcut with instructions",
						inputSchema: {
							type: "object",
							properties: {
								shortcut: {
									type: "string",
									description: "The shortcut name/alias",
								},
								context: {
									type: "string",
									description: "The context or instruction to store",
								},
							},
							required: ["shortcut", "context"],
						},
					},
					{
						name: "rec_list",
						description:
							"List all stored context shortcuts (equivalent to rec -l)",
						inputSchema: {
							type: "object",
							properties: {},
							required: [],
						},
					},
					{
						name: "rec_update",
						description:
							"Update/replace an existing context shortcut (equivalent to rec -u <shortcut> <context>)",
						inputSchema: {
							type: "object",
							properties: {
								shortcut: {
									type: "string",
									description: "The shortcut name/alias to update",
								},
								context: {
									type: "string",
									description: "The new context or instruction to store",
								},
							},
							required: ["shortcut", "context"],
						},
					},
					{
						name: "rec_delete",
						description:
							"Delete a context shortcut if it exists (idempotent operation)",
						inputSchema: {
							type: "object",
							properties: {
								shortcut: {
									type: "string",
									description: "The shortcut name/alias to delete",
								},
							},
							required: ["shortcut"],
						},
					},
					{
						name: "rec_purge",
						description: "Purge all stored shortcuts (requires confirmation)",
						inputSchema: {
							type: "object",
							properties: {
								confirm: {
									type: "boolean",
									description:
										"Confirmation to proceed with purging all shortcuts",
								},
							},
							required: ["confirm"],
						},
					},
					{
						name: "call",
						description:
							"Call a stored context shortcut and execute the instructions immediately",
						inputSchema: {
							type: "object",
							properties: {
								shortcut: {
									type: "string",
									description: "The shortcut name/alias to recall",
								},
							},
							required: ["shortcut"],
						},
					},
					{
						name: "rec_reload_starter_pack",
						description:
							"Reload the starter pack recipes (overwrites existing shortcuts)",
						inputSchema: {
							type: "object",
							properties: {
								confirm: {
									type: "boolean",
									description:
										"Confirmation to reload starter pack (this will overwrite existing shortcuts)",
								},
							},
							required: ["confirm"],
						},
					},
					{
						name: "rec_search",
						description: "Search shortcuts by content",
						inputSchema: {
							type: "object",
							properties: {
								query: {
									type: "string",
									description: "Search query",
								},
							},
							required: ["query"],
						},
					},
					{
						name: "rec_install",
						description: "Install a recipe from the repository",
						inputSchema: {
							type: "object",
							properties: {
								shortcut: {
									type: "string",
									description: "The shortcut name to install",
								},
								repo: {
									type: "string",
									description: "Repository URL (optional)",
								},
							},
							required: ["shortcut"],
						},
					},
					{
						name: "rec_list_repo",
						description: "List available recipes from repository",
						inputSchema: {
							type: "object",
							properties: {
								repo: {
									type: "string",
									description: "Repository URL (optional)",
								},
							},
							required: [],
						},
					},
					{
						name: "rec_stats",
						description: "Get engine statistics",
						inputSchema: {
							type: "object",
							properties: {},
							required: [],
						},
					},
					// Context tools (Universal Context System)
					{
						name: "rec_context_create",
						description: "Create a new static context",
						inputSchema: {
							type: "object",
							properties: {
								name: { type: "string", description: "Context name" },
								content: {
									type: "string",
									description: "Context content (markdown)",
								},
								source: {
									type: "string",
									enum: ["local", "global"],
									description: "Storage location",
								},
								tags: {
									type: "array",
									items: { type: "string" },
									description: "Optional tags",
								},
								category: { type: "string", description: "Optional category" },
								description: {
									type: "string",
									description: "Optional description",
								},
								repository: {
									type: "string",
									description: "Optional repository name",
								},
							},
							required: ["name", "content", "source"],
						},
					},
					{
						name: "rec_context_get",
						description: "Get a context by name or ID",
						inputSchema: {
							type: "object",
							properties: {
								identifier: {
									type: "string",
									description: "Context name or ID",
								},
							},
							required: ["identifier"],
						},
					},
					{
						name: "rec_context_search",
						description: "Search contexts by query",
						inputSchema: {
							type: "object",
							properties: {
								query: { type: "string", description: "Search query" },
								source: {
									type: "string",
									enum: ["local", "global", "remote", "all"],
									description: "Filter by source",
								},
								type: {
									type: "string",
									enum: ["static", "dynamic", "hybrid", "all"],
									description: "Filter by type",
								},
							},
							required: ["query"],
						},
					},
					{
						name: "rec_context_list",
						description: "List all contexts",
						inputSchema: {
							type: "object",
							properties: {
								source: { type: "string", enum: ["local", "global", "all"] },
								type: {
									type: "string",
									enum: ["static", "dynamic", "hybrid", "all"],
								},
							},
						},
					},
					{
						name: "rec_context_delete",
						description: "Delete a context",
						inputSchema: {
							type: "object",
							properties: {
								id: { type: "string", description: "Context ID" },
							},
							required: ["id"],
						},
					},
					{
						name: "rec_context_from_conversation",
						description:
							"Create a dynamic context from conversation (ML-powered)",
						inputSchema: {
							type: "object",
							properties: {
								name: { type: "string", description: "Context name" },
								messages: {
									type: "array",
									items: {
										type: "object",
										properties: {
											role: { type: "string", enum: ["user", "assistant"] },
											content: { type: "string" },
											timestamp: { type: "string" },
										},
									},
									description: "Conversation messages",
								},
								source: { type: "string", enum: ["local", "global"] },
								tags: { type: "array", items: { type: "string" } },
							},
							required: ["name", "messages", "source"],
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
		server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;

			try {
				switch (name) {
					case "rec": {
						const { shortcut, context } = args as {
							shortcut: string;
							context: string;
						};
						await this.engine.record(shortcut as ShortcutId, context);
						return {
							content: [
								{
									type: "text",
									text: `✅ Shortcut '${shortcut}' has been recorded successfully!\n\nStored context:\n${context}`,
								},
							],
						};
					}

					case "rec_list": {
						const shortcuts = await this.engine.list();

						if (shortcuts.length === 0) {
							return {
								content: [
									{
										type: "text",
										text: "No shortcuts stored yet. Use 'rec <shortcut> <context>' to create your first shortcut.",
									},
								],
							};
						}

						const shortcutDetails = shortcuts
							.map((s) => {
								// Safely handle context - ensure it's a string
								let contextStr: string;
								if (typeof s.context === 'string') {
									contextStr = s.context;
								} else if (s.context !== null && s.context !== undefined) {
									// Convert to string if it's not already
									contextStr = String(s.context);
								} else {
									contextStr = '(no context)';
								}
								
								const preview = contextStr.length > 100 
									? contextStr.substring(0, 100) + '...' 
									: contextStr;
								
								return `• ${s.id}: ${preview}`;
							})
							.join("\n");

						return {
							content: [
								{
									type: "text",
									text: `📋 Stored shortcuts (${shortcuts.length}):\n\n${shortcutDetails}`,
								},
							],
						};
					}

					case "rec_update": {
						const { shortcut, context } = args as {
							shortcut: string;
							context: string;
						};
						await this.engine.update(shortcut as ShortcutId, context);
						return {
							content: [
								{
									type: "text",
									text: `✅ Shortcut '${shortcut}' has been updated successfully!\n\nUpdated context:\n${context}`,
								},
							],
						};
					}

					case "rec_delete": {
						const { shortcut } = args as { shortcut: string };
						await this.engine.delete(shortcut as ShortcutId);
						return {
							content: [
								{
									type: "text",
									text: `✅ Shortcut '${shortcut}' has been deleted successfully!`,
								},
							],
						};
					}

					case "rec_purge": {
						const { confirm } = args as { confirm: boolean };

						if (!confirm) {
							return {
								content: [
									{
										type: "text",
										text: "⚠️  Confirmation required to purge all shortcuts.\n\nThis will delete ALL stored shortcuts permanently.\n\nTo proceed, use: rec_purge with confirm: true",
									},
								],
							};
						}

						await this.engine.purge();
						return {
							content: [
								{
									type: "text",
									text: "✅ All shortcuts have been purged successfully!",
								},
							],
						};
					}

					case "call": {
						const { shortcut } = args as { shortcut: string };
						
						// Try to get from old shortcut system first
						let contextStr: string | null = null;
						try {
							const context = await this.engine.call(shortcut as ShortcutId);
							if (context) {
								contextStr = context;
							}
						} catch (error) {
							// Shortcut not found in old system, try Context system
							if (this.contextEngine) {
								try {
									const context = await this.contextEngine.use(shortcut, "mcp");
									if (context) {
										// Safely handle context content
										if (typeof context.content === 'string') {
											contextStr = context.content;
										} else if (context.content !== null && context.content !== undefined) {
											contextStr = String(context.content);
										}
									}
								} catch (contextError) {
									// Context not found either
								}
							}
						}
						
						// If still not found, show error
						if (!contextStr) {
							return {
								content: [
									{
										type: "text",
										text: `❌ Shortcut or context '${shortcut}' not found. Use 'rec <shortcut> <context>' to create a shortcut, or 'rec_context_create' to create a context.`,
									},
								],
							};
						}
						
						// Safely handle context - ensure it's a string
						if (typeof contextStr !== 'string') {
							contextStr = String(contextStr);
						}
						
						return {
							content: [
								{
									type: "text",
									text: `EXECUTE THESE INSTRUCTIONS: ${contextStr}\n\nPlease follow and execute the above instructions immediately.`,
								},
							],
						};
					}

					case "rec_reload_starter_pack": {
						const { confirm } = args as { confirm: boolean };

						if (!confirm) {
							return {
								content: [
									{
										type: "text",
										text: "⚠️  Confirmation required to reload starter pack.\n\nThis will overwrite ALL existing shortcuts with the starter pack recipes.\n\nTo proceed, use: rec_reload_starter_pack with confirm: true",
									},
								],
							};
						}

						await this.engine.reloadStarterPack();
						return {
							content: [
								{
									type: "text",
									text: "✅ Starter pack has been reloaded successfully!",
								},
							],
						};
					}

					case "rec_search": {
						const { query } = args as { query: string };
						const shortcuts = await this.engine.search(query);

						if (shortcuts.length === 0) {
							return {
								content: [
									{
										type: "text",
										text: `No shortcuts found matching "${query}"`,
									},
								],
							};
						}

						const results = shortcuts
							.map((s) => {
								// Safely handle context - ensure it's a string
								let contextStr: string;
								if (typeof s.context === 'string') {
									contextStr = s.context;
								} else if (s.context !== null && s.context !== undefined) {
									// Convert to string if it's not already
									contextStr = String(s.context);
								} else {
									contextStr = '(no context)';
								}
								
								const preview = contextStr.length > 100 
									? contextStr.substring(0, 100) + '...' 
									: contextStr;
								
								return `• ${s.id}: ${preview}`;
							})
							.join("\n");

						return {
							content: [
								{
									type: "text",
									text: `🔍 Found ${shortcuts.length} shortcut(s) matching "${query}":\n\n${results}`,
								},
							],
						};
					}

					case "rec_install": {
						const { shortcut, repo } = args as {
							shortcut: string;
							repo?: string;
						};
						const repoUrl = repo || "https://contexts.reccaller.ai/";
						await this.engine.installRecipe(
							repoUrl as any,
							shortcut as ShortcutId,
						);
						return {
							content: [
								{
									type: "text",
									text: `✅ Recipe '${shortcut}' installed successfully!`,
								},
							],
						};
					}

					case "rec_list_repo": {
						const { repo } = args as { repo?: string };
						const repoUrl = repo || "https://contexts.reccaller.ai/";
						const recipes = await this.engine.listRecipes(repoUrl as any);

						if (recipes.length === 0) {
							return {
								content: [
									{
										type: "text",
										text: "No recipes found in repository.",
									},
								],
							};
						}

						const recipeList = recipes
							.map((r) => {
								// Safely handle recipe fields - ensure they're strings
								const shortcut = typeof r.shortcut === 'string' ? r.shortcut : String(r.shortcut || 'unknown');
								const name = typeof r.name === 'string' ? r.name : (r.name ? String(r.name) : shortcut);
								const description = typeof r.description === 'string' ? r.description : (r.description ? String(r.description) : '(no description)');
								return `• ${shortcut}: ${name}\n  ${description}`;
							})
							.join("\n");

						return {
							content: [
								{
									type: "text",
									text: `📋 Available recipes (${recipes.length}):\n\n${recipeList}`,
								},
							],
						};
					}

					case "rec_stats": {
						const stats = await this.engine.getStats();
						return {
							content: [
								{
									type: "text",
									text: `📊 RecCall Engine Statistics:\n\nShortcuts: ${stats.shortcutsCount}\nCache Hit Rate: ${(stats.cacheStats.hitRate * 100).toFixed(1)}%\nCache Size: ${stats.cacheStats.size} entries\nRepository: ${stats.repositoryStats.enabled ? "Enabled" : "Disabled"}`,
								},
							],
						};
					}

					// Context tools (Universal Context System)
					case "rec_context_create": {
						if (!this.contextEngine) {
							throw new Error("Context engine not initialized");
						}
						const {
							name,
							content,
							source,
							tags,
							category,
							description,
							repository,
						} = args as {
							name: string;
							content: string;
							source: "local" | "global";
							tags?: string[];
							category?: string;
							description?: string;
							repository?: string;
						};
						const createParams: any = {
							name,
							content,
							source,
						};
						if (tags !== undefined) {
							createParams.tags = tags;
						}
						if (category !== undefined) {
							createParams.category = category;
						}
						if (description !== undefined) {
							createParams.description = description;
						}
						if (repository !== undefined) {
							createParams.repository = repository;
						}
						const context = await this.contextEngine.createStatic(createParams);
						return {
							content: [
								{
									type: "text",
									text: `✅ Context '${context.name}' created successfully (ID: ${context.id})`,
								},
							],
						};
					}

					case "rec_context_get": {
						if (!this.contextEngine) {
							throw new Error("Context engine not initialized");
						}
						const { identifier } = args as { identifier: string };
						const context = await this.contextEngine.use(identifier, "mcp");
						if (!context) {
							return {
								content: [
									{
										type: "text",
										text: `Context '${identifier}' not found`,
									},
								],
							};
						}
						
						// Safely handle context content - ensure it's a string
						let contentStr: string;
						if (typeof context.content === 'string') {
							contentStr = context.content;
						} else if (context.content !== null && context.content !== undefined) {
							// Convert to string if it's not already
							contentStr = String(context.content);
						} else {
							contentStr = '(no content available)';
						}
						
						return {
							content: [
								{
									type: "text",
									text: contentStr,
								},
							],
						};
					}

					case "rec_context_search": {
						if (!this.contextEngine) {
							throw new Error("Context engine not initialized");
						}
						const { query, source, type } = args as {
							query: string;
							source?: "local" | "global" | "remote" | "all";
							type?: "static" | "dynamic" | "hybrid" | "all";
						};
						const filters: any = {};
						if (source !== undefined) {
							filters.source = source;
						}
						if (type !== undefined) {
							filters.type = type;
						}
						const results = await this.contextEngine.search(query, filters);
						return {
							content: [
								{
									type: "text",
									text: JSON.stringify(
										{
											count: results.length,
											contexts: results.map((c) => ({
												id: typeof c.id === 'string' ? c.id : String(c.id || 'unknown'),
												name: typeof c.name === 'string' ? c.name : String(c.name || 'unnamed'),
												description: typeof c.description === 'string' ? c.description : (c.description ? String(c.description) : undefined),
												tags: Array.isArray(c.tags) ? c.tags.map(t => typeof t === 'string' ? t : String(t)) : [],
												type: typeof c.type === 'string' ? c.type : String(c.type || 'static'),
												source: typeof c.source === 'string' ? c.source : String(c.source || 'local'),
											})),
										},
										null,
										2,
									),
								},
							],
						};
					}

					case "rec_context_list": {
						if (!this.contextEngine) {
							throw new Error("Context engine not initialized");
						}
						const { source, type } = args as {
							source?: "local" | "global" | "all";
							type?: "static" | "dynamic" | "hybrid" | "all";
						};
						const filters: any = {};
						if (source !== undefined) {
							filters.source = source;
						}
						if (type !== undefined) {
							filters.type = type;
						}
						const contexts = await this.contextEngine.list(filters);
						return {
							content: [
								{
									type: "text",
									text: JSON.stringify(
										{
											count: contexts.length,
											contexts: contexts.map((c) => ({
												id: typeof c.id === 'string' ? c.id : String(c.id || 'unknown'),
												name: typeof c.name === 'string' ? c.name : String(c.name || 'unnamed'),
												description: typeof c.description === 'string' ? c.description : (c.description ? String(c.description) : undefined),
												type: typeof c.type === 'string' ? c.type : String(c.type || 'static'),
												source: typeof c.source === 'string' ? c.source : String(c.source || 'local'),
											})),
										},
										null,
										2,
									),
								},
							],
						};
					}

					case "rec_context_delete": {
						if (!this.contextEngine) {
							throw new Error("Context engine not initialized");
						}
						const { id } = args as { id: string };
						await this.contextEngine.delete(id);
						return {
							content: [
								{
									type: "text",
									text: `✅ Context deleted successfully`,
								},
							],
						};
					}

					case "rec_context_from_conversation": {
						if (!this.contextEngine) {
							throw new Error("Context engine not initialized");
						}
						const { name, messages, source, tags } = args as {
							name: string;
							messages: Array<{
								role: string;
								content: string;
								timestamp?: string;
							}>;
							source: "local" | "global";
							tags?: string[];
						};
						const createParams: any = {
							name,
							messages: messages.map((msg) => ({
								role: msg.role as "user" | "assistant",
								content: msg.content,
								timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
							})),
							source,
						};
						if (tags !== undefined) {
							createParams.tags = tags;
						}
						const context =
							await this.contextEngine.createFromConversation(createParams);
						return {
							content: [
								{
									type: "text",
									text: `✅ Dynamic context '${context.name}' created successfully (ID: ${context.id})`,
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
								type: "text",
								text: `❌ ${error.message}`,
							},
						],
					};
				} else if (error instanceof Error) {
					return {
						content: [
							{
								type: "text",
								text: `❌ Unexpected error: ${error.message}`,
							},
						],
					};
				} else {
					return {
						content: [
							{
								type: "text",
								text: "❌ Unknown error occurred",
							},
						],
					};
				}
			}
		});
	}

	/**
	 * Start MCP server with specified transport(s)
	 * @param options Transport configuration options
	 */
	async start(
		options: MCPStartOptions = { stdio: true, http: { port: 3000 } },
	): Promise<void> {
		// Start stdio transport (for Cursor) - default enabled
		if (options.stdio !== false) {
			this.stdioTransport = new StdioServerTransport();
			await this.server.connect(this.stdioTransport);
			console.error("RecCall MCP Server running on stdio (Cursor)");
		}

		// Start HTTP transport (for Perplexity/Sora) - default enabled
		if (options.http !== undefined && options.http !== false) {
			const httpConfig = options.http;
			const port = httpConfig.port ?? 3000;
			const app = httpConfig.expressApp ?? express();

			// Middleware for JSON parsing
			if (!httpConfig.expressApp) {
				app.use(express.json());
			}

			// Create a separate server instance for HTTP to avoid transport conflicts with stdio
			// The stdio server (this.server) is already connected to stdio transport
			// HTTP needs its own server instance to handle concurrent requests
			this.httpServerInstance = new Server(
				{
					name: "reccall-http",
					version: "1.0.0",
				},
				{
					capabilities: {
						tools: {},
					},
				},
			);

			// Setup the same handlers on HTTP server instance
			this.setupHandlersOnServer(this.httpServerInstance);

			// HTTP transport - according to SDK docs, create transport per request
			// For HTTP, we use a stateless approach (no session ID) to allow multiple concurrent requests
			app.post("/mcp", async (req, res) => {
				try {
					// Create a new transport for each request to prevent request ID collisions
					// Stateless mode (no session ID) for better concurrent request handling
					const transport = new StreamableHTTPServerTransport({
						sessionIdGenerator: undefined, // Stateless mode
						enableJsonResponse: true, // Use JSON responses for simpler browser integration
					});

					// Clean up transport when response closes
					res.on("close", () => {
						transport.close();
					});

					// Connect HTTP server instance to this transport and handle request
					await this.httpServerInstance!.connect(transport);
					await transport.handleRequest(req, res, req.body);
				} catch (error) {
					console.error("HTTP transport error:", error);
					if (!res.headersSent) {
						res.status(500).json({
							jsonrpc: "2.0",
							id: req.body?.id ?? null,
							error: {
								code: -32603,
								message: "Internal error",
								data: error instanceof Error ? error.message : String(error),
							},
						});
					}
				}
			});

			// Start HTTP server if we created the app
			if (!httpConfig.expressApp) {
				try {
					this.httpServer = app.listen(port, () => {
						console.error(
							`RecCall MCP HTTP server running on http://localhost:${port}/mcp`,
						);
					});
					
					// Handle port conflicts gracefully (don't crash if port is in use)
					this.httpServer.on('error', (error: NodeJS.ErrnoException) => {
						if (error.code === 'EADDRINUSE') {
							console.error(
								`⚠️  HTTP server port ${port} is already in use. Continuing with stdio transport only.`,
							);
							// Don't crash - stdio transport will still work fine
							// Close the server instance if it was created
							const server = this.httpServer;
							if (server) {
								server.close();
								delete (this as any).httpServer;
							}
						} else {
							// Re-throw other errors
							throw error;
						}
					});
				} catch (error: any) {
					// Catch port conflict errors during listen() call
					if (error?.code === 'EADDRINUSE') {
						console.error(
							`⚠️  HTTP server port ${port} is already in use. Continuing with stdio transport only.`,
						);
						// Don't crash - stdio transport will still work fine
						delete (this as any).httpServer;
					} else {
						// Re-throw other errors
						throw error;
					}
				}
			} else {
				console.error(
					`RecCall MCP HTTP transport attached to existing Express app at /mcp`,
				);
			}
		}
	}

	/**
	 * Stop all transports and clean up
	 */
	async stop(): Promise<void> {
		// Close HTTP server if we started it
		if (this.httpServer) {
			return new Promise((resolve, reject) => {
				this.httpServer?.close((err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
		}
	}

	/**
	 * Get HTTP server port (if HTTP transport is active)
	 */
	getHttpPort(): number | undefined {
		return this.httpServer
			? (this.httpServer.address() as { port: number })?.port
			: undefined;
	}
}
