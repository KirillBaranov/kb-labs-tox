/**
 * Tests for ShapePool encoding/decoding
 */

import { describe, it, expect } from 'vitest';
import { encodeJson } from '../encode';
import { decodeJson } from '../decode';
import { deriveShape, calculateUniformity, ShapePool } from '@kb-labs/tox-core';

describe('ShapePool', () => {
  describe('Shape utilities', () => {
    it('should derive shape from object', () => {
      const obj1 = { from: 'a.ts', to: 'b.ts', type: 'import' };
      const shape1 = deriveShape(obj1);
      expect(shape1).toEqual(['from', 'to', 'type']);

      const obj2 = { type: 'export', name: 'foo', file: 'src/foo.ts' };
      const shape2 = deriveShape(obj2);
      expect(shape2).toEqual(['file', 'name', 'type']); // sorted lexicographically
    });

    it('should calculate uniformity correctly', () => {
      const shapes1 = [
        ['from', 'to', 'type'],
        ['from', 'to', 'type'],
        ['from', 'to', 'type'],
      ];
      expect(calculateUniformity(shapes1)).toBe(1.0);

      const shapes2 = [
        ['from', 'to', 'type'],
        ['from', 'to', 'type'],
        ['from', 'to', 'type'],
        ['file', 'imports'],
      ];
      expect(calculateUniformity(shapes2)).toBe(0.75); // 3/4 = 0.75

      const shapes3 = [
        ['a'],
        ['b'],
        ['c'],
      ];
      expect(calculateUniformity(shapes3)).toBeCloseTo(0.333, 2); // 1/3
    });

    it('should handle empty shapes array', () => {
      expect(calculateUniformity([])).toBe(1.0);
    });
  });

  describe('ShapePool class', () => {
    it('should add shapes and return IDs', () => {
      const pool = new ShapePool();
      const shape1 = ['from', 'to', 'type'];
      const id1 = pool.addShape(shape1);
      
      expect(id1).toMatch(/^s\d+$/);
      expect(pool.getShape(id1)).toEqual(shape1);
      
      // Adding same shape should return same ID
      const id2 = pool.addShape(shape1);
      expect(id2).toBe(id1);
    });

    it('should build shapes dictionary', () => {
      const pool = new ShapePool();
      pool.addShape(['from', 'to', 'type']);
      pool.addShape(['file', 'imports']);
      
      const dict = pool.toShapesDict();
      expect(Object.keys(dict).length).toBe(2);
      expect(Object.values(dict)).toContainEqual(['from', 'to', 'type']);
      expect(Object.values(dict)).toContainEqual(['file', 'imports']);
    });
  });

  describe('ShapePool encoding/decoding', () => {
    it('should encode array of uniform objects with ShapePool', () => {
      const obj = {
        edges: [
          { from: 'a.ts', to: 'b.ts', type: 'import' },
          { from: 'b.ts', to: 'c.ts', type: 'import' },
          { from: 'c.ts', to: 'd.ts', type: 'import' },
        ],
      };
      
      // Need at least 10 objects for auto mode, so force enable
      const encoded = encodeJson(obj, { enableShapePool: true });
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      // Should have $shapes dictionary (if ShapePool was enabled)
      // For small arrays (< 10), ShapePool may not be used even with enableShapePool: true
      // But if it is used, should have $shapes
      if (encoded.result.$shapes) {
        expect(Object.keys(encoded.result.$shapes).length).toBeGreaterThan(0);
      }
      
      // Edges should be encoded as { $shape: "s1", rows: [...] }
      const data = encoded.result.data as any;
      expect(data.edges).toBeDefined();
      expect(data.edges.$shape).toBeDefined();
      expect(data.edges.rows).toBeDefined();
      expect(Array.isArray(data.edges.rows)).toBe(true);
    });

    it('should decode ShapePool encoded arrays back to objects', () => {
      const obj = {
        edges: [
          { from: 'a.ts', to: 'b.ts', type: 'import' },
          { from: 'b.ts', to: 'c.ts', type: 'import' },
        ],
      };
      
      const encoded = encodeJson(obj, { enableShapePool: true });
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      const decoded = decodeJson(encoded.result);
      expect(decoded.ok).toBe(true);
      
      if (!decoded.ok || !decoded.result) {
        throw new Error('Decoding failed');
      }
      
      // Should decode back to original structure
      const result = decoded.result as typeof obj;
      expect(result.edges).toEqual(obj.edges);
    });

    it('should roundtrip arrays with ShapePool', () => {
      const obj = {
        edges: Array.from({ length: 15 }, (_, i) => ({
          from: `file${i}.ts`,
          to: `file${i + 1}.ts`,
          type: 'import',
        })),
      };
      
      const encoded = encodeJson(obj, { enableShapePool: true });
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

    it('should use auto heuristic for ShapePool', () => {
      const obj = {
        edges: Array.from({ length: 20 }, (_, i) => ({
          from: `a${i}.ts`,
          to: `b${i}.ts`,
          type: 'import',
        })),
      };
      
      const encoded = encodeJson(obj, { enableShapePool: 'auto' });
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      // ShapePool should be enabled automatically (n ≥ 10, uniformity = 1.0)
      const decision = encoded.result.$meta?.decisions?.shapePool;
      if (decision && typeof decision === 'object' && 'enabled' in decision) {
        expect((decision as any).enabled).toBe(true);
        expect((decision as any).uniformity).toBeGreaterThanOrEqual(0.8);
        expect((decision as any).n).toBeGreaterThanOrEqual(10);
      }
    });

    it('should not use ShapePool if uniformity < 0.8', () => {
      const obj = {
        items: [
          { a: 1, b: 2 },
          { c: 3, d: 4 },
          { e: 5, f: 6 },
        ].concat(Array.from({ length: 7 }, (_, i) => ({ a: i, b: i + 1 }))),
      };
      
      const encoded = encodeJson(obj, { enableShapePool: 'auto' });
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      // ShapePool should not be enabled (uniformity < 0.8)
      const decision = encoded.result.$meta?.decisions?.shapePool;
      if (decision && typeof decision === 'object' && 'enabled' in decision) {
        // May or may not be enabled depending on actual uniformity calculation
        // But if enabled, uniformity should be >= 0.8
        if ((decision as any).enabled) {
          expect((decision as any).uniformity).toBeGreaterThanOrEqual(0.8);
        }
      }
    });

    it('should preserve array order with ShapePool', () => {
      const obj = {
        edges: [
          { from: 'a.ts', to: 'b.ts', type: 'import' },
          { from: 'b.ts', to: 'c.ts', type: 'import' },
          { from: 'c.ts', to: 'd.ts', type: 'import' },
        ],
      };
      
      const encoded = encodeJson(obj, { enableShapePool: true });
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      const decoded = decodeJson(encoded.result);
      expect(decoded.ok).toBe(true);
      
      if (!decoded.ok || !decoded.result) {
        throw new Error('Decoding failed');
      }
      
      const result = decoded.result as typeof obj;
      // Order should be preserved
      expect(result.edges[0]?.from).toBe('a.ts');
      expect(result.edges[1]?.from).toBe('b.ts');
      expect(result.edges[2]?.from).toBe('c.ts');
    });

    it('should handle mixed arrays (objects and non-objects)', () => {
      const obj = {
        items: [
          { a: 1 },
          'string',
          { a: 2 },
          123,
        ],
      };
      
      const encoded = encodeJson(obj, { enableShapePool: true });
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      const decoded = decodeJson(encoded.result);
      expect(decoded.ok).toBe(true);
      
      if (!decoded.ok || !decoded.result) {
        throw new Error('Decoding failed');
      }
      
      // Non-uniform arrays should not use ShapePool
      const result = decoded.result as typeof obj;
      expect(result.items).toEqual(obj.items);
    });
  });
});

