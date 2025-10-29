/**
 * TOX inspect command
 */

import type { CommandModule } from './types.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ToxJson } from '@kb-labs/tox-codec-json';
import { box, keyValue } from '@kb-labs/shared-cli-ui';

export const run: CommandModule['run'] = async (ctx, argv, flags) => {
  const jsonMode = !!flags.json;
  const verbose = !!flags.verbose;
  const cwd = typeof flags.cwd === 'string' ? flags.cwd : ctx.cwd;

  if (!flags.in) {
    if (jsonMode) {
      ctx.presenter.json({
        ok: false,
        code: 'TOX_BAD_FLAGS',
        message: '--in flag is required',
      });
    } else {
      ctx.presenter.error('--in flag is required');
    }
    return 1;
  }

  try {
    // Read input
    const inputPath = resolve(cwd, flags.in);
    const inputContent = readFileSync(inputPath, 'utf-8');
    const inputTox = JSON.parse(inputContent) as ToxJson;
    const inputSize = Buffer.byteLength(inputContent, 'utf8');

    const dictSize = inputTox.$dict ? Object.keys(inputTox.$dict).length : 0;
    const dictKeys = inputTox.$dict ? Object.keys(inputTox.$dict) : [];

    if (jsonMode) {
      ctx.presenter.json({
        ok: true,
        schemaVersion: inputTox.$schemaVersion,
        meta: inputTox.$meta,
        dict: {
          size: dictSize,
          keys: verbose ? inputTox.$dict : undefined,
        },
        file: {
          size: inputSize,
        },
      });
    } else {
      const lines = keyValue({
        'Schema Version': inputTox.$schemaVersion,
        'Producer': inputTox.$meta.producer,
        'Generated At': inputTox.$meta.generatedAt,
        'Preset': inputTox.$meta.preset || 'none',
        'Dictionary Size': String(dictSize),
        'File Size': `${(inputSize / 1024).toFixed(2)} KB`,
      });

      ctx.presenter.write(box('TOX Inspect', lines));

      if (verbose && inputTox.$dict) {
        ctx.presenter.write('\nDictionary:');
        ctx.presenter.write(JSON.stringify(inputTox.$dict, null, 2));
      }
    }

    return 0;
  } catch (error: any) {
    if (jsonMode) {
      ctx.presenter.json({
        ok: false,
        code: 'TOX_INSPECT_ERROR',
        message: error.message,
      });
    } else {
      ctx.presenter.error(error.message);
    }
    return 1;
  }
};

