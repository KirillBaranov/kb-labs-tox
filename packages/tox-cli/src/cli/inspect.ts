/**
 * TOX inspect command
 */

import type { CommandModule } from './types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ToxJson } from '@kb-labs/tox-codec-json';
import { box, keyValue } from '@kb-labs/shared-cli-ui';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../analytics/events';

export const run: CommandModule['run'] = async (ctx, argv, flags): Promise<number | void> => {
  const startTime = Date.now();
  const jsonMode = !!flags.json;
  const verbose = !!flags.verbose;
  const cwd = typeof flags.cwd === 'string' ? flags.cwd : ctx.cwd;

  return (await runScope(
    {
      actor: ANALYTICS_ACTOR,
      ctx: { workspace: cwd },
    },
    async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>): Promise<number | void> => {
      try {
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

        // Track command start
        await emit({
          type: ANALYTICS_EVENTS.INSPECT_STARTED,
          payload: {
            verbose,
          },
        });
        // Read input
        const inputPath = resolve(cwd, flags.in);
        const inputContent = readFileSync(inputPath, 'utf-8');
        const inputTox = JSON.parse(inputContent) as ToxJson;
        const inputSize = Buffer.byteLength(inputContent, 'utf8');

        const dictSize = inputTox.$dict ? Object.keys(inputTox.$dict).length : 0;
        const dictKeys = inputTox.$dict ? Object.keys(inputTox.$dict) : [];

        const totalTime = Date.now() - startTime;

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

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.INSPECT_FINISHED,
          payload: {
            verbose,
            dictSize,
            inputSize,
            durationMs: totalTime,
            result: 'success',
          },
        });

        return 0;
      } catch (error: any) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.INSPECT_FINISHED,
          payload: {
            verbose,
            durationMs: totalTime,
            result: 'error',
            error: error.message,
          },
        });

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
    }
  )) as number | void;
};

