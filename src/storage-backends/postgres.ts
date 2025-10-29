/**
 * PostgreSQL storage backend for RecCall
 * Provides enterprise-grade storage with ACID compliance and query capabilities
 */

import type { IContextStorage, ShortcutId, Shortcut } from '../core/interfaces.js';
// Optional pg types - install pg if using PostgreSQL backend
type Pool = any;
type PoolClient = any;

export interface PostgresStorageConfig {
  pool?: Pool;
  connectionString?: string;
  tableName?: string;
}

export class PostgresStorage implements IContextStorage {
  private pool: Pool;
  private tableName: string;

  constructor(config: PostgresStorageConfig) {
    if (config.pool) {
      this.pool = config.pool;
    } else if (config.connectionString) {
      // Lazy import to avoid requiring pg if not used
      try {
        const { Pool: PostgresPool } = require('pg');
        this.pool = new PostgresPool({
          connectionString: config.connectionString,
        });
      } catch (error) {
        throw new Error('pg package is required for PostgreSQL storage. Install it with: npm install pg');
      }
    } else {
      throw new Error('PostgreSQL storage requires either a pool instance or connection string');
    }

    this.tableName = config.tableName || 'reccall_shortcuts';
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          shortcut VARCHAR(255) PRIMARY KEY,
          context TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_metadata 
        ON ${this.tableName} USING GIN (metadata);

        CREATE INDEX IF NOT EXISTS idx_${this.tableName}_updated_at 
        ON ${this.tableName} (updated_at);
      `);
    } finally {
      client.release();
    }
  }

  async record(shortcut: ShortcutId, context: string, options?: Record<string, any>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO ${this.tableName} (shortcut, context, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (shortcut) 
        DO UPDATE SET 
          context = EXCLUDED.context,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `,
        [shortcut, context, JSON.stringify(options || {})]
      );
    } finally {
      client.release();
    }
  }

  async get(shortcut: ShortcutId): Promise<Shortcut | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT shortcut, context, metadata, created_at, updated_at 
         FROM ${this.tableName} WHERE shortcut = $1`,
        [shortcut]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row: any = result.rows[0];
      const metadata = row.metadata || {};
      return {
        id: row.shortcut as ShortcutId,
        context: row.context,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        category: metadata.category,
        description: metadata.description,
      } as Shortcut;
    } finally {
      client.release();
    }
  }

  async list(): Promise<Shortcut[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT shortcut, context, metadata, created_at, updated_at 
         FROM ${this.tableName} ORDER BY updated_at DESC`
      );

      return result.rows.map((row: any) => {
        const metadata = row.metadata || {};
        return {
          id: row.shortcut as ShortcutId,
          context: row.context,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          category: metadata.category,
          description: metadata.description,
        };
      }) as Shortcut[];
    } finally {
      client.release();
    }
  }

  async update(shortcut: ShortcutId, context: string, options?: Record<string, any>): Promise<void> {
    const existing = await this.get(shortcut);
    if (!existing) {
      throw new Error(`Shortcut '${shortcut}' not found`);
    }

    const client = await this.pool.connect();
    try {
      await client.query(
        `
        UPDATE ${this.tableName}
        SET context = $1, metadata = $2, updated_at = NOW()
        WHERE shortcut = $3
      `,
        [context, JSON.stringify(options || {}), shortcut]
      );
    } finally {
      client.release();
    }
  }

  async delete(shortcut: ShortcutId): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`DELETE FROM ${this.tableName} WHERE shortcut = $1`, [shortcut]);
    } finally {
      client.release();
    }
  }

  async purge(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`TRUNCATE TABLE ${this.tableName}`);
    } finally {
      client.release();
    }
  }

  async exists(shortcut: ShortcutId): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT 1 FROM ${this.tableName} WHERE shortcut = $1 LIMIT 1`,
        [shortcut]
      );
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  async getByCategory(category: string): Promise<Shortcut[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT shortcut, context, metadata, created_at, updated_at 
         FROM ${this.tableName} 
         WHERE metadata->>'category' = $1 
         ORDER BY updated_at DESC`,
        [category]
      );

      return result.rows.map((row: any) => {
        const metadata = row.metadata || {};
        return {
          id: row.shortcut as ShortcutId,
          context: row.context,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          category: metadata.category,
          description: metadata.description,
        };
      }) as Shortcut[];
    } finally {
      client.release();
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Get database pool instance
   */
  getPool(): Pool {
    return this.pool;
  }
}
