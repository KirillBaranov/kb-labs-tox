/**
 * Decode TOX JSON format to object
 */

import { ToxErrorCode } from '@kb-labs/tox-core';
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

    // Get dictionary
    const dict = toxJson.$dict || {};

    // Resolve keys and values
    function resolve(value: unknown): unknown {
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

