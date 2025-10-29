import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { telemetryManager } from '../core/telemetry.js';
import { configManager } from '../core/config.js';

describe('Telemetry and Configuration Tests', () => {
  beforeEach(() => {
    // Reset telemetry manager
    telemetryManager.setEnabled(true);
  });

  afterEach(() => {
    // Clean up
    telemetryManager.setEnabled(false);
  });

  describe('Telemetry Manager', () => {
    it('should log events when enabled', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      telemetryManager.logEvent({
        event: 'test.event',
        timestamp: Date.now(),
        properties: { test: 'value' }
      });
      
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should not log events when disabled', () => {
      telemetryManager.setEnabled(false);
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      telemetryManager.logEvent({
        event: 'test.event',
        timestamp: Date.now(),
        properties: { test: 'value' }
      });
      
      expect(logSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should log errors with context', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const error = new Error('Test error');
      telemetryManager.logError(error, { context: 'test' });
      
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should log performance metrics', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      telemetryManager.logPerformance('test.operation', 150, { test: 'value' });
      
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('Configuration Manager', () => {
    beforeEach(async () => {
      await configManager.initialize();
    });

    it('should initialize with default configuration', () => {
      const config = configManager.getConfig();
      
      expect(config.storagePath).toBeDefined();
      expect(config.repositoryUrl).toBeDefined();
      expect(config.cacheTtl).toBeDefined();
      expect(config.cacheDirectory).toBeDefined();
      expect(config.enableTelemetry).toBeDefined();
      expect(config.enableRepository).toBeDefined();
    });

    it('should use custom configuration', async () => {
      const customConfig = {
        storagePath: '/custom/path',
        cacheTtl: 1800,
        enableTelemetry: false
      };
      
      await configManager.initialize(customConfig);
      const config = configManager.getConfig();
      
      expect(config.storagePath).toBe('/custom/path');
      expect(config.cacheTtl).toBe(1800);
      expect(config.enableTelemetry).toBe(false);
    });

    it('should check repository enabled status', () => {
      const enabled = configManager.isRepositoryEnabled();
      expect(typeof enabled).toBe('boolean');
    });

    it('should check telemetry enabled status', () => {
      const enabled = configManager.isTelemetryEnabled();
      expect(typeof enabled).toBe('boolean');
    });
  });
});
