# KB Labs TOX (@kb-labs/tox)

> **TOX (Terse Object eXchange)** — deterministic, compact representation format for structured data optimized for LLM consumption.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.18.0+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0+-orange.svg)](https://pnpm.io/)

## 🎯 Vision

KB Labs TOX provides a deterministic, compact representation format for structured data optimized for LLM consumption. It offers up to 35% compression while maintaining byte-identical output for the same input, making it ideal for token-efficient data exchange.

The project solves the problem of large token consumption when exchanging structured data with LLMs by providing a compression format that maintains determinism and token efficiency. Instead of sending large JSON payloads directly to LLMs, developers can use TOX to compress data while maintaining full fidelity and deterministic encoding.

This project is part of the **@kb-labs** ecosystem and integrates seamlessly with Mind, Release Manager, and all other KB Labs tools.

## 🚀 Quick Start

### Installation

```bash
# Clone repository
git clone https://github.com/kirill-baranov/kb-labs-tox.git
cd kb-labs-tox

# Install dependencies
pnpm install
```

### Development

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

### Basic Usage

#### CLI Commands

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

#### Programmatic Usage

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

## ✨ Features

- **Deterministic**: Same input produces byte-identical output
- **Compact**: Up to 35% compression for structured data
- **LLM-friendly**: Optimized for token efficiency
- **Stable**: Dictionary ordering is stable across encodes
- **Domain-specific**: Adapters for Mind QueryResult and Release Manifest
- **Benchmarking**: Built-in benchmarking tools for compression analysis

## 📁 Repository Structure

```
kb-labs-tox/
├── apps/                    # Demo applications
│   └── demo/                # Demo application
├── packages/                # Core packages
│   ├── tox-core/            # Core functionality: normalization, pooling, hashing
│   ├── tox-codec-json/      # JSON codec with dictionary compression
│   ├── tox-adapters/        # Domain-specific adapters (Mind, Release)
│   ├── tox-cli/             # CLI commands for encoding/decoding
│   └── tox-bench/           # Benchmarks and fixtures
├── docs/                    # Documentation
│   └── adr/                 # Architecture Decision Records
└── scripts/                 # Utility scripts
```

### Directory Descriptions

- **`apps/`** - Demo applications demonstrating TOX usage
- **`packages/tox-core/`** - Core functionality: normalization, pooling, hashing
- **`packages/tox-codec-json/`** - JSON codec with dictionary compression
- **`packages/tox-adapters/`** - Domain-specific adapters for Mind QueryResult and Release Manifest
- **`packages/tox-cli/`** - CLI commands for encoding, decoding, benchmarking, and inspection
- **`packages/tox-bench/`** - Benchmarks and fixtures for compression analysis
- **`docs/`** - Documentation including ADRs and guides
- **`scripts/`** - Utility scripts for development and maintenance

## 📦 Packages

| Package | Description |
|---------|-------------|
| [@kb-labs/tox-core](./packages/tox-core/) | Core functionality: normalization, pooling, hashing |
| [@kb-labs/tox-codec-json](./packages/tox-codec-json/) | JSON codec with dictionary compression |
| [@kb-labs/tox-adapters](./packages/tox-adapters/) | Domain-specific adapters (Mind QueryResult, Release Manifest) |
| [@kb-labs/tox-cli](./packages/tox-cli/) | CLI commands for encoding/decoding, benchmarking, and inspection |
| [@kb-labs/tox-bench](./packages/tox-bench/) | Benchmarks and fixtures for compression analysis |

### Package Details

**@kb-labs/tox-core** provides the core compression engine:
- Data normalization and shape detection
- Value pooling and dictionary building
- Path canonicalization and hashing
- Shape analysis and compression

**@kb-labs/tox-codec-json** provides the JSON codec:
- JSON encoding with dictionary compression
- JSON decoding with full fidelity
- Preset key support for common patterns
- Compact mode for maximum compression

**@kb-labs/tox-adapters** provides domain-specific adapters:
- Mind QueryResult adapter for context compression
- Release Manifest adapter for release metadata compression

**@kb-labs/tox-cli** provides CLI commands:
- Encoding and decoding commands
- Benchmarking tools
- Inspection utilities
- Integration with Mind Query

**@kb-labs/tox-bench** provides benchmarking:
- Compression ratio analysis
- Performance benchmarking
- Test fixtures for real-world data

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development mode for all packages |
| `pnpm build` | Build all packages |
| `pnpm build:clean` | Clean and build all packages |
| `pnpm test` | Run all tests |
| `pnpm test:coverage` | Run tests with coverage reporting |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm lint` | Lint all code |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm format` | Format code with Prettier |
| `pnpm type-check` | TypeScript type checking |
| `pnpm check` | Run lint, type-check, and tests |
| `pnpm ci` | Full CI pipeline (clean, build, check) |
| `pnpm clean` | Clean build artifacts |
| `pnpm clean:all` | Clean all node_modules and build artifacts |

## 📋 Development Policies

- **Code Style**: ESLint + Prettier, TypeScript strict mode
- **Testing**: Vitest with comprehensive test coverage
- **Versioning**: SemVer with automated releases through Changesets
- **Architecture**: Document decisions in ADRs (see `docs/adr/`)
- **Compression Strategy**: LLM-first optimization with deterministic encoding

## 🔧 Requirements

- **Node.js**: >= 18.18.0
- **pnpm**: >= 9.0.0

## 📚 Documentation

- [Documentation Standard](./docs/DOCUMENTATION.md) - Full documentation guidelines
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Architecture Decisions](./docs/adr/) - ADRs for this project

**Guides:**
- [Specification](./docs/spec.md) - Core specification and guarantees
- [JSON Codec](./docs/codec-json.md) - TOX JSON format details
- [Adapters](./docs/adapters.md) - Integration with Mind and Release Manager
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - Implementation status

## 🔗 Related Packages

### Dependencies

- [@kb-labs/core](https://github.com/KirillBaranov/kb-labs-core) - Core utilities

### Used By

- [@kb-labs/mind](https://github.com/KirillBaranov/kb-labs-mind) - Context layer for token-efficient queries
- [@kb-labs/release-manager](https://github.com/KirillBaranov/kb-labs-release-manager) - Release manifest compression

### Ecosystem

- [KB Labs](https://github.com/KirillBaranov/kb-labs) - Main ecosystem repository

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and contribution process.

## 📄 License

MIT © KB Labs

---

**See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and contribution process.**
