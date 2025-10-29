# @kb-labs/tox-codec-json

JSON codec for TOX format with dictionary compression.

## Features

- **Encoding**: Convert objects to TOX JSON format with key compression
- **Decoding**: Restore objects from TOX JSON format
- **Presets**: Pre-defined key dictionaries for common structures
- **Schema Validation**: JSON Schema validation for TOX format

## API

```typescript
import { encodeJson, decodeJson, getToxJsonSchema } from '@kb-labs/tox-codec-json';

// Encode
const encoded = encodeJson(obj, {
  presetKeys: ['edges', 'from', 'to'],
  compact: true,
  strict: true,
});

// Decode
const decoded = decodeJson(encoded.result!);

// Get schema
const schema = getToxJsonSchema();
```

## License

MIT

