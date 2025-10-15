#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   RecCall MCP Server Setup            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Project directory name
PROJECT_DIR="reccall"

# Check if directory exists
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠ Directory '$PROJECT_DIR' already exists!${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
    rm -rf "$PROJECT_DIR"
fi

# Create project directory
echo -e "${GREEN}✓${NC} Creating project directory..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Create index.ts
echo -e "${GREEN}✓${NC} Creating index.ts..."
cat > index.ts << 'EOF'
#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import os from "os";

const STORAGE_FILE = path.join(os.homedir(), ".reccall.json");

// Initialize storage
async function loadShortcuts(): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(STORAGE_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveShortcuts(shortcuts: Record<string, string>): Promise<void> {
  await fs.writeFile(STORAGE_FILE, JSON.stringify(shortcuts, null, 2));
}

// Create MCP server
const server = new Server(
  {
    name: "reccall",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "rec",
        description: "Record a new context shortcut with instructions",
        inputSchema: {
          type: "object",
          properties: {
            shortcut: {
              type: "string",
              description: "The shortcut name/alias",
            },
            context: {
              type: "string",
              description: "The context or instruction to store",
            },
          },
          required: ["shortcut", "context"],
        },
      },
      {
        name: "call",
        description: "Call a stored context shortcut",
        inputSchema: {
          type: "object",
          properties: {
            shortcut: {
              type: "string",
              description: "The shortcut name/alias to recall",
            },
          },
          required: ["shortcut"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "rec") {
    const { shortcut, context } = args as { shortcut: string; context: string };
    
    const shortcuts = await loadShortcuts();
    shortcuts[shortcut] = context;
    await saveShortcuts(shortcuts);

    return {
      content: [
        {
          type: "text",
          text: `✓ Shortcut '${shortcut}' has been recorded successfully!\n\nStored context:\n${context}`,
        },
      ],
    };
  }

  if (name === "call") {
    const { shortcut } = args as { shortcut: string };
    
    const shortcuts = await loadShortcuts();
    const context = shortcuts[shortcut];

    if (!context) {
      return {
        content: [
          {
            type: "text",
            text: `✗ Shortcut '${shortcut}' not found.\n\nAvailable shortcuts: ${Object.keys(shortcuts).join(", ") || "none"}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: context,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RecCall MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
EOF

# Create package.json
echo -e "${GREEN}✓${NC} Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "reccall",
  "version": "1.0.0",
  "description": "RecCall: MCP server for recording and calling context shortcuts in Cursor",
  "type": "module",
  "main": "index.js",
  "bin": {
    "reccall": "./index.js"
  },
  "scripts": {
    "build": "tsc",
    "prepare": "npm run build",
    "dev": "tsc --watch"
  },
  "keywords": ["mcp", "cursor", "context", "shortcuts", "reccall"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0"
  }
}
EOF

# Create tsconfig.json
echo -e "${GREEN}✓${NC} Creating tsconfig.json..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["index.ts"],
  "exclude": ["node_modules"]
}
EOF

# Create .gitignore
echo -e "${GREEN}✓${NC} Creating .gitignore..."
cat > .gitignore << 'EOF'
node_modules/
index.js
index.d.ts
*.log
.DS_Store
.vscode/
.idea/
EOF

# Create README.md
echo -e "${GREEN}✓${NC} Creating README.md..."
cat > README.md << 'EOF'
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
EOF

# Create LICENSE
echo -e "${GREEN}✓${NC} Creating LICENSE..."
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

echo ""
echo -e "${GREEN}✓ Project structure created successfully!${NC}"
echo ""
echo -e "${BLUE}📂 Project location:${NC} $(pwd)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. cd $PROJECT_DIR"
echo "  2. npm install"
echo "  3. npm run build"
echo "  4. Configure Cursor with this path: $(pwd)/index.js"
echo "  5. Restart Cursor"
echo ""
echo -e "${BLUE}For detailed setup instructions, see README.md${NC}"
echo ""

# Ask if user wants to install dependencies now
read -p "Do you want to install dependencies now? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    echo -e "${GREEN}Installing dependencies...${NC}"
    npm install
    echo ""
    echo -e "${GREEN}Building project...${NC}"
    npm run build
    echo ""
    echo -e "${GREEN}✓ Setup complete!${NC}"
    echo ""
    echo -e "${YELLOW}Final step:${NC} Add this to your Cursor config:"
    echo ""
    echo '  "mcpServers": {'
    echo '    "reccall": {'
    echo '      "command": "node",'
    echo "      \"args\": [\"$(pwd)/index.js\"]"
    echo '    }'
    echo '  }'
    echo ""
else
    echo ""
    echo -e "${YELLOW}Skipped dependency installation.${NC}"
    echo "Run 'npm install && npm run build' when ready."
fi