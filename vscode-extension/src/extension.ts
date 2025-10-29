/**
 * RecCall VSCode Extension
 * Refactored to use core engine via VSCodeAdapter
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Try to load core engine and adapter
// Since VSCode extensions bundle their code, we need to handle both:
// 1. Development mode: Core engine available from parent package
// 2. Production mode: Extension may run standalone, use fallback
let vscodeAdapter: any = null;
let coreEngine: any = null;

// Lazy load core engine and adapter
async function getVSCodeAdapter() {
  if (vscodeAdapter) {
    return vscodeAdapter;
  }

  try {
    // Try to load from parent reccall package
    // Path resolution: extension's directory -> parent -> dist
    const extensionPath = vscode.extensions.getExtension('reccaller-ai.reccall')?.extensionPath;
    if (!extensionPath) {
      throw new Error('Extension path not found');
    }

    // Try multiple strategies for loading the core engine
    const strategies = [
      // Strategy 1: Import from npm package (if installed)
      async () => {
        const { createCoreEngine } = await import('reccall/core');
        return await createCoreEngine();
      },
      // Strategy 2: Import from parent dist (development)
      async () => {
        const parentPath = path.resolve(extensionPath, '..', '..');
        const containerPath = path.join(parentPath, 'dist', 'src', 'core', 'container.js');
        const module = await import(`file://${containerPath}`);
        return await module.createCoreEngine();
      },
    ];

    for (const strategy of strategies) {
      try {
        coreEngine = await strategy();
        break;
      } catch (error) {
        // Try next strategy
        continue;
      }
    }

    if (coreEngine) {
      // Load VSCode adapter
      try {
        const adapterPath = path.resolve(extensionPath, '..', '..', 'dist', 'src', 'adapters', 'vscode', 'index.js');
        const adapterModule = await import(`file://${adapterPath}`);
        const { VSCodeAdapter } = adapterModule;
        vscodeAdapter = new VSCodeAdapter(coreEngine);
        await vscodeAdapter.initialize();
        return vscodeAdapter;
      } catch (error) {
        // If adapter not found, use core engine directly
        await coreEngine.initialize();
        return coreEngine;
      }
    }

    throw new Error('Could not load core engine');
  } catch (error) {
    // Core engine not available, will use fallback
    console.warn('Core engine not available, using fallback implementation:', error);
    return null;
  }
}

// Fallback implementation using direct file I/O
// This is used when the core engine is not available (e.g., extension running standalone)
import * as fs from 'fs';
import * as os from 'os';

const STORAGE_FILE = path.join(os.homedir(), '.reccall.json');

async function loadShortcutsFallback(): Promise<Record<string, string>> {
  try {
    const data = await fs.promises.readFile(STORAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

async function saveShortcutsFallback(shortcuts: Record<string, string>): Promise<void> {
  await fs.promises.writeFile(STORAGE_FILE, JSON.stringify(shortcuts, null, 2));
}

// Helper to use VSCode adapter or fallback
async function withAdapter<T>(
  operation: (adapter: any) => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  const adapter = await getVSCodeAdapter();
  if (adapter) {
    try {
      return await operation(adapter);
    } catch (error) {
      console.error('Error using VSCode adapter, falling back:', error);
      return await fallback();
    }
  }
  return await fallback();
}

export function activate(context: vscode.ExtensionContext) {
  console.log('RecCall extension is now active!');

  // Record a new shortcut
  const recordCommand = vscode.commands.registerCommand('reccall.record', async () => {
    const shortcut = await vscode.window.showInputBox({
      prompt: 'Enter shortcut name',
      placeHolder: 'e.g., react-component, api-test',
    });

    if (!shortcut) {
      return;
    }

    const contextText = await vscode.window.showInputBox({
      prompt: 'Enter context/instructions',
      placeHolder: 'e.g., Create React components with TypeScript...',
    });

    if (!contextText) {
      return;
    }

    await withAdapter(
      async (adapter) => {
        try {
          await adapter.record(shortcut as any, contextText);
          vscode.window.showInformationMessage(`✅ Shortcut '${shortcut}' recorded successfully!`);
        } catch (error: any) {
          if (error.message?.includes('already exists') || error.code === 'DUPLICATE_ERROR') {
            const overwrite = await vscode.window.showWarningMessage(
              `Shortcut '${shortcut}' already exists. Overwrite?`,
              'Yes', 'No',
            );
            
            if (overwrite === 'Yes') {
              await adapter.update(shortcut as any, contextText);
              vscode.window.showInformationMessage(`✅ Shortcut '${shortcut}' updated successfully!`);
            }
          } else {
            throw error;
          }
        }
      },
      async () => {
        const shortcuts = await loadShortcutsFallback();
        if (shortcuts[shortcut]) {
          const overwrite = await vscode.window.showWarningMessage(
            `Shortcut '${shortcut}' already exists. Overwrite?`,
            'Yes', 'No',
          );
          
          if (overwrite !== 'Yes') {
            return;
          }
        }
        shortcuts[shortcut] = contextText;
        await saveShortcutsFallback(shortcuts);
        vscode.window.showInformationMessage(`✅ Shortcut '${shortcut}' recorded successfully!`);
      }
    );
  });

  // Call/retrieve a shortcut
  const callCommand = vscode.commands.registerCommand('reccall.call', async () => {
    await withAdapter(
      async (adapter) => {
        const shortcuts = await adapter.list();
        if (shortcuts.length === 0) {
          vscode.window.showInformationMessage('No shortcuts available. Record some shortcuts first!');
          return;
        }

        const shortcutList = shortcuts.map(s => s.id);
        const selectedShortcut = await vscode.window.showQuickPick(shortcutList, {
          placeHolder: 'Select a shortcut to call',
        });

        if (!selectedShortcut) {
          return;
        }

        const contextText = await adapter.call(selectedShortcut as any);
        
        // Show the context in a new document
        const doc = await vscode.workspace.openTextDocument({
          content: `# ${selectedShortcut}\n\n${contextText}`,
          language: 'markdown',
        });
        
        await vscode.window.showTextDocument(doc);
        
        // Optionally insert into current editor
        const editor = vscode.window.activeTextEditor;
        const config = vscode.workspace.getConfiguration('reccall');
        const autoInsert = config.get<boolean>('autoInsert', true);
        
        if (editor && autoInsert) {
          const insert = await vscode.window.showInformationMessage(
            `Shortcut '${selectedShortcut}' loaded. Insert into current editor?`,
            'Yes', 'No',
          );
          
          if (insert === 'Yes') {
            const position = editor.selection.active;
            await editor.edit(editBuilder => {
              editBuilder.insert(position, contextText);
            });
          }
        }
      },
      async () => {
        const shortcuts = await loadShortcutsFallback();
        const shortcutList = Object.keys(shortcuts);
        
        if (shortcutList.length === 0) {
          vscode.window.showInformationMessage('No shortcuts available. Record some shortcuts first!');
          return;
        }

        const selectedShortcut = await vscode.window.showQuickPick(shortcutList, {
          placeHolder: 'Select a shortcut to call',
        });

        if (!selectedShortcut) {
          return;
        }

        const contextText = shortcuts[selectedShortcut];
        
        // Show the context in a new document
        const doc = await vscode.workspace.openTextDocument({
          content: `# ${selectedShortcut}\n\n${contextText}`,
          language: 'markdown',
        });
        
        await vscode.window.showTextDocument(doc);
        
        // Optionally insert into current editor
        const editor = vscode.window.activeTextEditor;
        const config = vscode.workspace.getConfiguration('reccall');
        const autoInsert = config.get<boolean>('autoInsert', true);
        
        if (editor && autoInsert) {
          const insert = await vscode.window.showInformationMessage(
            `Shortcut '${selectedShortcut}' loaded. Insert into current editor?`,
            'Yes', 'No',
          );
          
          if (insert === 'Yes') {
            const position = editor.selection.active;
            await editor.edit(editBuilder => {
              editBuilder.insert(position, contextText);
            });
          }
        }
      }
    );
  });

  // List all shortcuts
  const listCommand = vscode.commands.registerCommand('reccall.list', async () => {
    await withAdapter(
      async (adapter) => {
        const shortcuts = await adapter.list();
        
        if (shortcuts.length === 0) {
          vscode.window.showInformationMessage('No shortcuts stored yet.');
          return;
        }

        const content = shortcuts.map(s => {
          const preview = s.context.substring(0, 100);
          const truncated = s.context.length > 100 ? '...' : '';
          const category = s.category ? ` (${s.category})` : '';
          return `## ${s.id}${category}\n${preview}${truncated}\n`;
        }).join('\n');

        const doc = await vscode.workspace.openTextDocument({
          content: `# RecCall Shortcuts (${shortcuts.length})\n\n${content}`,
          language: 'markdown',
        });
        
        await vscode.window.showTextDocument(doc);
      },
      async () => {
        const shortcuts = await loadShortcutsFallback();
        const shortcutList = Object.keys(shortcuts);
        
        if (shortcutList.length === 0) {
          vscode.window.showInformationMessage('No shortcuts stored yet.');
          return;
        }

        const content = shortcutList.map(key => {
          const preview = shortcuts[key].substring(0, 100);
          const truncated = shortcuts[key].length > 100 ? '...' : '';
          return `## ${key}\n${preview}${truncated}\n`;
        }).join('\n');

        const doc = await vscode.workspace.openTextDocument({
          content: `# RecCall Shortcuts (${shortcutList.length})\n\n${content}`,
          language: 'markdown',
        });
        
        await vscode.window.showTextDocument(doc);
      }
    );
  });

  // Search shortcuts
  const searchCommand = vscode.commands.registerCommand('reccall.search', async () => {
    const query = await vscode.window.showInputBox({
      prompt: 'Search shortcuts',
      placeHolder: 'Enter search term',
    });

    if (!query) {
      return;
    }

    await withAdapter(
      async (adapter) => {
        const results = await adapter.search(query);
        
        if (results.length === 0) {
          vscode.window.showInformationMessage(`No shortcuts found matching "${query}".`);
          return;
        }

        const content = results.map(s => {
          const preview = s.context.substring(0, 100);
          const truncated = s.context.length > 100 ? '...' : '';
          const category = s.category ? ` (${s.category})` : '';
          return `## ${s.id}${category}\n${preview}${truncated}\n`;
        }).join('\n');

        const doc = await vscode.workspace.openTextDocument({
          content: `# Search Results for "${query}" (${results.length} found)\n\n${content}`,
          language: 'markdown',
        });
        
        await vscode.window.showTextDocument(doc);
      },
      async () => {
        const shortcuts = await loadShortcutsFallback();
        const results: Array<{key: string, context: string}> = [];
        
        Object.entries(shortcuts).forEach(([key, context]) => {
          if (key.toLowerCase().includes(query.toLowerCase()) || 
              context.toLowerCase().includes(query.toLowerCase())) {
            results.push({ key, context });
          }
        });
        
        if (results.length === 0) {
          vscode.window.showInformationMessage(`No shortcuts found matching "${query}".`);
          return;
        }

        const content = results.map(({ key, context }) => {
          const preview = context.substring(0, 100);
          const truncated = context.length > 100 ? '...' : '';
          return `## ${key}\n${preview}${truncated}\n`;
        }).join('\n');

        const doc = await vscode.workspace.openTextDocument({
          content: `# Search Results for "${query}" (${results.length} found)\n\n${content}`,
          language: 'markdown',
        });
        
        await vscode.window.showTextDocument(doc);
      }
    );
  });

  // Update a shortcut
  const updateCommand = vscode.commands.registerCommand('reccall.update', async () => {
    await withAdapter(
      async (adapter) => {
        const shortcuts = await adapter.list();
        
        if (shortcuts.length === 0) {
          vscode.window.showInformationMessage('No shortcuts available to update.');
          return;
        }

        const shortcutList = shortcuts.map(s => s.id);
        const selectedShortcut = await vscode.window.showQuickPick(shortcutList, {
          placeHolder: 'Select a shortcut to update',
        });

        if (!selectedShortcut) {
          return;
        }

        const existing = shortcuts.find(s => s.id === selectedShortcut);
        const newContext = await vscode.window.showInputBox({
          prompt: 'Enter new context/instructions',
          value: existing?.context || '',
          placeHolder: 'Enter new context...',
        });

        if (!newContext) {
          return;
        }

        await adapter.update(selectedShortcut as any, newContext);
        vscode.window.showInformationMessage(`✅ Shortcut '${selectedShortcut}' updated successfully!`);
      },
      async () => {
        const shortcuts = await loadShortcutsFallback();
        const shortcutList = Object.keys(shortcuts);
        
        if (shortcutList.length === 0) {
          vscode.window.showInformationMessage('No shortcuts available to update.');
          return;
        }

        const selectedShortcut = await vscode.window.showQuickPick(shortcutList, {
          placeHolder: 'Select a shortcut to update',
        });

        if (!selectedShortcut) {
          return;
        }

        const newContext = await vscode.window.showInputBox({
          prompt: 'Enter new context/instructions',
          value: shortcuts[selectedShortcut],
          placeHolder: 'Enter new context...',
        });

        if (!newContext) {
          return;
        }

        shortcuts[selectedShortcut] = newContext;
        await saveShortcutsFallback(shortcuts);
        vscode.window.showInformationMessage(`✅ Shortcut '${selectedShortcut}' updated successfully!`);
      }
    );
  });

  // Delete a shortcut
  const deleteCommand = vscode.commands.registerCommand('reccall.delete', async () => {
    await withAdapter(
      async (adapter) => {
        const shortcuts = await adapter.list();
        
        if (shortcuts.length === 0) {
          vscode.window.showInformationMessage('No shortcuts available to delete.');
          return;
        }

        const shortcutList = shortcuts.map(s => s.id);
        const selectedShortcut = await vscode.window.showQuickPick(shortcutList, {
          placeHolder: 'Select a shortcut to delete',
        });

        if (!selectedShortcut) {
          return;
        }

        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to delete shortcut '${selectedShortcut}'?`,
          'Yes', 'No',
        );

        if (confirm === 'Yes') {
          await adapter.delete(selectedShortcut as any);
          vscode.window.showInformationMessage(`✅ Shortcut '${selectedShortcut}' deleted successfully!`);
        }
      },
      async () => {
        const shortcuts = await loadShortcutsFallback();
        const shortcutList = Object.keys(shortcuts);
        
        if (shortcuts.length === 0) {
          vscode.window.showInformationMessage('No shortcuts available to delete.');
          return;
        }

        const selectedShortcut = await vscode.window.showQuickPick(shortcutList, {
          placeHolder: 'Select a shortcut to delete',
        });

        if (!selectedShortcut) {
          return;
        }

        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to delete shortcut '${selectedShortcut}'?`,
          'Yes', 'No',
        );

        if (confirm === 'Yes') {
          delete shortcuts[selectedShortcut];
          await saveShortcutsFallback(shortcuts);
          vscode.window.showInformationMessage(`✅ Shortcut '${selectedShortcut}' deleted successfully!`);
        }
      }
    );
  });

  // Reload starter pack
  const reloadStarterPackCommand = vscode.commands.registerCommand('reccall.reloadStarterPack', async () => {
    await withAdapter(
      async (adapter) => {
        const shortcuts = await adapter.list();
        const count = shortcuts.length;
        
        if (count > 0) {
          const confirm = await vscode.window.showWarningMessage(
            `This will add starter pack recipes. Existing shortcuts will be preserved. Continue?`,
            'Yes', 'No',
          );
          
          if (confirm !== 'Yes') {
            return;
          }
        }
        
        await adapter.reloadStarterPack();
        const updated = await adapter.list();
        vscode.window.showInformationMessage(
          `✅ Starter pack reloaded successfully! Total shortcuts: ${updated.length}.`,
        );
      },
      async () => {
        // Fallback implementation for starter pack loading
        const shortcuts = await loadShortcutsFallback();
        const count = Object.keys(shortcuts).length;
        
        if (count > 0) {
          const confirm = await vscode.window.showWarningMessage(
            `This will overwrite ALL ${count} existing shortcuts with starter pack recipes. Continue?`,
            'Yes', 'No',
          );
          
          if (confirm !== 'Yes') {
            return;
          }
        }
        
        // Load starter pack from extension path
        const extensionPath = vscode.extensions.getExtension('reccaller-ai.reccall')?.extensionPath;
        if (!extensionPath) {
          vscode.window.showErrorMessage('Extension path not found');
          return;
        }
        
        const manifestPath = path.join(extensionPath, '..', 'starter-pack', 'manifest.json');
        try {
          const manifestData = await fs.promises.readFile(manifestPath, 'utf-8');
          const manifest = JSON.parse(manifestData);
          const starterPack: Record<string, string> = {};
          
          for (const recipe of manifest.recipes) {
            try {
              const recipePath = path.join(extensionPath, '..', 'starter-pack', recipe.file);
              const recipeData = await fs.promises.readFile(recipePath, 'utf-8');
              const recipeObj = JSON.parse(recipeData);
              starterPack[recipeObj.shortcut] = recipeObj.context;
            } catch (error) {
              console.error(`Failed to load recipe ${recipe.file}:`, error);
            }
          }
          
          await saveShortcutsFallback(starterPack);
          vscode.window.showInformationMessage(
            `✅ Starter pack loaded successfully! ${Object.keys(starterPack).length} recipes loaded.`,
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to load starter pack: ${error}`);
        }
      }
    );
  });

  // Register all commands
  context.subscriptions.push(
    recordCommand,
    callCommand,
    listCommand,
    searchCommand,
    updateCommand,
    deleteCommand,
    reloadStarterPackCommand,
  );
}

export function deactivate() {
  console.log('RecCall extension is now deactivated!');
}
