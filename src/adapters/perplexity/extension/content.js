/**
 * Content script for Perplexity integration
 */

class PerplexityRecCall {
  private shortcuts: Record<string, string> = {};
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.loadShortcuts();
      this.injectUI();
      this.setupEventListeners();
      this.isInitialized = true;
    } catch (error) {
      console.error('RecCall Perplexity initialization failed:', error);
    }
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

  private injectUI(): void {
    // Create RecCall button
    const reccallButton = document.createElement('button');
    reccallButton.id = 'reccall-button';
    reccallButton.innerHTML = '🎯 RecCall';
    reccallButton.className = 'reccall-btn';
    reccallButton.title = 'RecCall Context Shortcuts';

    // Create shortcuts panel
    const shortcutsPanel = document.createElement('div');
    shortcutsPanel.id = 'reccall-panel';
    shortcutsPanel.className = 'reccall-panel hidden';

    const shortcutsList = document.createElement('div');
    shortcutsList.id = 'reccall-shortcuts';
    shortcutsList.className = 'reccall-shortcuts';

    const addButton = document.createElement('button');
    addButton.textContent = '+ Add Shortcut';
    addButton.className = 'reccall-add-btn';
    addButton.onclick = () => this.showAddShortcutDialog();

    shortcutsPanel.appendChild(shortcutsList);
    shortcutsPanel.appendChild(addButton);

    // Find the input area and inject UI
    const inputArea = document.querySelector('textarea[placeholder*="Ask anything"]') || 
                     document.querySelector('input[type="text"]') ||
                     document.querySelector('.ProseMirror');
    
    if (inputArea) {
      const container = inputArea.parentElement;
      if (container) {
        container.appendChild(reccallButton);
        container.appendChild(shortcutsPanel);
      }
    }

    this.updateShortcutsList();
  }

  private setupEventListeners(): void {
    // Toggle shortcuts panel
    const button = document.getElementById('reccall-button');
    if (button) {
      button.addEventListener('click', () => this.toggleShortcutsPanel());
    }

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'RECCALL_CALL') {
        this.callShortcut(message.shortcut);
        sendResponse({ success: true });
      } else if (message.type === 'RECCALL_RECORD') {
        this.recordShortcut(message.shortcut, message.context);
        sendResponse({ success: true });
      }
    });
  }

  private toggleShortcutsPanel(): void {
    const panel = document.getElementById('reccall-panel');
    if (panel) {
      panel.classList.toggle('hidden');
    }
  }

  private updateShortcutsList(): void {
    const shortcutsList = document.getElementById('reccall-shortcuts');
    if (!shortcutsList) return;

    shortcutsList.innerHTML = '';

    Object.entries(this.shortcuts).forEach(([shortcut, context]) => {
      const shortcutItem = document.createElement('div');
      shortcutItem.className = 'reccall-shortcut-item';

      const shortcutName = document.createElement('span');
      shortcutName.textContent = shortcut;
      shortcutName.className = 'reccall-shortcut-name';

      const callButton = document.createElement('button');
      callButton.textContent = 'Call';
      callButton.className = 'reccall-call-btn';
      callButton.onclick = () => this.callShortcut(shortcut);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = '×';
      deleteButton.className = 'reccall-delete-btn';
      deleteButton.onclick = () => this.deleteShortcut(shortcut);

      shortcutItem.appendChild(shortcutName);
      shortcutItem.appendChild(callButton);
      shortcutItem.appendChild(deleteButton);
      shortcutsList.appendChild(shortcutItem);
    });
  }

  private callShortcut(shortcut: string): void {
    const context = this.shortcuts[shortcut];
    if (!context) return;

    // Find the input field
    const inputField = document.querySelector('textarea[placeholder*="Ask anything"]') as HTMLTextAreaElement ||
                      document.querySelector('input[type="text"]') as HTMLInputElement;
    
    if (inputField) {
      inputField.value = context;
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
      inputField.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Focus the input
      inputField.focus();
      
      // Show success message
      this.showMessage(`Called shortcut: ${shortcut}`, 'success');
    }
  }

  private async recordShortcut(shortcut: string, context: string): Promise<void> {
    this.shortcuts[shortcut] = context;
    await this.saveShortcuts();
    this.updateShortcutsList();
    this.showMessage(`Recorded shortcut: ${shortcut}`, 'success');
  }

  private async deleteShortcut(shortcut: string): Promise<void> {
    delete this.shortcuts[shortcut];
    await this.saveShortcuts();
    this.updateShortcutsList();
    this.showMessage(`Deleted shortcut: ${shortcut}`, 'info');
  }

  private showAddShortcutDialog(): void {
    const shortcut = prompt('Enter shortcut name:');
    if (!shortcut) return;

    const context = prompt('Enter context/instructions:');
    if (!context) return;

    this.recordShortcut(shortcut, context);
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    const messageEl = document.createElement('div');
    messageEl.className = `reccall-message reccall-message-${type}`;
    messageEl.textContent = message;

    document.body.appendChild(messageEl);

    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PerplexityRecCall());
} else {
  new PerplexityRecCall();
}
