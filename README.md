# RecCall

**Rec**ord and **Call** context shortcuts in Cursor IDE with MCP.

A simple Model Context Protocol (MCP) server that lets you record context/instructions once and call them instantly in your AI conversations.

## 🎯 Features

- **rec**: Record a shortcut with context/instructions
- **call**: Call (retrieve) stored context by shortcut name
- **Persistent Storage**: All shortcuts saved to `~/.reccall.json`
- **Simple API**: Just two commands to master

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- Cursor IDE with MCP support
- npm or yarn

### Quick Setup

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

### Add to Cursor

You need to configure Cursor to use this MCP server. The configuration file location varies by OS:

**macOS:**
```
~/.cursor/config.json
```
or
```
~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

**Linux:**
```
~/.cursor/config.json
```
or
```
~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
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

**Example (macOS/Linux):**
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

**Example (Windows):**
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