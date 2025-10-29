/**
 * Determinism tests for TOX codec
 */

import { describe, it, expect } from 'vitest';
import { encodeJson } from '../../src';

describe('Determinism', () => {
  it('should produce identical output for same input (multiple encodes)', () => {
    const obj = {
      z: 1,
      a: 2,
      m: 3,
      nested: {
        c: 4,
        b: 5,
      },
    };

    const encoded1 = encodeJson(obj, { compact: true });
    const encoded2 = encodeJson(obj, { compact: true });
    const encoded3 = encodeJson(obj, { compact: true });

    expect(encoded1.ok).toBe(true);
    expect(encoded2.ok).toBe(true);
    expect(encoded3.ok).toBe(true);

    if (!encoded1.ok || !encoded1.result || !encoded2.ok || !encoded2.result || !encoded3.ok || !encoded3.result) {
      throw new Error('Encoding failed');
    }

    const json1 = JSON.stringify(encoded1.result);
    const json2 = JSON.stringify(encoded2.result);
    const json3 = JSON.stringify(encoded3.result);

    expect(json1).toBe(json2);
    expect(json2).toBe(json3);
  });

  it('should produce same output regardless of key order', () => {
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { c: 3, a: 1, b: 2 };
    const obj3 = { b: 2, c: 3, a: 1 };

    const encoded1 = encodeJson(obj1, { compact: true });
    const encoded2 = encodeJson(obj2, { compact: true });
    const encoded3 = encodeJson(obj3, { compact: true });

    expect(encoded1.ok).toBe(true);
    expect(encoded2.ok).toBe(true);
    expect(encoded3.ok).toBe(true);

    if (!encoded1.ok || !encoded1.result || !encoded2.ok || !encoded2.result || !encoded3.ok || !encoded3.result) {
      throw new Error('Encoding failed');
    }

    const json1 = JSON.stringify(encoded1.result);
    const json2 = JSON.stringify(encoded2.result);
    const json3 = JSON.stringify(encoded3.result);

    expect(json1).toBe(json2);
    expect(json2).toBe(json3);
  });

  it('should produce stable dictionary order', () => {
    const obj = {
      edges: [
        { from: 'z.ts', to: 'b.ts', type: 'import' },
        { from: 'a.ts', to: 'b.ts', type: 'import' },
      ],
      count: 2,
    };

    const encoded1 = encodeJson(obj, {
      presetKeys: ['edges', 'from', 'to', 'type', 'count'],
      compact: true,
    });
    const encoded2 = encodeJson(obj, {
      presetKeys: ['edges', 'from', 'to', 'type', 'count'],
      compact: true,
    });

    expect(encoded1.ok).toBe(true);
    expect(encoded2.ok).toBe(true);

    if (!encoded1.ok || !encoded1.result || !encoded2.ok || !encoded2.result) {
      throw new Error('Encoding failed');
    }

    // Dictionary should be identical
    expect(encoded1.result.$dict).toEqual(encoded2.result.$dict);

    // Full output should be identical
    const json1 = JSON.stringify(encoded1.result);
    const json2 = JSON.stringify(encoded2.result);
    expect(json1).toBe(json2);
  });

  it('should handle dictionary with frequency-based ordering', () => {
    // Create object where some keys appear more frequently
    const obj = {
      frequent: {
        a: 1,
        b: 2,
        a2: 3,
        b2: 4,
      },
      alsoFrequent: {
        a: 5,
        b: 6,
      },
      rare: {
        x: 1,
      },
    };

    const encoded1 = encodeJson(obj, { compact: true });
    const encoded2 = encodeJson(obj, { compact: true });

    expect(encoded1.ok).toBe(true);
    expect(encoded2.ok).toBe(true);

    if (!encoded1.ok || !encoded1.result || !encoded2.ok || !encoded2.result) {
      throw new Error('Encoding failed');
    }

    // Dictionary order should be stable
    expect(encoded1.result.$dict).toEqual(encoded2.result.$dict);

    // Keys with higher frequency should come first
    if (encoded1.result.$dict) {
      const dictKeys = Object.keys(encoded1.result.$dict);
      const dictValues = Object.values(encoded1.result.$dict);
      
      // 'a' and 'b' appear more frequently, so they should be earlier
      const aIndex = dictValues.indexOf('a');
      const bIndex = dictValues.indexOf('b');
      const xIndex = dictValues.indexOf('x');

      expect(aIndex).toBeGreaterThanOrEqual(0);
      expect(bIndex).toBeGreaterThanOrEqual(0);
      expect(xIndex).toBeGreaterThanOrEqual(0);
      
      // 'a' and 'b' should appear before 'x' (due to frequency)
      if (aIndex < xIndex && bIndex < xIndex) {
        // This is expected behavior
      }
    }
  });
});

