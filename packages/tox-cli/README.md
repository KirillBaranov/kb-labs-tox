# @kb-labs/tox-cli

CLI commands for KB Labs TOX format.

## Commands

- `tox encode` - Encode JSON to TOX format
- `tox decode` - Decode TOX format to JSON
- `tox bench` - Benchmark TOX encoding/decoding
- `tox inspect` - Inspect TOX file structure

## Usage

```bash
# Encode
kb tox encode --in input.json --out output.tox.json

# Decode
kb tox decode --in input.tox.json --out output.json

# Benchmark
kb tox bench --in fixtures/mind/externals.json --runs 30

# Inspect
kb tox inspect --in input.tox.json --verbose
```

## License

MIT

