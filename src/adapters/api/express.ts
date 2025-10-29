/**
 * Express.js middleware for RecCall API server
 * Provides REST API endpoints for team deployments
 */

// Optional Express.js types - install @types/express if using Express
type Request = any;
type Response = any;
type NextFunction = any;

import type { ICoreEngine } from '../../core/interfaces.js';
import type { ShortcutId } from '../../types.js';

export interface ReccallMiddlewareOptions {
  engine: ICoreEngine;
  basePath?: string;
  authenticate?: (req: Request) => Promise<boolean>;
}

/**
 * Express middleware factory
 */
export function createReccallMiddleware(options: ReccallMiddlewareOptions) {
  const { engine, basePath = '/api/reccall', authenticate } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Authentication check
    if (authenticate) {
      const isAuthenticated = await authenticate(req);
      if (!isAuthenticated) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    // Extract path and method
    const path = req.path.replace(basePath, '');
    const method = req.method.toUpperCase();

    // Route handlers
    try {
      switch (`${method} ${path}`) {
        case 'GET /shortcuts':
        case 'GET /':
          const shortcuts = await engine.list();
          return res.json({ shortcuts });

        case 'GET /shortcuts/:id':
          const shortcut = await engine.call(req.params.id as ShortcutId);
          return res.json({ shortcut: req.params.id, context: shortcut });

        case 'POST /shortcuts':
          const { shortcut: newShortcut, context } = req.body;
          if (!newShortcut || !context) {
            return res.status(400).json({ error: 'Missing shortcut or context' });
          }
          await engine.record(newShortcut as ShortcutId, context);
          return res.status(201).json({ success: true, shortcut: newShortcut });

        case 'PUT /shortcuts/:id':
          const updateContext = req.body.context;
          if (!updateContext) {
            return res.status(400).json({ error: 'Missing context' });
          }
          await engine.update(req.params.id as ShortcutId, updateContext);
          return res.json({ success: true });

        case 'DELETE /shortcuts/:id':
          await engine.delete(req.params.id as ShortcutId);
          return res.json({ success: true });

        case 'DELETE /shortcuts':
          await engine.purge();
          return res.json({ success: true });

        case 'GET /search':
          const query = req.query.q as string;
          if (!query) {
            return res.status(400).json({ error: 'Missing search query' });
          }
          const results = await engine.search(query);
          return res.json({ results });

        case 'GET /recipes':
          const repoUrl = req.query.repo as string | undefined;
          const recipes = await engine.listRecipes(repoUrl as any);
          return res.json({ recipes });

        case 'POST /recipes/:id/install':
          const installRepoUrl = req.body.repoUrl;
          await engine.installRecipe(installRepoUrl, req.params.id as ShortcutId);
          return res.json({ success: true });

        case 'GET /stats':
          const stats = await engine.getStats();
          return res.json({ stats });

        case 'GET /health':
          return res.json({ status: 'ok', timestamp: new Date().toISOString() });

        default:
          return res.status(404).json({ error: 'Not found' });
      }
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Internal server error',
        code: error.code || 'UNKNOWN_ERROR',
      });
    }
  };
}

/**
 * Express router setup helper
 */
export function setupReccallRoutes(app: any, options: ReccallMiddlewareOptions) {
  const { basePath = '/api/reccall' } = options;
  const middleware = createReccallMiddleware(options);

  // Apply middleware to all routes under basePath
  app.use(basePath, middleware);
}

/**
 * Type definitions for request/response
 */
export interface ShortcutRequest {
  shortcut: string;
  context: string;
  category?: string;
  tags?: string[];
}

export interface ShortcutResponse {
  shortcut: string;
  context: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResponse {
  results: ShortcutResponse[];
}

export interface StatsResponse {
  shortcutsCount: number;
  cacheStats: any;
  repositoryStats: any;
}
