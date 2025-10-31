/**
 * Analytics event types for TOX CLI
 * Centralized constants to prevent typos and enable type safety
 */

/**
 * Event type prefixes by command
 */
export const ANALYTICS_PREFIX = {
  BENCH: 'tox.bench',
  DECODE: 'tox.decode',
  ENCODE: 'tox.encode',
  INSPECT: 'tox.inspect',
} as const;

/**
 * Event lifecycle suffixes
 */
export const ANALYTICS_SUFFIX = {
  STARTED: 'started',
  FINISHED: 'finished',
} as const;

/**
 * TOX analytics event types
 */
export const ANALYTICS_EVENTS = {
  // Bench events
  BENCH_STARTED: `${ANALYTICS_PREFIX.BENCH}.${ANALYTICS_SUFFIX.STARTED}`,
  BENCH_FINISHED: `${ANALYTICS_PREFIX.BENCH}.${ANALYTICS_SUFFIX.FINISHED}`,

  // Decode events
  DECODE_STARTED: `${ANALYTICS_PREFIX.DECODE}.${ANALYTICS_SUFFIX.STARTED}`,
  DECODE_FINISHED: `${ANALYTICS_PREFIX.DECODE}.${ANALYTICS_SUFFIX.FINISHED}`,

  // Encode events
  ENCODE_STARTED: `${ANALYTICS_PREFIX.ENCODE}.${ANALYTICS_SUFFIX.STARTED}`,
  ENCODE_FINISHED: `${ANALYTICS_PREFIX.ENCODE}.${ANALYTICS_SUFFIX.FINISHED}`,

  // Inspect events
  INSPECT_STARTED: `${ANALYTICS_PREFIX.INSPECT}.${ANALYTICS_SUFFIX.STARTED}`,
  INSPECT_FINISHED: `${ANALYTICS_PREFIX.INSPECT}.${ANALYTICS_SUFFIX.FINISHED}`,
} as const;

/**
 * Type helper for analytics event types
 */
export type AnalyticsEventType = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

/**
 * Actor configuration for TOX analytics
 */
export const ANALYTICS_ACTOR = {
  type: 'agent' as const,
  id: 'tox-cli',
} as const;

