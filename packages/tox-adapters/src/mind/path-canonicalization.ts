/**
 * Path canonicalization utilities for Mind query results
 * Extracts common prefixes to reduce redundancy
 */

/**
 * Find longest common prefix in array of strings
 */
export function longestCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  if (strings.length === 1) {
    const str = strings[0] || '';
    // Return directory portion (up to last /)
    const lastSlash = str.lastIndexOf('/');
    return lastSlash >= 0 ? str.substring(0, lastSlash + 1) : '';
  }

  // Sort to ensure consistent results
  const sorted = [...strings].sort();
  const first = sorted[0] || '';
  const last = sorted[sorted.length - 1] || '';
  
  let i = 0;
  while (i < first.length && i < last.length && first[i] === last[i]) {
    i++;
  }
  
  // Return directory portion (up to last /)
  const prefix = first.substring(0, i);
  const lastSlash = prefix.lastIndexOf('/');
  return lastSlash >= 0 ? prefix.substring(0, lastSlash + 1) : '';
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

