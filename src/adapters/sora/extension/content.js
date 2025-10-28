/**
 * Content script for Sora integration
 */

class SoraRecCall {
  private shortcuts: Record<string, string> = {};
  private isInitialized = false;
  private clipboardMonitor: any = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.loadShortcuts();
      this.injectUI();
      this.setupEventListeners();
      this.startClipboardMonitoring();
      this.isInitialized = true;
    } catch (error) {
      console.error('RecCall Sora initialization failed:', error);
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
    reccallButton.id = 'reccall-sora-button';
    reccallButton.innerHTML = '🎬 RecCall';
    reccallButton.className = 'reccall-sora-btn';
    reccallButton.title = 'RecCall Video Context Shortcuts';

    // Create shortcuts panel
    const shortcutsPanel = document.createElement('div');
    shortcutsPanel.id = 'reccall-sora-panel';
    shortcutsPanel.className = 'reccall-sora-panel hidden';

    const shortcutsList = document.createElement('div');
    shortcutsList.id = 'reccall-sora-shortcuts';
    shortcutsList.className = 'reccall-sora-shortcuts';

    const addButton = document.createElement('button');
    addButton.textContent = '+ Add Video Context';
    addButton.className = 'reccall-add-btn';
    addButton.onclick = () => this.showAddShortcutDialog();

    shortcutsPanel.appendChild(shortcutsList);
    shortcutsPanel.appendChild(addButton);

    // Find the input area and inject UI
    const inputArea = document.querySelector('textarea') || 
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
    const button = document.getElementById('reccall-sora-button');
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

  private startClipboardMonitoring(): void {
    // Monitor clipboard for video generation prompts
    this.clipboardMonitor = setInterval(async () => {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (this.isVideoPrompt(clipboardText)) {
          this.suggestContext(clipboardText);
        }
      } catch (error) {
        // Clipboard access might be denied
      }
    }, 2000);
  }

  private isVideoPrompt(text: string): boolean {
    const videoKeywords = [
      'video', 'film', 'movie', 'animation', 'motion',
      'camera', 'shot', 'scene', 'cinematic', 'footage'
    ];
    
    return videoKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    ) && text.length > 20;
  }

  private suggestContext(text: string): void {
    const suggestion = document.createElement('div');
    suggestion.className = 'reccall-suggestion';
    suggestion.innerHTML = `
      <div class="suggestion-content">
        <strong>🎬 Video prompt detected!</strong>
        <p>Save this as a video context shortcut?</p>
        <div class="suggestion-actions">
          <button onclick="this.parentElement.parentElement.parentElement.remove()">Dismiss</button>
          <button onclick="window.reccallSora.saveClipboardAsShortcut('${text.replace(/'/g, "\\'")}')">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(suggestion);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (suggestion.parentElement) {
        suggestion.remove();
      }
    }, 10000);
  }

  private toggleShortcutsPanel(): void {
    const panel = document.getElementById('reccall-sora-panel');
    if (panel) {
      panel.classList.toggle('hidden');
    }
  }

  private updateShortcutsList(): void {
    const shortcutsList = document.getElementById('reccall-sora-shortcuts');
    if (!shortcutsList) return;

    shortcutsList.innerHTML = '';

    Object.entries(this.shortcuts).forEach(([shortcut, context]) => {
      const shortcutItem = document.createElement('div');
      shortcutItem.className = 'reccall-shortcut-item';

      const shortcutName = document.createElement('span');
      shortcutName.textContent = shortcut;
      shortcutName.className = 'reccall-shortcut-name';

      const callButton = document.createElement('button');
      callButton.textContent = 'Use';
      callButton.className = 'reccall-call-btn';
      callButton.onclick = () => this.callShortcut(shortcut);

      const copyButton = document.createElement('button');
      copyButton.textContent = 'Copy';
      copyButton.className = 'reccall-copy-btn';
      copyButton.onclick = () => this.copyToClipboard(context);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = '×';
      deleteButton.className = 'reccall-delete-btn';
      deleteButton.onclick = () => this.deleteShortcut(shortcut);

      shortcutItem.appendChild(shortcutName);
      shortcutItem.appendChild(callButton);
      shortcutItem.appendChild(copyButton);
      shortcutItem.appendChild(deleteButton);
      shortcutsList.appendChild(shortcutItem);
    });
  }

  private callShortcut(shortcut: string): void {
    const context = this.shortcuts[shortcut];
    if (!context) return;

    // Find the input field
    const inputField = document.querySelector('textarea') as HTMLTextAreaElement ||
                      document.querySelector('input[type="text"]') as HTMLInputElement;
    
    if (inputField) {
      inputField.value = context;
      inputField.dispatchEvent(new Event('input', { bubbles: true }));
      inputField.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Focus the input
      inputField.focus();
      
      // Show success message
      this.showMessage(`Used video context: ${shortcut}`, 'success');
    }
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showMessage('Copied to clipboard!', 'success');
    } catch (error) {
      this.showMessage('Failed to copy to clipboard', 'error');
    }
  }

  private async recordShortcut(shortcut: string, context: string): Promise<void> {
    this.shortcuts[shortcut] = context;
    await this.saveShortcuts();
    this.updateShortcutsList();
    this.showMessage(`Recorded video context: ${shortcut}`, 'success');
  }

  private async deleteShortcut(shortcut: string): Promise<void> {
    delete this.shortcuts[shortcut];
    await this.saveShortcuts();
    this.updateShortcutsList();
    this.showMessage(`Deleted video context: ${shortcut}`, 'info');
  }

  private showAddShortcutDialog(): void {
    const shortcut = prompt('Enter video context name:');
    if (!shortcut) return;

    const context = prompt('Enter video generation prompt:');
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

  // Global method for saving clipboard content
  public async saveClipboardAsShortcut(text: string): Promise<void> {
    const shortcut = prompt('Enter shortcut name for this video prompt:');
    if (!shortcut) return;

    await this.recordShortcut(shortcut, text);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.reccallSora = new SoraRecCall();
  });
} else {
  window.reccallSora = new SoraRecCall();
}
