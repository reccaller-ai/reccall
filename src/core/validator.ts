/**
 * Recipe validator implementation
 */

import type { IRecipeValidator, Recipe, ValidationResult } from './interfaces.js';
import { ValidationError } from '../types.js';
import type { ShortcutId } from '../types.js';

export class RecipeValidator implements IRecipeValidator {
  validate(recipe: Recipe): ValidationResult {
    const errors: string[] = [];

    // Validate shortcut
    const shortcutValidation = this.validateShortcutId(recipe.shortcut);
    if (!shortcutValidation.valid) {
      errors.push(...shortcutValidation.errors);
    }

    // Validate context
    const contextValidation = this.validateContext(recipe.context);
    if (!contextValidation.valid) {
      errors.push(...contextValidation.errors);
    }

    // Validate category
    if (!recipe.category || typeof recipe.category !== 'string') {
      errors.push('Recipe must have a valid category');
    }

    // Validate description
    if (!recipe.description || typeof recipe.description !== 'string') {
      errors.push('Recipe must have a valid description');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateShortcutId(shortcut: string): ValidationResult {
    const errors: string[] = [];

    if (!shortcut || typeof shortcut !== 'string') {
      errors.push('Shortcut must be a non-empty string');
    } else {
      if (shortcut.length === 0) {
        errors.push('Shortcut cannot be empty');
      }

      if (shortcut.length > 100) {
        errors.push('Shortcut cannot be longer than 100 characters');
      }

      if (!/^[a-zA-Z0-9-_]+$/.test(shortcut)) {
        errors.push('Shortcut must contain only alphanumeric characters, hyphens, and underscores');
      }

      // Check for reserved keywords
      const reservedKeywords = ['help', 'version', 'config', 'init', 'install', 'remove', 'list', 'search'];
      if (reservedKeywords.includes(shortcut.toLowerCase())) {
        errors.push(`Shortcut '${shortcut}' is reserved`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateContext(context: string): ValidationResult {
    const errors: string[] = [];

    if (!context || typeof context !== 'string') {
      errors.push('Context must be a non-empty string');
    } else {
      if (context.length === 0) {
        errors.push('Context cannot be empty');
      }

      if (context.length > 10000) {
        errors.push('Context cannot be longer than 10,000 characters');
      }

      // Check for minimum meaningful content
      const trimmedContext = context.trim();
      if (trimmedContext.length < 10) {
        errors.push('Context must be at least 10 characters long');
      }

      // Check for suspicious content (basic security check)
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /function\s*\(/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(context)) {
          errors.push('Context contains potentially unsafe content');
          break;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  sanitize(recipe: Recipe): Recipe {
    return {
      shortcut: recipe.shortcut.trim().toLowerCase() as ShortcutId,
      context: recipe.context.trim(),
      category: recipe.category?.trim().toLowerCase() || 'general',
      description: recipe.description?.trim() || '',
      name: recipe.name?.trim() || recipe.shortcut
    };
  }
}
