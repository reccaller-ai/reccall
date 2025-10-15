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
