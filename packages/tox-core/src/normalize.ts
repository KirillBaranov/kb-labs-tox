/**
 * Normalize objects for deterministic TOX encoding
 */

import { createError, ToxErrorCode } from './errors';
import { MAX_DEPTH, MAX_KEYS, MAX_ARRAY_LENGTH } from './limits';
import type { ToToxOpts } from './types';

export interface NormalizeResult {
  value: unknown;
  error?: {
    code: ToxErrorCode;
    message: string;
    hint: string;
  };
}

export function normalize(
  obj: unknown,
  opts: ToToxOpts = {}
): NormalizeResult {
  const {
    sortKeys = true,
    strict = false,
    maxDepth = MAX_DEPTH,
    maxKeys = MAX_KEYS,
    maxArrayLength = MAX_ARRAY_LENGTH,
  } = opts;

  const visited = new WeakSet<object>();
  let keyCount = 0;

  function normalizeValue(value: unknown, path: string, depth: number): { value: unknown; error?: { code: ToxErrorCode; message: string; hint: string } } | unknown {
    // Check depth limit
    if (depth > maxDepth) {
      if (strict) {
        return {
          value: null,
          error: {
            code: ToxErrorCode.LIMIT_EXCEEDED,
            message: `Maximum depth exceeded: ${depth} > ${maxDepth}`,
            hint: path,
          }
        };
      }
      return null;
    }

    // Handle null and undefined
    if (value === null || value === undefined) {
      return null;
    }

    // Handle primitives
    if (typeof value === 'boolean' || typeof value === 'number') {
      // Check for Infinity/NaN
      if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
          if (strict) {
            return {
              value: null,
              error: {
                code: ToxErrorCode.UNSUPPORTED_TYPE,
                message: `Unsupported number value: ${value}`,
                hint: path,
              }
            };
          }
          return null;
        }
      }
      return value;
    }

    if (typeof value === 'string') {
      return value;
    }

    // Handle Date
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle BigInt
    if (typeof value === 'bigint') {
      if (strict) {
        return {
          value: null,
          error: {
            code: ToxErrorCode.UNSUPPORTED_TYPE,
            message: 'BigInt is not supported',
            hint: path,
          }
        };
      }
      return null;
    }

    // Handle Function/Symbol
    if (typeof value === 'function' || typeof value === 'symbol') {
      if (strict) {
        return {
          value: null,
          error: {
            code: ToxErrorCode.UNSUPPORTED_TYPE,
            message: `${typeof value} is not supported`,
            hint: path,
          }
        };
      }
      return null;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length > maxArrayLength) {
        if (strict) {
          return {
            value: null,
            error: {
              code: ToxErrorCode.LIMIT_EXCEEDED,
              message: `Array length ${value.length} exceeds maximum ${maxArrayLength}`,
              hint: path,
            }
          };
        }
        return value.slice(0, maxArrayLength);
      }

      const normalized = value.map((item, index) => {
        const result = normalizeValue(item, `${path}[${index}]`, depth + 1);
        if (result && typeof result === 'object' && 'error' in result) {
          return result;
        }
        return result;
      });

      // Check for errors
      const firstError = normalized.find((r: any) => r && typeof r === 'object' && 'error' in r);
      if (firstError && strict) {
        return firstError;
      }

      return normalized.map((r: any) => {
        if (r && typeof r === 'object' && 'value' in r) {
          return r.value;
        }
        return r;
      });
    }

    // Handle objects
    if (typeof value === 'object') {
      // Check for cycles
      if (visited.has(value)) {
        if (strict) {
          return {
            value: null,
            error: {
              code: ToxErrorCode.UNSUPPORTED_TYPE,
              message: 'Circular reference detected',
              hint: path,
            }
          };
        }
        return null;
      }

      visited.add(value);

      // Handle Map/Set
      if (value instanceof Map || value instanceof Set) {
        if (strict) {
          return {
            value: null,
            error: {
              code: ToxErrorCode.UNSUPPORTED_TYPE,
              message: `${value.constructor.name} is not supported`,
              hint: path,
            }
          };
        }
        return null;
      }

      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);

      // Check key limit
      if (keyCount + keys.length > maxKeys) {
        if (strict) {
          return {
            value: null,
            error: {
              code: ToxErrorCode.LIMIT_EXCEEDED,
              message: `Key count ${keyCount + keys.length} exceeds maximum ${maxKeys}`,
              hint: path,
            }
          };
        }
        // Return partial object
        const result: Record<string, unknown> = {};
        for (const key of keys.slice(0, maxKeys - keyCount)) {
          const normalized = normalizeValue(obj[key]!, `${path}.${key}`, depth + 1);
          if (normalized && typeof normalized === 'object' && 'value' in normalized) {
            result[key] = (normalized as any).value;
          } else {
            result[key] = normalized;
          }
        }
        return result;
      }

      keyCount += keys.length;

      // Sort keys if requested
      const sortedKeys = sortKeys ? keys.sort() : keys;

      const result: Record<string, unknown> = {};
      for (const key of sortedKeys) {
        const normalized = normalizeValue(obj[key]!, `${path}.${key}`, depth + 1);
        
        // Check for errors in strict mode
        if (
          strict &&
          normalized &&
          typeof normalized === 'object' &&
          'error' in normalized
        ) {
          return normalized;
        }

        if (normalized && typeof normalized === 'object' && 'value' in normalized) {
          result[key] = (normalized as any).value;
        } else {
          result[key] = normalized;
        }
      }

      return result;
    }

    return null;
  }

  const result = normalizeValue(obj, '<root>', 0);

  // Check for errors in strict mode
  if (
    strict &&
    result &&
    typeof result === 'object' &&
    'error' in result
  ) {
    return { value: null, error: (result as any).error };
  }

  // Extract value if wrapped (only if it's an error object, not a regular object with 'value' property)
  const value = result && typeof result === 'object' && 'error' in result
    ? (result as any).value
    : result;

  return { value };
}

