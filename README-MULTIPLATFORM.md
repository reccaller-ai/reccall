# RecCall - Multi-Platform Context Shortcuts

**Rec**ord and **Call** context shortcuts across AI IDEs and development environments.

RecCall is now **IDE/environment agnostic** and supports:
- 🎯 **Cursor IDE** (via MCP)
- 💻 **VSCode** (via extension)
- ⚡ **Warp Terminal** (via shell integration)
- 🖥️ **Command Line** (via CLI tool)
- 🔮 **Future platforms** (easily extensible)

## 🚀 Quick Start

### Universal Installation
```bash
# Install RecCall globally
npm install -g reccall

# Or use the automated installer
curl -sfL https://reccaller.ai/install.sh | sh -
```

## 📱 Platform-Specific Usage

### 1. 🎯 Cursor IDE (MCP Server)

**Setup:**
1. Install RecCall globally: `npm install -g reccall`
2. Add to Cursor's MCP configuration:

```json
{
  "mcpServers": {
    "reccall": {
      "command": "reccall-mcp",
      "args": []
    }
  }
}
```

**Usage in Cursor:**
```
Save a shortcut called "react-component" with context: "Create React functional components with TypeScript, proper prop types, JSDoc comments, error boundaries, and React.memo for performance optimization."

List all my shortcuts

Call the 'react-component' shortcut
```

### 2. 💻 VSCode Extension

**Installation:**
1. Install from VSCode Marketplace: `RecCall`
2. Or install from VSIX: `code --install-extension reccall-1.0.0.vsix`

**Usage:**
- **Command Palette**: `Ctrl+Shift+P` → "RecCall: Record Shortcut"
- **Keyboard Shortcuts**:
  - `Ctrl+Shift+R` (Cmd+Shift+R on Mac): Record shortcut
  - `Ctrl+Shift+C` (Cmd+Shift+C on Mac): Call shortcut
  - `Ctrl+Shift+L` (Cmd+Shift+L on Mac): List shortcuts
- **Context Menu**: Right-click in editor → RecCall options

**Features:**
- Auto-insert shortcuts into editor
- Search and filter shortcuts
- Visual shortcut management
- Integration with VSCode's command palette

### 3. ⚡ Warp Terminal Integration

**Setup:**
1. Add to your shell profile (`.bashrc`, `.zshrc`, etc.):
```bash
# Add RecCall to your shell
source /path/to/reccall/warp-integration/reccall-warp.sh
```

2. Or add to Warp's custom commands:
```yaml
# In Warp settings
custom_commands:
  - name: "reccall"
    command: "source /path/to/reccall/warp-integration/reccall-warp.sh && reccall"
```

**Usage:**
```bash
# Record a shortcut
reccall rec react-component "Create React components with TypeScript"

# Call a shortcut
reccall call react-component

# List all shortcuts
reccall list

# Search shortcuts
reccall search api

# Update a shortcut
reccall update react-component "Updated context here"

# Delete a shortcut
reccall delete old-shortcut

# Reload starter pack
reccall reload-starter-pack

# Show info
reccall info
```

### 4. 🖥️ Command Line Interface

**Usage:**
```bash
# Record a shortcut
reccall rec <shortcut> <context>

# Call a shortcut
reccall call <shortcut>

# List all shortcuts
reccall list

# Search shortcuts
reccall search <query>

# Update a shortcut
reccall update <shortcut> <new_context>

# Delete a shortcut
reccall delete <shortcut>

# Purge all shortcuts
reccall purge --yes

# Export shortcuts
reccall export [file]

# Import shortcuts
reccall import <file> [--merge]

# Reload starter pack
reccall reload-starter-pack --yes

# Show information
reccall info
```

## 🔄 Cross-Platform Data Sharing

All platforms share the same storage file: `~/.reccall.json`

This means:
- ✅ **Shortcuts created in Cursor** are available in VSCode
- ✅ **Shortcuts created in CLI** are available in Warp
- ✅ **Universal access** across all platforms
- ✅ **Synchronized data** everywhere

## 📦 Installation Options

### Option 1: Automated Installation (Recommended)
```bash
curl -sfL https://reccaller.ai/install.sh | sh -
```

**What it installs:**
- ✅ Global CLI tool (`reccall`)
- ✅ MCP server for Cursor (`reccall-mcp`)
- ✅ VSCode extension (if VSCode detected)
- ✅ Warp integration scripts
- ✅ Auto-configuration for detected platforms

### Option 2: Manual Installation

**1. Install globally:**
```bash
npm install -g reccall
```

**2. Configure each platform:**

**Cursor (MCP):**
```json
{
  "mcpServers": {
    "reccall": {
      "command": "reccall-mcp",
      "args": []
    }
  }
}
```

**VSCode:**
```bash
code --install-extension reccall
```

**Warp:**
```bash
echo 'source $(which reccall-warp.sh)' >> ~/.zshrc
```

## 🎯 Platform-Specific Features

### Cursor IDE
- **MCP Integration**: Native AI assistant integration
- **Context Injection**: Automatic context injection in conversations
- **Smart Suggestions**: AI-powered shortcut suggestions

### VSCode
- **Extension Integration**: Native VSCode extension
- **Command Palette**: Full command palette integration
- **Keyboard Shortcuts**: Customizable keybindings
- **Auto-Insert**: Automatic insertion into editor
- **Visual Management**: GUI for managing shortcuts

### Warp Terminal
- **Shell Integration**: Native shell function
- **Tab Completion**: Auto-completion for shortcuts
- **Rich Output**: Colored and formatted output
- **Quick Access**: Fast command-line access

### CLI
- **Full Feature Set**: Complete command-line interface
- **Import/Export**: Backup and restore functionality
- **Search**: Advanced search capabilities
- **Batch Operations**: Bulk operations support

## 🚀 Starter Pack

RecCall comes with a **starter pack** of 16 common development recipes:

### Development (5 recipes)
- `component-development`: Generic component development best practices
- `api-testing`: Comprehensive API testing guidelines
- `documentation`: Documentation writing best practices
- `error-handling`: Generic error handling best practices
- `performance-optimization`: Generic performance optimization guidelines

### Git (3 recipes)
- `cleanup-branches`: Clean up merged branches
- `sync-main`: Sync main branch with remote
- `create-feature-branch`: Create feature branches with proper naming

### Deployment (2 recipes)
- `deploy`: Complete deployment checklist
- `pre-deploy-check`: Pre-deployment safety checks

### Debugging (2 recipes)
- `debug`: Systematic debugging approach
- `performance-debug`: Performance debugging guidelines

### Code Review (2 recipes)
- `code-review`: Comprehensive code review checklist
- `security-review`: Security-focused code review

### Other (2 recipes)
- `create-pr`: Pull request creation guidelines
- `testin-cmd`: Testing shortcut (example)

## 🔧 Advanced Usage

### Custom Storage Location
```bash
# Set custom storage path
export RECCALL_STORAGE="/path/to/custom/reccall.json"
```

### Batch Operations
```bash
# Export all shortcuts
reccall export my-shortcuts.json

# Import shortcuts (merge mode)
reccall import my-shortcuts.json --merge

# Purge all shortcuts
reccall purge --yes
```

### Integration with Other Tools
```bash
# Use in scripts
CONTEXT=$(reccall call react-component)
echo "$CONTEXT" | pbcopy  # Copy to clipboard

# Use in aliases
alias rc='reccall call'
alias rr='reccall rec'
```

## 🛠️ Development

### Project Structure
```
reccall/
├── index.ts              # MCP server (Cursor)
├── src/
│   └── cli.ts           # CLI implementation
├── vscode-extension/    # VSCode extension
├── warp-integration/    # Warp shell integration
├── starter-pack/        # Default recipes
└── dist/               # Compiled output
```

### Building
```bash
# Build all components
npm run build

# Build specific components
npm run build:cli
npm run build:vscode
npm run build:mcp
```

### Testing
```bash
# Test CLI
npm run test:cli

# Test VSCode extension
npm run test:vscode

# Test MCP server
npm run test:mcp
```

## 🤝 Contributing

We welcome contributions for:
- 🆕 **New platform integrations** (JetBrains, Sublime Text, etc.)
- 🎨 **UI/UX improvements** for existing platforms
- 📚 **Additional starter pack recipes**
- 🐛 **Bug fixes and improvements**
- 📖 **Documentation improvements**

## 📄 License

MIT License - feel free to use this in your own projects!

## 🙏 Credits

Built with:
- Model Context Protocol SDK by Anthropic
- VSCode Extension API
- Commander.js for CLI
- Warp Terminal integration

---

**Need help?** 
- 📖 Check the [documentation](https://reccaller.ai/docs)
- 🐛 [Report issues](https://github.com/reccaller-ai/reccall/issues)
- 💬 [Join discussions](https://github.com/reccaller-ai/reccall/discussions)
- 🌐 [Visit website](https://reccaller.ai)
