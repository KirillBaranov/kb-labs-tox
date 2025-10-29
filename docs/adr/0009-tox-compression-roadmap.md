# ADR-0009: TOX Compression Roadmap & Baseline

**Date:** 2025-10-29
**Status:** Accepted
**Deciders:** KB Labs Team

## Context

Current TOX MVP achieves modest compression (0-4%) on real data. This is insufficient to meet the target compression ratios of ≥35% for externals/docs/meta queries and ≥25% for impact/chain queries.

**Current Limitations:**
- Many unique keys (file paths) limit dictionary compression effectiveness
- No path segment optimization (long paths like `packages/cli/src/commands/run.ts` stored as single strings)
- No structural optimization for arrays of similar objects (edges, importers, exports)
- No value interning for frequent repeated values (types, tags)

**Alternatives Considered:**
- Binary format: rejected (breaks JSON compatibility, harder to debug)
- General-purpose compression (gzip): rejected (not LLM-friendly, loses structure)
- Incremental improvements to current dictionary: insufficient gains

## Decision

Implement progressive compression features in sequence:

1. **PathPool** - Segment path dictionaries for file paths
2. **ShapePool** - Structural object interning for arrays
3. **Columnar Mode** - Columnar storage for large arrays
4. **ValuePool** - Value interning for frequent scalars
5. **Adaptive Heuristics** - Auto-enable features based on data characteristics

All features are **backward compatible** (schema 1.0, optional fields). Old decoders can read new format by ignoring unknown fields.

## Baseline Benchmarks

### Test Environment
- Node.js LTS (v20)
- Fixtures: mix of mock data and real data from `kb-labs-cli/.kb/mind/`

### Baseline Results (before optimizations)

| Fixture | JSON Size | TOX Size | Compression | Dictionary Keys | Notes |
|---------|-----------|----------|-------------|-----------------|-------|
| externals | 779 bytes | 888 bytes | -14.0% | 0 | Mock, too small |
| docs | 965 bytes | 1,074 bytes | -11.3% | 0 | Mock, too small |
| meta | 888 bytes | 997 bytes | -12.3% | 0 | Mock, too small |
| impact | 520 bytes | 629 bytes | -21.0% | 0 | Mock, too small |
| chain | 450 bytes | 559 bytes | -24.2% | 0 | Mock, too small |
| **api-index** | **22,605 bytes** | **21,701 bytes** | **4.0%** | **84** | Real data |
| **docs-index** | **23,544 bytes** | **23,485 bytes** | **0.3%** | **10** | Real data |
| meta-real | 1,590 bytes | 1,699 bytes | -6.9% | 0 | Real, too small |
| query-result-real | 641 bytes | 750 bytes | -17.0% | 0 | Real, too small |

**Total:** 51,982 bytes → 51,782 bytes (**0.4% compression**)

### Analysis

**Why compression is low:**
- `api-index` has many unique file paths as keys → dictionary overhead dominates
- `docs-index` has many unique paths and little key repetition
- Small payloads (< 2KB) show negative compression due to TOX metadata overhead (~150 bytes)
- Current dictionary only helps with repeated keys, not path segments

**Opportunities:**
- Path segments are highly repetitive: `packages/`, `src/`, `dist/`, `.ts`, `.js`
- Arrays of objects (edges, importers, exports) have uniform shapes
- Frequent values like `"runtime"`, `"dev"`, `"guide"`, `"adr"` could be interned

## Roadmap & Targets

### Phase 1: PathPool
**Expected:** +15-25% on api-index
- Segment path dictionaries: `packages/cli/src` → `["p1","p2","p3"]`
- Heuristic: enable if `pathsRatio ≥ 0.15` and `avgSegments ≥ 3`

### Phase 2: ShapePool
**Expected:** +10-20% on arrays
- Structural interning: `edges: [{from,to,type}, ...]` → `{"$shape":"s1","rows":[[...],[...]]}`
- Heuristic: enable if `n ≥ mine` and `uniformity ≥ 0.8`

### Phase 3: Columnar Mode
**Expected:** +5-10% on large arrays
- Columnar storage: `{"$shape":"s1","cols":{"from":[...],"to":[...]}}`
- Heuristic: enable if `n ≥ 2000` and `avgValueLen ≤ 24`

### Phase 4: ValuePool
**Expected:** +5-10% on docs-index
- Value interning: `"runtime"` → `"v1"`
- Heuristic: enable if `freq ≥ 8` and `avgSaved ≥ 3 bytes`

### Phase 5: Adaptive Heuristics
- Auto-detect and enable optimal feature combination
- Log decisions in `$meta.decisions`

## Success Criteria

After all phases:
- **externals/docs/meta queries:** ≥35% compression (bytes or tokens)
- **impact/chain queries:** ≥25% compression
- **api-index:** ≥20% compression (currently 4%)
- **docs-index:** ≥15% compression (currently 0.3%)
- Backward compatible (schema 1.0, optional fields)
- Deterministic output (byte-identical for same input)
- Performance budget maintained: `encode(50KB) ≤ 5ms`, `decode(50KB) ≤ 3ms`

## Implementation Strategy

1. Sequential implementation: PathPool → ShapePool → Columnar → ValuePool
2. Each phase: implementation → tests → benchmarks → ADR update
3. Fail-closed: only include dictionaries if savings > overhead
4. Maintain strict determinism: dictionary ordering by (freq desc, lex asc, full key tie-breaker)

## Consequences

### Positive
- Achieves target compression ratios (25-35%)
- LLM-friendly format (better token efficiency)
- Backward compatible (no migration needed)
- Adaptive heuristics reduce manual configuration

### Negative
- Increased code complexity
- Additional encoding/decoding logic
- More fields to validate and document
- Debugging more complex formats

### Alternatives Considered
- Binary format: better compression but breaks JSON compatibility and LLM usability
- General-purpose compression: same issues as binary
- Incremental dictionary improvements: insufficient gains, path problem remains

## Implementation

**Status:** In progress

**Steps:**
1. ✅ Baseline benchmarks documented
2. ⏳ PathPool implementation
3. ⏳ ShapePool implementation
4. ⏳ Columnar mode
5. ⏳ ValuePool
6. ⏳ Adaptive heuristics

**Monitoring:**
- Benchmark results tracked in CI
- Regression gates: fail if compression drops > 2% vs last green run
- Performance budget enforced in tests

## References

- [TOX Specification](./../spec.md)
- [TOX JSON Codec Documentation](./../codec-json.md)
- Baseline benchmark script: `packages/tox-bench/src/bench-results.mjs`


