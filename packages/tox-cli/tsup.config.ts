import baseConfig from '@kb-labs/devkit/tsup/node.js';

export default {
  ...baseConfig,
  entry: ['src/index.ts', 'src/cli.manifest.ts'],
  format: ['esm'],
};

