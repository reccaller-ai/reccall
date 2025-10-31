/**
 * Fastify plugin for RecCall API server
 * Provides high-performance REST API for enterprise deployments
 */

// Optional Fastify types - install fastify if using Fastify
type FastifyInstance = any;
type FastifyRequest = any;
type FastifyReply = any;

import type { ICoreEngine } from '../../core/interfaces.js';
import type { ShortcutId } from '../../types.js';
import type { ContextEngine } from '../../core/context-engine.js';

export interface ReccallFastifyOptions {
  engine: ICoreEngine;
  contextEngine?: ContextEngine;
  basePath?: string;
  authenticate?: (request: FastifyRequest) => Promise<boolean>;
}

/**
 * Fastify plugin
 */
export async function reccallFastifyPlugin(
  fastify: FastifyInstance,
  options: ReccallFastifyOptions
) {
  const { engine, contextEngine, basePath = '/api/reccall', authenticate } = options;

  // Authentication hook
  if (authenticate) {
    fastify.addHook('onRequest', async (request: any, reply: any) => {
      if (request.url.startsWith(basePath)) {
        const isAuthenticated = await authenticate(request);
        if (!isAuthenticated) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }
      }
    });
  }

  // List all shortcuts
  fastify.get(`${basePath}/shortcuts`, async () => {
    const shortcuts = await engine.list();
    return { shortcuts };
  });

  // Get specific shortcut
  fastify.get(`${basePath}/shortcuts/:id`, async (request: any) => {
    const context = await engine.call(request.params.id as ShortcutId);
    return { shortcut: request.params.id, context };
  });

  // Create shortcut
  fastify.post(`${basePath}/shortcuts`, async (request: any) => {
      const { shortcut, context } = request.body;
      if (!shortcut || !context) {
        return { error: 'Missing shortcut or context' };
      }
      await engine.record(shortcut as ShortcutId, context);
      return { success: true, shortcut };
    }
  );

  // Update shortcut
  fastify.put(`${basePath}/shortcuts/:id`, async (request: any) => {
      const { context } = request.body;
      if (!context) {
        return { error: 'Missing context' };
      }
      await engine.update(request.params.id as ShortcutId, context);
      return { success: true };
    }
  );

  // Delete shortcut
  fastify.delete(`${basePath}/shortcuts/:id`, async (request: any) => {
    await engine.delete(request.params.id as ShortcutId);
    return { success: true };
  });

  // Purge all shortcuts
  fastify.delete(`${basePath}/shortcuts`, async () => {
    await engine.purge();
    return { success: true };
  });

  // Search shortcuts
  fastify.get(`${basePath}/search`, async (request: any) => {
    const query = request.query.q;
    if (!query) {
      return { error: 'Missing search query' };
    }
    const results = await engine.search(query);
    return { results };
  });

  // List recipes
  fastify.get(`${basePath}/recipes`, async (request: any) => {
    const repoUrl = request.query.repo;
    const recipes = await engine.listRecipes(repoUrl);
    return { recipes };
  });

  // Install recipe
  fastify.post(`${basePath}/recipes/:id/install`, async (request: any) => {
      const repoUrl = request.body.repoUrl;
      await engine.installRecipe(repoUrl, request.params.id as ShortcutId);
      return { success: true };
    }
  );

  // Get statistics
  fastify.get(`${basePath}/stats`, async () => {
    const stats = await engine.getStats();
    return { stats };
  });

  // Health check
  fastify.get(`${basePath}/health`, async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Context endpoints (Universal Context System)
  if (contextEngine) {
    // List contexts
    fastify.get(`${basePath}/contexts`, async (request: any) => {
      const contexts = await contextEngine.list({
        source: request.query.source,
        type: request.query.type,
      });
      return { contexts };
    });

    // Get context by ID
    fastify.get(`${basePath}/contexts/:id`, async (request: any) => {
      const foundContext = await contextEngine.get(request.params.id);
      if (!foundContext) {
        return { error: 'Context not found' };
      }
      return { context: foundContext };
    });

    // Create context
    fastify.post(`${basePath}/contexts`, async (request: any) => {
      const { name, content, source, tags, category, description, repository } = request.body;
      if (!name || !content || !source) {
        return { error: 'Missing required fields: name, content, source' };
      }
      const newContext = await contextEngine.createStatic({
        name,
        content,
        source,
        tags,
        category,
        description,
        repository,
      });
      return { context: newContext };
    });

    // Update context
    fastify.put(`${basePath}/contexts/:id`, async (request: any) => {
      const updates = request.body;
      const updatedContext = await contextEngine.update(request.params.id, updates);
      return { context: updatedContext };
    });

    // Delete context
    fastify.delete(`${basePath}/contexts/:id`, async (request: any) => {
      await contextEngine.delete(request.params.id);
      return { success: true };
    });

    // Search contexts
    fastify.get(`${basePath}/contexts/search`, async (request: any) => {
      const query = request.query.q;
      if (!query) {
        return { error: 'Missing search query' };
      }
      const results = await contextEngine.search(query, {
        source: request.query.source,
        type: request.query.type,
      });
      return { results };
    });

    // Get context stats
    fastify.get(`${basePath}/contexts/:id/stats`, async (request: any) => {
      const stats = await contextEngine.getStats(request.params.id);
      return { stats };
    });

    // Get system stats
    fastify.get(`${basePath}/contexts/stats`, async () => {
      const stats = await contextEngine.getStats();
      return { stats };
    });
  }
}

/**
 * Plugin export for Fastify
 */
export default reccallFastifyPlugin;
