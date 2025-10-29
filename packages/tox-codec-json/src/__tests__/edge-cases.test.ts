/**
 * Edge case tests for TOX codec
 */

import { describe, it, expect } from 'vitest';
import { encodeJson, decodeJson } from '../../src';
import { ToxErrorCode } from '@kb-labs/tox-core';

describe('Edge Cases', () => {
  it('should handle empty object', () => {
    const obj = {};
    const encoded = encodeJson(obj);
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual(obj);
  });

  it('should handle empty array', () => {
    const obj: any[] = [];
    const encoded = encodeJson(obj);
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual(obj);
  });

  it('should handle null values', () => {
    const obj = { a: null, b: 1 };
    const encoded = encodeJson(obj);
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual(obj);
  });

  it('should handle nested empty objects', () => {
    const obj = { a: {}, b: { c: {} } };
    const encoded = encodeJson(obj);
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual(obj);
  });

  it('should handle large nested structure', () => {
    const obj: any = {};
    let current = obj;
    for (let i = 0; i < 10; i++) {
      current[`level${i}`] = {};
      current = current[`level${i}`];
    }
    current.value = 42;

    const encoded = encodeJson(obj);
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual(obj);
  });

  it('should reject reserved keys in strict mode', () => {
    const obj = { $schemaVersion: 'test', data: 1 };
    const encoded = encodeJson(obj, { strict: true });
    expect(encoded.ok).toBe(false);
    expect(encoded.code).toBe(ToxErrorCode.STRICT_MODE_VIOLATION);
  });

  it('should skip reserved keys in non-strict mode', () => {
    const obj = { $schemaVersion: 'test', valid: 1 };
    const encoded = encodeJson(obj, { strict: false });
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    // Reserved key should be skipped
    expect((decoded.result as any).$schemaVersion).toBeUndefined();
    expect((decoded.result as any).valid).toBe(1);
  });

  it('should handle arrays with mixed types', () => {
    const obj = [1, 'test', { a: 1 }, null, true];
    const encoded = encodeJson(obj);
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual(obj);
  });

  it('should handle object with many keys', () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 100; i++) {
      obj[`key${i}`] = i;
    }

    const encoded = encodeJson(obj, { compact: true });
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual(obj);
  });
});

