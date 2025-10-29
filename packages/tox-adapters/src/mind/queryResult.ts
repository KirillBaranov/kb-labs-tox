/**
 * Adapter for Mind QueryResult to TOX format
 */

import type { QueryResult } from '@kb-labs/mind-types';
import { encodeJson, type ToxJson } from '@kb-labs/tox-codec-json';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { canonicalizePaths } from './path-canonicalization';

const DEFAULT_PRESET_KEYS = [
  'edges',
  'from',
  'to',
  'type',
  'importers',
  'externals',
  'exports',
  'file',
  'package',
  'count',
  'summary',
  'paths',
  'meta',
  'query',
  'params',
  'result',
];

export interface ToToxQueryResultOptions {
  preset?: string;
  compact?: boolean;
  strict?: boolean;
  aggressive?: boolean; // Domain-specific optimizations (LLM-friendly)
  canonicalizePaths?: boolean; // Extract common path prefixes
}

/**
 * Convert Mind QueryResult to TOX JSON
 */
export function toToxQueryResult(
  result: QueryResult,
  opts: ToToxQueryResultOptions = {}
): { ok: boolean; code?: string; message?: string; result?: ToxJson } {
  const { 
    preset = 'mind-v1', 
    compact = false, 
    strict = false,
    aggressive = false,
    canonicalizePaths: shouldCanonicalize = aggressive || false,
  } = opts;

  // Load preset keys
  let presetKeys = DEFAULT_PRESET_KEYS;
  if (preset === 'mind-v1') {
    // Use default preset keys (file loading can be added later if needed)
    presetKeys = DEFAULT_PRESET_KEYS;
  } else if (preset && preset !== 'mind-v1') {
    // Try to load custom preset file
    try {
      const presetPath = resolve(preset);
      const presetData = JSON.parse(readFileSync(presetPath, 'utf-8'));
      presetKeys = Array.isArray(presetData) ? presetData : DEFAULT_PRESET_KEYS;
    } catch {
      // Use default if preset file not found
      presetKeys = DEFAULT_PRESET_KEYS;
    }
  }

  // Sort special arrays for determinism
  const sortedResult = sortSpecialArrays(result);

  // Apply domain-specific optimizations if aggressive mode
  let dataToEncode: any = sortedResult;
  let pathPrefix: string | undefined;
  
  if (shouldCanonicalize && sortedResult.result) {
    const { data, pathPrefix: prefix } = canonicalizePaths(sortedResult.result as Record<string, unknown>);
    dataToEncode = { ...sortedResult, result: data };
    pathPrefix = prefix;
  }

  // Encode
  const encoded = encodeJson(dataToEncode, {
    presetKeys,
    compact,
    strict,
    preset: preset === 'mind-v1' ? 'mind-v1' : undefined,
  });

  // Add path prefix to metadata if canonicalized
  if (encoded.ok && encoded.result && pathPrefix) {
    if (!encoded.result.$meta) {
      encoded.result.$meta = {} as any;
    }
    (encoded.result.$meta as any).pathPrefix = pathPrefix;
  }

  return encoded;
}

/**
 * Sort special arrays for determinism
 */
function sortSpecialArrays(result: QueryResult): QueryResult {
  const sorted = { ...result };

  if (sorted.result && typeof sorted.result === 'object') {
    const res = sorted.result as any;

    // Sort edges: (from, to, type)
    if (Array.isArray(res.edges)) {
      res.edges = res.edges.sort((a: any, b: any) => {
        if (a.from !== b.from) return a.from.localeCompare(b.from);
        if (a.to !== b.to) return a.to.localeCompare(b.to);
        return (a.type || '').localeCompare(b.type || '');
      });
    }

    // Sort importers: (file)
    if (Array.isArray(res.importers)) {
      res.importers = res.importers.sort((a: any, b: any) => {
        return (a.file || '').localeCompare(b.file || '');
      });
    }

    // Sort externals: by package key
    if (res.externals && typeof res.externals === 'object') {
      const externals = res.externals as Record<string, string[]>;
      const sortedExternals: Record<string, string[]> = {};
      for (const key of Object.keys(externals).sort()) {
        sortedExternals[key] = externals[key]!.sort();
      }
      res.externals = sortedExternals;
    }
  }

  return sorted;
}

/**
 * Convert TOX JSON back to Mind QueryResult
 */
export async function fromToxQueryResult(tox: ToxJson): Promise<QueryResult> {
  const { decodeJson } = await import('@kb-labs/tox-codec-json');
  const decoded = decodeJson(tox);
  
  if (!decoded.ok || !decoded.result) {
    throw new Error(decoded.message || 'Decoding failed');
  }

  return decoded.result as QueryResult;
}

