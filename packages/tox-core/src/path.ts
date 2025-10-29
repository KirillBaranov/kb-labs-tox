/**
 * Path segment pooling for efficient path encoding
 */

import { StringPool } from './pool';

/**
 * Split a path into segments
 * Handles both Unix (/) and Windows (\\) separators
 * Normalizes to forward slashes for consistency
 */
export function splitPath(path: string): string[] {
  if (!path) {
    return [];
  }
  
  // Normalize separators (Windows \ -> Unix /)
  const normalized = path.replace(/\\/g, '/');
  
  // Split by /
  const segments = normalized.split('/').filter((seg) => seg.length > 0);
  
  return segments;
}

/**
 * Join segments back into a path
 * Uses forward slashes (Unix-style) for consistency
 */
export function joinPath(segments: string[]): string {
  if (segments.length === 0) {
    return '';
  }
  
  // Join with forward slashes
  return segments.join('/');
}

/**
 * Check if a string looks like a file path
 * Heuristics:
 * - Contains path separators (/ or \)
 * - Ends with file extension (.ts, .js, .json, .md, etc.)
 * - Matches common path patterns
 */
export function isLikelyPath(str: string): boolean {
  if (typeof str !== 'string' || str.length === 0) {
    return false;
  }
  
  // Contains path separators
  if (str.includes('/') || str.includes('\\')) {
    return true;
  }
  
  // Ends with common file extensions
  if (/\.(ts|js|json|md|tsx|jsx|mjs|cjs|yaml|yml|txt|csv)$/i.test(str)) {
    return true;
  }
  
  // Matches common path-like patterns: packages/name, src/file, dist/bundle
  if (/^(packages|src|dist|lib|test|tests|docs|node_modules|\.kb|apps)\//.test(str)) {
    return true;
  }
  
  return false;
}

/**
 * PathPool for interning path segments
 * Tracks segment frequency for optimal ordering
 */
export class PathPool extends StringPool {
  /**
   * Create segment ID (p1, p2, ...)
   */
  override add(segment: string): string {
    const existing = this.getId(segment);
    if (existing) {
      const entry = (this as any).entries.get(segment);
      if (entry) {
        entry.frequency++;
      }
      return existing;
    }

    const id = `p${(this as any).idCounter++}`;
    (this as any).entries.set(segment, {
      id,
      value: segment,
      frequency: 1,
    });

    return id;
  }

  /**
   * Add a full path by splitting into segments
   * Returns array of segment IDs
   */
  addPath(path: string): string[] {
    const segments = splitPath(path);
    return segments.map((seg) => this.add(seg));
  }

  /**
   * Get path from segment IDs
   */
  getPath(segmentIds: string[]): string {
    const segments = segmentIds.map((id) => this.get(id) || id);
    return joinPath(segments);
  }

  /**
   * Get segment ID array for a path
   */
  getPathIds(path: string): string[] | null {
    const segments = splitPath(path);
    const ids: string[] = [];
    
    for (const seg of segments) {
      const id = this.getId(seg);
      if (!id) {
        return null; // Path contains segments not in pool
      }
      ids.push(id);
    }
    
    return ids;
  }
}

/**
 * Calculate path statistics for heuristic decisions
 */
export interface PathStats {
  pathsCount: number;
  totalStrings: number;
  pathsRatio: number; // pathsCount / totalStrings
  totalSegments: number;
  avgSegments: number; // totalSegments / pathsCount
  uniqueSegments: number;
}

/**
 * Analyze path usage in an object
 */
export function analyzePaths(obj: unknown): PathStats {
  const stats: PathStats = {
    pathsCount: 0,
    totalStrings: 0,
    pathsRatio: 0,
    totalSegments: 0,
    avgSegments: 0,
    uniqueSegments: 0,
  };

  const uniqueSegs = new Set<string>();

  function traverse(value: unknown, key?: string): void {
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'string') {
        stats.totalStrings++;
        if (isLikelyPath(value)) {
          stats.pathsCount++;
          const segments = splitPath(value);
          stats.totalSegments += segments.length;
          segments.forEach((seg) => uniqueSegs.add(seg));
        }
      }
      // Also check keys (for structures like { "path/to.ts": {...} })
      if (key && isLikelyPath(key)) {
        stats.totalStrings++;
        stats.pathsCount++;
        const segments = splitPath(key);
        stats.totalSegments += segments.length;
        segments.forEach((seg) => uniqueSegs.add(seg));
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => traverse(item));
      return;
    }

    for (const [k, val] of Object.entries(value)) {
      if (isLikelyPath(k)) {
        stats.totalStrings++;
        stats.pathsCount++;
        const segments = splitPath(k);
        stats.totalSegments += segments.length;
        segments.forEach((seg) => uniqueSegs.add(seg));
      }
      traverse(val, k);
    }
  }

  traverse(obj);

  stats.pathsRatio = stats.totalStrings > 0 ? stats.pathsCount / stats.totalStrings : 0;
  stats.avgSegments = stats.pathsCount > 0 ? stats.totalSegments / stats.pathsCount : 0;
  stats.uniqueSegments = uniqueSegs.size;

  return stats;
}


