/**
 * RecCall JavaScript SDK
 * Official SDK for Node.js and browser environments
 * Provides a clean API wrapper around RecCall REST API endpoints
 */

export interface ReccallSDKConfig {
  /**
   * Base URL for the RecCall API server
   * Default: http://localhost:3000/api/reccall
   */
  baseUrl?: string;
  
  /**
   * API key or authentication token (optional)
   * Can be set via RECCALL_API_KEY environment variable
   */
  apiKey?: string;
  
  /**
   * Custom fetch function (for Node.js or custom implementations)
   */
  fetch?: typeof fetch;
  
  /**
   * Request timeout in milliseconds
   * Default: 30000 (30 seconds)
   */
  timeout?: number;
}

export interface Shortcut {
  id: string;
  context: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Context {
  id: string;
  name: string;
  content: string;
  type: 'static' | 'dynamic' | 'hybrid';
  source: 'local' | 'global' | 'remote';
  description?: string;
  tags?: string[];
  category?: string;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  lastUsedAt?: string;
}

export interface CreateStaticContextParams {
  name: string;
  content: string;
  source: 'local' | 'global';
  tags?: string[];
  category?: string;
  description?: string;
  repository?: string;
}

export interface CreateDynamicContextParams {
  name: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date | string;
  }>;
  source: 'local' | 'global';
  tags?: string[];
}

export interface ContextSearchFilters {
  source?: 'local' | 'global' | 'remote' | 'all';
  type?: 'static' | 'dynamic' | 'hybrid' | 'all';
}

export interface Stats {
  shortcutsCount: number;
  contextsCount?: number;
  cacheStats: {
    size: number;
    hitRate: number;
  };
  repositoryStats: {
    enabled: boolean;
  };
}

/**
 * RecCall JavaScript SDK
 * 
 * @example
 * ```typescript
 * import { ReccallSDK } from 'reccall/sdk';
 * 
 * const client = new ReccallSDK({
 *   baseUrl: 'http://localhost:3000/api/reccall',
 *   apiKey: 'your-api-key'
 * });
 * 
 * // Create a context
 * const context = await client.createContext({
 *   name: 'react-patterns',
 *   content: 'Always use TypeScript...',
 *   source: 'global'
 * });
 * 
 * // Search contexts
 * const results = await client.searchContexts('React');
 * ```
 */
export class ReccallSDK {
  private baseUrl: string;
  private apiKey: string | undefined;
  private fetchFn: typeof fetch;
  private timeout: number;

  constructor(config: ReccallSDKConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:3000/api/reccall';
    const envApiKey = typeof process !== 'undefined' && process.env.RECCALL_API_KEY;
    if (config.apiKey !== undefined) {
      this.apiKey = config.apiKey;
    } else if (envApiKey) {
      this.apiKey = String(envApiKey);
    }
    // else: apiKey remains undefined (not explicitly assigned)
    this.fetchFn = config.fetch || (typeof fetch !== 'undefined' ? fetch : this.getNodeFetch());
    this.timeout = config.timeout || 30000;
    
    // Remove trailing slash
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
  }

  /**
   * Get Node.js fetch (for server-side usage)
   */
  private getNodeFetch(): typeof fetch {
    try {
      return require('node-fetch');
    } catch {
      throw new Error(
        'fetch is not available. Install node-fetch or use Node.js 18+ with native fetch support.'
      );
    }
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        let error: { error?: string } = {};
        try {
          error = JSON.parse(text);
        } catch {
          error = { error: text || response.statusText };
        }
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  // ===== Shortcut Methods =====

  /**
   * List all shortcuts
   */
  async listShortcuts(): Promise<Shortcut[]> {
    const response = await this.request<{ shortcuts: Shortcut[] }>('/shortcuts');
    return response.shortcuts || [];
  }

  /**
   * Get a specific shortcut by ID
   */
  async getShortcut(id: string): Promise<Shortcut | null> {
    try {
      const response = await this.request<{ shortcut: string; context: string }>(`/shortcuts/${id}`);
      return {
        id: response.shortcut,
        context: response.context,
      };
    } catch (error) {
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found') || error.message.includes('Not found'))) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create a new shortcut
   */
  async createShortcut(id: string, context: string): Promise<void> {
    await this.request('/shortcuts', {
      method: 'POST',
      body: JSON.stringify({ shortcut: id, context }),
    });
  }

  /**
   * Update an existing shortcut
   */
  async updateShortcut(id: string, context: string): Promise<void> {
    await this.request(`/shortcuts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ context }),
    });
  }

  /**
   * Delete a shortcut
   */
  async deleteShortcut(id: string): Promise<void> {
    await this.request(`/shortcuts/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Search shortcuts by query
   */
  async searchShortcuts(query: string): Promise<Shortcut[]> {
    const response = await this.request<{ results: Shortcut[] }>(`/search?q=${encodeURIComponent(query)}`);
    return response.results || [];
  }

  /**
   * Purge all shortcuts
   */
  async purgeShortcuts(): Promise<void> {
    await this.request('/shortcuts', {
      method: 'DELETE',
    });
  }

  // ===== Context Methods (Universal Context System) =====

  /**
   * Create a static context
   */
  async createContext(params: CreateStaticContextParams): Promise<Context> {
    const response = await this.request<{ context: Context }>('/contexts', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response.context;
  }

  /**
   * Create a dynamic context from conversation
   */
  async createContextFromConversation(params: CreateDynamicContextParams): Promise<Context> {
    const response = await this.request<{ context: Context }>('/contexts/from-conversation', {
      method: 'POST',
      body: JSON.stringify({
        ...params,
        messages: params.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
        })),
      }),
    });
    return response.context;
  }

  /**
   * Get a context by ID or name
   */
  async getContext(identifier: string): Promise<Context | null> {
    try {
      const response = await this.request<{ context: Context }>(`/contexts/${identifier}`);
      return response.context;
    } catch (error) {
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found') || error.message.includes('Not found'))) {
        return null;
      }
      throw error;
    }
  }

  /**
   * List all contexts with optional filters
   */
  async listContexts(filters?: ContextSearchFilters): Promise<Context[]> {
    const params = new URLSearchParams();
    if (filters?.source) params.append('source', filters.source);
    if (filters?.type) params.append('type', filters.type);
    
    const query = params.toString();
    const endpoint = query ? `/contexts?${query}` : '/contexts';
    
    const response = await this.request<{ contexts: Context[] }>(endpoint);
    return response.contexts || [];
  }

  /**
   * Search contexts by query with optional filters
   */
  async searchContexts(query: string, filters?: ContextSearchFilters): Promise<Context[]> {
    const params = new URLSearchParams({ q: query });
    if (filters?.source) params.append('source', filters.source);
    if (filters?.type) params.append('type', filters.type);
    
    const response = await this.request<{ results: Context[] }>(`/contexts/search?${params.toString()}`);
    return response.results || [];
  }

  /**
   * Update a context
   */
  async updateContext(id: string, updates: Partial<CreateStaticContextParams>): Promise<Context> {
    const response = await this.request<{ context: Context }>(`/contexts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.context;
  }

  /**
   * Delete a context
   */
  async deleteContext(id: string): Promise<void> {
    await this.request(`/contexts/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get context statistics
   */
  async getContextStats(contextId: string): Promise<{
    usageCount: number;
    lastUsedAt?: string;
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.request<{ stats: any }>(`/contexts/${contextId}/stats`);
    return response.stats;
  }

  // ===== Utility Methods =====

  /**
   * Get engine statistics
   */
  async getStats(): Promise<Stats> {
    const response = await this.request<{ stats: Stats }>('/stats');
    return response.stats;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return await this.request<{ status: string; timestamp: string }>('/health');
  }
}

// Export default instance factory
export default function createReccallSDK(config?: ReccallSDKConfig): ReccallSDK {
  return new ReccallSDK(config);
}

