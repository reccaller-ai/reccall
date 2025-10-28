/**
 * Shared types for RecCall core engine and adapters
 */

// Branded types for type safety
export type ShortcutId = string & { readonly __brand: 'ShortcutId' };
export type ContextId = string & { readonly __brand: 'ContextId' };
export type RepositoryUrl = string & { readonly __brand: 'RepositoryUrl' };

// Core data structures
export interface Shortcut {
  id: ShortcutId;
  context: string;
  createdAt: Date;
  updatedAt: Date;
  category?: string;
  description?: string;
}

export interface Recipe {
  shortcut: ShortcutId;
  context: string;
  category: string;
  description: string;
  name?: string;
}

export interface RepositoryManifest {
  name: string;
  description: string;
  version: string;
  url: string;
  recipes: Array<{
    name: string;
    shortcut: ShortcutId;
    description: string;
    file: string;
    category: string;
  }>;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Configuration types
export interface CoreConfig {
  storage: {
    shortcutsFile: string;
    repoConfigFile: string;
  };
  repository: {
    defaultRepo: RepositoryUrl;
    enabled: boolean;
  };
  cache: {
    directory: string;
    ttl: number;
    memoryTtl: number;
  };
  telemetry: {
    enabled: boolean;
    endpoint?: string;
  };
}

// Error types
export class RecCallError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'RecCallError';
  }
}

export class StorageError extends RecCallError {
  constructor(message: string, cause?: Error) {
    super(message, 'STORAGE_ERROR', cause);
  }
}

export class RepositoryError extends RecCallError {
  constructor(message: string, cause?: Error) {
    super(message, 'REPOSITORY_ERROR', cause);
  }
}

export class ValidationError extends RecCallError {
  constructor(message: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', cause);
  }
}

// Platform adapter types
export interface PlatformCapabilities {
  canRecord: boolean;
  canCall: boolean;
  canList: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPurge: boolean;
  supportsRepository: boolean;
}

export interface PlatformContext {
  platform: string;
  version: string;
  capabilities: PlatformCapabilities;
  config?: Record<string, any>;
}
