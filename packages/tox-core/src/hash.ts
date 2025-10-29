/**
 * Hash function for TOX normalization
 */

import { createHash } from 'node:crypto';
import { normalize } from './normalize.js';

/**
 * Create SHA256 hash of normalized object
 */
export function hash(obj: unknown): string {
  const normalized = normalize(obj, { sortKeys: true });
  const json = JSON.stringify(normalized.value);
  return createHash('sha256').update(json).digest('hex');
}

