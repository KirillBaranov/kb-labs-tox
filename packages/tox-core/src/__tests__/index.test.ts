/**
 * Unit tests for TOX core
 */

import { describe, it, expect } from 'vitest';
import { normalize, hash, toToxAST, fromToxAST, estimateTokens, ToxErrorCode } from '../index';

describe('normalize', () => {
  it('should sort object keys', () => {
    const obj = { z: 1, a: 2, m: 3 };
    const result = normalize(obj, { sortKeys: true });
    expect(result.value).toEqual({ a: 2, m: 3, z: 1 });
  });

  it('should handle arrays', () => {
    const obj = [1, 2, 3];
    const result = normalize(obj);
    expect(result.value).toEqual([1, 2, 3]);
  });

  it('should convert Date to ISO string', () => {
    const date = new Date('2025-01-01T00:00:00Z');
    const result = normalize({ date });
    expect(result.value).toEqual({ date: '2025-01-01T00:00:00.000Z' });
  });

  it('should reject BigInt in strict mode', () => {
    const result = normalize(BigInt(123), { strict: true });
    expect(result.error?.code).toBe(ToxErrorCode.UNSUPPORTED_TYPE);
  });

  it('should reject Map in strict mode', () => {
    const result = normalize(new Map(), { strict: true });
    expect(result.error?.code).toBe(ToxErrorCode.UNSUPPORTED_TYPE);
  });

  it('should detect circular references', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    const result = normalize(obj, { strict: true });
    expect(result.error?.code).toBe(ToxErrorCode.UNSUPPORTED_TYPE);
  });

  it('should enforce depth limit', () => {
    let obj: any = {};
    let current = obj;
    for (let i = 0; i < 100; i++) {
      current.nested = {};
      current = current.nested;
    }
    const result = normalize(obj, { strict: true, maxDepth: 64 });
    expect(result.error?.code).toBe(ToxErrorCode.LIMIT_EXCEEDED);
  });
});

describe('hash', () => {
  it('should produce same hash for same objects', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 }; // Different key order
    const hash1 = hash(obj1);
    const hash2 = hash(obj2);
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different objects', () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 2 };
    const hash1 = hash(obj1);
    const hash2 = hash(obj2);
    expect(hash1).not.toBe(hash2);
  });
});

describe('toToxAST / fromToxAST', () => {
  it('should roundtrip simple object', () => {
    const obj = { a: 1, b: 'test' };
    const ast = toToxAST(obj);
    const restored = fromToxAST(ast);
    expect(restored).toEqual(obj);
  });

  it('should roundtrip nested object', () => {
    const obj = { a: { b: { c: 1 } } };
    const ast = toToxAST(obj);
    const restored = fromToxAST(ast);
    expect(restored).toEqual(obj);
  });

  it('should roundtrip array', () => {
    const obj = [1, 2, { a: 3 }];
    const ast = toToxAST(obj);
    const restored = fromToxAST(ast);
    expect(restored).toEqual(obj);
  });
});

describe('estimateTokens', () => {
  it('should estimate tokens', () => {
    const obj = { a: 1, b: 'test' };
    const estimate = estimateTokens(obj);
    expect(estimate.jsonBytes).toBeGreaterThan(0);
    expect(estimate.toxBytes).toBeGreaterThan(0);
    expect(estimate.jsonTokens).toBeGreaterThan(0);
    expect(estimate.toxTokens).toBeGreaterThan(0);
  });
});

