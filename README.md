# KB Labs TOX

TOX (Terse Object eXchange) - deterministic, compact representation format for structured data optimized for LLM consumption.

## Features

- **Deterministic**: Same input produces byte-identical output
- **Compact**: Up to 35% compression for structured data
- **LLM-friendly**: Optimized for token efficiency
- **Stable**: Dictionary ordering is stable across encodes

## Packages

- `@kb-labs/tox-core` - Core functionality: normalization, pooling, hashing
- `@kb-labs/tox-codec-json` - JSON codec with dictionary compression
- `@kb-labs/tox-adapters` - Domain-specific adapters (Mind QueryResult, Release Manifest)
- `@kb-labs/tox-cli` - CLI commands for encoding/decoding
- `@kb-labs/tox-bench` - Benchmarks and fixtures

## Quick Start

```bash
# Encode JSON to TOX
kb tox encode --in input.json --out output.tox.json

# Decode TOX to JSON
kb tox decode --in output.tox.json --out decoded.json

# Benchmark
kb tox bench --in fixtures/mind/externals.json --runs 30

# Inspect TOX file
kb tox inspect --in output.tox.json --verbose

# Use with Mind Query
kb mind query externals --tox
kb mind query externals --tox --tox-sidecar
```

## Usage

```typescript
import { encodeJson, decodeJson } from '@kb-labs/tox-codec-json';

// Encode
const encoded = encodeJson(obj, {
  presetKeys: ['edges', 'from', 'to'],
  compact: true,
});

// Decode
const decoded = decodeJson(encoded.result!);
```

## Documentation

- [Specification](./docs/spec.md) - Core specification and guarantees
- [JSON Codec](./docs/codec-json.md) - TOX JSON format details
- [Adapters](./docs/adapters.md) - Integration with Mind and Release Manager
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Implementation status

## Status

✅ MVP Implementation Complete
- All packages created and structured
- Core functionality implemented
- CLI commands ready
- Integration with Mind Query added
- Tests created (unit, roundtrip, determinism)
- Documentation written

## License

MIT
