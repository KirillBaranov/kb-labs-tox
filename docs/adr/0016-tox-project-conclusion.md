# ADR-0016: TOX Project Conclusion

**Date:** 2025-01-26
**Status:** Accepted
**Deciders:** KB Labs Team
**Last Reviewed:** 2025-11-03
**Tags:** [architecture, process]

## Context

TOX project was an experiment to achieve deterministic, compact, LLM-friendly data representation for Mind query results. After implementing Phases 0-5 (PathPool, ShapePool, Columnar, ValuePool, Adaptive Heuristics), the results were:

- **Token compression:** -9.1% (worse than baseline)
- **Byte compression:** -0.9% (essentially no benefit)
- **Target:** 35% for externals/docs/meta, 25% for impact/chain

**The experiment failed to meet its goals.**

## Root Causes

### 1. BPE Tokenization Reality

**Problem:** Generic dictionary-based compression doesn't work with BPE tokenizers.

**Why:**
- Short IDs like `["p1","p2","p3"]` tokenize to ~10 tokens
- Natural strings like `"packages/cli/src"` tokenize to ~7 tokens
- Dictionary metadata adds overhead
- LLM tokenizers favor natural language patterns

**Evidence:**
- api-index: PathPool activated but tokens worsened (-11.9%)
- docs-index: ShapePool activated but minimal benefit (+1.5%)

### 2. Data Diversity

**Problem:** Real Mind query results have diverse structures without common patterns.

**Why:**
- 74 unique file paths with different segments
- No common path prefix (apps vs packages vs root-level)
- Key redundancy: 0% (all keys unique)
- Not enough homogeneous arrays for tabular format

**Evidence:**
- Path canonicalization found no common prefix
- ShapePool requires n ≥ 10 AND uniformity ≥ 0.8 (not met)
- ValuePool found only 2 common values

### 3. Overhead vs Benefits

**Problem:** TOX metadata overhead (~200 bytes) dominates small payloads.

**Why:**
- `$schemaVersion`, `$meta`, `$dict` add fixed overhead
- Dictionary building costs exceed benefits for diverse data
- Fail-closed heuristics prevent dictionary use when not beneficial

**Evidence:**
- Small fixtures (< 1KB): -20% to -50% compression
- Large fixtures (> 20KB): 0-5% compression

## Alternative Solution: TOON

After testing `@byjohann/toon`:

- **Token compression:** +3.7% (proven better than TOX)
- **Format:** YAML+CSV tabular (keys declared once, values only)
- **LLM-friendly:** Designed specifically for this use case

**Key Advantages:**
- Tabular format: `users[3]{id,name,role}:\n  1,Alice,admin\n  2,Bob,user`
- Minimal syntax: no quotes, braces, brackets where not needed
- Delimiter options: comma, tab, pipe for different tokenizers

## Decision

**Keep TOX package for potential future development, but acknowledge it's not ready for production use.**

### Package Status

**What We Keep:**
- Package structure and implementation
- All compression features (Phases 0-5)
- Test suite and benchmarks
- Documentation and ADRs

**What It Provides:**
- Deterministic hashing (unique ID for same data)
- Schema versioning (backward compatible format evolution)
- Foundation for future improvements

**What It Doesn't Provide:**
- Token compression (makes it worse)
- Generic compression (limited benefit)
- Production-ready LLM optimization

### Use Case Recommendation

**Don't use TOX for:**
- ❌ LLM input (use TOON instead)
- ❌ Query result caching (plain JSON is simpler)
- ❌ Production Mind integration (negative token savings)

**Potential future use:**
- 🔮 Cross-document deterministic storage
- 🔮 Schema-migrated cache format
- 🔮 Data streaming with versioning

## Lessons Learned

### 1. LLM Tokenizers Are Different

**Lesson:** BPE tokenizers favor natural language, not compact encodings.

**Application:** Design for tokenizers, not byte optimization.

### 2. Data Structure Matters

**Lesson:** Compression benefits vary dramatically with data patterns.

**Application:** Benchmark on real data before optimizing.

### 3. Generic Doesn't Work

**Lesson:** Generic dictionary-based compression doesn't fit diverse data.

**Application:** Domain-specific optimizations (like TOON's tabular format) work better.

### 4. Overhead Kills Small Payloads

**Lesson:** Fixed metadata overhead dominates small payloads.

**Application:** Disable features for small data (< 2KB).

## Artifacts Created

### Documentation

- **ADR-0009:** TOX Compression Roadmap & Baseline
- **ADR-0010:** LLM-First Compression Strategy
- **ADR-0011:** Domain-Specific Optimization Strategy
- **ADR-0012:** Compression Limitations Analysis
- **ADR-0013:** TOX Current State
- **ADR-0014:** Consider TOON as Alternative
- **ADR-0015:** TOON-Inspired Optimization
- **ADR-0016:** TOX Project Conclusion (this document)

### Code

- **tox-core:** Normalization, hashing, limits, error handling
- **tox-codec-json:** PathPool, ShapePool, Columnar, ValuePool
- **tox-adapters:** Mind query result adapter, path canonicalization
- **tox-bench:** Benchmark infrastructure with token metrics
- **test-toon.mjs:** TOON comparison script

### Findings

- BPE tokenization constraints documented
- Path canonicalization limitations analyzed
- TOON advantages identified (+3.7% vs -9.1%)
- Data pattern requirements understood

## Next Steps

### Immediate

1. **Use TOON for LLM input** (if needed)
2. **Keep TOX for future** (don't delete)
3. **Use plain JSON** for caching/storage

### Future (if needed)

1. **Revisit TOX** when data patterns change
2. **Consider TOON integration** into Mind CLI
3. **Explore other optimizations** (pagination, field selection)

## Conclusion

TOX was an interesting experiment that produced valuable insights:

- ✅ **Failure is valuable:** We learned what doesn't work
- ✅ **Documentation persists:** ADRs capture lessons learned
- ✅ **Code remains:** Can be revisited or repurposed
- ✅ **Alternative found:** TOON is proven better for our use case

**Recommendation:** Keep TOX package for potential future development, but don't use it in production. Use TOON if LLM token optimization is needed, or plain JSON if it isn't.

