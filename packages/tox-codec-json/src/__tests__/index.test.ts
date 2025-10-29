/**
 * Unit tests for TOX codec
 */

import { describe, it, expect } from 'vitest';
import { encodeJson, decodeJson, getToxJsonSchema } from '../../src';
import { ToxErrorCode } from '@kb-labs/tox-core';

describe('encodeJson', () => {
  it('should encode simple object', () => {
    const obj = { a: 1, b: 'test' };
    const encoded = encodeJson(obj);
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    expect(encoded.result.$schemaVersion).toBe('1.0');
    expect(encoded.result.$meta).toBeDefined();
    expect(encoded.result.data).toBeDefined();
  });

  it('should include preset in meta', () => {
    const obj = { a: 1 };
    const encoded = encodeJson(obj, { preset: 'mind-v1' });
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    expect(encoded.result.$meta.preset).toBe('mind-v1');
  });

  it('should create dictionary with preset keys', () => {
    const obj = { edges: [], count: 0 };
    const encoded = encodeJson(obj, {
      presetKeys: ['edges', 'count'],
      compact: true,
    });
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    expect(encoded.result.$dict).toBeDefined();
    expect(Object.keys(encoded.result.$dict || {})).toContain('k1');
  });

  it('should reject reserved keys in preset', () => {
    const obj = { a: 1 };
    const encoded = encodeJson(obj, {
      presetKeys: ['$schemaVersion', 'a'],
      strict: true,
    });
    expect(encoded.ok).toBe(false);
    expect(encoded.code).toBe(ToxErrorCode.STRICT_MODE_VIOLATION);
  });
});

describe('decodeJson', () => {
  it('should decode simple TOX JSON', () => {
    const toxJson = {
      $schemaVersion: '1.0' as const,
      $meta: {
        generatedAt: new Date().toISOString(),
        producer: 'kb-tox@0.1.0',
      },
      data: { a: 1, b: 'test' },
    };
    const decoded = decodeJson(toxJson);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual({ a: 1, b: 'test' });
  });

  it('should resolve dictionary keys', () => {
    const toxJson = {
      $schemaVersion: '1.0' as const,
      $meta: {
        generatedAt: new Date().toISOString(),
        producer: 'kb-tox@0.1.0',
      },
      $dict: {
        k1: 'a',
        k2: 'b',
      },
      data: {
        k1: 1,
        k2: 'test',
      },
    };
    const decoded = decodeJson(toxJson);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual({ a: 1, b: 'test' });
  });
});

describe('getToxJsonSchema', () => {
  it('should return valid JSON Schema', () => {
    const schema = getToxJsonSchema();
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeDefined();
    expect(schema.properties?.$schemaVersion).toBeDefined();
    expect(schema.properties?.$meta).toBeDefined();
    expect(schema.properties?.$dict).toBeDefined();
    expect(schema.properties?.data).toBeDefined();
  });
});

