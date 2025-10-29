/**
 * Tests for Columnar mode encoding/decoding
 */

import { describe, it, expect } from 'vitest';
import { encodeJson } from '../encode';
import { decodeJson } from '../decode';

describe('Columnar Mode', () => {
  describe('Columnar encoding/decoding', () => {
    it('should encode large arrays in columnar format', () => {
      // Create a large array (2000+ items) with short values for columnar mode
      const obj = {
        edges: Array.from({ length: 2100 }, (_, i) => ({
          from: `a${i % 100}`,
          to: `b${i % 100}`,
          type: protecting,
        })),
      };
      
      const encoded = encodeJson(obj, {
        enableShapePool: true,
        columnarThreshold: 2000,
      });
      
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      // Should use columnar format
      const data = encoded.result.data as any;
      expect(data.edges).toBeDefined();
      expect(data.edges.$shape).toBeDefined();
      expect(data.edges.cols).toBeDefined();
      expect(data.edges.rows).toBeUndefined(); // Should not have rows
      
      // Check columnar structure
      expect(data.edges.cols.from).toBeDefined();
      expect(data.edges.cols.to).toBeDefined();
      expect(data.edges.cols.type).toBeDefined();
      expect(Array.isArray(data.edges.cols.from)).toBe(true);
      expect(data.edges.cols.from.length).toBeGreaterThanOrEqual(2100);
    });

    it('should decode columnar format back to arrays', () => {
      const original = {
        edges: Array.from({ length: 2100 }, (_, i) => ({
          from: `a${i % 100}`,
          to: `b${i % 100}`,
          type: 'import',
        })),
      };
      
      const encoded = encodeJson(original, {
        enableShapePool: true,
        columnarThreshold: 2000,
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
      
      const result = decoded.result as typeof original;
      expect(result.edges.length).toBe(original.edges.length);
      expect(result.edges[0]).toEqual(original.edges[0]);
      expect(result.edges[1000]).toEqual(original.edges[1000]);
      expect(result.edges[2099]).toEqual(original.edges[2099]);
    });

    it('should roundtrip columnar format correctly', () => {
      const obj = {
        data: Array.from({ length: 2500 }, (_, i) => ({
          id: i.toString(),
          value: `v${i % 50}`,
          tag: 'test',
        })),
      };
      
      const encoded = encodeJson(obj, {
        enableShapePool: true,
        columnarThreshold: 2000,
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

    it('should use rows format for smaller arrays', () => {
      const obj = {
        edges: Array.from({ length: 15 }, (_, i) => ({
          from: `a${i}`,
          to: `b${i}`,
          type: 'import',
        })),
      };
      
      const encoded = encodeJson(obj, {
        enableShapePool: true,
        columnarThreshold: 2000, // Higher threshold, should use rows
      });
      
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      const data = encoded.result.data as any;
      if (data.edges && typeof data.edges === 'object' && '$shape' in data.edges) {
        // Should use rows, not cols (because n < threshold)
        expect(data.edges.rows).toBeDefined();
        expect(data.edges.cols).toBeUndefined();
      }
    });

    it('should use rows for arrays with long values', () => {
      // Create array with long string values (avgValueLen > 24)
      const obj = {
        items: Array.from({ length: 3000 }, (_, i) => ({
          id: i,
          description: `This is a very long description string for item ${i} that exceeds the average value length threshold`,
        })),
      };
      
      const encoded = encodeJson(obj, {
        enableShapePool: true,
        columnarThreshold: 2000,
      });
      
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      const data = encoded.result.data as any;
      if (data.items && typeof data.items === 'object' && '$shape' in data.items) {
        // Should use rows (because avgValueLen > 24)
        expect(data.items.rows).toBeDefined();
        expect(data.items.cols).toBeUndefined();
      }
    });

    it('should log columnar decision in metadata', () => {
      const obj = {
        edges: Array.from({ length: 2500 }, (_, i) => ({
          from: `a${i % 100}`,
          to: `b${i % 100}`,
          type: 'import',
        })),
      };
      
      const encoded = encodeJson(obj, {
        enableShapePool: true,
        columnarThreshold: 2000,
      });
      
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      const decision = encoded.result.$meta?.decisions?.shapePool;
      if (decision && typeof decision === 'object' && 'mode' in decision) {
        expect((decision as any).mode).toBe('cols');
        expect(encoded.result.$meta?.features?.columnar).toBe(true);
      }
    });

    it('should preserve order in columnar format', () => {
      const original = {
        items: Array.from({ length: 2100 }, (_, i) => ({
          id: i,
          name: `item${i}`,
        })),
      };
      
      const encoded = encodeJson(original, {
        enableShapePool: true,
        columnarThreshold: 2000,
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
      
      const result = decoded.result as typeof original;
      // Verify order is preserved
      for (let i = 0; i < Math.min(100, original.items.length); i++) {
        expect(result.items[i]?.id).toBe(original.items[i]?.id);
        expect(result.items[i]?.name).toBe(original.items[i]?.name);
      }
    });
  });
});

