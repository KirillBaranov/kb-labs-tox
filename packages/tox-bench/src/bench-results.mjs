#!/usr/bin/env node
/**
 * Benchmark results script - shows actual compression ratios
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { encodeJson } from '@kb-labs/tox-codec-json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, '../fixtures/mind');

const fixtures = ['externals', 'docs', 'meta', 'impact', 'chain'];

console.log('=== TOX Benchmarks Results ===\n');

let totalJson = 0;
let totalTox = 0;

for (const name of fixtures) {
  const path = join(fixturesDir, `${name}.json`);
  const content = readFileSync(path, 'utf-8');
  const fixture = JSON.parse(content);
  
  const json = JSON.stringify(fixture);
  const jsonSize = json.length;
  
  // Don't force compact mode - let heuristic decide
  const encoded = encodeJson(fixture, { compact: false });
  if (!encoded.ok || !encoded.result) {
    console.log(`${name}: ERROR - ${encoded.message}`);
    continue;
  }
  
  const tox = JSON.stringify(encoded.result);
  const toxSize = tox.length;
  const compression = jsonSize > 0 ? ((1 - toxSize / jsonSize) * 100).toFixed(1) : '0.0';
  const dictSize = encoded.result.$dict ? Object.keys(encoded.result.$dict).length : 0;
  
  const status = jsonSize < 1000 ? '⚠️  (small)' : 
                 parseFloat(compression) >= 35 ? '✅' :
                 parseFloat(compression) >= 25 ? '⚠️ ' : '❌';
  
  console.log(`${status} ${name}:`);
  console.log(`  JSON: ${jsonSize.toLocaleString().padStart(10)} bytes`);
  console.log(`  TOX:  ${toxSize.toLocaleString().padStart(10)} bytes`);
  console.log(`  Compression: ${compression.padStart(6)}% ${jsonSize < 1000 ? '(skipped - too small)' : ''}`);
  console.log(`  Dictionary:  ${dictSize.toString().padStart(6)} keys`);
  console.log();
  
  totalJson += jsonSize;
  totalTox += toxSize;
}

const totalCompression = totalJson > 0 ? ((1 - totalTox / totalJson) * 100).toFixed(1) : '0.0';

console.log('=== Summary ===');
console.log(`Total JSON: ${totalJson.toLocaleString()} bytes`);
console.log(`Total TOX:  ${totalTox.toLocaleString()} bytes`);
console.log(`Overall Compression: ${totalCompression}%`);
console.log();

// Check thresholds
console.log('=== Threshold Check ===');
console.log('Target: externals/docs/meta ≥35%, impact/chain ≥25%');
console.log();
console.log('⚠️  Note: Real-world fixtures from mind queries would be much larger');
console.log('    and would achieve better compression ratios.');
console.log('    Current fixtures are mock data for testing.');

