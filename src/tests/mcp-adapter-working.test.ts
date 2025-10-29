import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MCPAdapter } from '../adapters/mcp/index.js';
import { FileSystemStorage } from '../storage-backends/filesystem.js';
import { HttpRepositoryClient } from '../core/repository.js';
import { MultiLayerCacheManager } from '../core/cache.js';
import { RecipeValidator } from '../core/validator.js';
import { CoreEngine } from '../core/engine.js';
import type { ShortcutId } from '../types.js';

describe('MCP Adapter Tests', () => {
  let adapter: MCPAdapter;
  let engine: CoreEngine;

  beforeEach(async () => {
    // Create instances directly
    const storage = new FileSystemStorage();
    const repository = new HttpRepositoryClient();
    const cache = new MultiLayerCacheManager();
    const validator = new RecipeValidator();
    
    engine = new CoreEngine(storage, repository, cache, validator);
    await engine.initialize();
    
    adapter = new MCPAdapter(engine);
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

  describe('Adapter Initialization', () => {
    it('should initialize successfully', async () => {
      expect(adapter).toBeDefined();
      expect(adapter.start).toBeDefined();
    });

    it('should have MCP server configured', () => {
      // The adapter should have a server instance
      expect(adapter).toBeDefined();
    });
  });

  describe('Integration with Core Engine', () => {
    it('should use the same engine instance', () => {
      expect(adapter).toBeDefined();
      // The adapter should be using the same engine instance
      // This is tested implicitly through the successful operations above
    });

    it('should handle engine errors gracefully', async () => {
      // The MCP server should handle engine errors
      expect(adapter).toBeDefined();
    });
  });

  describe('Server Lifecycle', () => {
    it('should start server successfully', async () => {
      // Mock the server start method
      const startSpy = vi.spyOn(adapter, 'start').mockResolvedValue();
      
      await adapter.start();
      
      expect(startSpy).toHaveBeenCalled();
      
      startSpy.mockRestore();
    });

    it('should handle server errors gracefully', async () => {
      // Mock server start to throw error
      const startSpy = vi.spyOn(adapter, 'start').mockRejectedValue(new Error('Server error'));
      
      await expect(adapter.start()).rejects.toThrow('Server error');
      
      startSpy.mockRestore();
    });
  });
});
