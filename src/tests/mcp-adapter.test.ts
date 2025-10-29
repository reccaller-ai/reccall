/**
 * Comprehensive tests for MCPAdapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPAdapter } from '../adapters/mcp/index.js';
import { CoreEngine } from '../core/engine.js';
import type { ICoreEngine } from '../core/interfaces.js';
import { MockStorage, MockCacheManager, MockValidator, MockRepositoryClient } from './test-utils.js';
import type { ShortcutId } from '../types.js';
import { configManager } from '../core/config.js';
import { telemetryManager } from '../core/telemetry.js';

vi.mock('../core/config.js', () => ({
  configManager: {
    initialize: vi.fn(),
    isRepositoryEnabled: vi.fn(() => true),
  },
}));

vi.mock('../core/telemetry.js', () => ({
  telemetryManager: {
    updateMetrics: vi.fn(),
    logEvent: vi.fn(),
    logError: vi.fn(),
  },
  Performance: () => () => {},
  LogErrors: () => () => {},
}));

describe('MCPAdapter', () => {
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Registration', () => {
    it('should register all required tools', async () => {
      const tools = await adapter.listTools();
      
      expect(tools.length).toBeGreaterThan(0);
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('rec');
      expect(toolNames).toContain('rec_list');
      expect(toolNames).toContain('rec_call');
      expect(toolNames).toContain('rec_update');
      expect(toolNames).toContain('rec_delete');
      expect(toolNames).toContain('rec_search');
    });

    it('should have correct tool schemas', async () => {
      const tools = await adapter.listTools();
      
      const recTool = tools.find(t => t.name === 'rec');
      expect(recTool?.inputSchema.properties).toHaveProperty('shortcut');
      expect(recTool?.inputSchema.properties).toHaveProperty('context');

      const callTool = tools.find(t => t.name === 'rec_call');
      expect(callTool?.inputSchema.properties).toHaveProperty('shortcut');
    });
  });

  describe('Record Tool', () => {
    it('should record a shortcut successfully', async () => {
      const result = await adapter.callTool('rec', {
        shortcut: 'mcp-test',
        context: 'Test context for MCP testing',
      });

      expect(result.content[0].text).toContain('Recorded shortcut');
      
      const shortcuts = await engine.list();
      expect(shortcuts.some(s => s.id === 'mcp-test')).toBe(true);
    });

    it('should handle duplicate shortcut error', async () => {
      await adapter.callTool('rec', {
        shortcut: 'duplicate-mcp',
        context: 'First context for MCP testing',
      });

      const result = await adapter.callTool('rec', {
        shortcut: 'duplicate-mcp',
        context: 'Second context for MCP testing',
      });

      expect(result.content[0].text).toContain('already exists');
    });

    it('should handle validation errors', async () => {
      const result = await adapter.callTool('rec', {
        shortcut: '',
        context: 'Test context',
      });

      expect(result.content[0].text).toContain('Invalid');
    });
  });

  describe('Call Tool', () => {
    beforeEach(async () => {
      await engine.record('call-mcp-test' as ShortcutId, 'Test context for MCP call testing');
    });

    it('should call a shortcut successfully', async () => {
      const result = await adapter.callTool('rec_call', {
        shortcut: 'call-mcp-test',
      });

      expect(result.content[0].text).toBe('Test context for MCP call testing');
    });

    it('should handle non-existent shortcut error', async () => {
      const result = await adapter.callTool('rec_call', {
        shortcut: 'nonexistent',
      });

      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('List Tool', () => {
    it('should list shortcuts successfully', async () => {
      await engine.record('list-mcp-1' as ShortcutId, 'First context for MCP list testing');
      await engine.record('list-mcp-2' as ShortcutId, 'Second context for MCP list testing');

      const result = await adapter.callTool('rec_list', {});

      expect(result.content[0].text).toContain('Shortcuts');
      expect(result.content[0].text).toContain('list-mcp-1');
      expect(result.content[0].text).toContain('list-mcp-2');
    });

    it('should handle empty list', async () => {
      await engine.purge();
      const result = await adapter.callTool('rec_list', {});

      expect(result.content[0].text).toBe('No shortcuts found');
    });
  });

  describe('Search Tool', () => {
    beforeEach(async () => {
      await engine.record('search-mcp-1' as ShortcutId, 'React component MCP testing');
      await engine.record('search-mcp-2' as ShortcutId, 'API endpoint MCP testing');
    });

    it('should search shortcuts successfully', async () => {
      const result = await adapter.callTool('rec_search', {
        query: 'testing',
      });

      expect(result.content[0].text).toContain('Search results');
      expect(result.content[0].text).toContain('search-mcp-1');
    });

    it('should handle no search results', async () => {
      const result = await adapter.callTool('rec_search', {
        query: 'nonexistent',
      });

      expect(result.content[0].text).toBe('No shortcuts found');
    });
  });

  describe('Delete Tool', () => {
    beforeEach(async () => {
      await engine.record('delete-mcp-test' as ShortcutId, 'Context to delete for MCP testing');
    });

    it('should delete a shortcut successfully', async () => {
      const result = await adapter.callTool('rec_delete', {
        shortcut: 'delete-mcp-test',
      });

      expect(result.content[0].text).toContain('Deleted shortcut');
      
      const shortcuts = await engine.list();
      expect(shortcuts.some(s => s.id === 'delete-mcp-test')).toBe(false);
    });

    it('should handle non-existent shortcut error', async () => {
      const result = await adapter.callTool('rec_delete', {
        shortcut: 'nonexistent',
      });

      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('Update Tool', () => {
    beforeEach(async () => {
      await engine.record('update-mcp-test' as ShortcutId, 'Original context');
    });

    it('should update a shortcut successfully', async () => {
      const result = await adapter.callTool('rec_update', {
        shortcut: 'update-mcp-test',
        context: 'Updated context',
      });

      expect(result.content[0].text).toContain('Updated shortcut');
      
      const updated = await engine.call('update-mcp-test' as ShortcutId);
      expect(updated).toBe('Updated context');
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool', async () => {
      const result = await adapter.callTool('unknown_tool', {});

      expect(result.content[0].text).toContain('Unknown tool');
    });
  });
});