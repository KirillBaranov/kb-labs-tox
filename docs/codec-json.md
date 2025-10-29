# TOX JSON Codec Documentation

## Format

TOX JSON format is a JSON document with the following structure:

```json
{
  "$schemaVersion": "1.0",
  "$meta": {
    "generatedAt": "2025-10-29T12:00:00Z",
    "producer": "kb-tox@0.1.0",
    "preset": "mind-v1"
  },
  "$dict": {
    "k1": "edges",
    "k2": "from",
    "k3": "to"
  },
  "data": {
    "k1": [
      {
        "k2": "a.ts",
        "k3": "b.ts"
      }
    ]
  }
}
```

## Fields

### `$schemaVersion`

Schema version identifier. Currently: `"1.0"`.

### `$meta`

Metadata about the document:
- `generatedAt`: ISO 8601 timestamp
- `producer`: Tool version that generated the document
- `preset`: Optional preset identifier (e.g., `"mind-v1"`)

### `$dict`

Dictionary mapping key IDs to original key names. Optional if no keys are compressed.

Dictionary entries are sorted by:
1. Frequency (descending)
2. Lexicographic order (ascending)
3. Full key as tie-breaker

### `data`

The actual data payload with keys replaced by IDs from `$dict`.

## JSON Schema

Use `getToxJsonSchema()` from `@kb-labs/tox-codec-json` to get the JSON Schema for validation.

## Compression

Compression is achieved through:
1. **Key compression**: Long keys replaced with short IDs (`k1`, `k2`, etc.)
2. **Dictionary reuse**: Same keys reused across the document
3. **Preset keys**: Common keys pre-assigned stable IDs

## Content-Type

TOX JSON documents use Content-Type: `application/tox+json;v=1`

## Examples

### Simple object

**Input:**
```json
{
  "name": "test",
  "value": 42
}
```

**Encoded:**
```json
{
  "$schemaVersion": "1.0",
  "$meta": {
    "generatedAt": "2025-10-29T12:00:00Z",
    "producer": "kb-tox@0.1.0"
  },
  "data": {
    "name": "test",
    "value": 42
  }
}
```

(No dictionary needed for small objects)

### Large object with compression

**Input:**
```json
{
  "edges": [
    { "from": "a.ts", "to": "b.ts", "type": "import" }
  ],
  "importers": [
    { "file": "c.ts", "imports": ["d.ts"] }
  ]
}
```

**Encoded (with preset):**
```json
{
  "$schemaVersion": "1.0",
  "$meta": {
    "generatedAt": "2025-10-29T12:00:00Z",
    "producer": "kb-tox@0.1.0",
    "preset": "mind-v1"
  },
  "$dict": {
    "k1": "edges",
    "k2": "from",
    "k3": "to",
    "k4": "type",
    "k5": "importers",
    "k6": "file",
    "k7": "imports"
  },
  "data": {
    "k1": [
      { "k2": "a.ts", "k3": "b.ts", "k4": "import" }
    ],
    "k5": [
      { "k6": "c.ts", "k7": ["d.ts"] }
    ]
  }
}
```

