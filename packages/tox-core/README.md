# @kb-labs/tox-core

Core TOX functionality: normalization, pooling, hashing, and token estimation.

## Features

- **Normalization**: Deterministic object normalization with sorting and validation
- **String Pooling**: Interning strings with stable ordering (frequency desc → lex asc)
- **Hashing**: SHA256 hash of normalized objects
- **Token Estimation**: Estimate tokens for JSON and TOX representations

## API

```typescript
import { toToxAST, fromToxAST, estimateTokens, normalize } from '@kb-labs/tox-core';

// Normalize and convert to AST
const ast = toToxAST(obj, { sortKeys: true, strict: true });

// Convert back
const restored = fromToxAST(ast);

// Estimate tokens
const estimate = estimateTokens(obj);
// { jsonBytes, toxBytes, jsonTokens, toxTokens }
```

## License

MIT

