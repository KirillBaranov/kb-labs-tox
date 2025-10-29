/**
 * Encode object to TOX JSON format
 */

import { normalize, ToxErrorCode, KeyPool, PathPool, analyzePaths, isLikelyPath, splitPath } from '@kb-labs/tox-core';
import type { SchemaVersion } from '@kb-labs/tox-core';

const RESERVED_KEYS = ['$schemaVersion', '$meta', '$dict', '$pathDict', '$valDict', '$shapes', 'data'];

export interface ToxJson {
  $schemaVersion: SchemaVersion;
  $meta: {
    generatedAt: string;
    producer: string;
    preset?: string;
    features?: {
      pathPool?: boolean;
      shapePool?: boolean;
      columnar?: boolean;
      valuePool?: boolean;
    };
    decisions?: {
      pathPool?: {
        enabled: boolean;
        pathsRatio: number;
        avgSegments: number;
        savings?: number;
      };
      shapePool?: {
        enabled: boolean;
        arrayName?: string;
        n: number;
        uniformity: number;
        savings?: number;
      };
      [key: string]: unknown;
    };
    encodeMs?: number;
    decodeMs?: number;
  };
  $dict?: Record<string, string>;
  $pathDict?: Record<string, string>;
  data: unknown;
}

export interface EncodeJsonOptions {
  presetKeys?: string[];
  compact?: boolean;
  strict?: boolean;
  preset?: string;
  debug?: boolean;
  enablePathPool?: boolean | 'auto';
  enableShapePool?: boolean | 'auto';
  enableValuePool?: boolean | 'auto';
  columnarThreshold?: number;
  adaptive?: boolean;
}

export interface EncodeJsonResult {
  ok: boolean;
  code?: ToxErrorCode;
  message?: string;
  hint?: string;
  result?: ToxJson;
}

/**
 * Encode object to TOX JSON
 */
export function encodeJson(
  obj: unknown,
  opts: EncodeJsonOptions = {}
): EncodeJsonResult {
  const {
    presetKeys = [],
    compact = false,
    strict = false,
    preset,
    debug = false,
    enablePathPool = 'auto',
    enableShapePool = 'auto',
    enableValuePool = 'auto',
    columnarThreshold = 2000,
    adaptive = false,
  } = opts;

  try {
    // Normalize object
    const normalized = normalize(obj, {
      sortKeys: true,
      strict,
    });

    if (normalized.error) {
      return {
        ok: false,
        code: normalized.error.code,
        message: normalized.error.message,
        hint: normalized.error.hint,
      };
    }

    // Build key pool
    const keyPool = new KeyPool();

    // Add preset keys first (for stable IDs)
    for (let i = 0; i < presetKeys.length; i++) {
      const key = presetKeys[i]!;
      if (RESERVED_KEYS.includes(key)) {
        if (strict) {
          return {
            ok: false,
            code: ToxErrorCode.STRICT_MODE_VIOLATION,
            message: `Reserved key '${key}' cannot be used in preset`,
            hint: `presetKeys[${i}]`,
          };
        }
        continue;
      }
      keyPool.add(key);
    }

    // Collect keys from normalized object
    const collectKeys = (value: unknown): void => {
      if (value === null || typeof value !== 'object') {
        return;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          collectKeys(item);
        }
        return;
      }

      const obj = value as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (!RESERVED_KEYS.includes(key)) {
          keyPool.add(key);
        }
        collectKeys(obj[key]);
      }
    };

    collectKeys(normalized.value);

    // Build dictionary (sorted by: freq desc → lex asc → full key)
    const dict = keyPool.toDict();

    // Apply compact mode heuristic: only use dict if it's beneficial
    // For small payloads (< 2KB), dictionary overhead often exceeds benefits
    const dictSize = Object.keys(dict).length;
    const dataStr = JSON.stringify(normalized.value);
    const originalDataSize = dataStr.length;
    
    // If compact mode is forced, always use dictionary
    let shouldUseDict = false;
    if (compact && dictSize > 0) {
      shouldUseDict = true;
    } else if (dictSize > 0 && originalDataSize >= 2000) {
      // For payloads >= 2KB, check if dictionary would be beneficial
      // Dictionary overhead: ~150 bytes (meta) + JSON encoding of dict itself
      const dictJsonSize = JSON.stringify(dict).length;
      const baseOverhead = 150; // $schemaVersion + $meta
      const totalOverhead = baseOverhead + dictJsonSize;
      
      // Estimate savings: each key occurrence saves ~3-10 bytes depending on key length
      // Rough heuristic: if dict is < 50% of data size, likely beneficial
      const overheadRatio = totalOverhead / originalDataSize;
      
      // Use dictionary if overhead is reasonable (< 30% of data size)
      // This ensures we don't increase size significantly
      shouldUseDict = overheadRatio < 0.3;
    }
    
    // Final safety: for very small payloads (< 2KB), never use dictionary unless forced
    if (originalDataSize < 2000 && !compact) {
      shouldUseDict = false;
    }

    // PathPool: analyze and build if beneficial
    let pathPool: PathPool | null = null;
    let shouldUsePathPool = false;
    let pathDict: Record<string, string> | undefined = undefined;
    const pathStats = analyzePaths(normalized.value);
    const pathPoolDecision = {
      enabled: false,
      pathsRatio: pathStats.pathsRatio,
      avgSegments: pathStats.avgSegments,
      savings: 0,
    };

    // PathPool heuristic: pathsRatio ≥ 0.15 and avgSegments ≥ 3
    if (
      enablePathPool === true ||
      (enablePathPool === 'auto' && pathStats.pathsRatio >= 0.15 && pathStats.avgSegments >= 3)
    ) {
      pathPool = new PathPool();
      
      // First pass: collect all paths into pool
      const collectPaths = (value: unknown): void => {
        if (value === null || typeof value !== 'object') {
          if (typeof value === 'string' && isLikelyPath(value)) {
            pathPool!.addPath(value);
          }
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(collectPaths);
          return;
        }
        for (const val of Object.values(value)) {
          collectPaths(val);
        }
      };
      collectPaths(normalized.value);
      
      // Build path dictionary
      pathDict = pathPool.toDict();
      
      // Estimate savings: compare segment IDs vs full paths
      // Rough estimate: if pathDict size < 30% of total path strings, beneficial
      const pathDictOverhead = JSON.stringify(pathDict).length;
      const estimatedPathStringsSize = pathStats.pathsCount * 30; // avg 30 chars per path
      const estimatedSegmentIdsSize = pathStats.totalSegments * 3; // avg 3 chars per segment ID like "p1"
      const estimatedSavings = estimatedPathStringsSize - estimatedSegmentIdsSize - pathDictOverhead;
      
      // If forced (enablePathPool === true), always use PathPool
      if (enablePathPool === true) {
        shouldUsePathPool = true;
        pathPoolDecision.enabled = true;
        pathPoolDecision.savings = estimatedSavings;
      } else {
        // Only use if savings > overhead (fail-closed)
        if (estimatedSavings > pathDictOverhead) {
          shouldUsePathPool = true;
          pathPoolDecision.enabled = true;
          pathPoolDecision.savings = estimatedSavings;
        } else {
          pathPoolDecision.savings = estimatedSavings;
        }
      }
    }

    // Replace keys and paths in data with IDs
    const replaceKeys = (value: unknown, path = '<root>'): unknown => {
      if (value === null || typeof value !== 'object') {
        // Replace path strings with segment arrays if PathPool is enabled
        if (typeof value === 'string' && shouldUsePathPool && pathPool && isLikelyPath(value)) {
          // Path was already added to pool in collectPaths, so addPath will return existing IDs
          const segmentIds = pathPool.addPath(value);
          return segmentIds; // Return array of segment IDs
        }
        return value;
      }

      if (Array.isArray(value)) {
        return value.map((item, idx) => replaceKeys(item, `${path}[${idx}]`));
      }

      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        if (RESERVED_KEYS.includes(key)) {
          if (strict) {
            const error = new Error(`Reserved key '${key}' found in data`) as any;
            error.code = ToxErrorCode.STRICT_MODE_VIOLATION;
            error.path = `${path}.${key}`;
            throw error;
          }
          continue;
        }

        const newPath = path === '<root>' ? key : `${path}.${key}`;

        // Only replace if using dict and key is in dictionary
        if (shouldUseDict) {
          const keyId = keyPool.getId(key);
          if (keyId) {
            result[keyId] = replaceKeys(val, newPath);
          } else {
            result[key] = replaceKeys(val, newPath);
          }
        } else {
          result[key] = replaceKeys(val, newPath);
        }
      }

      return result;
    };

    const encodeStartMs = Date.now();
    const data = replaceKeys(normalized.value);
    const encodeMs = Date.now() - encodeStartMs;

    // Build decisions object
    const decisions: Record<string, unknown> = {};
    if (enablePathPool !== false) {
      decisions.pathPool = pathPoolDecision;
    }

    const features: Record<string, boolean> = {};
    if (shouldUsePathPool) features.pathPool = true;

    const result: ToxJson = {
      $schemaVersion: '1.0',
      $meta: {
        generatedAt: new Date().toISOString(),
        producer: `kb-tox@0.1.0`,
        encodeMs: Math.round(encodeMs * 100) / 100,
        ...(preset ? { preset } : {}),
        ...(Object.keys(features).length > 0 ? { features } : {}),
        ...(Object.keys(decisions).length > 0 ? { decisions } : {}),
      },
      ...(shouldUseDict && Object.keys(dict).length > 0 ? { $dict: dict } : {}),
      ...(shouldUsePathPool && pathDict && Object.keys(pathDict).length > 0 ? { $pathDict: pathDict } : {}),
      data,
    };

    return {
      ok: true,
      result,
    };
  } catch (error: any) {
    return {
      ok: false,
      code: error.code || ToxErrorCode.ENCODE_ERROR,
      message: error.message || 'Encoding failed',
      hint: error.path || error.hint,
    };
  }
}

