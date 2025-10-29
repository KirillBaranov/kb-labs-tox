/**
 * Shape pool for structural object interning
 */

import { StringPool } from './pool';

/**
 * Derive shape (ordered key list) from an object
 * Keys are sorted lexicographically for consistency
 */
export function deriveShape(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).sort((a, b) => a.localeCompare(b));
}

/**
 * Calculate uniformity (ratio of most common shape to total objects)
 * Returns a value between 0 and 1
 */
export function calculateUniformity(shapes: string[][]): number {
  if (shapes.length === 0) {
    return 1.0;
  }

  // Count shape frequencies
  const shapeCounts = new Map<string, number>();
  for (const shape of shapes) {
    const shapeKey = JSON.stringify(shape);
    const count = shapeCounts.get(shapeKey) || 0;
    shapeCounts.set(shapeKey, count + 1);
  }

  // Find most common shape
  let maxCount = 0;
  for (const count of shapeCounts.values()) {
    maxCount = Math.max(maxCount, count);
  }

  return maxCount / shapes.length;
}

/**
 * ShapePool for interning object shapes
 * Maps shape (ordered key list) to a stable ID
 */
export class ShapePool extends StringPool {
  /**
   * Add a shape and return its ID
   */
  addShape(shape: string[]): string {
    // Use JSON.stringify to create a stable key for the shape
    const shapeKey = JSON.stringify(shape);
    return this.add(shapeKey);
  }

  /**
   * Get shape by ID
   */
  getShape(id: string): string[] | undefined {
    const shapeKey = this.get(id);
    if (!shapeKey) {
      return undefined;
    }
    try {
      return JSON.parse(shapeKey);
    } catch {
      return undefined;
    }
  }

  /**
   * Get ID for a shape (without adding it)
   */
  getShapeId(shape: string[]): string | undefined {
    const shapeKey = JSON.stringify(shape);
    return this.getId(shapeKey);
  }

  /**
   * Create shape ID (s1, s2, ...)
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

    const id = `s${(this as any).idCounter++}`;
    (this as any).entries.set(value, {
      id,
      value,
      frequency: 1,
    });

    return id;
  }

  /**
   * Build shapes dictionary: { "s1": ["from","to","type"], ... }
   */
  toShapesDict(): Record<string, string[]> {
    const dict: Record<string, string[]> = {};
    for (const entry of this.getSortedEntries()) {
      try {
        const shape = JSON.parse(entry.value);
        dict[entry.id] = shape;
      } catch {
        // Skip invalid shapes
      }
    }
    return dict;
  }
}

