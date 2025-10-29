/**
 * Value pool for interning frequently repeating scalar values
 */

import { StringPool } from './pool';

export interface ValuePoolEntry {
  id: string;
  value: unknown;
  frequency: number;
  estimatedSavings: number; // bytes saved per occurrence
}

/**
 * ValuePool for interning scalar values (strings, numbers, booleans)
 */
export class ValuePool {
  private entries = new Map<string, ValuePoolEntry>();
  private idCounter = 1;

  /**
   * Add a value and track frequency
   * Returns the ID if value should be interned, or null if not beneficial
   */
  add(value: unknown): string | null {
    // Only intern scalar values (primitives)
    if (value === null || typeof value === 'function' || typeof value === 'object') {
      return null;
    }

    // Create key for the value
    const key = this.getValueKey(value);

    const existing = this.entries.get(key);
    if (existing) {
      existing.frequency++;
      // Update estimated savings
      const valueSize = this.estimateValueSize(value);
      const idSize = this.estimateIdSize(existing.id);
      existing.estimatedSavings = valueSize - idSize;
      return existing.id;
    }

    // Check if value is worth interning (simple heuristic: strings/numbers longer than 3 chars)
    const valueSize = this.estimateValueSize(value);
    const idSize = 3; // Assume "v1", "v2", etc.
    
    // Only add if value is large enough to benefit from interning
    if (valueSize <= idSize + 1) {
      return null; // Not worth interning
    }

    const id = `v${this.idCounter++}`;
    this.entries.set(key, {
      id,
      value,
      frequency: 1,
      estimatedSavings: valueSize - idSize,
    });

    return id;
  }

  /**
   * Get ID for a value without adding it
   */
  getId(value: unknown): string | null {
    const key = this.getValueKey(value);
    const entry = this.entries.get(key);
    return entry ? entry.id : null;
  }

  /**
   * Get value by ID
   */
  get(id: string): unknown | undefined {
    for (const entry of this.entries.values()) {
      if (entry.id === id) {
        return entry.value;
      }
    }
    return undefined;
  }

  /**
   * Get all entries sorted by frequency (desc) then by value (asc)
   */
  getSortedEntries(): ValuePoolEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => {
      // Sort by frequency (desc), then by value key (asc)
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      return this.getValueKey(a.value).localeCompare(this.getValueKey(b.value));
    });
  }

  /**
   * Build value dictionary for encoding
   * Only includes values that appear frequently enough and save enough bytes
   * @param minFrequency Minimum frequency threshold (default: 8)
   * @param minAvgSavings Minimum average savings per occurrence in bytes (default: 3)
   */
  toDict(minFrequency = 8, minAvgSavings = 3): Record<string, unknown> {
    const dict: Record<string, unknown> = {};
    
    for (const entry of this.getSortedEntries()) {
      // Only include if frequency >= threshold and savings >= minimum
      if (entry.frequency >= minFrequency && entry.estimatedSavings >= minAvgSavings) {
        dict[entry.id] = entry.value;
      }
    }

    return dict;
  }

  /**
   * Get value key for comparison
   */
  private getValueKey(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (typeof value === 'boolean') {
      return `bool:${value}`;
    }
    if (typeof value === 'number') {
      // Handle special numbers
      if (Number.isNaN(value)) {
        return 'number:NaN';
      }
      if (value === Infinity) {
        return 'number:Infinity';
      }
      if (value === -Infinity) {
        return 'number:-Infinity';
      }
      return `number:${value}`;
    }
    if (typeof value === 'string') {
      return `string:${value}`;
    }
      return `unknown:${String(value)}`;
  }

  /**
   * Estimate size of value in JSON
   */
  private estimateValueSize(value: unknown): number {
    if (value === null) {
      return 4; // "null"
    }
    if (typeof value === 'boolean') {
      return value ? 4 : 5; // "true" : "false"
    }
    if (typeof value === 'number') {
      return String(value).length;
    }
    if (typeof value === 'string') {
      // Estimate: string length + 2 for quotes
      return value.length + 2;
    }
    return 10; // Unknown, conservative estimate
  }

  /**
   * Estimate size of ID in JSON
   */
  private estimateIdSize(id: string): number {
    // ID format: "v1", "v2", etc.
    // In JSON: quoted string
    return id.length + 2; // id + quotes
  }
}

