/**
 * TOX decode command
 */

import type { CommandModule } from './types';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decodeJson, type ToxJson } from '@kb-labs/tox-codec-json';
import { TimingTracker, formatTiming, box, keyValue } from '@kb-labs/shared-cli-ui';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../analytics/events';

export const run: CommandModule['run'] = async (ctx, argv, flags) => {
  const startTime = Date.now();
  const jsonMode = !!flags.json;
  const debug = !!flags.debug;
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
          type: ANALYTICS_EVENTS.DECODE_STARTED,
          payload: {
            debug,
            strict: !!flags.strict,
          },
        });

        const tracker = new TimingTracker();
        tracker.checkpoint('start');
        // Read input
        const inputPath = resolve(cwd, flags.in);
        const inputContent = readFileSync(inputPath, 'utf-8');
        const inputTox = JSON.parse(inputContent) as ToxJson;

        tracker.checkpoint('read');

        // Decode
        const decoded = decodeJson(inputTox, !!flags.strict);

        tracker.checkpoint('decode');

        if (!decoded.ok || !decoded.result) {
          const totalTime = Date.now() - startTime;
          await emit({
            type: ANALYTICS_EVENTS.DECODE_FINISHED,
            payload: {
              debug,
              strict: !!flags.strict,
              durationMs: totalTime,
              result: 'failed',
              error: decoded.message || 'Decoding failed',
            },
          });
          if (jsonMode) {
            ctx.presenter.json({
              ok: false,
              code: decoded.code,
              message: decoded.message,
              hint: decoded.hint,
            });
          } else {
            ctx.presenter.error(decoded.message || 'Decoding failed');
            if (decoded.hint) {
              ctx.presenter.info(`Hint: ${decoded.hint}`);
            }
          }
          return 1;
        }

        // Write output
        const outputPath = resolve(cwd, flags.out);
        const outputContent = JSON.stringify(decoded.result, null, 2);
        writeFileSync(outputPath, outputContent, 'utf-8');

        tracker.checkpoint('write');

        const totalTime = Date.now() - startTime;
        const inputSize = Buffer.byteLength(inputContent, 'utf8');
        const outputSize = Buffer.byteLength(outputContent, 'utf8');

        if (jsonMode) {
          ctx.presenter.json({
            ok: true,
            input: {
              size: inputSize,
            },
            output: {
              size: outputSize,
            },
            timing: tracker.total(),
            ...(debug ? {
              debug: {
                steps: tracker.checkpointsOnly(),
                schemaVersion: inputTox.$schemaVersion,
                meta: inputTox.$meta,
              },
            } : {}),
          });
        } else {
          if (!flags.quiet) {
            const lines = keyValue({
              'Input': flags.in,
              'Output': flags.out,
              'Schema Version': inputTox.$schemaVersion,
              'Time': formatTiming(tracker.total()),
            });

            ctx.presenter.write(box('TOX Decode', lines));
          }
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.DECODE_FINISHED,
          payload: {
            debug,
            strict: !!flags.strict,
            inputSize,
            outputSize,
            durationMs: totalTime,
            result: 'success',
          },
        });

        return 0;
      } catch (error: any) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.DECODE_FINISHED,
          payload: {
            debug,
            strict: !!flags.strict,
            durationMs: totalTime,
            result: 'error',
            error: error.message,
          },
        });

        if (jsonMode) {
          ctx.presenter.json({
            ok: false,
            code: 'TOX_DECODE_ERROR',
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

