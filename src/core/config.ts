/**
 * Core configuration management
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { CoreConfig, RepositoryUrl } from '../types.js';

const DEFAULT_CONFIG: CoreConfig = {
  storage: {
    shortcutsFile: path.join(os.homedir(), '.reccall.json'),
    repoConfigFile: path.join(os.homedir(), '.reccall-repo.json')
  },
  repository: {
    defaultRepo: 'https://contexts.reccaller.ai/' as RepositoryUrl,
    enabled: true
  },
  cache: {
    directory: path.join(os.homedir(), '.reccall-cache'),
    ttl: 60 * 60 * 1000, // 1 hour
    memoryTtl: 5 * 1000   // 5 seconds
  },
  telemetry: {
    enabled: false
  }
};

export class ConfigManager {
  private config: CoreConfig = DEFAULT_CONFIG;
  private initialized = false;

  /**
   * Initialize configuration
   */
  async initialize(customConfig?: Partial<CoreConfig>): Promise<void> {
    if (this.initialized) return;

    // Load repository config if it exists
    try {
      const repoConfigData = await fs.readFile(this.config.storage.repoConfigFile, 'utf-8');
      const repoConfig = JSON.parse(repoConfigData);
      
      this.config.repository = {
        ...this.config.repository,
        ...repoConfig
      };
    } catch (error) {
      // Repository config doesn't exist, use defaults
    }

    // Apply custom config
    if (customConfig) {
      this.config = this.mergeConfig(this.config, customConfig);
    }

    // Ensure cache directory exists
    try {
      await fs.mkdir(this.config.cache.directory, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    this.initialized = true;
  }

  /**
   * Get current configuration
   */
  getConfig(): CoreConfig {
    if (!this.initialized) {
      throw new Error('ConfigManager not initialized');
    }
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<CoreConfig>): Promise<void> {
    if (!this.initialized) {
      throw new Error('ConfigManager not initialized');
    }

    this.config = this.mergeConfig(this.config, updates);

    // Save repository config if it changed
    if (updates.repository) {
      await this.saveRepositoryConfig();
    }
  }

  /**
   * Get storage file path
   */
  getStoragePath(): string {
    return this.config.storage.shortcutsFile;
  }

  /**
   * Get repository config file path
   */
  getRepoConfigPath(): string {
    return this.config.storage.repoConfigFile;
  }

  /**
   * Get cache directory
   */
  getCacheDirectory(): string {
    return this.config.cache.directory;
  }

  /**
   * Get cache TTL
   */
  getCacheTtl(): number {
    return this.config.cache.ttl;
  }

  /**
   * Get memory cache TTL
   */
  getMemoryTtl(): number {
    return this.config.cache.memoryTtl;
  }

  /**
   * Get default repository URL
   */
  getDefaultRepository(): RepositoryUrl {
    return this.config.repository.defaultRepo;
  }

  /**
   * Check if repository features are enabled
   */
  isRepositoryEnabled(): boolean {
    return this.config.repository.enabled;
  }

  /**
   * Check if telemetry is enabled
   */
  isTelemetryEnabled(): boolean {
    return this.config.telemetry.enabled;
  }

  /**
   * Merge configuration objects
   */
  private mergeConfig(base: CoreConfig, updates: Partial<CoreConfig>): CoreConfig {
    return {
      storage: { ...base.storage, ...updates.storage },
      repository: { ...base.repository, ...updates.repository },
      cache: { ...base.cache, ...updates.cache },
      telemetry: { ...base.telemetry, ...updates.telemetry }
    };
  }

  /**
   * Save repository configuration
   */
  private async saveRepositoryConfig(): Promise<void> {
    const repoConfig = {
      defaultRepo: this.config.repository.defaultRepo,
      enabled: this.config.repository.enabled,
      cacheDir: this.config.cache.directory
    };

    await fs.writeFile(
      this.config.storage.repoConfigFile,
      JSON.stringify(repoConfig, null, 2)
    );
  }
}

// Singleton instance
export const configManager = new ConfigManager();
