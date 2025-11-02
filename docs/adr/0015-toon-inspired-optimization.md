# ADR-0015: TOON-Inspired Optimization for TOX

**Date:** 2025-01-26
**Status:** Proposed
**Deciders:** KB Labs Team
**Last Reviewed:** 2025-11-03
**Tags:** [architecture, performance]

## Context

TOON achieves better compression (+3.7% tokens) than TOX (-9.1% tokens) on our data. Analysis reveals TOON's key advantages:

1. **Tabular array format:** `users[3]{id,name,role}:\n  1,Alice,admin\n  2,Bob,user`
2. **Minimal syntax:** No quotes, braces, brackets where not needed
3. **YAML-style indentation:** Replaces JSON structure

**Question:** Can we make TOX competitive by adopting TOON-like optimizations?

## TOON's Key Advantages

### 1. Tabular Array Format

TOON's format for uniform arrays:

```
users[3]{id,name,role}:
  1,Alice,admin
  2,Bob,user
  3,Charlie,user
```

**Savings:**
- Keys declared once in header (`{id,name,role}`)
- No JSON structure overhead
- ~70% size reduction for this example

### 2. Minimal Syntax

TOON removes unnecessary quotes, braces, and brackets:
- No quotes for safe strings (spaces, unicode, emoji OK)
- No braces for objects (indentation-based)
- No brackets for arrays (header + indentation)

### 3. Delimiter Options

TOON supports comma, tab, or pipe delimiters for tabular data:
- Tabs tokenize better than commas
- Pipes are visually cleaner
- Reduces quote-escaping needed

## Proposal: TOX + TOON Optimization

### Option A: Add TOON as Alternative Format

**Implementation:**
```typescript
// In tox-codec-json
export function encodeToon(obj: unknown): string;
export function decodeToon(str: string): unknown;

// In mind adapter
export function toToxQueryResult(result: QueryResult, opts: {
  format?: 'json' | 'toon';
})
```

**Benefits:**
- Simple integration
- Can use either format
- Best compression for LLM input

**Drawbacks:**
- Two formats to maintain
- Not deterministic (no hash)

### Option B: Hybrid: JSON Structure + TOON Tabular

**Implementation:**
- Keep JSON structure for metadata
- Use TOON tabular format for arrays

```json
{
  "$schemaVersion": "1.0",
  "users[3]{id,name,role}":
    "1,Alice,admin\n  2,Bob,user\n  3,Charlie,user"
}
```

**Benefits:**
- Best of both worlds
- Deterministic (hashable)
- LLM-friendly tabular data

**Drawbacks:**
- Custom hybrid format
- Parsing complexity

### Option C: Enhanced TOX with TOON Algorithms

**Implementation:**
- Add "compact" mode to TOX
- Use tabular format for uniform arrays
- Minimal quoting rules

**Benefits:**
- Single format
- Deterministic
- Better compression

**Drawbacks:**
- Breaking change or new version

## Recommendation: Option A (Add TOON Support)

**Why:**
1. **Proven compression:** TOON already achieves 30-60% reduction (our tests show 3.7%)
2. **Simple integration:** Just add `format: 'toon'` option
3. **Best for LLM:** TOON is specifically designed for this use case
4. **Keep TOX for storage:** TOX's deterministic hashing remains valuable

## Implementation Plan

### Step 1: Add TOON Codec

```typescript
// packages/tox-codec-json/src/toon.ts
import { encode, decode } from '@byjohann/toon';

export function encodeToon(obj: unknown): string {
  return encode(obj);
}

export function decodeToon(str: string): unknown {
  return decode(str);
}
```

### Step 2: Update Mind Adapter

```typescript
export function toToxQueryResult(result: QueryResult, opts: {
  format?: 'json' | 'toon';
  ...
}) {
  if (opts.format === 'toon') {
    return { ok: true, result: encodeToon(result) };
  }
  // ... existing TOX logic
}
```

### Step 3: CLI Integration

```bash
# Use TOON format for LLM input
mind query --format toon

# Use TOX format for storage/caching
mind query --format tox
```

## Expected Results

Based on current tests:

| Format | Tokens | Compression |
|--------|--------|-------------|
| JSON | 12,999 | baseline |
| TOX | 14,181 | **-9.1%** (worse) |
| TOON | 12,515 | **+3.7%** (better) |

**TOON advantage:** 12.8% better than TOX

## Alternatives Considered

### 1. Keep TOX Only ❌
- Current implementation is worse (-9.1%)
- Doesn't solve the problem

### 2. Replace TOX with TOON ❌
- Lose deterministic hashing
- Lose schema versioning
- Lose cache compatibility

### 3. Hybrid Format ❌
- Custom format complexity
- Compatibility issues
- Harder to debug

## Decision

**Add TOON support alongside TOX:**

- Use TOON for LLM input (better compression)
- Keep TOX for internal storage (deterministic, versioned)
- Best of both worlds

## Success Criteria

- TOON achieves 3-10% token savings (proven)
- TOX remains deterministic for caching
- Both formats supported in CLI
- Backward compatibility maintained

## Next Steps

1. Add TOON codec to tox-codec-json
2. Update mind adapter to support format option
3. Test on real query results
4. Update CLI to support format selection
5. Document usage in README

