/**
 * Webhook support for enterprise monitoring and integrations
 * Allows external systems to receive events from RecCall
 */

export interface WebhookConfig {
  url: string;
  secret?: string;
  events?: WebhookEvent[];
  timeout?: number;
  retries?: number;
}

export type WebhookEvent =
  | 'shortcut.recorded'
  | 'shortcut.updated'
  | 'shortcut.deleted'
  | 'shortcut.called'
  | 'recipe.installed'
  | 'engine.initialized'
  | 'engine.shutdown'
  | 'error.occurred';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
  metadata?: {
    source?: string;
    user?: string;
    session?: string;
  };
}

export class WebhookManager {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  /**
   * Register a webhook
   */
  register(id: string, config: WebhookConfig): void {
    this.webhooks.set(id, config);
  }

  /**
   * Unregister a webhook
   */
  unregister(id: string): void {
    this.webhooks.delete(id);
  }

  /**
   * List all registered webhooks
   */
  list(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  /**
   * Trigger webhook event
   */
  async trigger(event: WebhookEvent, data: Record<string, any>, metadata?: Record<string, any>): Promise<void> {
    if (!this.enabled || this.webhooks.size === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      ...(metadata ? { metadata } : {}),
    };

    const promises: Promise<void>[] = [];

    for (const [id, config] of this.webhooks.entries()) {
      // Check if event should be sent to this webhook
      if (config.events && !config.events.includes(event)) {
        continue;
      }

      promises.push(this.sendWebhook(id, config, payload));
    }

    // Don't await - fire and forget
    Promise.allSettled(promises).catch(() => {
      // Silently ignore webhook failures
    });
  }

  /**
   * Send webhook payload
   */
  private async sendWebhook(id: string, config: WebhookConfig, payload: WebhookPayload): Promise<void> {
    const maxRetries = config.retries || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'RecCall/1.0.0',
        };

        // Add signature if secret is provided
        if (config.secret) {
          const crypto = await import('crypto');
          const signature = crypto
            .createHmac('sha256', config.secret)
            .update(JSON.stringify(payload))
            .digest('hex');
          headers['X-RecCall-Signature'] = signature;
        }

        const controller = new AbortController();
        const timeout = config.timeout || 5000;
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Webhook failed with status ${response.status}`);
        }

        return; // Success
      } catch (error: any) {
        lastError = error;

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed - log but don't throw
    console.error(`Webhook ${id} failed after ${maxRetries} attempts:`, lastError?.message);
  }

  /**
   * Enable/disable webhooks
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Clear all webhooks
   */
  clear(): void {
    this.webhooks.clear();
  }
}
