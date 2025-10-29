/**
 * Tests for TOX adapters
 */

import { describe, it, expect } from 'vitest';
import { toToxQueryResult, fromToxQueryResult } from '../mind/queryResult';
import type { QueryResult } from '@kb-labs/mind-types';

describe('toToxQueryResult / fromToxQueryResult', () => {
  it('should convert QueryResult to TOX and back', async () => {
    const queryResult: QueryResult = {
      ok: true,
      code: null,
      query: 'impact',
      params: { file: 'src/index.ts' },
      result: {
        importers: [
          { file: 'a.ts', imports: ['b.ts'] },
          { file: 'c.ts', imports: ['d.ts'] },
        ],
        count: 2,
      },
      schemaVersion: '1.0',
      meta: {
        cwd: '/test',
        queryId: 'test-123',
        tokensEstimate: 100,
        cached: false,
        filesScanned: 2,
        edgesTouched: 0,
        depsHash: 'abc',
        apiHash: 'def',
        timingMs: { load: 10, filter: 20, total: 30 },
      },
    };

    const encoded = toToxQueryResult(queryResult);
    expect(encoded.ok).toBe(true);
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = await fromToxQueryResult(encoded.result);
    
    // Compare structure (some fields may differ due to normalization)
    expect(decoded.query).toBe(queryResult.query);
    expect(decoded.result).toBeDefined();
    if (decoded.result && typeof decoded.result === 'object') {
      const result = decoded.result as any;
      expect(result.importers).toBeDefined();
      expect(result.count).toBe(2);
    }
  });

  it('should sort edges for determinism', () => {
    const queryResult: QueryResult = {
      ok: true,
      code: null,
      query: 'scope',
      params: {},
      result: {
        edges: [
          { from: 'z.ts', to: 'b.ts', type: 'import' },
          { from: 'a.ts', to: 'b.ts', type: 'import' },
        ],
        count: 2,
      },
      schemaVersion: '1.0',
      meta: {
        cwd: '/test',
        queryId: 'test-123',
        tokensEstimate: 100,
        cached: false,
        filesScanned: 0,
        edgesTouched: 0,
        depsHash: 'abc',
        apiHash: 'def',
        timingMs: { load: 10, filter: 20, total: 30 },
      },
    };

    const encoded1 = toToxQueryResult(queryResult);
    const encoded2 = toToxQueryResult(queryResult);
    
    expect(encoded1.ok).toBe(true);
    expect(encoded2.ok).toBe(true);
    
    if (!encoded1.ok || !encoded1.result || !encoded2.ok || !encoded2.result) {
      throw new Error('Encoding failed');
    }

    // Compare without $meta.generatedAt (timestamp changes between encodes)
    const result1 = { ...encoded1.result, $meta: { ...encoded1.result.$meta, generatedAt: 'fixed' } };
    const result2 = { ...encoded2.result, $meta: { ...encoded2.result.$meta, generatedAt: 'fixed' } };
    
    const json1 = JSON.stringify(result1);
    const json2 = JSON.stringify(result2);
    expect(json1).toBe(json2);
  });
});

