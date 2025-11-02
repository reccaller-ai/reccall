/**
 * Tests for RecCall JavaScript SDK
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReccallSDK } from '../sdk/js/index.js';

// Mock fetch
global.fetch = vi.fn();

describe('ReccallSDK', () => {
  let sdk: ReccallSDK;
  const baseUrl = 'http://localhost:3000/api/reccall';

  beforeEach(() => {
    sdk = new ReccallSDK({ baseUrl });
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  describe('Configuration', () => {
    it('should use default base URL if not provided', () => {
      const defaultSdk = new ReccallSDK();
      expect(defaultSdk).toBeInstanceOf(ReccallSDK);
    });

    it('should use provided base URL', () => {
      const customSdk = new ReccallSDK({ baseUrl: 'http://custom:8080/api' });
      expect(customSdk).toBeInstanceOf(ReccallSDK);
    });

    it('should remove trailing slash from base URL', async () => {
      const sdkWithSlash = new ReccallSDK({ baseUrl: 'http://localhost:3000/api/reccall/' });
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ shortcuts: [] }),
      });

      await sdkWithSlash.listShortcuts();
      
      const fetchCall = (fetch as any).mock.calls[0][0];
      expect(fetchCall).toBe('http://localhost:3000/api/reccall/shortcuts');
    });

    it('should use API key from config', async () => {
      const sdkWithKey = new ReccallSDK({
        baseUrl,
        apiKey: 'test-api-key',
      });

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ shortcuts: [] }),
      });

      await sdkWithKey.listShortcuts();

      const fetchCall = (fetch as any).mock.calls[0];
      const headers = fetchCall[1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-api-key');
    });
  });

  describe('Shortcut Methods', () => {
    describe('listShortcuts', () => {
      it('should list all shortcuts', async () => {
        const mockShortcuts = [
          { id: 'shortcut1', context: 'Context 1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          { id: 'shortcut2', context: 'Context 2', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
        ];

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ shortcuts: mockShortcuts }),
        });

        const shortcuts = await sdk.listShortcuts();

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/shortcuts`);
        expect(shortcuts).toEqual(mockShortcuts);
      });

      it('should handle empty shortcuts list', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ shortcuts: [] }),
        });

        const shortcuts = await sdk.listShortcuts();
        expect(shortcuts).toEqual([]);
      });
    });

    describe('getShortcut', () => {
      it('should get a specific shortcut', async () => {
        const mockShortcut = { shortcut: 'test-id', context: 'Test context' };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify(mockShortcut),
        });

        const shortcut = await sdk.getShortcut('test-id');

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/shortcuts/test-id`);
        expect(shortcut).toEqual({
          id: 'test-id',
          context: 'Test context',
        });
      });

      it('should return null for non-existent shortcut', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: async () => JSON.stringify({ error: 'Not found' }),
        });

        const shortcut = await sdk.getShortcut('non-existent');
        expect(shortcut).toBeNull();
      });
    });

    describe('createShortcut', () => {
      it('should create a new shortcut', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => '',
        });

        await sdk.createShortcut('new-shortcut', 'New context');

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/shortcuts`);
        expect(fetchCall[1]?.method).toBe('POST');
        expect(fetchCall[1]?.body).toBe(JSON.stringify({ shortcut: 'new-shortcut', context: 'New context' }));
      });
    });

    describe('updateShortcut', () => {
      it('should update an existing shortcut', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => '',
        });

        await sdk.updateShortcut('existing-id', 'Updated context');

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/shortcuts/existing-id`);
        expect(fetchCall[1]?.method).toBe('PUT');
        expect(fetchCall[1]?.body).toBe(JSON.stringify({ context: 'Updated context' }));
      });
    });

    describe('deleteShortcut', () => {
      it('should delete a shortcut', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => '',
        });

        await sdk.deleteShortcut('delete-id');

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/shortcuts/delete-id`);
        expect(fetchCall[1]?.method).toBe('DELETE');
      });
    });

    describe('searchShortcuts', () => {
      it('should search shortcuts by query', async () => {
        const mockResults = [
          { id: 'result1', context: 'Matching context' },
        ];

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ results: mockResults }),
        });

        const results = await sdk.searchShortcuts('query');

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toContain('/search?q=query');
        expect(results).toEqual(mockResults);
      });
    });

    describe('purgeShortcuts', () => {
      it('should purge all shortcuts', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => '',
        });

        await sdk.purgeShortcuts();

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/shortcuts`);
        expect(fetchCall[1]?.method).toBe('DELETE');
      });
    });
  });

  describe('Context Methods', () => {
    describe('createContext', () => {
      it('should create a static context', async () => {
        const mockContext = {
          id: 'ctx-1',
          name: 'test-context',
          content: 'Test content',
          type: 'static' as const,
          source: 'global' as const,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ context: mockContext }),
        });

        const context = await sdk.createContext({
          name: 'test-context',
          content: 'Test content',
          source: 'global',
        });

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/contexts`);
        expect(fetchCall[1]?.method).toBe('POST');
        expect(context).toEqual(mockContext);
      });
    });

    describe('createContextFromConversation', () => {
      it('should create a dynamic context from conversation', async () => {
        const mockContext = {
          id: 'ctx-2',
          name: 'conversation-context',
          content: 'Generated content',
          type: 'dynamic' as const,
          source: 'local' as const,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        };

        const messages = [
          { role: 'user' as const, content: 'Hello', timestamp: new Date() },
          { role: 'assistant' as const, content: 'Hi there', timestamp: new Date() },
        ];

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ context: mockContext }),
        });

        const context = await sdk.createContextFromConversation({
          name: 'conversation-context',
          messages,
          source: 'local',
        });

        const fetchCall = (fetch as any).mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);

        expect(body.name).toBe('conversation-context');
        expect(body.messages).toHaveLength(2);
        expect(body.messages[0].role).toBe('user');
        expect(typeof body.messages[0].timestamp).toBe('string'); // Should be ISO string
      });
    });

    describe('getContext', () => {
      it('should get a context by identifier', async () => {
        const mockContext = {
          id: 'ctx-1',
          name: 'test-context',
          content: 'Test content',
          type: 'static' as const,
          source: 'global' as const,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ context: mockContext }),
        });

        const context = await sdk.getContext('ctx-1');

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/contexts/ctx-1`);
        expect(context).toEqual(mockContext);
      });

      it('should return null for non-existent context', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          text: async () => JSON.stringify({ error: 'Not found' }),
        });

        const context = await sdk.getContext('non-existent');
        expect(context).toBeNull();
      });
    });

    describe('listContexts', () => {
      it('should list all contexts', async () => {
        const mockContexts = [
          {
            id: 'ctx-1',
            name: 'context1',
            content: 'Content 1',
            type: 'static' as const,
            source: 'global' as const,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ];

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ contexts: mockContexts }),
        });

        const contexts = await sdk.listContexts();

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/contexts`);
        expect(contexts).toEqual(mockContexts);
      });

      it('should apply filters when provided', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ contexts: [] }),
        });

        await sdk.listContexts({ source: 'global', type: 'static' });

        const fetchCall = (fetch as any).mock.calls[0][0];
        expect(fetchCall).toContain('source=global');
        expect(fetchCall).toContain('type=static');
      });
    });

    describe('searchContexts', () => {
      it('should search contexts by query', async () => {
        const mockResults = [
          {
            id: 'ctx-1',
            name: 'matched-context',
            content: 'Matching content',
            type: 'static' as const,
            source: 'global' as const,
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
          },
        ];

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ results: mockResults }),
        });

        const results = await sdk.searchContexts('query');

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toContain('/contexts/search?q=query');
        expect(results).toEqual(mockResults);
      });

      it('should apply filters when provided', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ results: [] }),
        });

        await sdk.searchContexts('query', { source: 'local', type: 'dynamic' });

        const fetchCall = (fetch as any).mock.calls[0][0];
        expect(fetchCall).toContain('q=query');
        expect(fetchCall).toContain('source=local');
        expect(fetchCall).toContain('type=dynamic');
      });
    });

    describe('updateContext', () => {
      it('should update a context', async () => {
        const mockContext = {
          id: 'ctx-1',
          name: 'updated-context',
          content: 'Updated content',
          type: 'static' as const,
          source: 'global' as const,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ context: mockContext }),
        });

        const context = await sdk.updateContext('ctx-1', { content: 'Updated content' });

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/contexts/ctx-1`);
        expect(fetchCall[1]?.method).toBe('PUT');
        expect(context).toEqual(mockContext);
      });
    });

    describe('deleteContext', () => {
      it('should delete a context', async () => {
        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => '',
        });

        await sdk.deleteContext('ctx-1');

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/contexts/ctx-1`);
        expect(fetchCall[1]?.method).toBe('DELETE');
      });
    });

    describe('getContextStats', () => {
      it('should get context statistics', async () => {
        const mockStats = {
          usageCount: 5,
          lastUsedAt: '2024-01-02',
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ stats: mockStats }),
        });

        const stats = await sdk.getContextStats('ctx-1');

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/contexts/ctx-1/stats`);
        expect(stats).toEqual(mockStats);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('getStats', () => {
      it('should get engine statistics', async () => {
        const mockStats = {
          shortcutsCount: 10,
          contextsCount: 5,
          cacheStats: {
            size: 100,
            hitRate: 0.85,
          },
          repositoryStats: {
            enabled: true,
          },
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ stats: mockStats }),
        });

        const stats = await sdk.getStats();

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/stats`);
        expect(stats).toEqual(mockStats);
      });
    });

    describe('healthCheck', () => {
      it('should check API health', async () => {
        const mockHealth = {
          status: 'ok',
          timestamp: '2024-01-01T00:00:00.000Z',
        };

        (fetch as any).mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify(mockHealth),
        });

        const health = await sdk.healthCheck();

        expect(fetch).toHaveBeenCalled();
        const fetchCall = (fetch as any).mock.calls[0];
        expect(fetchCall[0]).toBe(`${baseUrl}/health`);
        expect(health).toEqual(mockHealth);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle HTTP errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => JSON.stringify({ error: 'Server error' }),
      });

      await expect(sdk.listShortcuts()).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(sdk.listShortcuts()).rejects.toThrow('Network error');
    });

    it('should handle timeout', async () => {
      const sdkWithTimeout = new ReccallSDK({ baseUrl, timeout: 100 });
      
      (fetch as any).mockImplementationOnce(() => {
        return Promise.reject(new Error('Request timeout after 100ms'));
      });

      await expect(sdkWithTimeout.listShortcuts()).rejects.toThrow('Request timeout');
    });

    it('should handle empty responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      // purgeShortcuts returns void, so we just check it doesn't throw
      await expect(sdk.purgeShortcuts()).resolves.toBeUndefined();
    });
  });
});

