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
const REPO_CONFIG_FILE = path.join(os.homedir(), '.reccall-repo.json');

// Default repository configuration
const DEFAULT_REPO_CONFIG = {
  defaultRepo: 'https://reccaller.repo.ai',
  cacheDir: path.join(os.homedir(), '.reccall-cache'),
  enabled: true
};

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

// Load repository configuration
async function loadRepoConfig(): Promise<typeof DEFAULT_REPO_CONFIG> {
  try {
    const data = await fs.readFile(REPO_CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_REPO_CONFIG, ...JSON.parse(data) };
  } catch (error) {
    return DEFAULT_REPO_CONFIG;
  }
}

// Save repository configuration
async function saveRepoConfig(config: typeof DEFAULT_REPO_CONFIG): Promise<void> {
  await fs.writeFile(REPO_CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Repository API client
async function fetchFromRepo(url: string): Promise<any> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch from repository: ${error}`);
  }
}

// Get available recipes from repository
async function getRepoRecipes(repoUrl: string): Promise<Array<{name: string, description: string, shortcut: string, context: string}>> {
  const manifestUrl = `${repoUrl}/manifest.json`;
  const manifest = await fetchFromRepo(manifestUrl);
  
  const recipes = [];
  for (const recipe of manifest.recipes || []) {
    try {
      const recipeUrl = `${repoUrl}/${recipe.file}`;
      const recipeData = await fetchFromRepo(recipeUrl);
      recipes.push({
        name: recipe.name || recipe.shortcut,
        description: recipe.description || '',
        shortcut: recipeData.shortcut,
        context: recipeData.context
      });
    } catch (error) {
      console.warn(`Failed to load recipe ${recipe.file}:`, error);
    }
  }
  
  return recipes;
}

// Install recipe from repository
async function installRepoRecipe(shortcut: string, repoUrl: string): Promise<void> {
  const recipes = await getRepoRecipes(repoUrl);
  const recipe = recipes.find(r => r.shortcut === shortcut);
  
  if (!recipe) {
    throw new Error(`Recipe '${shortcut}' not found in repository`);
  }
  
  const shortcuts = await loadShortcuts();
  shortcuts[shortcut] = recipe.context;
  await saveShortcuts(shortcuts);
}

// Cache management
async function ensureCacheDir(): Promise<void> {
  const config = await loadRepoConfig();
  try {
    await fs.mkdir(config.cacheDir, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

async function getCachedRecipes(repoUrl: string): Promise<Array<{name: string, description: string, shortcut: string, context: string}> | null> {
  const config = await loadRepoConfig();
  const cacheFile = path.join(config.cacheDir, `${Buffer.from(repoUrl).toString('base64')}.json`);
  
  try {
    const data = await fs.readFile(cacheFile, 'utf-8');
    const cached = JSON.parse(data);
    
    // Check if cache is less than 1 hour old
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - cached.timestamp < oneHour) {
      return cached.recipes;
    }
  } catch (error) {
    // Cache doesn't exist or is invalid
  }
  
  return null;
}

async function setCachedRecipes(repoUrl: string, recipes: Array<{name: string, description: string, shortcut: string, context: string}>): Promise<void> {
  const config = await loadRepoConfig();
  await ensureCacheDir();
  
  const cacheFile = path.join(config.cacheDir, `${Buffer.from(repoUrl).toString('base64')}.json`);
  const cacheData = {
    timestamp: Date.now(),
    recipes: recipes
  };
  
  await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
}

// Enhanced getRepoRecipes with caching
async function getRepoRecipesCached(repoUrl: string): Promise<Array<{name: string, description: string, shortcut: string, context: string}>> {
  // Try to get from cache first
  const cached = await getCachedRecipes(repoUrl);
  if (cached) {
    return cached;
  }
  
  // Fetch from repository
  const recipes = await getRepoRecipes(repoUrl);
  
  // Cache the results
  await setCachedRecipes(repoUrl, recipes);
  
  return recipes;
}

// Recipe validation
function validateRecipe(recipe: any): { valid: boolean, errors: string[] } {
  const errors: string[] = [];
  
  if (!recipe.shortcut || typeof recipe.shortcut !== 'string') {
    errors.push('Recipe must have a valid shortcut');
  }
  
  if (!recipe.context || typeof recipe.context !== 'string') {
    errors.push('Recipe must have context content');
  }
  
  if (recipe.shortcut && !/^[a-zA-Z0-9-_]+$/.test(recipe.shortcut)) {
    errors.push('Recipe shortcut must contain only alphanumeric characters, hyphens, and underscores');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
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

// Repository commands
program
  .command('repo-list')
  .description('List available recipes from the configured repository')
  .option('-r, --repo <url>', 'Repository URL (overrides default)')
  .action(async (options) => {
    try {
      const config = await loadRepoConfig();
      const repoUrl = options.repo || config.defaultRepo;
      
      console.log(`🔍 Fetching recipes from ${repoUrl}...`);
      const recipes = await getRepoRecipesCached(repoUrl);
      
      if (recipes.length === 0) {
        console.log('No recipes found in repository.');
        return;
      }
      
      console.log(`📋 Available recipes (${recipes.length}):`);
      console.log();
      
      recipes.forEach(recipe => {
        console.log(`• ${recipe.shortcut}: ${recipe.name}`);
        if (recipe.description) {
          console.log(`  ${recipe.description}`);
        }
        console.log();
      });
    } catch (error) {
      console.error(`❌ Failed to fetch recipes: ${error}`);
      process.exit(1);
    }
  });

program
  .command('repo-install')
  .description('Install a recipe from the repository')
  .argument('<shortcut>', 'Recipe shortcut to install')
  .option('-r, --repo <url>', 'Repository URL (overrides default)')
  .action(async (shortcut: string, options) => {
    try {
      const config = await loadRepoConfig();
      const repoUrl = options.repo || config.defaultRepo;
      
      console.log(`📥 Installing recipe '${shortcut}' from ${repoUrl}...`);
      
      // Get recipe with validation
      const recipes = await getRepoRecipesCached(repoUrl);
      const recipe = recipes.find(r => r.shortcut === shortcut);
      
      if (!recipe) {
        throw new Error(`Recipe '${shortcut}' not found in repository`);
      }
      
      // Validate recipe
      const validation = validateRecipe(recipe);
      if (!validation.valid) {
        throw new Error(`Recipe validation failed: ${validation.errors.join(', ')}`);
      }
      
      // Install the recipe
      const shortcuts = await loadShortcuts();
      shortcuts[shortcut] = recipe.context;
      await saveShortcuts(shortcuts);
      
      console.log(`✅ Recipe '${shortcut}' installed successfully!`);
    } catch (error) {
      console.error(`❌ Failed to install recipe: ${error}`);
      process.exit(1);
    }
  });

program
  .command('repo-search')
  .description('Search for recipes in the repository')
  .argument('<query>', 'Search query')
  .option('-r, --repo <url>', 'Repository URL (overrides default)')
  .action(async (query: string, options) => {
    try {
      const config = await loadRepoConfig();
      const repoUrl = options.repo || config.defaultRepo;
      
      console.log(`🔍 Searching for "${query}" in ${repoUrl}...`);
      const recipes = await getRepoRecipesCached(repoUrl);
      
      const results = recipes.filter(recipe => 
        recipe.name.toLowerCase().includes(query.toLowerCase()) ||
        recipe.description.toLowerCase().includes(query.toLowerCase()) ||
        recipe.shortcut.toLowerCase().includes(query.toLowerCase())
      );
      
      if (results.length === 0) {
        console.log(`No recipes found matching "${query}".`);
        return;
      }
      
      console.log(`📋 Found ${results.length} recipe(s) matching "${query}":`);
      console.log();
      
      results.forEach(recipe => {
        console.log(`• ${recipe.shortcut}: ${recipe.name}`);
        if (recipe.description) {
          console.log(`  ${recipe.description}`);
        }
        console.log();
      });
    } catch (error) {
      console.error(`❌ Failed to search recipes: ${error}`);
      process.exit(1);
    }
  });

program
  .command('repo-config')
  .description('Configure repository settings')
  .option('-s, --set-repo <url>', 'Set default repository URL')
  .option('-d, --disable', 'Disable repository features')
  .option('-e, --enable', 'Enable repository features')
  .action(async (options) => {
    const config = await loadRepoConfig();
    
    if (options.setRepo) {
      config.defaultRepo = options.setRepo;
      console.log(`✅ Default repository set to: ${config.defaultRepo}`);
    }
    
    if (options.disable) {
      config.enabled = false;
      console.log('✅ Repository features disabled');
    }
    
    if (options.enable) {
      config.enabled = true;
      console.log('✅ Repository features enabled');
    }
    
    await saveRepoConfig(config);
    
    console.log('\n📊 Current repository configuration:');
    console.log(`  Default repository: ${config.defaultRepo}`);
    console.log(`  Cache directory: ${config.cacheDir}`);
    console.log(`  Repository enabled: ${config.enabled}`);
  });

program
  .command('repo-cache-clear')
  .description('Clear repository cache')
  .action(async () => {
    try {
      const config = await loadRepoConfig();
      const cacheFiles = await fs.readdir(config.cacheDir).catch(() => []);
      
      if (cacheFiles.length === 0) {
        console.log('Cache is already empty.');
        return;
      }
      
      for (const file of cacheFiles) {
        await fs.unlink(path.join(config.cacheDir, file));
      }
      
      console.log(`✅ Cleared ${cacheFiles.length} cached repository file(s).`);
    } catch (error) {
      console.error(`❌ Failed to clear cache: ${error}`);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
