#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_FILE = path.join(os.homedir(), '.reccall.json');
const STARTER_PACK_DIR = path.join(__dirname, '..', 'starter-pack');

// Load shortcuts from storage
async function loadShortcuts(): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// Save shortcuts to storage
async function saveShortcuts(shortcuts: Record<string, string>): Promise<void> {
  await fs.writeFile(STORAGE_FILE, JSON.stringify(shortcuts, null, 2));
}

// Load starter pack recipes
async function loadStarterPack(): Promise<Record<string, string>> {
  const shortcuts: Record<string, string> = {};
  
  try {
    const manifestPath = path.join(STARTER_PACK_DIR, 'manifest.json');
    const manifestData = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestData);
    
    for (const recipe of manifest.recipes) {
      try {
        const recipePath = path.join(STARTER_PACK_DIR, recipe.file);
        const recipeData = await fs.readFile(recipePath, 'utf-8');
        const recipeObj = JSON.parse(recipeData);
        shortcuts[recipeObj.shortcut] = recipeObj.context;
      } catch (error) {
        console.error(`Failed to load recipe ${recipe.file}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to load starter pack:', error);
  }
  
  return shortcuts;
}

// CLI Commands
const program = new Command();

program
  .name('reccall')
  .description('RecCall: Record and call context shortcuts across AI IDEs and environments')
  .version('1.0.0');

// Record a new shortcut
program
  .command('rec')
  .description('Record a new context shortcut')
  .argument('<shortcut>', 'The shortcut name/alias')
  .argument('<context>', 'The context or instruction to store')
  .action(async (shortcut: string, context: string) => {
    const shortcuts = await loadShortcuts();
    
    if (shortcuts[shortcut]) {
      console.log(`⚠️  Warning: Shortcut '${shortcut}' already exists!`);
      console.log(`Current context: ${shortcuts[shortcut]}`);
      console.log(`To update it, use: reccall update ${shortcut} <new_context>`);
      process.exit(1);
    }
    
    shortcuts[shortcut] = context;
    await saveShortcuts(shortcuts);
    
    console.log(`✅ Shortcut '${shortcut}' has been recorded successfully!`);
    console.log(`Stored context: ${context}`);
  });

// List all shortcuts
program
  .command('list')
  .alias('ls')
  .description('List all stored shortcuts')
  .action(async () => {
    const shortcuts = await loadShortcuts();
    const shortcutList = Object.keys(shortcuts);
    
    if (shortcutList.length === 0) {
      console.log('No shortcuts stored yet. Use "reccall rec <shortcut> <context>" to create your first shortcut.');
      return;
    }
    
    console.log(`📋 Stored shortcuts (${shortcutList.length}):`);
    console.log();
    
    shortcutList.forEach(key => {
      const preview = shortcuts[key].substring(0, 100);
      const truncated = shortcuts[key].length > 100 ? '...' : '';
      console.log(`• ${key}: ${preview}${truncated}`);
    });
  });

// Call/retrieve a shortcut
program
  .command('call')
  .description('Call (retrieve) a stored shortcut')
  .argument('<shortcut>', 'The shortcut name to retrieve')
  .action(async (shortcut: string) => {
    const shortcuts = await loadShortcuts();
    
    if (!shortcuts[shortcut]) {
      console.log(`❌ Shortcut '${shortcut}' not found.`);
      console.log(`Available shortcuts: ${Object.keys(shortcuts).join(', ')}`);
      process.exit(1);
    }
    
    console.log(`📋 Context for '${shortcut}':`);
    console.log();
    console.log(shortcuts[shortcut]);
  });

// Update an existing shortcut
program
  .command('update')
  .description('Update an existing shortcut')
  .argument('<shortcut>', 'The shortcut name to update')
  .argument('<context>', 'The new context or instruction')
  .action(async (shortcut: string, context: string) => {
    const shortcuts = await loadShortcuts();
    
    if (!shortcuts[shortcut]) {
      console.log(`❌ Shortcut '${shortcut}' not found.`);
      console.log(`Available shortcuts: ${Object.keys(shortcuts).join(', ')}`);
      process.exit(1);
    }
    
    const oldContext = shortcuts[shortcut];
    shortcuts[shortcut] = context;
    await saveShortcuts(shortcuts);
    
    console.log(`✅ Shortcut '${shortcut}' has been updated successfully!`);
    console.log(`Previous context: ${oldContext}`);
    console.log(`New context: ${context}`);
  });

// Delete a shortcut
program
  .command('delete')
  .alias('rm')
  .description('Delete a shortcut')
  .argument('<shortcut>', 'The shortcut name to delete')
  .action(async (shortcut: string) => {
    const shortcuts = await loadShortcuts();
    
    if (!shortcuts[shortcut]) {
      console.log(`⚠️  Shortcut '${shortcut}' not found. Nothing to delete.`);
      return;
    }
    
    delete shortcuts[shortcut];
    await saveShortcuts(shortcuts);
    
    console.log(`✅ Shortcut '${shortcut}' has been deleted successfully!`);
  });

// Purge all shortcuts
program
  .command('purge')
  .description('Delete all shortcuts (requires confirmation)')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    const shortcuts = await loadShortcuts();
    const count = Object.keys(shortcuts).length;
    
    if (count === 0) {
      console.log('No shortcuts to delete.');
      return;
    }
    
    if (!options.yes) {
      console.log(`⚠️  This will delete ALL ${count} shortcuts. This action cannot be undone.`);
      console.log('Use --yes flag to confirm deletion.');
      process.exit(1);
    }
    
    await saveShortcuts({});
    console.log(`✅ All ${count} shortcuts have been deleted successfully!`);
  });

// Reload starter pack
program
  .command('reload-starter-pack')
  .description('Reload starter pack recipes (overwrites existing shortcuts)')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options) => {
    const shortcuts = await loadShortcuts();
    const count = Object.keys(shortcuts).length;
    
    if (count > 0 && !options.yes) {
      console.log(`⚠️  This will overwrite ALL ${count} existing shortcuts with starter pack recipes.`);
      console.log('Use --yes flag to confirm reload.');
      process.exit(1);
    }
    
    const starterPack = await loadStarterPack();
    await saveShortcuts(starterPack);
    
    console.log(`✅ Starter pack loaded successfully! ${Object.keys(starterPack).length} recipes loaded.`);
  });

// Search shortcuts
program
  .command('search')
  .description('Search shortcuts by name or content')
  .argument('<query>', 'Search query')
  .action(async (query: string) => {
    const shortcuts = await loadShortcuts();
    const results: Array<{key: string, context: string}> = [];
    
    Object.entries(shortcuts).forEach(([key, context]) => {
      if (key.toLowerCase().includes(query.toLowerCase()) || 
          context.toLowerCase().includes(query.toLowerCase())) {
        results.push({ key, context });
      }
    });
    
    if (results.length === 0) {
      console.log(`No shortcuts found matching "${query}".`);
      return;
    }
    
    console.log(`🔍 Found ${results.length} shortcut(s) matching "${query}":`);
    console.log();
    
    results.forEach(({ key, context }) => {
      const preview = context.substring(0, 100);
      const truncated = context.length > 100 ? '...' : '';
      console.log(`• ${key}: ${preview}${truncated}`);
    });
  });

// Export shortcuts
program
  .command('export')
  .description('Export shortcuts to a file')
  .argument('[file]', 'Output file path (default: reccall-shortcuts.json)')
  .action(async (file = 'reccall-shortcuts.json') => {
    const shortcuts = await loadShortcuts();
    await fs.writeFile(file, JSON.stringify(shortcuts, null, 2));
    console.log(`✅ Shortcuts exported to ${file}`);
  });

// Import shortcuts
program
  .command('import')
  .description('Import shortcuts from a file')
  .argument('<file>', 'Input file path')
  .option('-m, --merge', 'Merge with existing shortcuts (default: overwrite)')
  .action(async (file: string, options) => {
    try {
      const data = await fs.readFile(file, 'utf-8');
      const importedShortcuts = JSON.parse(data);
      
      if (options.merge) {
        const existingShortcuts = await loadShortcuts();
        const mergedShortcuts = { ...existingShortcuts, ...importedShortcuts };
        await saveShortcuts(mergedShortcuts);
        console.log(`✅ Imported ${Object.keys(importedShortcuts).length} shortcuts (merged with existing)`);
      } else {
        await saveShortcuts(importedShortcuts);
        console.log(`✅ Imported ${Object.keys(importedShortcuts).length} shortcuts (overwrote existing)`);
      }
    } catch (error) {
      console.error(`❌ Failed to import shortcuts: ${error}`);
      process.exit(1);
    }
  });

// Show info
program
  .command('info')
  .description('Show RecCall information and statistics')
  .action(async () => {
    const shortcuts = await loadShortcuts();
    const count = Object.keys(shortcuts).length;
    
    console.log('📊 RecCall Information');
    console.log('====================');
    console.log('Version: 1.0.0');
    console.log(`Storage file: ${STORAGE_FILE}`);
    console.log(`Total shortcuts: ${count}`);
    console.log();
    
    if (count > 0) {
      const categories = new Set<string>();
      Object.keys(shortcuts).forEach(key => {
        if (key.includes('-')) {
          categories.add(key.split('-')[0]);
        }
      });
      
      console.log('📁 Categories:');
      Array.from(categories).sort().forEach(cat => {
        const catCount = Object.keys(shortcuts).filter(k => k.startsWith(cat)).length;
        console.log(`  • ${cat}: ${catCount} shortcuts`);
      });
    }
  });

// Parse command line arguments
program.parse();
