/**
 * Telemetry and structured logging for RecCall
 */

import pino from 'pino';
import type { CoreConfig } from './interfaces.js';
import { configManager } from './config.js';
import { RecCallError } from '../types.js';

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
  averageResponseTime?: number;
  operationCounts?: Record<string, number>;
  errorCounts?: Record<string, number>;
  fileIOOperations?: number;
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
      averageResponseTime: 0,
      operationCounts: {},
      errorCounts: {},
      fileIOOperations: 0,
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
   * Increment operation count
   */
  incrementOperation(operation: string): void {
    if (!this.metrics.operationCounts) {
      this.metrics.operationCounts = {};
    }
    this.metrics.operationCounts[operation] = (this.metrics.operationCounts[operation] || 0) + 1;
  }

  /**
   * Increment error count
   */
  incrementError(errorCode: string): void {
    if (!this.metrics.errorCounts) {
      this.metrics.errorCounts = {};
    }
    this.metrics.errorCounts[errorCode] = (this.metrics.errorCounts[errorCode] || 0) + 1;
  }

  /**
   * Record response time for an operation
   */
  recordResponseTime(duration: number): void {
    if (!this.metrics.averageResponseTime) {
      this.metrics.averageResponseTime = duration;
    } else {
      // Exponential moving average
      this.metrics.averageResponseTime = this.metrics.averageResponseTime * 0.9 + duration * 0.1;
    }
  }

  /**
   * Increment file I/O operation count
   */
  incrementFileIO(): void {
    this.metrics.fileIOOperations = (this.metrics.fileIOOperations || 0) + 1;
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

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    const timestamp = Date.now();

    return `# HELP reccall_shortcuts_count Total number of shortcuts
# TYPE reccall_shortcuts_count gauge
reccall_shortcuts_count ${metrics.shortcutsCount} ${timestamp}

# HELP reccall_cache_hit_rate Cache hit rate (0-1)
# TYPE reccall_cache_hit_rate gauge
reccall_cache_hit_rate ${metrics.cacheHitRate} ${timestamp}

# HELP reccall_cache_size Current cache size
# TYPE reccall_cache_size gauge
reccall_cache_size ${metrics.cacheSize} ${timestamp}

# HELP reccall_repository_enabled Whether repository is enabled
# TYPE reccall_repository_enabled gauge
reccall_repository_enabled ${metrics.repositoryEnabled ? 1 : 0} ${timestamp}

# HELP reccall_last_activity_timestamp Last activity timestamp in milliseconds
# TYPE reccall_last_activity_timestamp gauge
reccall_last_activity_timestamp ${metrics.lastActivity} ${timestamp}
`;
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
      telemetryManager.incrementOperation(operation);
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;
        
        telemetryManager.recordResponseTime(duration);
        telemetryManager.logPerformance(operation, duration, {
          method: propertyKey,
          success: true,
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        const errorCode = error instanceof RecCallError ? error.code : 'UNKNOWN_ERROR';
        telemetryManager.incrementError(errorCode);
        
        telemetryManager.logPerformance(operation, duration, {
          method: propertyKey,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode,
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
