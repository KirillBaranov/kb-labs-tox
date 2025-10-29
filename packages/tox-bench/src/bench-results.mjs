#!/usr/bin/env node
/**
 * Enhanced benchmark results script - shows compression ratios, tokens, timing, and structure analysis
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { encodeJson, decodeJson } from '@kb-labs/tox-codec-json';
import { estimateTokens } from '@kb-labs/tox-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, '../fixtures/mind');

// Include both mock fixtures (small) and real fixtures (large)
const fixtures = [
  // Mock fixtures (small, for testing)
  'externals', 'docs', 'meta', 'impact', 'chain',
  // Real fixtures from kb-labs-cli (large, real data)
  'api-index', 'docs-index', 'meta-real', 'query-result-real'
].filter(Boolean);

/**
 * Analyze structure: key uniqueness, path frequency
 */
function analyzeStructure(obj) {
  const stats = {
    totalKeys: 0,
    uniqueKeys: new Set(),
    pathLikeStrings: 0,
    totalStrings: 0,
    arrays: 0,
    objects: 0,
    maxDepth: 0,
  };

  function traverse(value, depth = 0) {
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    if (value === null || typeof value !== 'object') {
      if (typeof value === 'string') {
        stats.totalStrings++;
        // Heuristic: path-like if contains / or file extension
        if (value.includes('/') || /\.(ts|js|json|md|tsx|jsx)$/.test(value)) {
          stats.pathLikeStrings++;
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      stats.arrays++;
      value.forEach((item) => traverse(item, depth + 1));
      return;
    }

    stats.objects++;
    for (const [key, val] of Object.entries(value)) {
      stats.totalKeys++;
      stats.uniqueKeys.add(key);
      traverse(val, depth + 1);
    }
  }

  traverse(obj);
  
  return {
    totalKeys: stats.totalKeys,
    uniqueKeys: stats.uniqueKeys.size,
    keyUniquenessRatio: stats.totalKeys > 0 ? stats.uniqueKeys.size / stats.totalKeys : 0,
    pathLikeRatio: stats.totalStrings > 0 ? stats.pathLikeStrings / stats.totalStrings : 0,
    pathLikeCount: stats.pathLikeStrings,
    totalStrings: stats.totalStrings,
    arrays: stats.arrays,
    objects: stats.objects,
    maxDepth: stats.maxDepth,
  };
}

console.log('=== TOX Benchmarks Results ===\n');

let totalJson = 0;
let totalTox = 0;
const results = [];

for (const name of fixtures) {
  const path = join(fixturesDir, `${name}.json`);
  const content = readFileSync(path, 'utf-8');
  const fixture = JSON.parse(content);
  
  // Structure analysis
  const structure = analyzeStructure(fixture);
  
  const json = JSON.stringify(fixture);
  const jsonSize = json.length;
  
  // Token estimation (JSON)
  const jsonTokens = estimateTokens(fixture);
  
  // Timing: encode
  const encodeStart = performance.now();
  // Use adaptive mode with all features enabled automatically
  const encoded = encodeJson(fixture, {
    enablePathPool: 'auto',
    enableShapePool: 'auto',
    enableValuePool: 'auto',
  });
  const encodeMs = performance.now() - encodeStart;
  
  if (!encoded.ok || !encoded.result) {
    console.log(`${name}: ERROR - ${encoded.message}`);
    continue;
  }
  
  const tox = JSON.stringify(encoded.result);
  const toxSize = tox.length;
  
  // Token estimation (TOX)
  const toxTokens = estimateTokens(encoded.result);
  
  // Timing: decode
  const decodeStart = performance.now();
  const decoded = decodeJson(encoded.result);
  const decodeMs = performance.now() - decodeStart;
  
  if (!decoded.ok || !decoded.result) {
    console.log(`${name}: DECODE ERROR - ${decoded.message}`);
    continue;
  }
  
  const compression = jsonSize > 0 ? ((1 - toxSize / jsonSize) * 100).toFixed(1) : '0.0';
  const tokenCompression = jsonTokens.jsonTokens > 0 
    ? ((1 - toxTokens.jsonTokens / jsonTokens.jsonTokens) * 100).toFixed(1) 
    : '0.0';
  const dictSize = encoded.result.$dict ? Object.keys(encoded.result.$dict).length : 0;
  
  const status = jsonSize < 1000 ? '⚠️  (small)' : 
                 parseFloat(compression) >= 35 ? '✅' :
                 parseFloat(compression) >= 25 ? '⚠️ ' : '❌';
  
  console.log(`${status} ${name}:`);
  console.log(`  JSON: ${jsonSize.toLocaleString().padStart(10)} bytes  |  TOX: ${toxSize.toLocaleString().padStart(10)} bytes  |  Compression: ${compression.padStart(6)}%`);
  console.log(`  Tokens: ${jsonTokens.jsonTokens.toLocaleString().padStart(8)} (JSON)  |  ${toxTokens.jsonTokens.toLocaleString().padStart(8)} (TOX)  |  Compression: ${tokenCompression.padStart(6)}%`);
  console.log(`  Time: encode ${encodeMs.toFixed(2)}ms  |  decode ${decodeMs.toFixed(2)}ms`);
  console.log(`  Dictionaries: $dict=${dictSize}, $pathDict=${pathDictSize}, $shapes=${shapesDictSize}, $valDict=${valDictSize}`);
  if (Object.keys(features).length > 0) {
    console.log(`  Features: ${Object.keys(features).filter(k => features[k]).join(', ')}`);
  }
  console.log(`  Structure: ${structure.uniqueKeys}/${structure.totalKeys} unique keys (${(structure.keyUniquenessRatio * 100).toFixed(1)}%)`);
  console.log(`  Path-like strings: ${structure.pathLikeCount}/${structure.totalStrings} (${(structure.pathLikeRatio * 100).toFixed(1)}%)`);
  console.log();
  
  results.push({
    name,
    jsonSize,
    toxSize,
    compression: parseFloat(compression),
    jsonTokens: jsonTokens.jsonTokens,
    toxTokens: toxTokens.jsonTokens,
    tokenCompression: parseFloat(tokenCompression),
    encodeMs,
    decodeMs,
    dictSize,
    structure,
  });
  
  totalJson += jsonSize;
  totalTox += toxSize;
}

const totalCompression = totalJson > 0 ? ((1 - totalTox / totalJson) * 100).toFixed(1) : '0.0';
const totalJsonTokens = results.reduce((sum, r) => sum + r.jsonTokens, 0);
const totalToxTokens = results.reduce((sum, r) => sum + r.toxTokens, 0);
const totalTokenCompression = totalJsonTokens > 0 ? ((1 - totalToxTokens / totalJsonTokens) * 100).toFixed(1) : '0.0';
const totalEncodeMs = results.reduce((sum, r) => sum + r.encodeMs, 0);
const totalDecodeMs = results.reduce((sum, r) => sum + r.decodeMs, 0);

console.log('=== Summary ===');
console.log(`Total JSON: ${totalJson.toLocaleString()} bytes  |  TOX: ${totalTox.toLocaleString()} bytes  |  Compression: ${totalCompression}%`);
console.log(`Total Tokens: ${totalJsonTokens.toLocaleString()} (JSON)  |  ${totalToxTokens.toLocaleString()} (TOX)  |  Compression: ${totalTokenCompression}%`);
console.log(`Total Time: encode ${totalEncodeMs.toFixed(2)}ms  |  decode ${totalDecodeMs.toFixed(2)}ms`);
console.log();

// Check thresholds
console.log('=== Threshold Check ===');
console.log('Target: externals/docs/meta ≥35%, impact/chain ≥25%');
console.log();

const largeFixtures = results.filter(r => r.jsonSize >= 2000);
if (largeFixtures.length > 0) {
  console.log('=== Large Fixtures Analysis (≥2KB) ===');
  for (const r of largeFixtures) {
    const pathsRatio = r.structure.pathLikeRatio;
    const keyUniqueness = r.structure.keyUniquenessRatio;
    console.log(`${r.name}:`);
    console.log(`  Compression: ${r.compression.toFixed(1)}% (bytes), ${r.tokenCompression.toFixed(1)}% (tokens)`);
    console.log(`  Path-like ratio: ${(pathsRatio * 100).toFixed(1)}% (${pathsRatio >= 0.15 ? '✓ PathPool candidate' : '✗'})`);
    console.log(`  Key uniqueness: ${(keyUniqueness * 100).toFixed(1)}% (${keyUniqueness < 0.5 ? '✓ Dictionary-friendly' : '✗ too unique'})`);
    console.log();
  }
}

console.log('=== Notes ===');
console.log('• Small mock fixtures (< 1KB) show negative compression due to TOX metadata overhead');
console.log('• Real fixtures (api-index, docs-index) show modest compression (0-4%)');
console.log('• These data structures have many unique keys (file paths), limiting dictionary benefits');
console.log('• Better compression expected with PathPool (pathsRatio ≥ 15%) and ShapePool (uniform arrays)');
console.log('• Token compression often better than byte compression for LLM-friendly formats');
