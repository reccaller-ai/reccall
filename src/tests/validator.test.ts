/**
 * Comprehensive tests for RecipeValidator
 */

import { describe, it, expect } from 'vitest';
import { RecipeValidator } from '../core/validator.js';
import type { Recipe } from '../core/interfaces.js';
import type { ShortcutId } from '../types.js';

describe('RecipeValidator', () => {
  let validator: RecipeValidator;

  beforeEach(() => {
    validator = new RecipeValidator();
  });

  describe('validateShortcutId', () => {
    it('should validate valid shortcut ID', () => {
      const result = validator.validateShortcutId('valid-shortcut' as any);
      expect(result.valid).toBe(true);
      expect(result.errors?.length || 0).toBe(0);
    });

    it('should reject empty shortcut ID', () => {
      const result = validator.validateShortcutId('' as any);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e: string) => e.includes('empty') || e.includes('cannot be empty'))).toBe(true);
    });

    it('should reject shortcut with invalid characters', () => {
      const result = validator.validateShortcutId('invalid shortcut!' as any);
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e: string) => e.includes('alphanumeric'))).toBe(true);
    });
  });

  describe('validateContext', () => {
    it('should validate valid context', () => {
      const result = validator.validateContext('Valid context with enough characters');
      expect(result.valid).toBe(true);
    });

    it('should reject context that is too short', () => {
      const result = validator.validateContext('Hi');
      expect(result.valid).toBe(false);
      expect(result.errors?.some((e: string) => e.includes('characters') || e.includes('length'))).toBe(true);
    });

    it('should reject empty context', () => {
      const result = validator.validateContext('');
      expect(result.valid).toBe(false);
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('should validate valid recipe', () => {
      const recipe: Recipe = {
        shortcut: 'test-recipe' as ShortcutId,
        context: 'Valid context for testing',
        category: 'testing',
        description: 'A test recipe',
      };
      const result = validator.validate(recipe);
      expect(result.valid).toBe(true);
    });

    it('should reject recipe with invalid shortcut', () => {
      const recipe: Recipe = {
        shortcut: '' as ShortcutId,
        context: 'Valid context',
        category: 'testing',
        description: 'Test',
      };
      const result = validator.validate(recipe);
      expect(result.valid).toBe(false);
    });

    it('should reject recipe with invalid context', () => {
      const recipe: Recipe = {
        shortcut: 'test-recipe' as ShortcutId,
        context: 'Hi',
        category: 'testing',
        description: 'Test',
      };
      const result = validator.validate(recipe);
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitize', () => {
    it('should sanitize recipe data', () => {
      const recipe: Recipe = {
        shortcut: '  TEST-RECIPE  ' as any,
        context: '  Context with spaces  ',
        category: 'testing',
        description: 'Test',
      };
      const sanitized = validator.sanitize(recipe);
      expect(sanitized.shortcut).toBe('test-recipe');
      expect(sanitized.context).toBe('Context with spaces');
    });
  });
});
