/**
 * Tests for Context Engine (Universal Context Management System)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ContextEngine } from '../core/context-engine.js';
import { ContextStore } from '../core/storage/context-store.js';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

describe('ContextEngine', () => {
  let engine: ContextEngine;
  let testBasePath: string;

  beforeEach(async () => {
    // Use temporary directory for tests
    testBasePath = path.join(os.tmpdir(), `reccall-test-${Date.now()}`);
    const store = new ContextStore(testBasePath);
    engine = new ContextEngine(store);
    await engine.initialize();
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(testBasePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('createStatic', () => {
    it('should create a static context', async () => {
      const context = await engine.createStatic({
        name: 'test-context',
        content: '# Test Context\n\nThis is a test.',
        source: 'local',
        tags: ['test', 'example'],
        category: 'testing',
        description: 'A test context',
      });

      expect(context.id).toMatch(/^ctx_/);
      expect(context.name).toBe('test-context');
      expect(context.content).toBe('# Test Context\n\nThis is a test.');
      expect(context.type).toBe('static');
      expect(context.source).toBe('local');
      expect(context.tags).toEqual(['test', 'example']);
      expect(context.category).toBe('testing');
      expect(context.description).toBe('A test context');
      expect(context.version).toBe('1.0.0');
      expect(context.syncStatus).toBe('local');
      expect(context.usageCount).toBe(0);
    });

    it('should retrieve created context by ID', async () => {
      const created = await engine.createStatic({
        name: 'retrieval-test',
        content: 'Test content',
        source: 'global',
      });

      const retrieved = await engine.get(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('retrieval-test');
      expect(retrieved?.content).toBe('Test content');
    });

    it('should retrieve created context by name', async () => {
      await engine.createStatic({
        name: 'name-search-test',
        content: 'Content for name search',
        source: 'local',
      });

      const retrieved = await engine.get('name-search-test');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('name-search-test');
    });
  });

  describe('createFromConversation', () => {
    it('should create a dynamic context from conversation', async () => {
      const messages = [
        { role: 'user' as const, content: 'How do I test this?', timestamp: new Date() },
        { role: 'assistant' as const, content: 'You can use unit tests.', timestamp: new Date() },
      ];

      const context = await engine.createFromConversation({
        name: 'conversation-test',
        messages,
        source: 'local',
        tags: ['conversation'],
      });

      expect(context.type).toBe('dynamic');
      expect(context.name).toBe('conversation-test');
      expect(context.content).toContain('User');
      expect(context.content).toContain('How do I test this?');
    });
  });

  describe('search', () => {
    it('should search contexts by keyword', async () => {
      await engine.createStatic({
        name: 'api-testing',
        content: 'API testing guidelines',
        source: 'local',
        tags: ['api', 'testing'],
      });

      await engine.createStatic({
        name: 'database-setup',
        content: 'Database setup instructions',
        source: 'local',
        tags: ['database'],
      });

      const results = await engine.search('testing');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(c => c.name === 'api-testing')).toBe(true);
    });

    it('should filter by source', async () => {
      await engine.createStatic({
        name: 'local-context',
        content: 'Local content',
        source: 'local',
      });

      await engine.createStatic({
        name: 'global-context',
        content: 'Global content',
        source: 'global',
      });

      const localResults = await engine.search('content', { source: 'local' });
      expect(localResults.every(c => c.source === 'local')).toBe(true);
    });
  });

  describe('list', () => {
    it('should list all contexts', async () => {
      await engine.createStatic({
        name: 'context-1',
        content: 'Content 1',
        source: 'local',
      });

      await engine.createStatic({
        name: 'context-2',
        content: 'Content 2',
        source: 'global',
      });

      const contexts = await engine.list();
      expect(contexts.length).toBe(2);
    });

    it('should filter by type', async () => {
      await engine.createStatic({
        name: 'static-ctx',
        content: 'Static',
        source: 'local',
      });

      await engine.createFromConversation({
        name: 'dynamic-ctx',
        messages: [{ role: 'user', content: 'Test', timestamp: new Date() }],
        source: 'local',
      });

      const staticContexts = await engine.list({ type: 'static' });
      expect(staticContexts.every(c => c.type === 'static')).toBe(true);
    });
  });

  describe('update', () => {
    it('should update context content', async () => {
      const created = await engine.createStatic({
        name: 'update-test',
        content: 'Original content',
        source: 'local',
      });

      const updated = await engine.update(created.id, {
        content: 'Updated content',
      });

      expect(updated.content).toBe('Updated content');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });
  });

  describe('delete', () => {
    it('should delete a context', async () => {
      const created = await engine.createStatic({
        name: 'delete-test',
        content: 'To be deleted',
        source: 'local',
      });

      await engine.delete(created.id);

      const retrieved = await engine.get(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('use', () => {
    it('should track usage and platform', async () => {
      const created = await engine.createStatic({
        name: 'usage-test',
        content: 'Content',
        source: 'local',
      });

      const used = await engine.use(created.id, 'cli');
      expect(used.usageCount).toBe(1);
      expect(used.platforms).toContain('cli');
      expect(used.lastUsedAt).toBeDefined();

      const usedAgain = await engine.use(created.id, 'mcp');
      expect(usedAgain.usageCount).toBe(2);
      expect(usedAgain.platforms).toContain('cli');
      expect(usedAgain.platforms).toContain('mcp');
    });
  });

  describe('getStats', () => {
    it('should return context-specific stats', async () => {
      const created = await engine.createStatic({
        name: 'stats-test',
        content: 'Content',
        source: 'local',
      });

      await engine.use(created.id, 'cli');

      const stats = await engine.getStats(created.id);
      expect(stats).toHaveProperty('id', created.id);
      expect(stats).toHaveProperty('usageCount', 1);
      expect(stats).toHaveProperty('platforms', ['cli']);
    });

    it('should return system-wide stats', async () => {
      await engine.createStatic({
        name: 'ctx1',
        content: 'Content 1',
        source: 'local',
        category: 'test',
      });

      await engine.createStatic({
        name: 'ctx2',
        content: 'Content 2',
        source: 'global',
        category: 'test',
      });

      const stats = await engine.getStats();
      expect(stats).toHaveProperty('totalContexts', 2);
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('bySource');
      if ('byType' in stats) {
        expect(stats.byType.static).toBe(2);
      }
    });
  });
});

