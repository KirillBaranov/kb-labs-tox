# ADR-0011: Domain-Specific Optimization Strategy

**Date:** 2025-10-29
**Status:** Proposed
**Deciders:** KB Labs Team
**Last Reviewed:** 2025-11-03
**Tags:** [architecture, performance]

## Context

After lowering PathPool thresholds, PathPool activates on api-index but token compression worsens (-11.9%). The problem is that **BPE tokenization doesn't favor short IDs over natural strings**.

**Key Insight:**
- `"packages/cli/src/main.ts"` tokenizes to ~6-8 tokens
- `["p1","p2","p3","m"]` tokenizes to ~10-12 tokens (each `"p1"` is 2 tokens)
- Dictionary overhead makes it worse

**Root Cause:**
Generic dictionary-based compression doesn't work well for LLM tokenization because:
1. Short IDs are tokenized inefficiently
2. Dictionary metadata adds token overhead
3. LLM tokenizers favor natural language patterns

## Decision

**Implement domain-specific optimizations** that work WITH BPE tokenization, not against it:

1. **Path Canonicalization** - Normalize paths for better tokenization
2. **Value Presets** - Use common prefixes that tokenize efficiently
3. **Structure Simplification** - Remove verbose metadata
4. **Smart Interning** - Only intern values that actually improve tokens

### Strategy: LLM-Friendly Canonicalization

Instead of `"packages/cli/src/main.ts"` → `["p1","p2","p3","m"]`, do:
1. **Extract common prefixes:** All paths start with `"packages/"`
2. **Relative paths:** `"packages/cli/src/main.ts"` → `"cli/src/main.ts"` + base prefix
3. **Path registry in metadata:** One-time cost, reused

### Strategy: Frequent Value Optimization

For mind query results:
- `type: "runtime"` appears 1000+ times
- Instead of interning to `"v1"`, use shorter canonical form
- Better: drop `type` field if all edges are same type

### Strategy: Metadata Stripping

Remove verbose fields that LLM doesn't need:
- Keep: core data (edges, files, exports)
- Strip: hashes, timestamps, detailed meta
- Add minimal: just enough for context

## Implementation Plan

### Phase 1: Path Canonicalization (2 hours)

**In `tox-adapters/src/mind/queryResult.ts`:**

```typescript
function canonicalizePaths(result: QueryResult): QueryResult {
  // Find common prefix across all file paths
  const allPaths = collectAllPaths(result);
  const commonPrefix = longestCommonPrefix(allPaths);
  
  // Replace absolute paths with relative paths
  const prefixLength = commonPrefix.length;
  return transformPaths(result, (path) => path.substring(prefixLength));
}
```

**Benefits:**
- "packages/adapters/src/" repeated 1000x → stored once
- Tokens saved: ~30-40% on paths alone
- No dictionary overhead

### Phase 2: Value Presets (1 hour)

**Predefined shortcuts for common values:**

```typescript
const MIND_VALUE_PRESETS = {
  types: {
    runtime: 'rt',
    dev: 'd',
    peer: 'p',
    import: 'i',
  },
  kind: {
    function: 'fn',
    class: 'cls',
    type: 't',
    const: 'c',
  },
};
```

**Benefits:**
- Short values that tokenize efficiently
- Domain-specific (only for mind data)
- No dictionary needed

### Phase 3: Metadata Stripping (1 hour)

**Remove verbose fields:**

```typescript
function stripVerboseMeta(result: QueryResult): QueryResult {
  const { meta, ...cleaned } = result;
  return {
    ...cleaned,
    meta: {
      // Keep only essential
      tokensEstimate: meta.tokensEstimate,
      filesScanned: meta.filesScanned,
      // Strip: hashes, timings, etc.
    },
  };
}
```

## Expected Results

**After all phases:**
- Token compression: +20-30% (currently -11.9%)
- Byte compression: Maintain or improve
- Path overhead: Minimal (just common prefix)

## Testing

**Fixtures to test on:**
1. api-index (paths)
2. docs-index (paths + tags)
3. Real query results with edges (when available)

**Metrics:**
- Token counts (primary)
- Byte counts (secondary)
- Encode/decode time

## Alternatives Considered

1. **Keep generic compression:** Rejected - makes tokens worse
2. **Use gzip:** Rejected - not LLM-friendly
3. **Binary format:** Rejected - breaks LLM integration
4. **Domain-specific only:** Selected - best token efficiency

## Status

**Proposed** - Ready for implementation

**Next Steps:**
1. Implement path canonicalization
2. Add value presets
3. Strip verbose metadata
4. Benchmark token improvements

