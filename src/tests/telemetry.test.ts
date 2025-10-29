/**
 * Comprehensive tests for TelemetryManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelemetryManager } from '../core/telemetry.js';
import { configManager } from '../core/config.js';

vi.mock('../core/config.js', () => ({
  configManager: {
    isTelemetryEnabled: vi.fn(() => true),
  },
}));

describe('TelemetryManager', () => {
  let telemetry: TelemetryManager;

  beforeEach(() => {
    telemetry = new TelemetryManager();
  });

  describe('Event Logging', () => {
    it('should log events when enabled', () => {
      telemetry.setEnabled(true);
      
      // Just verify it doesn't throw
      expect(() => {
        telemetry.logEvent({
          event: 'test.event',
          timestamp: Date.now(),
          properties: { test: 'value' },
        });
      }).not.toThrow();
    });

    it('should not throw when disabled', () => {
      telemetry.setEnabled(false);
      
      expect(() => {
        telemetry.logEvent({
          event: 'test.event',
          timestamp: Date.now(),
        });
      }).not.toThrow();
    });
  });

  describe('Error Logging', () => {
    it('should log errors when enabled', () => {
      telemetry.setEnabled(true);
      
      // Just verify it doesn't throw
      expect(() => {
        telemetry.logError(new Error('Test error'), { context: 'test' });
      }).not.toThrow();
    });
  });

  describe('Metrics', () => {
    it('should update and retrieve metrics', () => {
      telemetry.updateMetrics({
        shortcutsCount: 10,
        cacheHitRate: 0.85,
        cacheSize: 100,
        repositoryEnabled: true,
        lastActivity: Date.now(),
      });

      const metrics = telemetry.getMetrics();
      expect(metrics.shortcutsCount).toBe(10);
      expect(metrics.cacheHitRate).toBe(0.85);
      expect(metrics.cacheSize).toBe(100);
    });
  });

  describe('Prometheus Metrics Export', () => {
    it('should export metrics in Prometheus format', () => {
      telemetry.updateMetrics({
        shortcutsCount: 5,
        cacheHitRate: 0.9,
        cacheSize: 50,
        repositoryEnabled: true,
      });

      const prometheusMetrics = telemetry.exportPrometheusMetrics();
      expect(prometheusMetrics).toContain('reccall_shortcuts_count');
      expect(prometheusMetrics).toContain('reccall_cache_hit_rate');
      expect(prometheusMetrics).toContain('reccall_cache_size');
      expect(prometheusMetrics).toContain('reccall_repository_enabled');
    });
  });
});
