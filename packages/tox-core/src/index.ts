/**
 * @kb-labs/tox-core
 * Core TOX functionality: normalization, pooling, hashing
 */

export * from './types';
export * from './normalize';
export * from './pool';
export * from './path';
export * from './hash';
export * from './errors';
export * from './limits';
export { ToxErrorCode } from './errors';
export { KeyPool, StringPool } from './pool';
export { PathPool, splitPath, joinPath, isLikelyPath, analyzePaths } from './path';
export type { NormalizeResult } from './normalize';
export type { PathStats } from './path';

import type { ToToxOpts, ToxAST, TokenEstimate } from './types';
import { normalize } from './normalize';
import { estimateTokens as mindEstimateTokens } from '@kb-labs/mind-core';

/**
 * Convert object to TOX AST
 */
export function toToxAST(input: unknown, opts?: ToToxOpts): ToxAST {
  const normalized = normalize(input, opts);
  
  if (normalized.error) {
    throw new Error(`${normalized.error.code}: ${normalized.error.message}`);
  }

  return {
    value: normalized.value as any,
  };
}

/**
 * Convert TOX AST back to object
 */
export function fromToxAST(ast: ToxAST): unknown {
  function resolveValue(value: unknown): unknown {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(resolveValue);
    }

    const obj = value as Record<string, unknown>;
    const resolved: Record<string, unknown> = {};

    // Resolve string pool references
    if (ast.stringPool) {
      for (const [key, val] of Object.entries(obj)) {
        if (typeof val === 'string' && ast.stringPool[val]) {
          resolved[key] = ast.stringPool[val];
        } else {
          resolved[key] = resolveValue(val);
        }
      }
    } else {
      for (const [key, val] of Object.entries(obj)) {
        resolved[key] = resolveValue(val);
      }
    }

    return resolved;
  }

  return resolveValue(ast.value);
}

/**
 * Estimate tokens for JSON and TOX representations
 */
export function estimateTokens(obj: unknown): TokenEstimate {
  const jsonString = JSON.stringify(obj);
  const jsonBytes = Buffer.byteLength(jsonString, 'utf8');
  const jsonTokens = mindEstimateTokens(jsonString);

  // Rough estimate for TOX (assuming 30% compression on average)
  const toxBytes = Math.round(jsonBytes * 0.7);
  const toxString = jsonString.substring(0, Math.floor(jsonString.length * 0.7));
  const toxTokens = mindEstimateTokens(toxString);

  return {
    jsonBytes,
    toxBytes,
    jsonTokens,
    toxTokens,
  };
}

