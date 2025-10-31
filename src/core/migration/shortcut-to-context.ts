/**
 * Migration utility to convert Shortcuts to Contexts
 * Part of Universal Context Management System implementation
 */

import type { ICoreEngine } from '../interfaces.js';
import type { ContextEngine } from '../context-engine.js';
import type { Shortcut } from '../../types.js';
import { configManager } from '../config.js';

export interface MigrationOptions {
  source?: 'local' | 'global'; // Default source for migrated contexts
  dryRun?: boolean; // If true, don't actually migrate, just report what would be migrated
}

export interface MigrationResult {
  totalShortcuts: number;
  migrated: number;
  skipped: number;
  errors: Array<{ shortcut: string; error: string }>;
}

/**
 * Migrate all shortcuts to contexts
 */
export async function migrateShortcutsToContexts(
  engine: ICoreEngine,
  contextEngine: ContextEngine,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const result: MigrationResult = {
    totalShortcuts: 0,
    migrated: 0,
    skipped: 0,
    errors: [],
  };

  // Get all shortcuts
  const shortcuts = await engine.list();
  result.totalShortcuts = shortcuts.length;

  const defaultSource = options.source || 'local';

  // Migrate each shortcut
  for (const shortcut of shortcuts) {
    try {
      // Check if context with same name already exists
      const existing = await contextEngine.get(shortcut.id);
      if (existing) {
        result.skipped++;
        continue;
      }

      if (!options.dryRun) {
        // Create context from shortcut
        await contextEngine.createStatic({
          name: shortcut.id,
          content: shortcut.context,
          source: defaultSource,
          tags: shortcut.category ? [shortcut.category] : [],
          category: shortcut.category,
          description: shortcut.description,
        });
      }

      result.migrated++;
    } catch (error) {
      result.errors.push({
        shortcut: shortcut.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

/**
 * Migrate a single shortcut to context
 */
export async function migrateShortcutToContext(
  shortcutId: string,
  engine: ICoreEngine,
  contextEngine: ContextEngine,
  options: MigrationOptions = {}
): Promise<boolean> {
  const shortcut = await engine.call(shortcutId as any);
  if (!shortcut) {
    return false;
  }

  // Get shortcut details
  const shortcuts = await engine.list();
  const shortcutData = shortcuts.find(s => s.id === shortcutId);
  if (!shortcutData) {
    return false;
  }

  // Check if context already exists
  const existing = await contextEngine.get(shortcutId);
  if (existing) {
    return false;
  }

  if (!options.dryRun) {
    const defaultSource = options.source || 'local';
    await contextEngine.createStatic({
      name: shortcutId,
      content: shortcutData.context,
      source: defaultSource,
      tags: shortcutData.category ? [shortcutData.category] : [],
      category: shortcutData.category,
      description: shortcutData.description,
    });
  }

  return true;
}

