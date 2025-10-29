/**
 * Decode TOX JSON format to object
 */

import { ToxErrorCode, PathPool, joinPath } from '@kb-labs/tox-core';
import type { ToxJson } from './encode';

export interface DecodeJsonResult {
  ok: boolean;
  code?: ToxErrorCode;
  message?: string;
  hint?: string;
  result?: unknown;
}

/**
 * Decode TOX JSON to object
 */
export function decodeJson(toxJson: ToxJson, strict = false): DecodeJsonResult {
  try {
    // Validate schema version
    if (toxJson.$schemaVersion !== '1.0') {
      return {
        ok: false,
        code: ToxErrorCode.INCOMPATIBLE_VERSION,
        message: `Unsupported schema version: ${toxJson.$schemaVersion}`,
        hint: '$schemaVersion',
      };
    }

    // Get dictionaries
    const dict = toxJson.$dict || {};
    const pathDict = toxJson.$pathDict || {};
    const shapesDict = toxJson.$shapes || {};

    // Build PathPool for path reconstruction
    const pathPool = new PathPool();
    for (const [id, segment] of Object.entries(pathDict)) {
      pathPool.add(segment);
      // Map ID back to segment (PathPool uses its own IDs, so we need manual mapping)
      (pathPool as any).entries.set(segment, { id, value: segment, frequency: 0 });
    }

    // Helper to reconstruct path from segment IDs array
    const reconstructPath = (segmentIds: string[]): string => {
      const segments = segmentIds.map((id) => pathDict[id] || id);
      return joinPath(segments);
    };

    // Resolve keys, paths, shapes, and values
    function resolve(value: unknown): unknown {
      // Check if this is a ShapePool encoded array: { $shape: "s1", rows: [...] }
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        if ('$shape' in obj && 'rows' in obj && typeof obj.$shape === 'string') {
          const shapeId = obj.$shape;
          const rows = obj.rows;
          
          // Get shape from dictionary
          const shape = shapesDict[shapeId];
          if (shape && Array.isArray(rows)) {
            // Reconstruct array of objects from shape and tuples
            const reconstructed = rows.map((row) => {
              if (!Array.isArray(row)) {
                return row;
              }
              const obj: Record<string, unknown> = {};
              for (let i = 0; i < shape.length; i++) {
                const key = shape[i]!;
                obj[key] = resolve(row[i]);
              }
              return obj;
            });
            return reconstructed;
          }
        }
      }

      // Check if this is a path segment array (array of strings matching pathDict IDs)
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        // Check if all items look like segment IDs (start with 'p' followed by digits)
        const allAreSegmentIds = value.every((item) => typeof item === 'string' && /^p\d+$/.test(item));
        if (allAreSegmentIds && Object.keys(pathDict).length > 0) {
          // Try to reconstruct path
          const reconstructed = reconstructPath(value as string[]);
          // If reconstruction succeeded (all segments found), return path string
          if (reconstructed.split('/').every((seg) => seg.length > 0 || value.length === 1)) {
            return reconstructed;
          }
        }
        // Otherwise, resolve array items normally
        return value.map(resolve);
      }

      if (value === null || typeof value !== 'object') {
        return value;
      }

      if (Array.isArray(value)) {
        return value.map(resolve);
      }

      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(obj)) {
        // Resolve key ID back to original key
        let originalKey = key;
        if (dict[key]) {
          originalKey = dict[key];
        }

        result[originalKey] = resolve(val);
      }

      return result;
    }

    const result = resolve(toxJson.data);

    return {
      ok: true,
      result,
    };
  } catch (error: any) {
    return {
      ok: false,
      code: ToxErrorCode.DECODE_ERROR,
      message: error.message || 'Decoding failed',
      hint: error.path,
    };
  }
}

