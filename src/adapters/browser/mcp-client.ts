/**
 * Browser MCP Client for RecCall
 * Shared library for Perplexity and Sora browser extensions
 * Uses MCP SDK's StreamableHTTPClientTransport to connect to HTTP MCP server
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export interface MCPClientConfig {
  serverUrl?: string; // Default: http://localhost:3000/mcp
  timeout?: number; // Request timeout in ms (default: 30000)
}

export class BrowserMCPClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport | null = null;
  private serverUrl: string;
  private timeout: number;
  private connected: boolean = false;

  constructor(config: MCPClientConfig = {}) {
    this.serverUrl = config.serverUrl ?? 'http://localhost:3000/mcp';
    this.timeout = config.timeout ?? 30000;

    this.client = new Client(
      {
        name: 'reccall-browser-extension',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );
  }

  /**
   * Connect to MCP server
   */
  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      // Create fetch wrapper with timeout
      const fetchWithTimeout: typeof fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          return await fetch(url as string | Request, {
            ...init,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }
      };

      // StreamableHTTPClientTransport constructor: (url: URL, opts?: StreamableHTTPClientTransportOptions)
      this.transport = new StreamableHTTPClientTransport(
        new URL(this.serverUrl),
        {
          fetch: fetchWithTimeout,
        }
      );

      await this.client.connect(this.transport as any); // Type workaround for strict optional properties
      this.connected = true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to MCP server at ${this.serverUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.close();
      this.transport = null;
      this.connected = false;
    } catch (error) {
      console.error('Error disconnecting from MCP server:', error);
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Call an MCP tool
   */
  async callTool(name: string, args: Record<string, any> = {}): Promise<any> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const result = await this.client.callTool({
        name,
        arguments: args,
      });

      // Extract content from result
      const content = (result as any).content;
      if (content && Array.isArray(content) && content.length > 0) {
        // Return text content or structured content
        const textContent = content.find((c: any) => c.type === 'text');
        if (textContent) {
          return textContent.text;
        }
        
        // Return structured content if available
        if ((result as any).isError) {
          throw new Error(content[0]?.text || 'Tool call failed');
        }

        return content;
      }

      return result;
    } catch (error) {
      throw new Error(`Tool call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<Array<{ name: string; description: string }>> {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const { tools } = await this.client.listTools();
      return tools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
      }));
    } catch (error) {
      throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convenience method: Record a shortcut
   */
  async recordShortcut(shortcut: string, context: string): Promise<string> {
    return await this.callTool('rec', { shortcut, context });
  }

  /**
   * Convenience method: Call a shortcut
   */
  async callShortcut(shortcut: string): Promise<string> {
    return await this.callTool('call', { shortcut });
  }

  /**
   * Convenience method: List shortcuts
   */
  async listShortcuts(): Promise<string> {
    return await this.callTool('rec_list', {});
  }

  /**
   * Convenience method: Search shortcuts
   */
  async searchShortcuts(query: string): Promise<string> {
    return await this.callTool('rec_search', { query });
  }

  /**
   * Convenience method: Create a static context
   */
  async createContext(
    name: string,
    content: string,
    source: 'local' | 'global',
    options?: {
      tags?: string[];
      category?: string;
      description?: string;
    }
  ): Promise<string> {
    return await this.callTool('rec_context_create', {
      name,
      content,
      source,
      ...options,
    });
  }

  /**
   * Convenience method: Get a context
   */
  async getContext(identifier: string): Promise<string> {
    return await this.callTool('rec_context_get', { identifier });
  }

  /**
   * Convenience method: Search contexts
   */
  async searchContexts(
    query: string,
    filters?: {
      source?: 'local' | 'global' | 'remote' | 'all';
      type?: 'static' | 'dynamic' | 'hybrid' | 'all';
    }
  ): Promise<string> {
    return await this.callTool('rec_context_search', {
      query,
      ...filters,
    });
  }
}

