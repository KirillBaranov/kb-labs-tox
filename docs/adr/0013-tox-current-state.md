# ADR-0013: TOX Current State - Not Ready for Production

**Date:** 2025-01-26  
**Status:** Accepted  
**Deciders:** KB Labs Team

## Context

TOX was designed to provide deterministic, compact, LLM-friendly representation for Mind query results. However, after implementing Phases 0-5, the results are **worse than baseline for LLM consumption** (primary use case).

**Current Results:**
- api-index: +4.3% bytes, **-11.9% tokens** ❌
- docs-index: +0.9% bytes, +1.5% tokens ⚠️
- Overall: -0.9% bytes, **-9.1% tokens** ❌

**Problem:** The package doesn't solve the real pain (token efficiency for LLM) and actually makes it worse.

## Decision

**Keep the package for future use, but acknowledge it's NOT READY for production use with Mind query results.**

### Why Keep It?

The package has value for:
1. **Deterministic output** - unique hash for same data
2. **Schema versioning** - structured format evolution
3. **Forward compatibility** - can be improved in future
4. **Alternative use cases** - might work better for different data types

### Why Not Ready for Production?

1. **Token compression is negative** (-11.9% on api-index)
2. **BPE tokenization works against dictionaries** (short IDs tokenize worse)
3. **Data diversity prevents pattern extraction** (no common prefixes)
4. **Generic compression strategies don't work** for this data

## Root Cause

### BPE Tokenization Reality

**What we expected:**
- Short IDs like `"p1"` → save tokens
- Dictionary overhead would be offset by savings

**What actually happens:**
- Natural strings: `"packages/cli/src"` → ~7 tokens
- Short IDs: `["p1","p2","p3"]` → ~10 tokens (worse!)
- Dictionary metadata: `{"p1":"packages","p2":"cli"}` → adds tokens

**Conclusion:** BPE tokenizers favor natural language patterns over short strings.

### Data Structure Reality

**api-index has 74 files:**
- 74 unique paths with different segments
- No common prefix (apps vs packages vs root-level)
- Path canonicalization finds nothing

**Key redundancy:** 0% (all keys unique)

**Array uniformity:** Not enough data (docs-index has ~10 items, needs 10+ for ShapePool)

## Consequences

### Negative
- Cannot use TOX for Mind query results in production
- Need to revert to plain JSON for LLM consumption
- Token costs will be higher (no compression benefit)
- Package doesn't solve the stated problem

### Positive
- Package infrastructure exists for future improvements
- Lessons learned about BPE tokenization constraints
- Clear understanding of what doesn't work
- Architecture is sound, just needs different approach

## Future Direction

### Option 1: Domain-Specific Aggressive Optimization

Instead of generic dictionaries, use domain-specific presets:

```javascript
// Pre-defined path segments for Mind
const MIND_SEGMENTS = {
  "packages": "p",
  "src": "s",
  "adapters": "a",
  // ...
};

// Pre-defined value shortcuts
const MIND_VALUES = {
  "runtime": "r",
  "function": "fn",
  // ...
};
```

**Expected:** +20-30% token improvement

**Trade-off:** Only works for Mind data, not generic

### Option 2: Accept Limitations

TOX is good for:
- Deterministic hashing ✅
- Schema versioning ✅
- Structured metadata ✅

NOT for:
- Token compression ❌
- Generic data compression ❌

**Accept:** Use plain JSON for LLM consumption, keep TOX for other purposes.

### Option 3: Different Approach Entirely

Maybe compression isn't the right problem to solve. Consider:
- Streaming responses
- Pagination
- Selective field inclusion
- Query result subsetting

## Implementation Status

**Completed:**
- ✅ Phase 0-5 implementation
- ✅ All compression features working
- ✅ Tests passing
- ❌ **Results don't meet goals**

**Current State:**
- Package builds successfully
- All features implemented
- **Not recommended for production use with Mind**

## Recommendations

1. **Don't use TOX for Mind query results in production**
2. **Keep package for future improvements**
3. **Focus on other optimizations** (pagination, field selection)
4. **Consider domain-specific presets** if compression is critical

## Conclusion

TOX doesn't solve the real pain (token efficiency for LLM). It actually makes it worse (-11.9% tokens). Keep the package for future use, but accept it's not ready for production with current data structures.

**Next Steps:**
- Document this limitation in package README
- Add warning in tox-adapters for Mind integration
- Focus on other approaches for LLM token efficiency

