/**
 * VSCode Platform Adapter
 * Provides RecCall functionality for VSCode extensions
 */

import type { ICoreEngine, Shortcut, ShortcutId } from '../../core/interfaces.js';
import { RecCallError } from '../../types.js';

export interface VSCodeExtensionContext {
  workspaceStoragePath?: string;
  globalStoragePath?: string;
}

/**
 * VSCode Platform Adapter
 * Implements IPlatformAdapter for VSCode extension integration
 */
export class VSCodeAdapter {
  private engine: ICoreEngine;
  private initialized = false;

  constructor(engine: ICoreEngine) {
    this.engine = engine;
  }

  /**
   * Initialize the adapter
   */
  async initialize(context?: VSCodeExtensionContext): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize core engine with VSCode-specific config if needed
    await this.engine.initialize();
    this.initialized = true;
  }

  /**
   * Record a shortcut
   */
  async record(shortcut: ShortcutId, context: string): Promise<void> {
    await this.ensureInitialized();
    await this.engine.record(shortcut, context);
  }

  /**
   * Call (retrieve) a shortcut
   */
  async call(shortcut: ShortcutId): Promise<string> {
    await this.ensureInitialized();
    return await this.engine.call(shortcut);
  }

  /**
   * List all shortcuts
   */
  async list(): Promise<Shortcut[]> {
    await this.ensureInitialized();
    return await this.engine.list();
  }

  /**
   * Update a shortcut
   */
  async update(shortcut: ShortcutId, context: string): Promise<void> {
    await this.ensureInitialized();
    await this.engine.update(shortcut, context);
  }

  /**
   * Delete a shortcut
   */
  async delete(shortcut: ShortcutId): Promise<void> {
    await this.ensureInitialized();
    await this.engine.delete(shortcut);
  }

  /**
   * Search shortcuts
   */
  async search(query: string): Promise<Shortcut[]> {
    await this.ensureInitialized();
    return await this.engine.search(query);
  }

  /**
   * Reload starter pack
   */
  async reloadStarterPack(): Promise<void> {
    await this.ensureInitialized();
    await this.engine.reloadStarterPack();
  }

  /**
   * Check if shortcut exists
   */
  async exists(shortcut: ShortcutId): Promise<boolean> {
    await this.ensureInitialized();
    const shortcutData = await this.engine.call(shortcut).catch(() => null);
    return shortcutData !== null;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      throw new RecCallError(
        'VSCodeAdapter is not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }
  }
}

