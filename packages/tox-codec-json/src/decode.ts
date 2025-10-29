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
    const valDict = toxJson.$valDict || {};

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
      // Check if this is a ShapePool encoded array: { $shape: "s1", rows: [...] } or { $shape: "s1", cols: {...} }
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const obj = value as Record<string, unknown>;
        if ('$shape' in obj && typeof obj.$shape === 'string') {
          const shapeId = obj.$shape;
          
          // Get shape from dictionary
          const shape = shapesDict[shapeId];
          if (shape) {
            // Check for columnar format (cols)
            if ('cols' in obj && typeof obj.cols === 'object' && obj.cols !== null) {
              const cols = obj.cols as Record<string, unknown[]>;
              
              // Reconstruct array from columns
              // Find maximum length across all columns
              let maxLength = 0;
              for (const colValues of Object.values(cols)) {
                if (Array.isArray(colValues)) {
                  maxLength = Math.max(maxLength, colValues.length);
                }
              }
              
              // Resolve nested values in columns first, then reconstruct
              const resolvedCols: Record<string, unknown[]> = {};
              for (const key of shape) {
                const colValues = cols[key];
                if (Array.isArray(colValues)) {
                  resolvedCols[key] = colValues.map((val) => resolve(val));
                }
              }
              
              // Reconstruct rows from resolved columns
              const reconstructed = [];
              for (let i = 0; i < maxLength; i++) {
                const objRow: Record<string, unknown> = {};
                for (const key of shape) {
                  const colValues = resolvedCols[key];
                  if (Array.isArray(colValues) && i < colValues.length) {
                    objRow[key] = colValues[i];
                  }
                }
                reconstructed.push(objRow);
              }
              return reconstructed;
            }
            
            // Check for row (tuple) format (rows)
            if ('rows' in obj && Array.isArray(obj.rows)) {
              const rows = obj.rows;
              
              // Reconstruct array of objects from shape and tuples
              const reconstructed = rows.map((row) => {
                if (!Array.isArray(row)) {
                  return row;
                }
                const objRow: Record<string, unknown> = {};
                for (let i = 0; i < shape.length; i++) {
                  const key = shape[i]!;
                  objRow[key] = resolve(row[i]);
                }
                return objRow;
              });
              return reconstructed;
            }
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
        // Resolve value ID to actual value if ValuePool is used
        if (typeof value === 'string' && /^v\d+$/.test(value) && valDict[value] !== undefined) {
          return resolve(valDict[value]);
        }
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

