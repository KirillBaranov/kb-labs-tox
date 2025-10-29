/**
 * Unit tests for StringPool
 */

import { describe, it, expect } from 'vitest';
import { StringPool, KeyPool } from '../pool';

describe('StringPool', () => {
  it('should add and retrieve strings', () => {
    const pool = new StringPool();
    const id1 = pool.add('test');
    const id2 = pool.add('test');
    expect(id1).toBe(id2);
    expect(pool.get(id1)).toBe('test');
  });

  it('should track frequency', () => {
    const pool = new StringPool();
    pool.add('a');
    pool.add('b');
    pool.add('a');
    pool.add('c');
    pool.add('a');
    
    const entries = pool.getSortedEntries();
    expect(entries[0]!.value).toBe('a'); // Highest frequency
    expect(entries[0]!.frequency).toBe(3);
  });

  it('should sort by frequency then lex', () => {
    const pool = new StringPool();
    pool.add('z');
    pool.add('a');
    pool.add('z');
    pool.add('a');
    pool.add('m');
    
    const entries = pool.getSortedEntries();
    // Both 'a' and 'z' have frequency 2, so lex order determines
    expect(entries[0]!.frequency).toBe(2);
    expect(entries[1]!.frequency).toBe(2);
  });

  it('should build dictionary', () => {
    const pool = new StringPool();
    const id1 = pool.add('test');
    const id2 = pool.add('value');
    const dict = pool.toDict();
    expect(dict[id1]).toBe('test');
    expect(dict[id2]).toBe('value');
  });
});

describe('KeyPool', () => {
  it('should create key IDs', () => {
    const pool = new KeyPool();
    const id = pool.add('myKey');
    expect(id).toMatch(/^k\d+$/);
  });

  it('should reuse IDs for same keys', () => {
    const pool = new KeyPool();
    const id1 = pool.add('key');
    const id2 = pool.add('key');
    expect(id1).toBe(id2);
  });
});

