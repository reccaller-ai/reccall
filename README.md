# RecCall

**Rec**ord and **Call** context shortcuts in Cursor IDE with MCP.

A simple Model Context Protocol (MCP) server that lets you record context/instructions once and call them instantly in your AI conversations.

## 🎯 Features

- **rec**: Record a shortcut with context/instructions
- **rec_list**: List all stored shortcuts (equivalent to `rec -l`)
- **rec_update**: Update/replace an existing shortcut (equivalent to `rec -u`)
- **rec_delete**: Delete a shortcut (idempotent operation)
- **rec_purge**: Purge all shortcuts (with confirmation)
- **call**: Call (retrieve) stored context by shortcut name
- **Persistent Storage**: All shortcuts saved to `~/.reccall.json`
- **Smart Duplicate Detection**: Warns when creating duplicate shortcuts
- **Enhanced Error Handling**: Clear feedback for non-existent shortcuts

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- Cursor IDE with MCP support
- npm or yarn

### Quick Setup

**Option 1: Automated Installation (Recommended)**
```bash
curl -sfL https://reccaller.ai/install.sh | sh -
```

The automated installer provides:
- 🔍 **Prerequisites Check**: Verifies Node.js 18+ and npm
- 📦 **Automatic Download**: Clones and builds RecCall from GitHub
- ⚙️ **Smart Configuration**: Automatically configures Cursor IDE
- 🔄 **Update Support**: Updates existing installations seamlessly
- 💾 **Backup Protection**: Creates backups before modifying configs
- 🛠️ **Cross-Platform**: Works on macOS, Linux, and Windows

**Option 2: Manual Installation**

1. **Clone or download this repository**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Note the absolute path:**
   ```bash
   pwd
   # Copy this path - you'll need it for Cursor config
   ```

## ⚙️ Configuration

### Automated Configuration (Recommended)

If you used the automated installer, the Cursor configuration is handled automatically! The installer will:

- ✅ Detect your operating system and Cursor config location
- ✅ Backup any existing configuration files
- ✅ Automatically add/update the RecCall MCP server configuration
- ✅ Preserve existing MCP servers in your configuration
- ✅ Handle both new installations and updates

### Manual Configuration (If Needed)

If you installed manually or need to configure manually, you need to configure Cursor to use this MCP server. The configuration file location varies by OS:

**macOS:**
```
~/.cursor/mcp.json
```

**Linux:**
```
~/.cursor/mcp.json
```

**Windows:**
```
%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

### Configuration Format

Add this to your configuration file (replace `/FULL/PATH/TO/reccall` with your actual path):

```json
{
  "mcpServers": {
    "reccall": {
      "command": "node",
      "args": ["/FULL/PATH/TO/reccall/index.js"]
    }
  }
}
```

**Example (macOS/Linux - ~/.cursor/mcp.json):**
```json
{
  "mcpServers": {
    "reccall": {
      "command": "node",
      "args": ["/Users/yourname/projects/reccall/index.js"]
    }
  }
}
```

**Example (Windows - cline_mcp_settings.json):**
```json
{
  "mcpServers": {
    "reccall": {
      "command": "node",
      "args": ["C:\\Users\\YourName\\projects\\reccall\\index.js"]
    }
  }
}
```

### Restart Cursor

After adding the configuration, **completely restart Cursor** for the changes to take effect.

## 🚀 Usage

Once configured, you can use these tools in Cursor's AI chat:

### Recording a Shortcut (rec)

In your Cursor chat, ask the AI to use the `rec` tool:

```
Use the rec tool to save this:
Shortcut: apitest
Context: When testing APIs, always include error handling, timeout configuration, and proper request/response logging. Use axios with interceptors for auth tokens.
```

Or more naturally:

```
Save a shortcut called "react-component" with the context: "Create React functional components with TypeScript. Use proper prop types, add JSDoc comments, implement error boundaries, and use React.memo for performance optimization."
```

### Listing Shortcuts (rec_list)

To see all your stored shortcuts:

```
List all my shortcuts
```

Or:

```
Use the rec_list tool to show me what shortcuts I have
```

This will display all your stored shortcuts with their contexts.

### Updating a Shortcut (rec_update)

To update an existing shortcut:

```
Update my 'apitest' shortcut with: "When testing APIs, always include comprehensive error handling, timeout configuration, request/response logging, authentication testing, and rate limiting validation. Use axios with interceptors for auth tokens and implement retry logic."
```

Or:

```
Use the rec_update tool to change my 'react-component' shortcut to: "Create React functional components with TypeScript, proper prop types, JSDoc comments, error boundaries, React.memo for performance, and include unit tests with React Testing Library."
```

### Deleting a Shortcut (rec_delete)

To delete a shortcut (idempotent - safe to run even if shortcut doesn't exist):

```
Delete my 'old-shortcut' shortcut
```

Or:

```
Use the rec_delete tool to remove the 'temp-shortcut' shortcut
```

### Purging All Shortcuts (rec_purge)

To delete all shortcuts (requires confirmation):

```
Purge all my shortcuts
```

Or:

```
Use the rec_purge tool to delete all stored shortcuts
```

**Note**: The purge command will ask for confirmation before proceeding to prevent accidental data loss.

### Calling a Shortcut (call)

To retrieve and use a stored context:

```
Call the 'apitest' shortcut
```

Or:

```
Use the call tool to get my 'react-component' guidelines
```

The stored context will be injected into the conversation, and the AI will follow those instructions!

## 💡 Example Shortcuts

Here are some useful shortcuts you might want to create:

### Code Review
```
Shortcut: codereview
Context: Review code for: security vulnerabilities, performance issues, error handling, code style consistency, test coverage, documentation quality, and accessibility.
```

### API Testing
```
Shortcut: apitest
Context: API tests should include: happy path tests, error scenarios, edge cases, authentication/authorization, rate limiting, timeout handling, and response validation.
```

### Documentation
```
Shortcut: docs
Context: Write documentation with: clear purpose statement, usage examples, parameter descriptions, return value details, error conditions, and related functions.
```

### Debugging
```
Shortcut: debug
Context: Debug systematically: reproduce the issue, check logs, verify inputs, test assumptions, isolate the problem, use breakpoints, and document the solution.
```

### Deploy Checklist
```
Shortcut: deploy
Context: Before deploying: run tests, check environment variables, review changelog, backup database, verify rollback plan, monitor metrics post-deploy.
```

## 📁 Storage

All shortcuts are stored in:
```
~/.reccall.json
```

You can manually edit this file if needed. Format:
```json
{
  "shortcut-name": "The context or instruction text",
  "another-shortcut": "More context here"
}
```

## 🛠️ Development

### Run in Development Mode
```bash
npm run dev
```

This watches for TypeScript changes and recompiles automatically.

### Available Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `rec` | Record a new shortcut | `rec <shortcut> <context>` |
| `rec_list` | List all stored shortcuts | `rec_list` |
| `rec_update` | Update an existing shortcut | `rec_update <shortcut> <new_context>` |
| `rec_delete` | Delete a shortcut (idempotent) | `rec_delete <shortcut>` |
| `rec_purge` | Purge all shortcuts (with confirmation) | `rec_purge <confirm: true>` |
| `call` | Call a stored shortcut | `call <shortcut>` |

### Project Structure
```
reccall/
├── index.ts          # Main server code
├── index.js          # Compiled JavaScript (generated)
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## 🐛 Troubleshooting

### Server not showing up in Cursor

1. **Verify the path is absolute** (not relative like `./reccall/index.js`)
2. **Check the build succeeded**: Look for `index.js` in your project directory
3. **Restart Cursor completely**: Not just reload, but quit and reopen
4. **Check Cursor logs**: Look for MCP-related errors in Cursor's developer console

### Permission Denied Error

Make the compiled file executable:
```bash
chmod +x index.js
```

### Module Not Found Errors

Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Shortcuts Not Persisting

Check file permissions on the storage file:
```bash
ls -la ~/.reccall.json
```

If it doesn't exist, it will be created on first use.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📄 License

MIT License - feel free to use this in your own projects!

## 🙏 Credits

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol) by Anthropic.

---

**Need help?** Open an issue or check the [MCP documentation](https://modelcontextprotocol.io/).