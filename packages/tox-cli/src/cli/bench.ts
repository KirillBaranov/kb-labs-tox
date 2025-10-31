/**
 * TOX bench command
 */

import type { CommandModule } from './types';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { encodeJson, decodeJson } from '@kb-labs/tox-codec-json';
import { TimingTracker, formatTiming, box, keyValue } from '@kb-labs/shared-cli-ui';
import { runScope, type AnalyticsEventV1, type EmitResult } from '@kb-labs/analytics-sdk-node';
import { ANALYTICS_EVENTS, ANALYTICS_ACTOR } from '../analytics/events';

export const run: CommandModule['run'] = async (ctx, argv, flags) => {
  const startTime = Date.now();
  const jsonMode = !!flags.json;
  const cwd = typeof flags.cwd === 'string' ? flags.cwd : ctx.cwd;
  const runs = Number(flags.runs) || 30;

  return await runScope(
    {
      actor: ANALYTICS_ACTOR,
      ctx: { workspace: cwd },
    },
    async (emit: (event: Partial<AnalyticsEventV1>) => Promise<EmitResult>) => {
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
          type: ANALYTICS_EVENTS.BENCH_STARTED,
          payload: {
            runs,
          },
        });
        // Read input
        const inputPath = resolve(cwd, flags.in);
        const inputContent = readFileSync(inputPath, 'utf-8');
        const inputObj = JSON.parse(inputContent);
        const inputSize = Buffer.byteLength(inputContent, 'utf8');

        // Warmup (5 runs)
        for (let i = 0; i < 5; i++) {
          const encoded = encodeJson(inputObj, { compact: true });
          if (encoded.ok && encoded.result) {
            decodeJson(encoded.result);
          }
        }

        // Benchmark
        const encodeTimes: number[] = [];
        const decodeTimes: number[] = [];
        const outputSizes: number[] = [];

        for (let i = 0; i < runs; i++) {
          // Encode
          const encodeStart = Date.now();
          const encoded = encodeJson(inputObj, { compact: true });
          encodeTimes.push(Date.now() - encodeStart);

          if (!encoded.ok || !encoded.result) {
            throw new Error('Encoding failed');
          }

          const outputContent = JSON.stringify(encoded.result);
          const outputSize = Buffer.byteLength(outputContent, 'utf8');
          outputSizes.push(outputSize);

          // Decode
          const decodeStart = Date.now();
          const decoded = decodeJson(encoded.result);
          decodeTimes.push(Date.now() - decodeStart);

          if (!decoded.ok) {
            throw new Error('Decoding failed');
          }
        }

        // Calculate statistics
        const sortedEncode = [...encodeTimes].sort((a, b) => a - b);
        const sortedDecode = [...decodeTimes].sort((a, b) => a - b);
        const sortedSizes = [...outputSizes].sort((a, b) => a - b);

        const p50 = (arr: number[]) => arr[Math.floor(arr.length * 0.5)]!;
        const p95 = (arr: number[]) => arr[Math.floor(arr.length * 0.95)]!;

        const encodeP50 = p50(sortedEncode);
        const encodeP95 = p95(sortedEncode);
        const decodeP50 = p50(sortedDecode);
        const decodeP95 = p95(sortedDecode);
        const avgSize = outputSizes.reduce((a, b) => a + b, 0) / outputSizes.length;
        const compressionRatio = ((1 - avgSize / inputSize) * 100).toFixed(2);

        const totalTime = Date.now() - startTime;

        if (jsonMode) {
          ctx.presenter.json({
            ok: true,
            input: {
              size: inputSize,
            },
            output: {
              size: avgSize,
              compression: `${compressionRatio}%`,
            },
            encode: {
              p50: encodeP50,
              p95: encodeP95,
              unit: 'ms',
            },
            decode: {
              p50: decodeP50,
              p95: decodeP95,
              unit: 'ms',
            },
            runs,
          });
        } else {
          const lines = keyValue({
            'Input Size': `${(inputSize / 1024).toFixed(2)} KB`,
            'Output Size': `${(avgSize / 1024).toFixed(2)} KB`,
            'Compression': `${compressionRatio}%`,
            'Encode (p50)': `${encodeP50}ms`,
            'Encode (p95)': `${encodeP95}ms`,
            'Decode (p50)': `${decodeP50}ms`,
            'Decode (p95)': `${decodeP95}ms`,
            'Runs': String(runs),
          });

          ctx.presenter.write(box('TOX Bench', lines));
        }

        // Track command completion
        await emit({
          type: ANALYTICS_EVENTS.BENCH_FINISHED,
          payload: {
            runs,
            encodeP50,
            encodeP95,
            decodeP50,
            decodeP95,
            compressionRatio: parseFloat(compressionRatio),
            inputSize,
            outputSize: avgSize,
            durationMs: totalTime,
            result: 'success',
          },
        });

        return 0;
      } catch (error: any) {
        const totalTime = Date.now() - startTime;

        // Track command failure
        await emit({
          type: ANALYTICS_EVENTS.BENCH_FINISHED,
          payload: {
            runs,
            durationMs: totalTime,
            result: 'error',
            error: error.message,
          },
        });

        if (jsonMode) {
          ctx.presenter.json({
            ok: false,
            code: 'TOX_BENCH_ERROR',
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

