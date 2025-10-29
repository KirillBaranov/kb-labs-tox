# TOX Specification

TOX (Terse Object eXchange) is a deterministic, compact representation format for structured data optimized for LLM consumption.

## Core Principles

### Determinism

TOX ensures that identical inputs produce identical outputs, enabling:
- Stable hashing for caching
- Reproducible builds
- Deterministic testing

### Stability Rules

1. **Object keys**: Sorted lexicographically (ascending)
2. **Special arrays**: Sorted by specific fields:
   - `edges`: (from, to, type)
   - `importers`: (file)
   - `externals`: (package)
3. **Dictionary order**: Frequency (desc) → Lexicographic (asc) → Full key as tie-breaker

### Example: Dictionary Stability

**Input:**
```json
{
  "from": "a.ts",
  "to": "b.ts",
  "type": "import"
}
```

**First encode:**
```json
{
  "$schemaVersion": "1.0",
  "$meta": {...},
  "$dict": {
    "k1": "from",
    "k2": "to",
    "k3": "type"
  },
  "data": {
    "k1": "a.ts",
    "k2": "b.ts",
    "k3": "import"
  }
}
```

**Second encode (same input):**
```json
{
  "$schemaVersion": "1.0",
  "$meta": {...},
  "$dict": {
    "k1": "from",
    "k2": "to",
    "k3": "type"
  },
  "data": {
    "k1": "a.ts",
    "k2": "b.ts",
    "k3": "import"
  }
}
```

The dictionary order is stable across multiple encodes of the same data.

**Example with frequency sorting:**

**Input:**
```json
{
  "frequent": {
    "a": 1,
    "b": 2,
    "a": 3
  },
  "rare": {
    "x": 1
  }
}
```

**Encoded:**
```json
{
  "$schemaVersion": "1.0",
  "$meta": {...},
  "$dict": {
    "k1": "a",
    "k2": "b",
    "k3": "frequent",
    "k4": "x",
    "k5": "rare"
  },
  "data": {
    "k3": {
      "k1": 1,
      "k2": 2,
      "k1": 3
    },
    "k5": {
      "k4": 1
    }
  }
}
```

Keys `a` and `b` appear more frequently than `x`, so they come first in the dictionary (frequency desc → lex asc).

## Versioning

Current schema version: **1.0**

All TOX documents include `$schemaVersion` field. Future schema versions will maintain backward compatibility or provide migration paths.

## Guarantees

- **Round-trip**: `fromToxAST(toToxAST(x)) == x` (idempotent)
- **Determinism**: Same input produces byte-identical output
- **Stability**: Dictionary order is stable for the same payload

## Limits

Default limits (can be overridden):
- `maxDepth`: 64
- `maxKeys`: 50,000
- `maxArrayLength`: 100,000

In strict mode, exceeding limits results in errors. In non-strict mode, limits are enforced with warnings or truncation.

## Unsupported Types

The following types are not supported and will cause errors:
- `Map` / `Set` (use arrays instead)
- `BigInt` (use strings)
- `Infinity` / `NaN` (use null)
- `Function` / `Symbol` (not serializable)
- Circular references (detected and rejected)

## Reserved Keys

The following keys are reserved and cannot be used in user data:
- `$schemaVersion`
- `$meta`
- `$dict`
- `data`

Attempting to use reserved keys will result in an error in strict mode.

