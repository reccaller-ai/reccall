import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const STORAGE_FILE = path.join(os.homedir(), '.reccall.json');

// Load shortcuts from storage
async function loadShortcuts(): Promise<Record<string, string>> {
  try {
    const data = await fs.promises.readFile(STORAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// Save shortcuts to storage
async function saveShortcuts(shortcuts: Record<string, string>): Promise<void> {
  await fs.promises.writeFile(STORAGE_FILE, JSON.stringify(shortcuts, null, 2));
}

// Load starter pack recipes
async function loadStarterPack(): Promise<Record<string, string>> {
  const shortcuts: Record<string, string> = {};
  
  try {
    const extensionPath = vscode.extensions.getExtension('reccaller-ai.reccall')?.extensionPath;
    if (!extensionPath) {
      throw new Error('Extension path not found');
    }
    
    const manifestPath = path.join(extensionPath, 'starter-pack', 'manifest.json');
    const manifestData = await fs.promises.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestData);
    
    for (const recipe of manifest.recipes) {
      try {
        const recipePath = path.join(extensionPath, 'starter-pack', recipe.file);
        const recipeData = await fs.promises.readFile(recipePath, 'utf-8');
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

    const context = await vscode.window.showInputBox({
      prompt: 'Enter context/instructions',
      placeHolder: 'e.g., Create React components with TypeScript...',
    });

    if (!context) {
      return;
    }

    const shortcuts = await loadShortcuts();
    
    if (shortcuts[shortcut]) {
      const overwrite = await vscode.window.showWarningMessage(
        `Shortcut '${shortcut}' already exists. Overwrite?`,
        'Yes', 'No',
      );
      
      if (overwrite !== 'Yes') {
        return;
      }
    }
    
    shortcuts[shortcut] = context;
    await saveShortcuts(shortcuts);
    
    vscode.window.showInformationMessage(`✅ Shortcut '${shortcut}' recorded successfully!`);
  });

  // Call/retrieve a shortcut
  const callCommand = vscode.commands.registerCommand('reccall.call', async () => {
    const shortcuts = await loadShortcuts();
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

    const context = shortcuts[selectedShortcut];
    
    // Show the context in a new document
    const doc = await vscode.workspace.openTextDocument({
      content: `# ${selectedShortcut}\n\n${context}`,
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
          editBuilder.insert(position, context);
        });
      }
    }
  });

  // List all shortcuts
  const listCommand = vscode.commands.registerCommand('reccall.list', async () => {
    const shortcuts = await loadShortcuts();
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

    const shortcuts = await loadShortcuts();
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
  });

  // Update a shortcut
  const updateCommand = vscode.commands.registerCommand('reccall.update', async () => {
    const shortcuts = await loadShortcuts();
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
    await saveShortcuts(shortcuts);
    
    vscode.window.showInformationMessage(`✅ Shortcut '${selectedShortcut}' updated successfully!`);
  });

  // Delete a shortcut
  const deleteCommand = vscode.commands.registerCommand('reccall.delete', async () => {
    const shortcuts = await loadShortcuts();
    const shortcutList = Object.keys(shortcuts);
    
    if (shortcutList.length === 0) {
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
      await saveShortcuts(shortcuts);
      vscode.window.showInformationMessage(`✅ Shortcut '${selectedShortcut}' deleted successfully!`);
    }
  });

  // Reload starter pack
  const reloadStarterPackCommand = vscode.commands.registerCommand('reccall.reloadStarterPack', async () => {
    const shortcuts = await loadShortcuts();
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
    
    const starterPack = await loadStarterPack();
    await saveShortcuts(starterPack);
    
    vscode.window.showInformationMessage(
      `✅ Starter pack loaded successfully! ${Object.keys(starterPack).length} recipes loaded.`,
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
