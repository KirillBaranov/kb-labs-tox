/**
 * String pool for interning strings with stable ordering
 */

export interface StringPoolEntry {
  id: string;
  value: string;
  frequency: number;
}

export class StringPool {
  private entries: Map<string, StringPoolEntry> = new Map();
  private idCounter = 1;

  /**
   * Add a string to the pool and return its ID
   */
  add(value: string): string {
    const existing = this.entries.get(value);
    if (existing) {
      existing.frequency++;
      return existing.id;
    }

    const id = `s${this.idCounter++}`;
    this.entries.set(value, {
      id,
      value,
      frequency: 1,
    });

    return id;
  }

  /**
   * Get string value by ID
   */
  get(id: string): string | undefined {
    for (const entry of this.entries.values()) {
      if (entry.id === id) {
        return entry.value;
      }
    }
    return undefined;
  }

  /**
   * Get ID by string value
   */
  getId(value: string): string | undefined {
    return this.entries.get(value)?.id;
  }

  /**
   * Get all entries sorted by: frequency (desc) → lex asc → full key as tie-breaker
   */
  getSortedEntries(): StringPoolEntry[] {
    return Array.from(this.entries.values()).sort((a, b) => {
      // First: frequency descending
      if (b.frequency !== a.frequency) {
        return b.frequency - a.frequency;
      }
      // Second: lexicographic ascending
      const lexCompare = a.value.localeCompare(b.value);
      if (lexCompare !== 0) {
        return lexCompare;
      }
      // Third: full key as tie-breaker (shouldn't happen, but for stability)
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * Build dictionary object: { id: value }
   */
  toDict(): Record<string, string> {
    const dict: Record<string, string> = {};
    for (const entry of this.getSortedEntries()) {
      dict[entry.id] = entry.value;
    }
    return dict;
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.entries.clear();
    this.idCounter = 1;
  }

  /**
   * Get size
   */
  size(): number {
    return this.entries.size;
  }
}

/**
 * Key pool for interning object keys
 */
export class KeyPool extends StringPool {
  /**
   * Create key ID (k1, k2, ...)
   */
  override add(value: string): string {
    const existing = this.getId(value);
    if (existing) {
      const entry = (this as any).entries.get(value);
      if (entry) {
        entry.frequency++;
      }
      return existing;
    }

    const id = `k${(this as any).idCounter++}`;
    (this as any).entries.set(value, {
      id,
      value,
      frequency: 1,
    });

    return id;
  }
}

/**
 * Path pool for interning file paths
 */
export class PathPool extends StringPool {
  /**
   * Create path ID (p1, p2, ...)
   */
  override add(value: string): string {
    const existing = this.getId(value);
    if (existing) {
      const entry = (this as any).entries.get(value);
      if (entry) {
        entry.frequency++;
      }
      return existing;
    }

    const id = `p${(this as any).idCounter++}`;
    (this as any).entries.set(value, {
      id,
      value,
      frequency: 1,
    });

    return id;
  }
}

