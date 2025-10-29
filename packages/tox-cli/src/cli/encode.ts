/**
 * TOX encode command
 */

import type { CommandModule } from './types.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { encodeJson } from '@kb-labs/tox-codec-json';
import { TimingTracker, formatTiming, box, keyValue } from '@kb-labs/shared-cli-ui';

export const run: CommandModule['run'] = async (ctx, argv, flags) => {
  const jsonMode = !!flags.json;
  const debug = !!flags.debug;
  const debugSteps = !!flags['debug-steps'];
  const cwd = typeof flags.cwd === 'string' ? flags.cwd : ctx.cwd;

  if (!flags.in || !flags.out) {
    if (jsonMode) {
      ctx.presenter.json({
        ok: false,
        code: 'TOX_BAD_FLAGS',
        message: 'Both --in and --out flags are required',
      });
    } else {
      ctx.presenter.error('Both --in and --out flags are required');
    }
    return 1;
  }

  const tracker = new TimingTracker();
  tracker.checkpoint('start');

  try {
    // Read input
    const inputPath = resolve(cwd, flags.in);
    const inputContent = readFileSync(inputPath, 'utf-8');
    const inputObj = JSON.parse(inputContent);

    tracker.checkpoint('read');

    // Load preset if specified
    let presetKeys: string[] | undefined;
    if (flags.preset) {
      const presetPath = resolve(cwd, flags.preset);
      const presetContent = readFileSync(presetPath, 'utf-8');
      presetKeys = JSON.parse(presetContent);
      if (!Array.isArray(presetKeys)) {
        throw new Error('Preset file must contain an array of keys');
      }
    }

    tracker.checkpoint('preset');

    // Encode
    const encoded = encodeJson(inputObj, {
      presetKeys,
      compact: !!flags.compact,
      strict: !!flags.strict,
      preset: flags.preset ? 'mind-v1' : undefined,
      debug: debug || debugSteps,
    });

    tracker.checkpoint('encode');

    if (!encoded.ok || !encoded.result) {
      if (jsonMode) {
        ctx.presenter.json({
          ok: false,
          code: encoded.code,
          message: encoded.message,
          hint: encoded.hint,
        });
      } else {
        ctx.presenter.error(encoded.message || 'Encoding failed');
        if (encoded.hint) {
          ctx.presenter.info(`Hint: ${encoded.hint}`);
        }
      }
      return 1;
    }

    // Write output
    const outputPath = resolve(cwd, flags.out);
    const outputContent = JSON.stringify(encoded.result, null, 2);
    writeFileSync(outputPath, outputContent, 'utf-8');

    tracker.checkpoint('write');

    if (jsonMode) {
      ctx.presenter.json({
        ok: true,
        input: {
          size: Buffer.byteLength(inputContent, 'utf8'),
        },
        output: {
          size: Buffer.byteLength(outputContent, 'utf8'),
        },
        compression: {
          ratio: ((1 - Buffer.byteLength(outputContent, 'utf8') / Buffer.byteLength(inputContent, 'utf8')) * 100).toFixed(2) + '%',
        },
        timing: tracker.total(),
        ...(debug || debugSteps ? {
          debug: {
            steps: tracker.checkpointsOnly(),
            dict: encoded.result.$dict,
          },
        } : {}),
      });
    } else {
      if (!flags.quiet) {
        const lines = keyValue({
          'Input': flags.in,
          'Output': flags.out,
          'Input Size': `${(Buffer.byteLength(inputContent, 'utf8') / 1024).toFixed(2)} KB`,
          'Output Size': `${(Buffer.byteLength(outputContent, 'utf8') / 1024).toFixed(2)} KB`,
          'Compression': `${((1 - Buffer.byteLength(outputContent, 'utf8') / Buffer.byteLength(inputContent, 'utf8')) * 100).toFixed(2)}%`,
          'Time': formatTiming(tracker.total()),
        });

        ctx.presenter.write(box('TOX Encode', lines));
      }

      if (debug && encoded.result.$dict) {
        ctx.presenter.write('\nDictionary:');
        ctx.presenter.write(JSON.stringify(encoded.result.$dict, null, 2));
      }
    }

    return 0;
  } catch (error: any) {
    if (jsonMode) {
      ctx.presenter.json({
        ok: false,
        code: 'TOX_ENCODE_ERROR',
        message: error.message,
      });
    } else {
      ctx.presenter.error(error.message);
    }
    return 1;
  }
};

