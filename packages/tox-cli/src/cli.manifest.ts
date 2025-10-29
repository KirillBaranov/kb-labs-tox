/**
 * TOX CLI manifest
 */

import type { CommandManifest, FlagDefinition } from './cli/types';

export const commands: CommandManifest[] = [
  {
    manifestVersion: '1.0',
    id: 'tox:encode',
    aliases: ['tox-encode'],
    group: 'tox',
    describe: 'Encode JSON to TOX format',
    longDescription: 'Convert JSON objects to compact TOX JSON format',
    flags: [
      {
        name: 'in',
        type: 'string',
        description: 'Input file path',
        required: true,
      },
      {
        name: 'out',
        type: 'string',
        description: 'Output file path',
        required: true,
      },
      {
        name: 'preset',
        type: 'string',
        description: 'Preset keys file path',
      },
      {
        name: 'compact',
        type: 'boolean',
        description: 'Enable compact mode',
      },
      {
        name: 'strict',
        type: 'boolean',
        description: 'Enable strict mode',
      },
      {
        name: 'json',
        type: 'boolean',
        description: 'Output in JSON format',
      },
      {
        name: 'debug',
        type: 'boolean',
        description: 'Enable debug output',
      },
      {
        name: 'debug-steps',
        type: 'boolean',
        description: 'Show processing steps',
      },
    ],
    examples: [
      'kb tox encode --in input.json --out output.tox.json',
      'kb tox encode --in input.json --out output.tox.json --preset presets/mind-v1.json --compact',
      'kb tox encode --in input.json --out output.tox.json --strict --json',
    ],
    loader: async () => import('./cli/encode'),
  },
  {
    manifestVersion: '1.0',
    id: 'tox:decode',
    aliases: ['tox-decode'],
    group: 'tox',
    describe: 'Decode TOX format to JSON',
    longDescription: 'Convert TOX JSON format back to regular JSON',
    flags: [
      {
        name: 'in',
        type: 'string',
        description: 'Input TOX file path',
        required: true,
      },
      {
        name: 'out',
        type: 'string',
        description: 'Output file path',
        required: true,
      },
      {
        name: 'strict',
        type: 'boolean',
        description: 'Enable strict mode',
      },
      {
        name: 'json',
        type: 'boolean',
        description: 'Output in JSON format',
      },
      {
        name: 'debug',
        type: 'boolean',
        description: 'Enable debug output',
      },
    ],
    examples: [
      'kb tox decode --in input.tox.json --out output.json',
      'kb tox decode --in input.tox.json --out output.json --strict --json',
    ],
    loader: async () => import('./cli/decode'),
  },
  {
    manifestVersion: '1.0',
    id: 'tox:bench',
    aliases: ['tox-bench'],
    group: 'tox',
    describe: 'Benchmark TOX encoding/decoding',
    longDescription: 'Measure compression ratio and performance metrics',
    flags: [
      {
        name: 'in',
        type: 'string',
        description: 'Input file path',
        required: true,
      },
      {
        name: 'runs',
        type: 'number',
        description: 'Number of benchmark runs',
        default: 30,
      },
      {
        name: 'json',
        type: 'boolean',
        description: 'Output in JSON format',
      },
    ],
    examples: [
      'kb tox bench --in fixtures/mind/externals.json',
      'kb tox bench --in fixtures/mind/externals.json --runs 50 --json',
    ],
    loader: async () => import('./cli/bench'),
  },
  {
    manifestVersion: '1.0',
    id: 'tox:inspect',
    aliases: ['tox-inspect'],
    group: 'tox',
    describe: 'Inspect TOX file structure',
    longDescription: 'Display dictionary and statistics about TOX file',
    flags: [
      {
        name: 'in',
        type: 'string',
        description: 'Input TOX file path',
        required: true,
      },
      {
        name: 'json',
        type: 'boolean',
        description: 'Output in JSON format',
      },
      {
        name: 'verbose',
        type: 'boolean',
        description: 'Verbose output',
      },
    ],
    examples: [
      'kb tox inspect --in input.tox.json',
      'kb tox inspect --in input.tox.json --verbose --json',
    ],
    loader: async () => import('./cli/inspect'),
  },
];

