/**
 * Popup script for RecCall Perplexity extension
 */

class PopupManager {
  private shortcuts: Record<string, string> = {};

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.loadShortcuts();
    this.setupEventListeners();
    this.renderShortcuts();
  }

  private async loadShortcuts(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['reccall_shortcuts']);
      this.shortcuts = result.reccall_shortcuts || {};
    } catch (error) {
      console.error('Failed to load shortcuts:', error);
    }
  }

  private async saveShortcuts(): Promise<void> {
    try {
      await chrome.storage.local.set({ reccall_shortcuts: this.shortcuts });
    } catch (error) {
      console.error('Failed to save shortcuts:', error);
    }
  }

  private setupEventListeners(): void {
    const addButton = document.getElementById('addShortcut');
    if (addButton) {
      addButton.addEventListener('click', () => this.showAddShortcutDialog());
    }
  }

  private renderShortcuts(): void {
    const shortcutsList = document.getElementById('shortcutsList');
    if (!shortcutsList) return;

    if (Object.keys(this.shortcuts).length === 0) {
      shortcutsList.innerHTML = '<div class="empty-state">No shortcuts yet</div>';
      return;
    }

    shortcutsList.innerHTML = '';

    Object.entries(this.shortcuts).forEach(([shortcut, context]) => {
      const shortcutItem = document.createElement('div');
      shortcutItem.className = 'shortcut-item';

      const shortcutName = document.createElement('span');
      shortcutName.textContent = shortcut;
      shortcutName.className = 'shortcut-name';

      const actions = document.createElement('div');
      actions.className = 'shortcut-actions';

      const callButton = document.createElement('button');
      callButton.textContent = 'Call';
      callButton.className = 'btn btn-call';
      callButton.onclick = () => this.callShortcut(shortcut);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = '×';
      deleteButton.className = 'btn btn-delete';
      deleteButton.onclick = () => this.deleteShortcut(shortcut);

      actions.appendChild(callButton);
      actions.appendChild(deleteButton);

      shortcutItem.appendChild(shortcutName);
      shortcutItem.appendChild(actions);
      shortcutsList.appendChild(shortcutItem);
    });
  }

  private async callShortcut(shortcut: string): Promise<void> {
    try {
      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'RECCALL_CALL',
          shortcut: shortcut
        });
        window.close();
      }
    } catch (error) {
      console.error('Failed to call shortcut:', error);
    }
  }

  private async deleteShortcut(shortcut: string): Promise<void> {
    delete this.shortcuts[shortcut];
    await this.saveShortcuts();
    this.renderShortcuts();
  }

  private async showAddShortcutDialog(): Promise<void> {
    const shortcut = prompt('Enter shortcut name:');
    if (!shortcut) return;

    const context = prompt('Enter context/instructions:');
    if (!context) return;

    this.shortcuts[shortcut] = context;
    await this.saveShortcuts();
    this.renderShortcuts();
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => new PopupManager());
