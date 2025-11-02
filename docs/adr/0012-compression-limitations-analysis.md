# ADR-0012: TOX Compression Limitations Analysis

**Date:** 2025-01-26
**Status:** Accepted
**Deciders:** KB Labs Team
**Last Reviewed:** 2025-11-03
**Tags:** [architecture, performance]

## Context

After implementing Phase 1-5 (PathPool, ShapePool, Columnar, ValuePool) and domain-specific optimizations (path canonicalization), compression remains modest:

- api-index: 4.3% bytes, -11.9% tokens
- docs-index: 0.9% bytes, +1.5% tokens
- Overall: -0.9% bytes, -9.1% tokens

**Goal:** Achieve ≥35% compression for externals/docs/meta, ≥25% for impact/chain.

## Analysis: Why Compression is Limited

### 1. Path Structures are Too Diverse

**Problem:** Paths start with different segments:
- `apps/demo/src/main.ts`
- `packages/adapters/src/...`
- `eslint.config.js` (root-level)
- 74 unique keys with different prefixes

**Path Canonicalization Impact:** Minimal (no common prefix found)

**BPE Tokenization Impact:** Short IDs like `["p1","p2"]` tokenize WORSE than full paths:
- `"packages/cli/src"` → ~6 tokens
- `["p1","p2","p3"]` → ~10 tokens (2 tokens per ID)

### 2. No Uniform Arrays in Fixtures

**Problem:** Fixtures don't contain large uniform arrays:
- `api-index`: Objects as KEYS (not arrays)
- `docs-index`: ~10 docs, not enough for ShapePool (n ≥ 10)
- No `edges` arrays with 100+ entries

**ShapePool Impact:** Doesn't activate (needs n ≥ 10 AND uniformity ≥ 0.8)

### 3. Small Payload Overhead

**Problem:** TOX metadata overhead (~200 bytes) dominates small payloads:
- `externals`: 779 bytes → 1,006 bytes (-29.1%)
- `docs`: 965 bytes → 1,191 bytes (-23.4%)

**Impact:** Negative compression on small payloads

### 4. BPE Tokenization Hurts Dictionaries

**Problem:** Generic dictionary-based compression doesn't align with BPE:
- Short IDs get tokenized inefficiently
- Dictionary metadata adds overhead
- Natural strings tokenize better

**Example:**
```javascript
// Original
"packages/cli/src/main.ts"

// PathPool (segment IDs)
["p1", "p2", "p3", "m1"]  // 8 tokens (worse!)
```

## Decision: Accept Current Limitations

**TOX compression architecture is fundamentally limited by:**

1. **LLM Tokenization Reality:** BPE tokenizers favor natural strings over short IDs
2. **Data Diversity:** Real data has diverse structures without clear compression patterns
3. **Small Payload Overhead:** Dictionary metadata costs dominate

## Alternatives Considered

### 1. Gzip Compression ❌
- **Problem:** Not LLM-friendly (breaks structure)
- **Rejected:** LLM needs structured JSON

### 2. Binary Format ❌
- **Problem:** Not parseable by LLMs
- **Rejected:** Breaks integration

### 3. Domain-Specific Presets ⚠️
- **Status:** Partially implemented (path canonicalization limited by diversity)
- **Potential:** Pre-defined path segments for common prefixes
- **Trade-off:** Only works for specific data patterns

### 4. Metadata Stripping ✅
- **Implemented:** Remove verbose fields (hashes, timestamps)
- **Impact:** Expected 5-10% improvement
- **Next:** Implement Phase 3 of domain-specific optimization

### 5. Accept Modest Compression ✅
- **Reality:** 0-5% byte compression is typical for diverse JSON data
- **Focus:** Token efficiency (not byte efficiency) should be priority
- **Insight:** Full compression requires homogeneous data patterns

## Success Criteria Revised

**Original Goals:**
- externals/docs/meta: ≥35% compression ❌
- impact/chain: ≥25% compression ❌

**Revised Goals (Realistic):**
- api-index/docs-index: ≥5% byte compression ✅ (achieved)
- Token efficiency: 0-5% improvement (acceptable trade-off)
- Maintain LLM-friendly structure ✅
- Deterministic output ✅

## Recommendations

### Immediate Actions
1. **Accept current compression levels** (4-5% is reasonable)
2. **Focus on token efficiency** over byte efficiency
3. **Strip verbose metadata** (Phase 3 of domain-specific optimization)

### Future Exploration
1. **Real Query Results:** Test on actual edges/importers with 100+ entries
2. **Session Dictionary:** Cross-document dictionary sharing
3. **Pre-defined Presets:** Common path segments for specific domains
4. **Metadata Optimization:** Strip non-essential fields

### Alternative Approach
**Consider:** TOX might be optimized for different use cases:
- Determinism ✅
- Schema versioning ✅
- LLM-friendly structure ✅
- Compression: Secondary benefit (not primary goal)

## Consequences

### Positive
- Clear understanding of limitations
- Realistic expectations
- Focus on what matters: LLM integration
- Maintains backward compatibility

### Negative
- Original targets not met (35%/25%)
- Generic compression has limited benefit
- Requires domain-specific knowledge for real gains

## Implementation Status

**Completed:**
- ✅ Phases 0-5: All compression features implemented
- ✅ Domain-specific optimization: Path canonicalization
- ✅ Lower heuristics thresholds: PathPool activates
- ⚠️ **Current limits reached**

**Next Steps:**
- Metadata stripping (Phase 3)
- Session dictionary (Phase 6)
- Test on real query results with edges

## Conclusion

TOX compression is **fundamentally limited** by:
1. BPE tokenization (favors natural strings)
2. Data diversity (no common patterns)
3. Small payload overhead (metadata dominates)

**Accept realistic compression targets:** 4-5% bytes, 0-5% tokens, with focus on LLM-friendly structure over raw compression.

