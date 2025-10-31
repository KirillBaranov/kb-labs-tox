/**
 * TOX encode command
 */

import type { CommandModule } from './types';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { encodeJson } from '@kb-labs/tox-codec-json';
import { TimingTracker, formatTiming, box, keyValue } from '@kb-labs/shared-cli-ui';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../analytics/events';

export const run: CommandModule['run'] = async (ctx, argv, flags) => {
  const startTime = Date.now();
  const jsonMode = !!flags.json;
  const debug = !!flags.debug;
  const debugSteps = !!flags['debug-steps'];
  const cwd = typeof flags.cwd === 'string' ? flags.cwd : ctx.cwd;

  return await runScope(
    {
      actor: ANALYTICS_ACTOR,
      ctx: { workspace: cwd },
    },
    async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>) => {
      try {
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

        // Track command start
        await emit({
          type: ANALYTICS_EVENTS.ENCODE_STARTED,
          payload: {
            debug,
            debugSteps,
            compact: !!flags.compact,
            strict: !!flags.strict,
            preset: !!flags.preset,
          },
        });

        const tracker = new TimingTracker();
        tracker.checkpoint('start');
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
          const totalTime = Date.now() - startTime;
          await emit({
            type: ANALYTICS_EVENTS.ENCODE_FINISHED,
            payload: {
              debug,
              debugSteps,
              compact: !!flags.compact,
              strict: !!flags.strict,
              preset: !!flags.preset,
              durationMs: totalTime,
              result: 'failed',
              error: encoded.message || 'Encoding failed',
            },
          });
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

        const totalTime = Date.now() - startTime;
        const inputSize = Buffer.byteLength(inputContent, 'utf8');
        const outputSize = Buffer.byteLength(outputContent, 'utf8');
        const compressionRatio = ((1 - outputSize / inputSize) * 100).toFixed(2);

        if (jsonMode) {
          ctx.presenter.json({
            ok: true,
            input: {
              size: inputSize,
            },
            output: {
              size: outputSize,
            },
            compression: {
              ratio: compressionRatio + '%',
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
              'Input Size': `${(inputSize / 1024).toFixed(2)} KB`,
              'Output Size': `${(outputSize / 1024).toFixed(2)} KB`,
              'Compression': `${compressionRatio}%`,
              'Time': formatTiming(tracker.total()),
            });

            ctx.presenter.write(box('TOX Encode', lines));
          }

          if (debug && encoded.result.$dict) {
            ctx.presenter.write('\nDictionary:');
            ctx.presenter.write(JSON.stringify(encoded.result.$dict, null, 2));
          }
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.ENCODE_FINISHED,
          payload: {
            debug,
            debugSteps,
            compact: !!flags.compact,
            strict: !!flags.strict,
            preset: !!flags.preset,
            inputSize,
            outputSize,
            compressionRatio: parseFloat(compressionRatio),
            durationMs: totalTime,
            result: 'success',
          },
        });

        return 0;
      } catch (error: any) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.ENCODE_FINISHED,
          payload: {
            debug,
            debugSteps,
            compact: !!flags.compact,
            strict: !!flags.strict,
            preset: !!flags.preset,
            durationMs: totalTime,
            result: 'error',
            error: error.message,
          },
        });

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
    }
  );
};

