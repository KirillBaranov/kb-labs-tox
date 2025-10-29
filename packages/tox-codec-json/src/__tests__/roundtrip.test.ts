/**
 * Roundtrip tests for TOX codec
 */

import { describe, it, expect } from 'vitest';
import { encodeJson, decodeJson } from '../../src';

describe('Roundtrip', () => {
  it('should roundtrip simple object', () => {
    const obj = { a: 1, b: 'test' };
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

  it('should roundtrip nested object', () => {
    const obj = {
      a: 1,
      b: {
        c: 2,
        d: {
          e: 3,
        },
      },
    };
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

  it('should roundtrip array', () => {
    const obj = [1, 'test', { a: 1 }];
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

  it('should roundtrip object with Date', () => {
    const date = new Date('2025-01-01T00:00:00Z');
    const obj = { date, value: 1 };
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

    expect((decoded.result as any).date).toBe(date.toISOString());
  });

  it('should roundtrip with preset keys', () => {
    const obj = {
      edges: [
        { from: 'a.ts', to: 'b.ts', type: 'import' },
        { from: 'b.ts', to: 'c.ts', type: 'import' },
      ],
      count: 2,
    };
    const encoded = encodeJson(obj, {
      presetKeys: ['edges', 'from', 'to', 'type', 'count'],
      compact: true,
    });
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

describe('Determinism', () => {
  it('should produce identical output for same input', () => {
    const obj = { z: 1, a: 2, m: 3 };
    const encoded1 = encodeJson(obj, { compact: true });
    const encoded2 = encodeJson(obj, { compact: true });
    
    expect(encoded1.ok).toBe(true);
    expect(encoded2.ok).toBe(true);
    
    if (!encoded1.ok || !encoded1.result || !encoded2.ok || !encoded2.result) {
      throw new Error('Encoding failed');
    }

    const json1 = JSON.stringify(encoded1.result);
    const json2 = JSON.stringify(encoded2.result);
    expect(json1).toBe(json2);
  });

  it('should produce same output regardless of key order', () => {
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { c: 3, a: 1, b: 2 };
    const encoded1 = encodeJson(obj1, { compact: true });
    const encoded2 = encodeJson(obj2, { compact: true });
    
    expect(encoded1.ok).toBe(true);
    expect(encoded2.ok).toBe(true);
    
    if (!encoded1.ok || !encoded1.result || !encoded2.ok || !encoded2.result) {
      throw new Error('Encoding failed');
    }

    const json1 = JSON.stringify(encoded1.result);
    const json2 = JSON.stringify(encoded2.result);
    expect(json1).toBe(json2);
  });
});

describe('Error handling', () => {
  it('should reject incompatible schema version', () => {
    const toxJson = {
      $schemaVersion: '2.0' as any,
      $meta: {
        generatedAt: new Date().toISOString(),
        producer: 'kb-tox@0.1.0',
      },
      data: { a: 1 },
    };
    const decoded = decodeJson(toxJson);
    expect(decoded.ok).toBe(false);
    expect(decoded.code).toBe('TOX_INCOMPATIBLE_VERSION');
  });

  it('should reject reserved keys in strict mode', () => {
    const obj = { $schemaVersion: 'test', data: 1 };
    const encoded = encodeJson(obj, { strict: true });
    expect(encoded.ok).toBe(false);
  });
});

