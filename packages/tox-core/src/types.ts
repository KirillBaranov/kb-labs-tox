/**
 * Core types for TOX (Terse Object eXchange)
 */

export type SchemaVersion = "1.0";

export type ToxStringId = string; // e.g., "k1", "k2", "s1", "s2"

export type ToxValue = 
  | string
  | number
  | boolean
  | null
  | ToxMap
  | ToxList;

export interface ToxMap {
  [key: ToxStringId]: ToxValue;
}

export interface ToxList {
  [index: number]: ToxValue;
}

export interface ToxAST {
  value: ToxValue;
  stringPool?: Record<ToxStringId, string>;
  keyPool?: Record<ToxStringId, string>;
  pathPool?: Record<ToxStringId, string>;
}

export interface ToToxOpts {
  sortKeys?: boolean;
  stableArrays?: boolean;
  strict?: boolean;
  maxDepth?: number;
  maxKeys?: number;
  maxArrayLength?: number;
  debug?: boolean;
}

export interface TokenEstimate {
  jsonBytes: number;
  toxBytes: number;
  jsonTokens: number;
  toxTokens: number;
}

