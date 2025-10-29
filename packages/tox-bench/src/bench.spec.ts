/**
 * Benchmark tests for TOX
 */

import { describe, it, expect } from 'vitest';
import { encodeJson, decodeJson } from '@kb-labs/tox-codec-json';

describe('TOX Benchmarks', () => {
  // Mock fixtures - in real implementation these would be loaded from files
  const mockExternals = {
    externals: {
      '@kb-labs/core': ['package1', 'package2'],
      '@kb-labs/shared': ['package3'],
    },
    count: 2,
  };

  const mockDocs = {
    docs: [
      { path: 'docs/spec.md', title: 'Spec', type: 'spec' },
      { path: 'docs/api.md', title: 'API', type: 'api' },
    ],
    count: 2,
  };

  const mockMeta = {
    project: 'test-project',
    products: [
      { id: 'product1', name: 'Product 1' },
      { id: 'product2', name: 'Product 2' },
    ],
    generatedAt: new Date().toISOString(),
  };

  const mockImpact = {
    importers: [
      { file: 'a.ts', imports: ['b.ts'], relevance: 0.9 },
      { file: 'c.ts', imports: ['d.ts'], relevance: 0.8 },
    ],
    count: 2,
  };

  const mockChain = {
    levels: [
      { depth: 1, files: ['a.ts', 'b.ts'] },
      { depth: 2, files: ['c.ts'] },
    ],
    visited: 3,
  };

  it('should encode and decode externals correctly', () => {
    const encoded = encodeJson(mockExternals, { compact: true });
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    // Roundtrip should preserve data
    expect(decoded.result).toEqual(mockExternals);

    // Note: Compression ratio test requires real fixtures with substantial size
    // Mock fixtures are too small to benefit from dictionary compression
  });

  it('should encode and decode docs correctly', () => {
    const encoded = encodeJson(mockDocs, { compact: true });
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual(mockDocs);
  });

  it('should encode and decode meta correctly', () => {
    const encoded = encodeJson(mockMeta, { compact: true });
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual(mockMeta);
  });

  it('should encode and decode impact correctly', () => {
    const encoded = encodeJson(mockImpact, { compact: true });
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual(mockImpact);
  });

  it('should encode and decode chain correctly', () => {
    const encoded = encodeJson(mockChain, { compact: true });
    
    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);
    
    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    expect(decoded.result).toEqual(mockChain);
  });

  it('should decode encoded data correctly (roundtrip)', () => {
    const fixture = {
      edges: [
        { from: 'a.ts', to: 'b.ts', type: 'import' },
        { from: 'b.ts', to: 'c.ts', type: 'import' },
      ],
      count: 2,
    };

    const encoded = encodeJson(fixture, { compact: true });
    expect(encoded.ok).toBe(true);

    if (!encoded.ok || !encoded.result) {
      throw new Error('Encoding failed');
    }

    const decoded = decodeJson(encoded.result);
    expect(decoded.ok).toBe(true);

    if (!decoded.ok || !decoded.result) {
      throw new Error('Decoding failed');
    }

    // Roundtrip should preserve data
    expect(decoded.result).toEqual(fixture);
  });
});


