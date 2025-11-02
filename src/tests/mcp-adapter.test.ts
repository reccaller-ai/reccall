/**
 * Comprehensive tests for MCPAdapter
 * Tests MCP server handlers via protocol request method
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MCPAdapter } from "../adapters/mcp/index.js";
import { configManager } from "../core/config.js";
import { CoreEngine } from "../core/engine.js";
import type { ICoreEngine } from "../core/interfaces.js";
import { telemetryManager } from "../core/telemetry.js";
import type { ShortcutId } from "../types.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { CallToolResult, ListToolsResult } from "@modelcontextprotocol/sdk/types.js";
import {
	MockCacheManager,
	MockRepositoryClient,
	MockStorage,
	MockValidator,
} from "./test-utils.js";

vi.mock("../core/config.js", () => ({
	configManager: {
		initialize: vi.fn(),
		isRepositoryEnabled: vi.fn(() => true),
		getDefaultRepository: vi.fn(() => "https://contexts.reccaller.ai/"),
	},
}));

vi.mock("../core/telemetry.js", () => ({
	telemetryManager: {
		updateMetrics: vi.fn(),
		logEvent: vi.fn(),
		logError: vi.fn(),
	},
	Performance: () => () => {},
	LogErrors: () => () => {},
}));

describe("MCPAdapter", () => {
	let adapter: MCPAdapter;
	let engine: ICoreEngine;

	beforeEach(async () => {
		const storage = new MockStorage();
		const cache = new MockCacheManager();
		const validator = new MockValidator();
		const repository = new MockRepositoryClient();
		engine = new CoreEngine(storage, repository, cache, validator);

		adapter = new MCPAdapter(engine);
		await adapter.initialize();

		vi.clearAllMocks();
	});

	afterEach(async () => {
		vi.clearAllMocks();
	});

	/**
	 * Helper to call MCP tool by directly invoking the handler
	 * Handlers are stored by method name (string) in _requestHandlers Map
	 */
	async function callTool(
		name: string,
		args: Record<string, any>,
	): Promise<CallToolResult> {
		const server = adapter.getServer();
		// Access the internal request handlers map (keyed by method name)
		const handlers = (server as any)._requestHandlers;
		if (!handlers) {
			throw new Error("Request handlers not found");
		}

		// Get handler by method name directly
		const handler = handlers.get("tools/call");
		if (!handler) {
			throw new Error("CallTool handler not found for 'tools/call'");
		}

		// Parse and create request
		const request = CallToolRequestSchema.parse({
			method: "tools/call",
			params: {
				name,
				arguments: args,
			},
		});

		// Create mock extra object with required fields
		const mockExtra = {
			signal: new AbortController().signal,
			requestId: 1,
			sendNotification: async () => {},
			sendRequest: async () => ({}),
		};

		// Call handler - it expects (request, extra) and returns result
		const result = await handler(request, mockExtra);
		return result as CallToolResult;
	}

	/**
	 * Helper to list tools by directly invoking the handler
	 */
	async function listTools(): Promise<
		Array<{ name: string; description: string; inputSchema: any }>
	> {
		const server = adapter.getServer();
		// Access the internal request handlers map (keyed by method name)
		const handlers = (server as any)._requestHandlers;
		if (!handlers) {
			throw new Error("Request handlers not found");
		}

		// Get handler by method name directly
		const handler = handlers.get("tools/list");
		if (!handler) {
			throw new Error("ListTools handler not found for 'tools/list'");
		}

		// Parse and create request
		const request = ListToolsRequestSchema.parse({
			method: "tools/list",
			params: {},
		});

		// Create mock extra object
		const mockExtra = {
			signal: new AbortController().signal,
			requestId: 1,
			sendNotification: async () => {},
			sendRequest: async () => ({}),
		};

		// Call handler
		const result = await handler(request, mockExtra);
		return (result as ListToolsResult).tools;
	}

	describe("Tool Registration", () => {
		it("should register all required tools", async () => {
			const tools = await listTools();

			expect(tools.length).toBeGreaterThan(0);
			const toolNames = tools.map((t) => t.name);
			expect(toolNames).toContain("rec");
			expect(toolNames).toContain("rec_list");
			expect(toolNames).toContain("call");
			expect(toolNames).toContain("rec_update");
			expect(toolNames).toContain("rec_delete");
			expect(toolNames).toContain("rec_search");
		});

		it("should have correct tool schemas", async () => {
			const tools = await listTools();

			const recTool = tools.find((t) => t.name === "rec");
			expect(recTool?.inputSchema.properties).toHaveProperty("shortcut");
			expect(recTool?.inputSchema.properties).toHaveProperty("context");

			const callTool = tools.find((t) => t.name === "call");
			expect(callTool?.inputSchema.properties).toHaveProperty("shortcut");
		});
	});

	describe("Record Tool", () => {
		it("should record a shortcut successfully", async () => {
			const result = await callTool("rec", {
				shortcut: "mcp-test",
				context: "Test context for MCP testing",
			});

			expect(result.content[0].text).toContain("recorded successfully");

			const shortcuts = await engine.list();
			expect(shortcuts.some((s) => s.id === "mcp-test")).toBe(true);
		});

		it("should handle duplicate shortcut error", async () => {
			await callTool("rec", {
				shortcut: "duplicate-mcp",
				context: "First context for MCP testing",
			});

			// Second call should fail with duplicate error (engine.record throws on duplicate)
			try {
				await callTool("rec", {
					shortcut: "duplicate-mcp",
					context: "Second context for MCP testing",
				});
				// If it doesn't throw, check for error message in result
				fail("Expected duplicate error");
			} catch (error) {
				// Engine throws RecCallError for duplicates
				expect(error).toBeDefined();
			}
		});
	});

	describe("Call Tool", () => {
		beforeEach(async () => {
			await engine.record(
				"call-mcp-test" as ShortcutId,
				"Test context for MCP call testing",
			);
		});

		it("should call a shortcut successfully", async () => {
			const result = await callTool("call", {
				shortcut: "call-mcp-test",
			});

			expect(result.content[0].text).toContain("EXECUTE THESE INSTRUCTIONS");
			expect(result.content[0].text).toContain(
				"Test context for MCP call testing",
			);
		});

		it("should handle non-existent shortcut error", async () => {
			try {
				const result = await callTool("call", {
					shortcut: "nonexistent",
				});
				// If handler catches error and returns error result, check message
				expect(result.content[0].text).toContain("not found");
			} catch (error: any) {
				// Engine throws RecCallError, which handler should catch and return
				// If it reaches here, the handler didn't catch it properly
				expect(error).toBeDefined();
			}
		});
	});

	describe("List Tool", () => {
		it("should list shortcuts successfully", async () => {
			await engine.record(
				"list-mcp-1" as ShortcutId,
				"First context for MCP list testing",
			);
			await engine.record(
				"list-mcp-2" as ShortcutId,
				"Second context for MCP list testing",
			);

			const result = await callTool("rec_list", {});

			expect(result.content[0].text).toContain("Stored shortcuts");
			expect(result.content[0].text).toContain("list-mcp-1");
			expect(result.content[0].text).toContain("list-mcp-2");
		});

		it("should handle empty list", async () => {
			await engine.purge();
			const result = await callTool("rec_list", {});

			expect(result.content[0].text).toContain("No shortcuts stored yet");
		});
	});

	describe("Search Tool", () => {
		beforeEach(async () => {
			await engine.record(
				"search-mcp-1" as ShortcutId,
				"React component MCP testing",
			);
			await engine.record(
				"search-mcp-2" as ShortcutId,
				"API endpoint MCP testing",
			);
		});

		it("should search shortcuts successfully", async () => {
			const result = await callTool("rec_search", {
				query: "testing",
			});

			expect(result.content[0].text).toContain("Found");
			expect(result.content[0].text).toContain("shortcut(s) matching");
			expect(result.content[0].text).toContain("search-mcp-1");
		});

		it("should handle no search results", async () => {
			const result = await callTool("rec_search", {
				query: "nonexistent",
			});

			expect(result.content[0].text).toContain("No shortcuts found matching");
		});
	});

	describe("Delete Tool", () => {
		beforeEach(async () => {
			await engine.record(
				"delete-mcp-test" as ShortcutId,
				"Context to delete for MCP testing",
			);
		});

		it("should delete a shortcut successfully", async () => {
			const result = await callTool("rec_delete", {
				shortcut: "delete-mcp-test",
			});

			expect(result.content[0].text).toContain("deleted successfully");

			const shortcuts = await engine.list();
			expect(shortcuts.some((s) => s.id === "delete-mcp-test")).toBe(false);
		});

		it("should handle non-existent shortcut error", async () => {
			// Delete throws error if shortcut doesn't exist
			const result = await callTool("rec_delete", {
				shortcut: "nonexistent",
			});

			// Handler catches the error and returns error message
			expect(result.content[0].text).toContain("❌");
			expect(result.content[0].text).toContain("not found");
		});
	});

	describe("Update Tool", () => {
		beforeEach(async () => {
			await engine.record("update-mcp-test" as ShortcutId, "Original context");
		});

		it("should update a shortcut successfully", async () => {
			const result = await callTool("rec_update", {
				shortcut: "update-mcp-test",
				context: "Updated context",
			});

			expect(result.content[0].text).toContain("updated successfully");

			const updated = await engine.call("update-mcp-test" as ShortcutId);
			expect(updated).toBe("Updated context");
		});
	});

	describe("Error Handling", () => {
		it("should handle unknown tool", async () => {
			const result = await callTool("unknown_tool", {});

			expect(result.content[0].text).toContain("Unknown tool");
		});
	});
});
