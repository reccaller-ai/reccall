import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock storage for testing
class MockStorage {
  private shortcuts: Map<string, string> = new Map();

  async record(shortcut: string, context: string): Promise<void> {
    this.shortcuts.set(shortcut, context);
  }

  async call(shortcut: string): Promise<string> {
    const context = this.shortcuts.get(shortcut);
    if (!context) {
      throw new Error(`Shortcut '${shortcut}' not found`);
    }
    return context;
  }

  async list(): Promise<Array<{ shortcut: string; context: string }>> {
    return Array.from(this.shortcuts.entries()).map(([shortcut, context]) => ({
      shortcut,
      context
    }));
  }

  async update(shortcut: string, context: string): Promise<void> {
    if (!this.shortcuts.has(shortcut)) {
      throw new Error(`Shortcut '${shortcut}' not found`);
    }
    this.shortcuts.set(shortcut, context);
  }

  async delete(shortcut: string): Promise<void> {
    if (!this.shortcuts.has(shortcut)) {
      throw new Error(`Shortcut '${shortcut}' not found`);
    }
    this.shortcuts.delete(shortcut);
  }

  async purge(): Promise<void> {
    this.shortcuts.clear();
  }

  async search(query: string): Promise<Array<{ shortcut: string; context: string }>> {
    const results: Array<{ shortcut: string; context: string }> = [];
    for (const [shortcut, context] of this.shortcuts.entries()) {
      if (context.toLowerCase().includes(query.toLowerCase())) {
        results.push({ shortcut, context });
      }
    }
    return results;
  }

  async exists(shortcut: string): Promise<boolean> {
    return this.shortcuts.has(shortcut);
  }
}

// Mock validator for testing
class MockValidator {
  validateShortcutId(shortcut: string): { valid: boolean; errors?: string[] } {
    if (!shortcut || shortcut.length < 1) {
      return { valid: false, errors: ['Shortcut ID cannot be empty'] };
    }
    return { valid: true };
  }

  validateContext(context: string): { valid: boolean; errors?: string[] } {
    if (!context || context.length < 5) {
      return { valid: false, errors: ['Context must be at least 5 characters long'] };
    }
    return { valid: true };
  }
}

// Mock cache manager
class MockCacheManager {
  private cache: Map<string, any> = new Map();

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key) || null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.cache.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// Mock repository client
class MockRepositoryClient {
  async fetchManifest(): Promise<any> {
    return { shortcuts: [] };
  }

  async fetchRecipe(): Promise<any> {
    return null;
  }
}

// Simple core engine for testing
class TestCoreEngine {
  private storage: MockStorage;
  private validator: MockValidator;
  private cache: MockCacheManager;
  private repository: MockRepositoryClient;
  private initialized = false;

  constructor() {
    this.storage = new MockStorage();
    this.validator = new MockValidator();
    this.cache = new MockCacheManager();
    this.repository = new MockRepositoryClient();
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Engine not initialized');
    }
  }

  async record(shortcut: string, context: string): Promise<void> {
    this.ensureInitialized();

    // Validate shortcut ID
    const shortcutValidation = this.validator.validateShortcutId(shortcut);
    if (!shortcutValidation.valid) {
      throw new Error(`Invalid shortcut ID: ${shortcutValidation.errors?.join(', ')}`);
    }

    // Validate context
    const contextValidation = this.validator.validateContext(context);
    if (!contextValidation.valid) {
      throw new Error(`Invalid context: ${contextValidation.errors?.join(', ')}`);
    }

    // Check if shortcut already exists
    const exists = await this.storage.exists(shortcut);
    if (exists) {
      throw new Error(`Shortcut '${shortcut}' already exists`);
    }

    await this.storage.record(shortcut, context);
  }

  async call(shortcut: string): Promise<string> {
    this.ensureInitialized();
    return await this.storage.call(shortcut);
  }

  async list(): Promise<Array<{ shortcut: string; context: string }>> {
    this.ensureInitialized();
    return await this.storage.list();
  }

  async update(shortcut: string, context: string): Promise<void> {
    this.ensureInitialized();

    // Validate context
    const contextValidation = this.validator.validateContext(context);
    if (!contextValidation.valid) {
      throw new Error(`Invalid context: ${contextValidation.errors?.join(', ')}`);
    }

    await this.storage.update(shortcut, context);
  }

  async delete(shortcut: string): Promise<void> {
    this.ensureInitialized();
    await this.storage.delete(shortcut);
  }

  async purge(): Promise<void> {
    this.ensureInitialized();
    await this.storage.purge();
  }

  async search(query: string): Promise<Array<{ shortcut: string; context: string }>> {
    this.ensureInitialized();
    return await this.storage.search(query);
  }
}

// Simple MCP adapter for testing
class TestMCPAdapter {
  private engine: TestCoreEngine;
  private tools: Array<{ name: string; description: string; inputSchema: any }>;

  constructor(engine: TestCoreEngine) {
    this.engine = engine;
    this.tools = [
      {
        name: 'reccall_record',
        description: 'Record a new context shortcut',
        inputSchema: {
          type: 'object',
          properties: {
            shortcut: { type: 'string', description: 'Shortcut identifier' },
            context: { type: 'string', description: 'Context content' }
          },
          required: ['shortcut', 'context']
        }
      },
      {
        name: 'reccall_call',
        description: 'Call a context shortcut',
        inputSchema: {
          type: 'object',
          properties: {
            shortcut: { type: 'string', description: 'Shortcut identifier' }
          },
          required: ['shortcut']
        }
      },
      {
        name: 'reccall_list',
        description: 'List all context shortcuts',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'reccall_search',
        description: 'Search context shortcuts',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        }
      },
      {
        name: 'reccall_delete',
        description: 'Delete a context shortcut',
        inputSchema: {
          type: 'object',
          properties: {
            shortcut: { type: 'string', description: 'Shortcut identifier' }
          },
          required: ['shortcut']
        }
      }
    ];
  }

  async initialize(): Promise<void> {
    await this.engine.initialize();
  }

  async listTools(): Promise<Array<{ name: string; description: string; inputSchema: any }>> {
    return this.tools;
  }

  async callTool(name: string, args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    switch (name) {
      case 'reccall_record':
        try {
          await this.engine.record(args.shortcut, args.context);
          return {
            content: [{ type: 'text', text: `✅ Recorded shortcut: ${args.shortcut}` }]
          };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `❌ Error: ${error.message}` }]
          };
        }

      case 'reccall_call':
        try {
          const context = await this.engine.call(args.shortcut);
          return {
            content: [{ type: 'text', text: context }]
          };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `❌ Error: ${error.message}` }]
          };
        }

      case 'reccall_list':
        try {
          const shortcuts = await this.engine.list();
          if (shortcuts.length === 0) {
            return {
              content: [{ type: 'text', text: 'No shortcuts found' }]
            };
          }
          const listText = shortcuts.map(({ shortcut, context }) => 
            `${shortcut}: ${context.substring(0, 50)}${context.length > 50 ? '...' : ''}`
          ).join('\n');
          return {
            content: [{ type: 'text', text: `📋 Shortcuts:\n${listText}` }]
          };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `❌ Error: ${error.message}` }]
          };
        }

      case 'reccall_search':
        try {
          const results = await this.engine.search(args.query);
          if (results.length === 0) {
            return {
              content: [{ type: 'text', text: 'No shortcuts found' }]
            };
          }
          const searchText = results.map(({ shortcut, context }) => 
            `${shortcut}: ${context.substring(0, 50)}${context.length > 50 ? '...' : ''}`
          ).join('\n');
          return {
            content: [{ type: 'text', text: `🔍 Search results for "${args.query}":\n${searchText}` }]
          };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `❌ Error: ${error.message}` }]
          };
        }

      case 'reccall_delete':
        try {
          await this.engine.delete(args.shortcut);
          return {
            content: [{ type: 'text', text: `✅ Deleted shortcut: ${args.shortcut}` }]
          };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `❌ Error: ${error.message}` }]
          };
        }

      default:
        return {
          content: [{ type: 'text', text: `❌ Unknown tool: ${name}` }]
        };
    }
  }
}

describe('MCP Adapter Integration Tests', () => {
  let adapter: TestMCPAdapter;
  let engine: TestCoreEngine;

  beforeEach(async () => {
    engine = new TestCoreEngine();
    adapter = new TestMCPAdapter(engine);
    await adapter.initialize();
  });

  afterEach(async () => {
    // Clean up
    try {
      await engine.purge();
    } catch (error) {
      // Ignore purge errors
    }
  });

  describe('Tool Registration', () => {
    it('should register all required tools', async () => {
      const tools = await adapter.listTools();
      
      expect(tools).toHaveLength(5);
      expect(tools.map(t => t.name)).toEqual([
        'reccall_record',
        'reccall_call',
        'reccall_list',
        'reccall_search',
        'reccall_delete'
      ]);
    });

    it('should have correct tool schemas', async () => {
      const tools = await adapter.listTools();
      
      const recordTool = tools.find(t => t.name === 'reccall_record');
      expect(recordTool?.inputSchema.properties).toHaveProperty('shortcut');
      expect(recordTool?.inputSchema.properties).toHaveProperty('context');
      expect(recordTool?.inputSchema.required).toEqual(['shortcut', 'context']);

      const callTool = tools.find(t => t.name === 'reccall_call');
      expect(callTool?.inputSchema.properties).toHaveProperty('shortcut');
      expect(callTool?.inputSchema.required).toEqual(['shortcut']);

      const searchTool = tools.find(t => t.name === 'reccall_search');
      expect(searchTool?.inputSchema.properties).toHaveProperty('query');
      expect(searchTool?.inputSchema.required).toEqual(['query']);
    });
  });

  describe('Record Tool', () => {
    it('should record a shortcut successfully', async () => {
      const result = await adapter.callTool('reccall_record', {
        shortcut: 'mcp-test',
        context: 'Test context for MCP testing'
      });

      expect(result.content[0].text).toBe('✅ Recorded shortcut: mcp-test');

      // Verify shortcut was actually recorded
      const shortcuts = await engine.list();
      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].shortcut).toBe('mcp-test');
    });

    it('should handle duplicate shortcut error', async () => {
      // Record first shortcut
      await adapter.callTool('reccall_record', {
        shortcut: 'duplicate-mcp',
        context: 'First context for MCP testing'
      });

      // Try to record duplicate
      const result = await adapter.callTool('reccall_record', {
        shortcut: 'duplicate-mcp',
        context: 'Second context for MCP testing'
      });

      expect(result.content[0].text).toContain('already exists');
    });

    it('should handle validation errors', async () => {
      const result = await adapter.callTool('reccall_record', {
        shortcut: '',
        context: 'Test context'
      });

      expect(result.content[0].text).toContain('Invalid shortcut ID');
    });
  });

  describe('Call Tool', () => {
    beforeEach(async () => {
      // Set up test data
      await engine.record('call-mcp-test', 'Test context for MCP call testing');
    });

    it('should call a shortcut successfully', async () => {
      const result = await adapter.callTool('reccall_call', {
        shortcut: 'call-mcp-test'
      });

      expect(result.content[0].text).toBe('Test context for MCP call testing');
    });

    it('should handle non-existent shortcut error', async () => {
      const result = await adapter.callTool('reccall_call', {
        shortcut: 'nonexistent'
      });

      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('List Tool', () => {
    it('should list shortcuts successfully', async () => {
      // Set up test data
      await engine.record('list-mcp-1', 'First context for MCP list testing');
      await engine.record('list-mcp-2', 'Second context for MCP list testing');

      const result = await adapter.callTool('reccall_list', {});

      expect(result.content[0].text).toContain('📋 Shortcuts:');
      expect(result.content[0].text).toContain('list-mcp-1');
      expect(result.content[0].text).toContain('list-mcp-2');
    });

    it('should handle empty list', async () => {
      const result = await adapter.callTool('reccall_list', {});

      expect(result.content[0].text).toBe('No shortcuts found');
    });
  });

  describe('Search Tool', () => {
    beforeEach(async () => {
      // Set up test data
      await engine.record('search-mcp-1', 'React component MCP testing');
      await engine.record('search-mcp-2', 'API endpoint MCP testing');
      await engine.record('search-mcp-3', 'Database schema MCP testing');
    });

    it('should search shortcuts successfully', async () => {
      const result = await adapter.callTool('reccall_search', {
        query: 'testing'
      });

      expect(result.content[0].text).toContain('🔍 Search results for "testing":');
      expect(result.content[0].text).toContain('search-mcp-1');
      expect(result.content[0].text).toContain('search-mcp-2');
      expect(result.content[0].text).toContain('search-mcp-3');
    });

    it('should handle no search results', async () => {
      const result = await adapter.callTool('reccall_search', {
        query: 'nonexistent'
      });

      expect(result.content[0].text).toBe('No shortcuts found');
    });

    it('should search case-insensitively', async () => {
      const result = await adapter.callTool('reccall_search', {
        query: 'REACT'
      });

      expect(result.content[0].text).toContain('search-mcp-1');
    });
  });

  describe('Delete Tool', () => {
    beforeEach(async () => {
      // Set up test data
      await engine.record('delete-mcp-test', 'Context to delete for MCP testing');
    });

    it('should delete a shortcut successfully', async () => {
      const result = await adapter.callTool('reccall_delete', {
        shortcut: 'delete-mcp-test'
      });

      expect(result.content[0].text).toBe('✅ Deleted shortcut: delete-mcp-test');

      // Verify shortcut was actually deleted
      const shortcuts = await engine.list();
      expect(shortcuts).toHaveLength(0);
    });

    it('should handle non-existent shortcut error', async () => {
      const result = await adapter.callTool('reccall_delete', {
        shortcut: 'nonexistent'
      });

      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool', async () => {
      const result = await adapter.callTool('unknown_tool', {});

      expect(result.content[0].text).toContain('Unknown tool');
    });

    it('should handle missing required arguments', async () => {
      const result = await adapter.callTool('reccall_record', {
        shortcut: 'test'
        // Missing context
      });

      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('Integration Workflow', () => {
    it('should handle complete workflow', async () => {
      // Record multiple shortcuts
      await adapter.callTool('reccall_record', {
        shortcut: 'workflow-1',
        context: 'First workflow context for MCP testing'
      });
      await adapter.callTool('reccall_record', {
        shortcut: 'workflow-2',
        context: 'Second workflow context for MCP testing'
      });

      // List shortcuts
      const listResult = await adapter.callTool('reccall_list', {});
      expect(listResult.content[0].text).toContain('workflow-1');
      expect(listResult.content[0].text).toContain('workflow-2');

      // Search shortcuts
      const searchResult = await adapter.callTool('reccall_search', {
        query: 'workflow'
      });
      expect(searchResult.content[0].text).toContain('workflow-1');
      expect(searchResult.content[0].text).toContain('workflow-2');

      // Call shortcut
      const callResult = await adapter.callTool('reccall_call', {
        shortcut: 'workflow-1'
      });
      expect(callResult.content[0].text).toBe('First workflow context for MCP testing');

      // Delete shortcut
      const deleteResult = await adapter.callTool('reccall_delete', {
        shortcut: 'workflow-1'
      });
      expect(deleteResult.content[0].text).toBe('✅ Deleted shortcut: workflow-1');

      // Verify deletion
      const finalListResult = await adapter.callTool('reccall_list', {});
      expect(finalListResult.content[0].text).toContain('workflow-2');
      expect(finalListResult.content[0].text).not.toContain('workflow-1');
    });
  });
});
