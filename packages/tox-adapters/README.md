# @kb-labs/tox-adapters

Adapters for converting domain objects to/from TOX format.

## Features

- **Mind QueryResult**: Convert Mind query results to TOX format with aggressive field shortening
- **Release Manifest**: Stubs for future release-manager integration

## API

```typescript
import { toToxQueryResult, fromToxQueryResult } from '@kb-labs/tox-adapters';

// Convert QueryResult to TOX
const tox = toToxQueryResult(queryResult, {
  preset: 'mind-v1',
  compact: true,
});

// Convert back
const restored = fromToxQueryResult(tox.result!);
```

## License

MIT

