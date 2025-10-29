# TOX Adapters Documentation

## Overview

TOX adapters provide domain-specific converters for common data structures to/from TOX format.

## Mind QueryResult Adapter

### `toToxQueryResult(result, opts)`

Convert Mind QueryResult to TOX JSON format.

**Options:**
- `preset`: Preset identifier (default: `"mind-v1"`)
- `compact`: Enable compact mode
- `strict`: Enable strict mode

**Example:**
```typescript
import { toToxQueryResult } from '@kb-labs/tox-adapters';

const tox = toToxQueryResult(queryResult, {
  preset: 'mind-v1',
  compact: true,
});
```

### `fromToxQueryResult(tox)`

Convert TOX JSON back to Mind QueryResult.

**Example:**
```typescript
import { fromToxQueryResult } from '@kb-labs/tox-adapters';

const result = await fromToxQueryResult(toxJson);
```

### Special Array Sorting

The adapter automatically sorts special arrays for determinism:
- `edges`: Sorted by (from, to, type)
- `importers`: Sorted by file
- `externals`: Sorted by package

## Release Manifest Adapter

**Status:** Stub (TODO: Implement when release-manager is ready)

### `toToxReleaseManifest(manifest)`

Convert Release Manifest to TOX JSON format.

**Note:** Currently throws an error indicating it's not implemented.

### `fromToxReleaseManifest(tox)`

Convert TOX JSON back to Release Manifest.

**Note:** Currently throws an error indicating it's not implemented.

## Integration with Mind Query

To use TOX format with Mind Query:

```bash
# Output TOX format
kb mind query impact --file src/index.ts --tox

# Output TOX format with sidecar file
kb mind query impact --file src/index.ts --tox --tox-sidecar

# Use custom preset
kb mind query impact --file src/index.ts --tox --tox-preset presets/custom.json
```

Sidecar files are written to: `.kb/mind/query/<queryId>.tox.json`

