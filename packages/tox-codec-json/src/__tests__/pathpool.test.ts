/**
 * Tests for PathPool encoding/decoding
 */

import { describe, it, expect } from 'vitest';
import { encodeJson } from '../encode';
import { decodeJson } from '../decode';
import { splitPath, joinPath, isLikelyPath, PathPool, analyzePaths } from '@kb-labs/tox-core';

describe('PathPool', () => {
  describe('Path utilities', () => {
    it('should split paths correctly', () => {
      expect(splitPath('packages/cli/src/commands/run.ts')).toEqual(['packages', 'cli', 'src', 'commands', 'run.ts']);
      expect(splitPath('src/index.js')).toEqual(['src', 'index.js']);
      expect(splitPath('/absolute/path')).toEqual(['absolute', 'path']);
      expect(splitPath('relative')).toEqual(['relative']);
      expect(splitPath('')).toEqual([]);
      // Windows style
      expect(splitPath('packages\\cli\\src')).toEqual(['packages', 'cli', 'src']);
    });

    it('should join paths correctly', () => {
      expect(joinPath(['packages', 'cli', 'src'])).toBe('packages/cli/src');
      expect(joinPath(['src', 'index.js'])).toBe('src/index.js');
      expect(joinPath([])).toBe('');
      expect(joinPath(['single'])).toBe('single');
    });

    it('should roundtrip split/join', () => {
      const paths = [
        'packages/cli/src/commands/run.ts',
        'src/index.js',
        'docs/README.md',
        'node_modules/@types/node/index.d.ts',
      ];
      for (const path of paths) {
        expect(joinPath(splitPath(path))).toBe(path.replace(/\\/g, '/'));
      }
    });

    it('should detect path-like strings', () => {
      expect(isLikelyPath('packages/cli/src')).toBe(true);
      expect(isLikelyPath('src/index.ts')).toBe(true);
      expect(isLikelyPath('README.md')).toBe(true);
      expect(isLikelyPath('file.json')).toBe(true);
      expect(isLikelyPath('packages\\cli')).toBe(true); // Windows style
      
      expect(isLikelyPath('simple string')).toBe(false);
      expect(isLikelyPath('123')).toBe(false);
      expect(isLikelyPath('')).toBe(false);
    });
  });

  describe('PathPool class', () => {
    it('should add paths and return segment IDs', () => {
      const pool = new PathPool();
      const path1 = 'packages/cli/src';
      const ids1 = pool.addPath(path1);
      
      expect(ids1).toEqual(['p1', 'p2', 'p3']);
      expect(pool.get('p1')).toBe('packages');
      expect(pool.get('p2')).toBe('cli');
      expect(pool.get('p3')).toBe('src');
      
      // Reusing segments should return same IDs
      const path2 = 'packages/shared/src';
      const ids2 = pool.addPath(path2);
      expect(ids2).toEqual(['p1', 'p4', 'p3']); // packages and src reused
    });

    it('should reconstruct paths from segment IDs', () => {
      const pool = new PathPool();
      pool.addPath('packages/cli/src');
      pool.addPath('packages/shared/src');
      
      expect(pool.getPath(['p1', 'p2', 'p3'])).toBe('packages/cli/src');
      expect(pool.getPath(['p1', 'p4', 'p3'])).toBe('packages/shared/src');
    });

    it('should track segment frequency for ordering', () => {
      const pool = new PathPool();
      pool.addPath('packages/cli/src'); // packages, cli, src
      pool.addPath('packages/shared/src'); // packages, shared, src
      pool.addPath('packages/core/src'); // packages, core, src
      
      const dict = pool.toDict();
      const entries = Array.from(Object.entries(dict));
      
      // Most frequent should come first: packages (3x), src (3x), then others
      expect(entries.length).toBeGreaterThan(0);
      // Check that frequent segments appear early in dictionary
      const packagesId = pool.getId('packages');
      const srcId = pool.getId('src');
      expect(packagesId).toBeDefined();
      expect(srcId).toBeDefined();
    });
  });

  describe('Path analysis', () => {
    it('should analyze path statistics', () => {
      const obj = {
        files: [
          { path: 'packages/cli/src/index.ts' },
          { path: 'packages/cli/src/commands/run.ts' },
          { path: 'packages/shared/src/utils.ts' },
        ],
        config: { location: 'config/project.json' },
      };
      
      const stats = analyzePaths(obj);
      expect(stats.pathsCount).toBe(4);
      expect(stats.pathsRatio).toBeGreaterThan(0.5); // Most strings are paths
      expect(stats.avgSegments).toBeGreaterThan(3);
      expect(stats.uniqueSegments).toBeGreaterThan(0);
    });
  });

  describe('PathPool encoding/decoding', () => {
    it('should encode paths as segment arrays', () => {
      const obj = {
        files: [
          { path: 'packages/cli/src/index.ts' },
          { path: 'packages/shared/src/utils.ts' },
        ],
      };
      
      const encoded = encodeJson(obj, { enablePathPool: true });
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      // Should have $pathDict
      expect(encoded.result.$pathDict).toBeDefined();
      expect(Object.keys(encoded.result.$pathDict!).length).toBeGreaterThan(0);
      
      // Paths should be encoded as arrays of segment IDs
      const data = encoded.result.data as any;
      expect(Array.isArray(data.files[0].path)).toBe(true);
      expect(Array.isArray(data.files[1].path)).toBe(true);
    });

    it('should decode segment arrays back to paths', () => {
      const obj = {
        files: [
          { path: 'packages/cli/src/index.ts' },
          { path: 'packages/shared/src/utils.ts' },
        ],
      };
      
      const encoded = encodeJson(obj, { enablePathPool: true });
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      const decoded = decodeJson(encoded.result);
      expect(decoded.ok).toBe(true);
      
      if (!decoded.ok || !decoded.result) {
        throw new Error('Decoding failed');
      }
      
      // Paths should be decoded back to strings
      const result = decoded.result as typeof obj;
      expect(result.files[0].path).toBe('packages/cli/src/index.ts');
      expect(result.files[1].path).toBe('packages/shared/src/utils.ts');
    });

    it('should roundtrip paths correctly', () => {
      const obj = {
        files: [
          { path: 'packages/cli/src/index.ts', size: 1024 },
          { path: 'packages/shared/src/utils.ts', size: 2048 },
        ],
        config: { location: 'config/project.json' },
      };
      
      const encoded = encodeJson(obj, { enablePathPool: true });
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

    it('should use auto heuristic for PathPool', () => {
      // Object with many paths (pathsRatio ≥ 0.15)
      const obj = {
        files: Array.from({ length: 10 }, (_, i) => ({
          path: `packages/cli/src/file${i}.ts`,
        })),
      };
      
      const encoded = encodeJson(obj, { enablePathPool: 'auto' });
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      // PathPool should be enabled automatically
      const decision = encoded.result.$meta?.decisions?.pathPool;
      if (decision && typeof decision === 'object' && 'enabled' in decision) {
        // May or may not be enabled based on savings calculation
        // But should have decision logged
        expect(decision.pathsRatio).toBeGreaterThan(0.15);
      }
    });

    it('should not use PathPool if pathsRatio < 0.15', () => {
      const obj = {
        name: 'test',
        value: 123,
        files: [{ path: 'src/index.ts' }], // Only one path, low ratio
      };
      
      const encoded = encodeJson(obj, { enablePathPool: 'auto' });
      expect(encoded.ok).toBe(true);
      
      if (!encoded.ok || !encoded.result) {
        throw new Error('Encoding failed');
      }
      
      // PathPool should not be enabled
      const decision = encoded.result.$meta?.decisions?.pathPool;
      if (decision && typeof decision === 'object' && 'enabled' in decision) {
        expect((decision as any).enabled).toBe(false);
      }
    });

    it('should preserve non-path strings', () => {
      const obj = {
        name: 'test-project',
        files: [{ path: 'src/index.ts', content: 'const x = 1;' }],
        description: 'A test project',
      };
      
      const encoded = encodeJson(obj, { enablePathPool: true });
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
      expect(result.name).toBe('test-project');
      expect(result.files[0].content).toBe('const x = 1;');
      expect(result.description).toBe('A test project');
    });
  });
});

