/**
 * Basic smoke tests for CLI module
 */

import { describe, it, expect } from 'vitest';

describe('TOX CLI', () => {
  it('should export CLI manifest', async () => {
    const manifest = await import('../src/cli.manifest');
    expect(manifest.commands).toBeDefined();
    expect(Array.isArray(manifest.commands)).toBe(true);
    expect(manifest.commands.length).toBeGreaterThan(0);
  });

  it('should have correct command IDs', async () => {
    const { commands } = await import('../src/cli.manifest');
    const commandIds = commands.map((c) => c.id);
    expect(commandIds).toContain('tox:encode');
    expect(commandIds).toContain('tox:decode');
    expect(commandIds).toContain('tox:bench');
    expect(commandIds).toContain('tox:inspect');
  });
});

