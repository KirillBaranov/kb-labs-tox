# ADR-0014: Consider TOON as Alternative to TOX

**Date:** 2025-01-26  
**Status:** Proposed  
**Deciders:** KB Labs Team

## Context

TOX implementation achieves **negative token compression** (-11.9% on api-index) after implementing Phases 0-5. The package doesn't solve the stated problem (LLM token efficiency) and actually makes it worse.

Meanwhile, `@byjohann/toon` (TOON - Token-Oriented Object Notation) achieves **30-60% token reduction** according to their benchmarks.

## TOON Overview

### What TOON Does

TOON (Token-Oriented Object Notation) combines YAML indentation with CSV tabular format:

**JSON:**
```json
{
  "users": [
    { "id": 1, "name": "Alice", "role": "admin" },
    { "id": 2, "name": "Bob", "role": "user" }
  ]
}
```

**TOON:**
```
users[2]{id,name,role}:
  1,Alice,admin
  2,Bob,user
```

### Key Features

1. **Array Length Declaration:** `[2]` tells LLM how many items
2. **Field List:** `{id,name,role}` declares schema once
3. **Tabular Rows:** Values only, no key repetition
4. **Minimal Syntax:** No quotes, braces, brackets (except where needed)

### Benefits

- **Token-efficient:** 30-60% fewer tokens than JSON
- **LLM-friendly:** Explicit structure helps models understand data
- **Self-documenting:** Array lengths and field lists provide validation
- **Tabular format:** Especially efficient for uniform object arrays

## Comparison: TOX vs TOON

### TOX (Current Implementation)

**Pros:**
- Deterministic output with unique hash
- Schema versioning
- Dictionary-based compression (PathPool, ShapePool, etc.)
- Cross-document dictionary sharing

**Cons:**
- **Negative token compression** (-11.9% on api-index)
- BPE tokenization works against dictionaries
- Complex implementation (Phases 0-5)
- Generic approach doesn't fit Mind data

### TOON

**Pros:**
- **30-60% token reduction** (proven benchmarks)
- Simple YAML+CSV approach
- LLM-friendly explicit structure
- Tabular format optimal for uniform objects
- Lightweight implementation

**Cons:**
- Different format (not JSON-compatible)
- Less suitable for non-uniform data
- No schema versioning
- No cross-document features

## Recommendations

### Option 1: Replace TOX with TOON (Recommended)

**Action:**
- Use `@byjohann/toon` for Mind query results
- Keep TOX for other use cases (determinism, versioning)

**Benefits:**
- Immediate 30-60% token savings
- Simpler implementation
- Proven to work with LLMs

**Trade-offs:**
- Different format (requires LLM prompt adjustments)
- Less deterministic (no hash)
- No schema versioning

### Option 2: Hybrid Approach

**Action:**
- Use TOON for LLM input (query results)
- Keep TOX for internal storage (caching, versioning)

**Benefits:**
- Best of both worlds
- LLM gets token-efficient format
- Storage gets deterministic format

### Option 3: Keep TOX, Accept Limitations

**Action:**
- Don't use TOX for production LLM queries
- Keep TOX for future improvements
- Focus on other optimizations (pagination, field selection)

## Testing Plan

### Test TOON on Real Data

1. Install `@byjohann/toon`
2. Convert Mind query results to TOON
3. Measure token count improvements
4. Test LLM comprehension with TOON format

### Expected Results

Based on TOON benchmarks:
- api-index: **30-60% token reduction** (vs -11.9% with TOX)
- docs-index: **30-60% token reduction** (vs +1.5% with TOX)
- Query results with edges: **40-60% token reduction**

## Decision Criteria

**Choose TOON if:**
- Token efficiency is primary goal ✅
- Data has uniform object arrays (Mind edges/importers) ✅
- LLM prompt can be adjusted to handle TOON format ✅
- Schema versioning not critical for LLM input ✅

**Keep TOX if:**
- Deterministic hashing is required ✅
- Schema versioning is critical
- Need cross-document features
- JSON compatibility is required

## Implementation Steps

### If Choosing TOON

1. **Evaluate TOON on real Mind data**
   - Convert api-index to TOON
   - Measure token savings
   - Test LLM comprehension

2. **Integrate TOON into Mind CLI**
   - Add `--toon` flag to `mind:query`
   - Convert query results to TOON format
   - Update AI mode to use TOON

3. **Update Documentation**
   - Explain TOON format to users
   - Provide TOON examples in prompts
   - Document token savings

4. **Keep TOX for Other Use Cases**
   - Keep package for future improvements
   - Use for caching/versioning if needed

## Conclusion

TOON appears to be a **better fit** for LLM token efficiency than TOX. It achieves proven 30-60% token reduction vs TOX's -11.9%.

**Recommendation:** Test TOON on real Mind query results. If it achieves expected token savings, replace TOX with TOON for LLM input (keep TOX for other use cases).

## Next Steps

1. ✅ Document TOON comparison (this ADR)
2. ⏳ Test TOON on api-index and docs-index
3. ⏳ Measure token savings vs TOX
4. ⏳ Test LLM comprehension with TOON
5. ⏳ Decide: Replace, hybrid, or keep both

