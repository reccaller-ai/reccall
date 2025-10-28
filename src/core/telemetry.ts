/**
 * Telemetry and structured logging for RecCall
 */

import pino from 'pino';
import type { CoreConfig } from './interfaces.js';
import { configManager } from './config.js';

export interface TelemetryEvent {
  event: string;
  timestamp: number;
  duration?: number;
  properties?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface Metrics {
  shortcutsCount: number;
  cacheHitRate: number;
  cacheSize: number;
  repositoryEnabled: boolean;
  lastActivity: number;
}

export class TelemetryManager {
  private logger: pino.Logger;
  private metrics: Metrics;
  private enabled: boolean;

  constructor() {
    this.enabled = configManager.isTelemetryEnabled();
    
    this.logger = pino.default({
      level: this.enabled ? 'info' : 'silent',
      formatters: {
        level: (label: string) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });

    this.metrics = {
      shortcutsCount: 0,
      cacheHitRate: 0,
      cacheSize: 0,
      repositoryEnabled: false,
      lastActivity: Date.now(),
    };
  }

  /**
   * Log an event
   */
  logEvent(event: TelemetryEvent): void {
    if (!this.enabled) return;

    this.logger.info({
      ...event,
      service: 'reccall-core',
      version: '1.0.0',
    });
  }

  /**
   * Log an error
   */
  logError(error: Error, context?: Record<string, any>): void {
    if (!this.enabled) return;

    this.logger.error({
      event: 'error',
      timestamp: Date.now(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
      service: 'reccall-core',
      version: '1.0.0',
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(operation: string, duration: number, properties?: Record<string, any>): void {
    if (!this.enabled) return;

    this.logger.info({
      event: 'performance',
      timestamp: Date.now(),
      operation,
      duration,
      properties,
      service: 'reccall-core',
      version: '1.0.0',
    });
  }

  /**
   * Update metrics
   */
  updateMetrics(metrics: Partial<Metrics>): void {
    this.metrics = { ...this.metrics, ...metrics };
    this.metrics.lastActivity = Date.now();
  }

  /**
   * Get current metrics
   */
  getMetrics(): Metrics {
    return { ...this.metrics };
  }

  /**
   * Log metrics snapshot
   */
  logMetrics(): void {
    if (!this.enabled) return;

    this.logger.info({
      event: 'metrics',
      timestamp: Date.now(),
      metrics: this.metrics,
      service: 'reccall-core',
      version: '1.0.0',
    });
  }

  /**
   * Enable/disable telemetry
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.logger.level = enabled ? 'info' : 'silent';
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const telemetryManager = new TelemetryManager();

/**
 * Performance decorator for methods
 */
export function Performance(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;
        
        telemetryManager.logPerformance(operation, duration, {
          method: propertyKey,
          success: true,
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        telemetryManager.logPerformance(operation, duration, {
          method: propertyKey,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Error logging decorator for methods
 */
export function LogErrors(context?: Record<string, any>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        telemetryManager.logError(error as Error, {
          method: propertyKey,
          ...context,
        });
        throw error;
      }
    };

    return descriptor;
  };
}
