# ADR-0010: LLM-First Compression Strategy

**Date:** 2025-01-26  
**Status:** Proposed  
**Deciders:** KB Labs Team

## Context

TOX's primary use case is passing data to LLMs via context windows. Current compression features (PathPool, ShapePool, etc.) focus on byte compression, but **token efficiency is more important than byte efficiency** for LLM consumption.

**Key Insight:** LLMs use tokenizers (BPE/WordPiece) that tokenize on sub-word boundaries. Short common strings like `"from"`, `"to"`, `"type"` tokenize to 1-2 tokens, while repetitive long strings like file paths tokenize inefficiently.

**Current Problem:**
- Generic PathPool/ShapePool activations thresholds too conservative
- Real mind query results don't trigger heuristics (no large uniform arrays)
- Token compression negative (-11%) even when byte compression positive (+4%)

## Decision

**Prioritize token efficiency over byte efficiency** for mind query results:

1. **Lower heuristic thresholds** for domain-specific patterns (mind queries)
2. **Domain-specific optimizations** in `tox-adapters` for mind structures
3. **Session dictionary** for cross-query dictionary reuse
4. **Token-aware compression** that considers BPE tokenization costs

## Strategy

### Phase A: Lower Generic Thresholds (Quick Win)

Current thresholds too strict:
- PathPool: `pathsRatio ≥ 15%` AND `avgSegments ≥ 3` → **Too strict**
- ShapePool: `n ≥ 10` AND `uniformity ≥ 0.8` → **Too strict**

**Proposed:**
- PathPool: `pathsRatio ≥ 3%` OR `(uniquePaths > 50 AND avgSegments ≥ 2)`
- ShapePool: `n ≥ 3` AND `uniformity ≥ 0.5` (allow partial matches)

**Expected Impact:** PathPool activates on `api-index` and `docs-index`

### Phase B: Domain-Specific Optimization (High Impact)

**Mind Adapter Aggressive Mode:**

```typescript
// Current: generic optimization
encodeJson(queryResult)

// Proposed: domain-aware
encodeJson(queryResult, {
  aggressive: true,  // Mind-specific optimization
  pathPreset: 'mind-v1'  // Pre-defined path segments
})
```

**Optimizations:**
1. **Predefined path segments:** `"packages/"` → `p0`, `"src/"` → `p1`, `"/ts"` → `t0`
2. **Typed structure detection:** auto-detect `edges`, `importers` patterns
3. **Value aliasing:** `"runtime"` → `r`, `"dev"` → `d`, `"import"` → `i`
4. **Metadata stripping:** Remove verbose meta fields for LLM

### Phase C: Session Dictionary (Cross-Document)

**Problem:** Each query result encodes its own dictionary (overhead)

**Solution:** Share dictionaries across related queries:
- `externals` query → base dict
- `docs` query → reuse + add to dict
- `meta` query → reuse + add to dict

**Format:**
```json
{
  "$session": {
    "id": "sess-abc123",
    "generatedAt": "2025-01-26T...",
    "dictionaries": {
      "keys": {"k1": "edges", ...},
      "paths": {"p1": "packages", ...},
      "values": {"v1": "runtime", ...}
    }
  }
}
```

### Phase D: Token-Aware Compression

**Future:** Consider BPE tokenization costs when deciding compression:

```typescript
// Instead of: save bytes
if (bytesSaved > dictOverhead) { enable = true }

// Do: save tokens
if (tokensSaved > 3) { enable = true }  // Tokens cost more than bytes
```

## Implementation Plan

### Step 1: Lower Thresholds (30 min)
- Update `encode.ts` heuristic logic
- Test on `api-index` / `docs-index`
- Verify PathPool activation

### Step 2: Mind Adapter Enhancements (2 hours)
- Add aggressive mode to `toToxQueryResult`
- Predefined path segment dictionaries
- Value aliasing for common values

### Step 3: Session Dictionary (1 hour)
- Implement session pool in `tox-codec-json`
- Export/import session state
- Integration in mind-cli for multi-query scenarios

## Success Criteria

**Token Compression Targets:**
- api-index: tokens ≥ 10% (currently -11%)
- docs-index: tokens ≥ 5% (currently +1.5%)
- query results with edges: tokens ≥ 25%
- Overall: tokens ≥ 15%

**Byte Compression:**
- Can be lower priority, but positive on large payloads
- Accept negative on small payloads (< 2KB) if tokens saved

## Consequences

### Positive
- Better token efficiency for LLM consumption
- Lower cost and latency for AI queries
- Domain-specific optimizations yield higher gains

### Negative
- Generic compression slightly less effective
- More complex heuristics (but more accurate)
- Need session state management

### Alternatives Considered
- Binary format: Rejected (not LLM-friendly)
- Gzip: Rejected (loses structure)
- Keep current thresholds: Rejected (doesn't meet targets)

## Status

**Proposed** - Ready for implementation

**Next Steps:**
1. Implement lower thresholds (Step 1)
2. Enhance mind adapter (Step 2)
3. Add session dictionary (Step 3)
4. Benchmark token compression improvements

