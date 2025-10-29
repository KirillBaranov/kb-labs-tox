# ADR-0013: Token Compression Forecast

**Date:** 2025-01-26  
**Status:** Proposed  
**Deciders:** KB Labs Team

## Context

Current TOX implementation achieves modest byte compression (4-5%) but **negative token compression** (-11.9% on api-index). BPE tokenization works against dictionary-based compression strategies.

**Question:** What is the realistic token compression we can achieve?

## Current State

**api-index:**
- JSON: 22,605 bytes, 6,951 tokens
- TOX: 21,636 bytes, 7,779 tokens
- Compression: +4.3% bytes, **-11.9% tokens**

**docs-index:**
- JSON: 23,544 bytes, 6,360 tokens  
- TOX: 23,327 bytes, 6,264 tokens
- Compression: +0.9% bytes, +1.5% tokens

## Root Cause Analysis

### Why PathPool Hurts Tokens

**Example:**
```javascript
// Original
"packages/cli/src/main.ts"  // ~7 tokens (natural string)

// With PathPool (segment IDs)
["p1","p2","p3","m1"]  // ~10 tokens (2 tokens per ID)
```

**Problem:** Short IDs like `"p1"` tokenize to 2 BPE tokens each, while natural strings tokenize more efficiently.

### Why Generics Don't Work

1. **Dictionary Overhead:** Metadata in `$meta`, `$dict`, `$pathDict` adds tokens
2. **Inefficient IDs:** Short strings tokenize worse than natural language
3. **Missing Patterns:** Fixtures lack homogeneous arrays for ShapePool

## Forecast: Token Compression Strategies

### Strategy 1: Metadata Stripping (High Impact)

**Remove verbose fields:**
- `meta.sha256`, `meta.timingMs`, `meta.depsHash`, `meta.apiHash`
- Keep only: `meta.tokensEstimate`, `meta.filesScanned`

**Expected Improvement:** +5-10% tokens

**Rationale:** Metadata is verbose and doesn't help LLM understand content.

### Strategy 2: Domain-Specific Aggressive Optimization

**For mind query results:**
- Strip non-essential fields (hashes, timestamps, IDs)
- Use shorter canonical forms (e.g., `type: "runtime"` → `t: "r"`)
- Remove duplicated information

**Expected Improvement:** +10-15% tokens

**Rationale:** LLM doesn't need implementation details, only semantic content.

### Strategy 3: Structural Simplification

**Collapse redundant structure:**
- Remove wrapper objects when not needed
- Flatten nested structures where possible
- Eliminate redundant key repetition

**Expected Improvement:** +5-10% tokens

**Rationale:** Simpler structure = fewer JSON syntax tokens.

### Strategy 4: Path Canonicalization (Conditional)

**If common prefix exists:**
- Extract prefix to metadata
- Use relative paths in data

**Expected Improvement:** +10-20% tokens (only if common prefix found)

**Limitation:** Our current fixtures have no common prefix.

## Realistic Forecast

### Conservative Estimate

**api-index (current -11.9% tokens):**
- Metadata stripping: +5%
- Domain-specific optimization: +10%
- Structural simplification: +5%
- **Net: +20%** (from -11.9% → **+8% positive compression**)

**docs-index (current +1.5% tokens):**
- Same optimizations
- **Net: +15-20%** (from +1.5% → **+17-21% compression**)

### Optimistic Estimate

**With all optimizations:**
- api-index: **+10-15% token compression** (vs -11.9% current)
- docs-index: **+20-25% token compression** (vs +1.5% current)
- Overall: **+15-20% token compression**

### Realistic Target (Accounting for BPE Reality)

**Accept that TOX has fundamental limitations:**

1. **BPE favors natural strings** - short IDs tokenize worse
2. **Data diversity** - no common patterns to exploit
3. **Metadata overhead** - dictionary dictionaries add cost

**Realistic forecast:**
- api-index: **+5-10%** token compression (vs -11.9%)
- docs-index: **+10-15%** token compression (vs +1.5%)
- Overall: **+8-12%** token compression

**Acceptance:** Better than current, but not 35% target.

## Implementation Plan

### Phase 1: Metadata Stripping (1-2 hours)
**Impact:** +5-10% tokens
- Remove hashes, timings, verbose meta
- Keep only essential fields

### Phase 2: Domain-Specific Optimization (2-3 hours)  
**Impact:** +10-15% tokens
- Aggressive field shortening for mind data
- Preset values for common types
- Remove redundant information

### Phase 3: Structural Simplification (1-2 hours)
**Impact:** +5% tokens
- Flatten nested structures
- Remove wrapper objects

### Phase 4: Path Canonicalization (Deferred)
**Impact:** +10-20% (only if common prefix)
- Current fixtures have no common prefix
- Defer until we have better test data

## Expected Results

After phases 1-3:

| Fixture | Current Tokens | Target Tokens | Improvement |
|---------|---------------|---------------|-------------|
| api-index | -11.9% | +5-10% | **+17-22%** |
| docs-index | +1.5% | +10-15% | **+8-13%** |
| **Overall** | **-9.1%** | **+8-12%** | **+17-21%** |

## Success Criteria

**Minimum Acceptable:**
- api-index: ≥ +5% token compression (currently -11.9%)
- docs-index: ≥ +10% token compression (currently +1.5%)
- Overall: ≥ +8% token compression (currently -9.1%)

**Stretch Goal:**
- Overall: ≥ +15% token compression
- api-index: ≥ +10% token compression
- docs-index: ≥ +20% token compression

## Conclusion

**Forecast:** With metadata stripping, domain-specific optimization, and structural simplification, we can achieve **+8-12% token compression** (realistic) or **+15-20%** (optimistic).

**Key Insight:** TOX's value is **not raw compression** but:
1. Deterministic output
2. Schema versioning
3. LLM-friendly structure
4. Modest compression as bonus feature

**Decision:** Focus on token efficiency (not byte efficiency) and accept that 35% compression is unrealistic for diverse JSON data with BPE tokenizers.

