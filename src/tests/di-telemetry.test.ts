import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { diContainer, TOKENS } from '../core/container.js';
import { telemetryManager, Performance, LogErrors } from '../core/telemetry.js';
import { configManager } from '../core/config.js';
import type { ICoreEngine, IContextStorage, IRepositoryClient, ICacheManager, IRecipeValidator } from '../core/interfaces.js';

describe('Dependency Injection Tests', () => {
  beforeEach(() => {
    // Clear container before each test
    diContainer.clear();
  });

  afterEach(() => {
    // Clear container after each test
    diContainer.clear();
  });

  describe('Container Initialization', () => {
    it('should initialize container successfully', async () => {
      await diContainer.initialize();
      expect(diContainer.isInitialized()).toBe(true);
    });

    it('should register all required services', async () => {
      await diContainer.initialize();
      
      // All services should be registered
      expect(diContainer.get<IContextStorage>(TOKENS.CONTEXT_STORAGE)).toBeDefined();
      expect(diContainer.get<IRepositoryClient>(TOKENS.REPOSITORY_CLIENT)).toBeDefined();
      expect(diContainer.get<ICacheManager>(TOKENS.CACHE_MANAGER)).toBeDefined();
      expect(diContainer.get<IRecipeValidator>(TOKENS.RECIPE_VALIDATOR)).toBeDefined();
      expect(diContainer.get<ICoreEngine>(TOKENS.CORE_ENGINE)).toBeDefined();
    });
  });

  describe('Service Registration', () => {
    it('should register custom services', () => {
      class CustomService {
        test() {
          return 'custom';
        }
      }

      diContainer.register('CUSTOM_SERVICE', CustomService);
      const service = diContainer.get<CustomService>('CUSTOM_SERVICE');
      
      expect(service).toBeDefined();
      expect(service.test()).toBe('custom');
    });

    it('should register custom instances', () => {
      const customInstance = { test: () => 'instance' };
      
      diContainer.registerInstance('CUSTOM_INSTANCE', customInstance);
      const instance = diContainer.get<typeof customInstance>('CUSTOM_INSTANCE');
      
      expect(instance).toBe(customInstance);
      expect(instance.test()).toBe('instance');
    });
  });

  describe('Service Resolution', () => {
    beforeEach(async () => {
      await diContainer.initialize();
    });

    it('should resolve services as singletons', () => {
      const service1 = diContainer.get<IContextStorage>(TOKENS.CONTEXT_STORAGE);
      const service2 = diContainer.get<IContextStorage>(TOKENS.CONTEXT_STORAGE);
      
      expect(service1).toBe(service2);
    });

    it('should throw error for unregistered services', () => {
      expect(() => {
        diContainer.get('UNREGISTERED_SERVICE');
      }).toThrow('DIContainer not initialized');
    });

    it('should throw error when not initialized', () => {
      diContainer.clear();
      
      expect(() => {
        diContainer.get<ICoreEngine>(TOKENS.CORE_ENGINE);
      }).toThrow('DIContainer not initialized');
    });
  });

  describe('Container Lifecycle', () => {
    it('should clear all instances', async () => {
      await diContainer.initialize();
      expect(diContainer.isInitialized()).toBe(true);
      
      diContainer.clear();
      expect(diContainer.isInitialized()).toBe(false);
    });

    it('should reinitialize after clear', async () => {
      await diContainer.initialize();
      diContainer.clear();
      
      await diContainer.initialize();
      expect(diContainer.isInitialized()).toBe(true);
    });
  });
});

describe('Telemetry Tests', () => {
  beforeEach(() => {
    // Reset telemetry manager
    telemetryManager.setEnabled(true);
  });

  afterEach(() => {
    // Clean up
    telemetryManager.setEnabled(false);
  });

  describe('Event Logging', () => {
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

  describe('Metrics Management', () => {
    it('should update metrics', () => {
      telemetryManager.updateMetrics({
        shortcutsCount: 10,
        cacheHitRate: 0.85
      });
      
      const metrics = telemetryManager.getMetrics();
      expect(metrics.shortcutsCount).toBe(10);
      expect(metrics.cacheHitRate).toBe(0.85);
    });

    it('should log metrics snapshot', () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      telemetryManager.updateMetrics({ shortcutsCount: 5 });
      telemetryManager.logMetrics();
      
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('Performance Decorators', () => {
    it('should measure method performance', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      class TestClass {
        @Performance('test.method')
        async testMethod() {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'result';
        }
      }
      
      const instance = new TestClass();
      const result = await instance.testMethod();
      
      expect(result).toBe('result');
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should log errors from decorated methods', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      class TestClass {
        @LogErrors({ context: 'test' })
        async errorMethod() {
          throw new Error('Test error');
        }
      }
      
      const instance = new TestClass();
      
      try {
        await instance.errorMethod();
      } catch (error) {
        // Expected to throw
      }
      
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});

describe('Configuration Tests', () => {
  beforeEach(async () => {
    await configManager.initialize();
  });

  describe('Configuration Management', () => {
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

  describe('Configuration Validation', () => {
    it('should handle invalid configuration gracefully', async () => {
      const invalidConfig = {
        cacheTtl: -1, // Invalid TTL
        enableTelemetry: 'invalid' // Invalid boolean
      };
      
      await expect(configManager.initialize(invalidConfig)).resolves.not.toThrow();
    });

    it('should merge configuration with defaults', async () => {
      const partialConfig = {
        cacheTtl: 3600
      };
      
      await configManager.initialize(partialConfig);
      const config = configManager.getConfig();
      
      expect(config.cacheTtl).toBe(3600);
      expect(config.storagePath).toBeDefined(); // Should have default value
    });
  });
});
