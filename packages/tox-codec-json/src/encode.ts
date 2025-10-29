/**
 * Encode object to TOX JSON format
 */

import { normalize, ToxErrorCode, KeyPool } from '@kb-labs/tox-core';
import type { SchemaVersion } from '@kb-labs/tox-core';

const RESERVED_KEYS = ['$schemaVersion', '$meta', '$dict', 'data'];

export interface ToxJson {
  $schemaVersion: SchemaVersion;
  $meta: {
    generatedAt: string;
    producer: string;
    preset?: string;
  };
  $dict?: Record<string, string>;
  data: unknown;
}

export interface EncodeJsonOptions {
  presetKeys?: string[];
  compact?: boolean;
  strict?: boolean;
  preset?: string;
  debug?: boolean;
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
    const dictSize = Object.keys(dict).length;
    const dataStr = JSON.stringify(normalized.value);
    const shouldUseDict = dictSize > 0 && (compact || dictSize <= dataStr.length * 0.5);

    // Replace keys in data with IDs
    const replaceKeys = (value: unknown): unknown => {
      if (value === null || typeof value !== 'object') {
        return value;
      }

      if (Array.isArray(value)) {
        return value.map(replaceKeys);
      }

      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        if (RESERVED_KEYS.includes(key)) {
          if (strict) {
            throw new Error(`Reserved key '${key}' found in data`);
          }
          continue;
        }

        // Only replace if using dict and key is in dictionary
        if (shouldUseDict) {
          const keyId = keyPool.getId(key);
          if (keyId) {
            result[keyId] = replaceKeys(val);
          } else {
            result[key] = replaceKeys(val);
          }
        } else {
          result[key] = replaceKeys(val);
        }
      }

      return result;
    };

    const data = replaceKeys(normalized.value);

    const result: ToxJson = {
      $schemaVersion: '1.0',
      $meta: {
        generatedAt: new Date().toISOString(),
        producer: `kb-tox@0.1.0`,
        ...(preset ? { preset } : {}),
      },
      ...(shouldUseDict && Object.keys(dict).length > 0 ? { $dict: dict } : {}),
      data,
    };

    return {
      ok: true,
      result,
    };
  } catch (error: any) {
    return {
      ok: false,
      code: ToxErrorCode.ENCODE_ERROR,
      message: error.message || 'Encoding failed',
      hint: error.path,
    };
  }
}

