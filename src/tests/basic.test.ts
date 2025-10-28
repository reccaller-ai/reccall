import { describe, it, expect } from 'vitest';

describe('Basic Tests', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should work with objects', () => {
    const obj = { name: 'RecCall', version: '1.0.0' };
    expect(obj.name).toBe('RecCall');
    expect(obj.version).toBe('1.0.0');
  });
});
