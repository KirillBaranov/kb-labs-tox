/**
 * Error codes for TOX operations
 */

export enum ToxErrorCode {
  DECODE_ERROR = "TOX_DECODE_ERROR",
  ENCODE_ERROR = "TOX_ENCODE_ERROR",
  UNSUPPORTED_TYPE = "TOX_UNSUPPORTED_TYPE",
  INCOMPATIBLE_VERSION = "TOX_INCOMPATIBLE_VERSION",
  STRICT_MODE_VIOLATION = "TOX_STRICT_MODE_VIOLATION",
  SCHEMA_INVALID = "TOX_SCHEMA_INVALID",
  LIMIT_EXCEEDED = "TOX_LIMIT_EXCEEDED",
}

export interface ToxError {
  ok: false;
  code: ToxErrorCode;
  message: string;
  hint?: string;
}

export function createError(
  code: ToxErrorCode,
  message: string,
  hint?: string
): ToxError {
  return {
    ok: false,
    code,
    message,
    hint,
  };
}

