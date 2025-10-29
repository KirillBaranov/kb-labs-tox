/**
 * Path canonicalization utilities for Mind query results
 * Extracts common prefixes to reduce redundancy
 */

/**
 * Find longest common prefix in array of strings
 * Returns directory portion (up to last /) to maximize savings
 */
export function longestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  if (strings.length === 1) {
    const str = strings[0] || '';
    // Return directory portion (up to last /)
    const lastSlash = str.lastIndexOf('/');
    return lastSlash >= 0 ? str.substring(0, lastSlash + 1) : '';
  }

  // Filter paths that don't have / separator (like root-level files)
  const pathLike = strings.filter((s) => s.includes('/'));
  
  if (pathLike.length === 0) return '';
  
  // Sort to ensure consistent results
  const sorted = [...pathLike].sort();
  const first = sorted[0] || '';
  
  // Strategy: Find common leading SEGMENTS, not just characters
  // This handles cases like "apps/" vs "packages/" better
  const segmentArrays = sorted.map((p) => p.split('/'));
  let commonDepth = 0;
  
  while (true) {
    const seg = segmentArrays[0]?.[commonDepth];
    if (!seg) break;
    
    // Check if all paths have same segment at this depth
    const allSame = segmentArrays.every((s) => s[commonDepth] === seg);
    if (!allSame) break;
    
    commonDepth++;
  }
  
  // Build prefix from common segments
  if (commonDepth === 0) {
    return '';
  }
  
  const prefix = segmentArrays[0].slice(0, commonDepth).join('/') + '/';
  return prefix;
}

/**
 * Collect all path-like strings from an object recursively
 */
export function collectAllPaths(obj: unknown, paths: string[] = [], seen = new Set()): string[] {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string' && isLikelyPath(obj)) {
      paths.push(obj);
    }
    return paths;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      collectAllPaths(item, paths, seen);
    }
    return paths;
  }

  // Avoid circular references
  const objId = `${(obj as any).constructor?.name || 'Object'}_${Object.keys(obj).length}`;
  if (seen.has(objId)) {
    return paths;
  }
  seen.add(objId);

  for (const [key, value] of Object.entries(obj)) {
    // Check key itself
    if (isLikelyPath(key)) {
      paths.push(key);
    }
    // Traverse value
    collectAllPaths(value, paths, seen);
  }

  return paths;
}

/**
 * Simple path detection heuristic
 */
function isLikelyPath(str: string): boolean {
  return str.includes('/') || /\.(ts|js|tsx|jsx|json|md|yml|yaml)$/.test(str);
}

/**
 * Transform paths in object by removing common prefix
 */
export function transformPaths(obj: unknown, prefix: string, transformed = new Set()): unknown {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string' && isLikelyPath(obj)) {
      return obj.startsWith(prefix) ? obj.substring(prefix.length) : obj;
    }
    return obj;
  }

  // Avoid circular references
  if (transformed.has(obj as any)) {
    return obj;
  }
  transformed.add(obj as any);

  if (Array.isArray(obj)) {
    return obj.map((item) => transformPaths(item, prefix, transformed));
  }

  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Transform key
    let newKey = key;
    if (isLikelyPath(key) && key.startsWith(prefix)) {
      newKey = key.substring(prefix.length);
    }
    
    // Transform value
    result[newKey] = transformPaths(value, prefix, transformed);
  }

  return result;
}

/**
 * Canonicalize paths in Mind query result data
 * Returns transformed data and prefix metadata
 */
export function canonicalizePaths(result: Record<string, unknown>): {
  data: unknown;
  pathPrefix?: string;
} {
  // Collect all paths
  const allPaths = collectAllPaths(result);
  
  if (allPaths.length === 0) {
    return { data: result };
  }

  // Find common prefix
  const commonPrefix = longestCommonPrefix(allPaths);
  
  if (!commonPrefix || commonPrefix === '') {
    return { data: result };
  }

  // Transform all paths
  const transformed = transformPaths(result, commonPrefix);

  return {
    data: transformed,
    pathPrefix: commonPrefix,
  };
}

