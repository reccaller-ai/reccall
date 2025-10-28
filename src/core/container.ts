/**
 * Dependency injection container for RecCall core engine
 */

import 'reflect-metadata';
import { container, injectable, inject } from 'tsyringe';
import type { 
  ICoreEngine,
  IContextStorage, 
  IRepositoryClient, 
  ICacheManager, 
  IRecipeValidator 
} from './interfaces.js';
import { CoreEngine } from './engine.js';
import { FileSystemStorage } from '../storage-backends/filesystem.js';
import { HttpRepositoryClient } from './repository.js';
import { MultiLayerCacheManager } from './cache.js';
import { RecipeValidator } from './validator.js';
import { configManager } from './config.js';

// Service tokens for dependency injection
export const TOKENS = {
  CORE_ENGINE: 'ICoreEngine',
  CONTEXT_STORAGE: 'IContextStorage',
  REPOSITORY_CLIENT: 'IRepositoryClient',
  CACHE_MANAGER: 'ICacheManager',
  RECIPE_VALIDATOR: 'IRecipeValidator',
} as const;

/**
 * Dependency injection container setup
 */
export class DIContainer {
  private static instance: DIContainer;
  private initialized = false;

  private constructor() {}

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Initialize the container with all dependencies
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Register core services
    container.registerSingleton<IContextStorage>(TOKENS.CONTEXT_STORAGE, FileSystemStorage);
    container.registerSingleton<IRepositoryClient>(TOKENS.REPOSITORY_CLIENT, HttpRepositoryClient);
    container.registerSingleton<ICacheManager>(TOKENS.CACHE_MANAGER, MultiLayerCacheManager);
    container.registerSingleton<IRecipeValidator>(TOKENS.RECIPE_VALIDATOR, RecipeValidator);

    // Register core engine with dependencies
    container.registerSingleton<ICoreEngine>(TOKENS.CORE_ENGINE, CoreEngine);

    // Initialize configuration
    await configManager.initialize();

    this.initialized = true;
  }

  /**
   * Get a service from the container
   */
  get<T>(token: string): T {
    if (!this.initialized) {
      throw new Error('DIContainer not initialized. Call initialize() first.');
    }
    return container.resolve<T>(token);
  }

  /**
   * Register a custom service
   */
  register<T>(token: string, implementation: new (...args: any[]) => T): void {
    container.registerSingleton<T>(token, implementation);
  }

  /**
   * Register a custom instance
   */
  registerInstance<T>(token: string, instance: T): void {
    container.registerInstance<T>(token, instance);
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    container.clearInstances();
    this.initialized = false;
  }

  /**
   * Check if container is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const diContainer = DIContainer.getInstance();

/**
 * Decorator for dependency injection
 */
export function Injectable() {
  return function <T extends new (...args: any[]) => any>(target: T) {
    return injectable()(target);
  };
}

/**
 * Decorator for injecting dependencies
 */
export function Inject(token: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    return inject(token)(target, propertyKey, parameterIndex);
  };
}

/**
 * Factory function to create core engine with DI
 */
export async function createCoreEngine(): Promise<ICoreEngine> {
  await diContainer.initialize();
  return diContainer.get<ICoreEngine>(TOKENS.CORE_ENGINE);
}

/**
 * Factory function to create CLI adapter with DI
 */
export async function createCLIAdapter() {
  const { CLIAdapter } = await import('../adapters/cli/index.js');
  const engine = await createCoreEngine();
  return new CLIAdapter(engine);
}

/**
 * Factory function to create MCP adapter with DI
 */
export async function createMCPAdapter() {
  const { MCPAdapter } = await import('../adapters/mcp/index.js');
  const engine = await createCoreEngine();
  return new MCPAdapter(engine);
}
