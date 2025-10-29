#!/usr/bin/env node

import { encode } from '@byjohann/toon';
import fs from 'fs';
import path from 'path';

const fixturesDir = path.join(process.cwd(), 'packages/tox-bench/fixtures/mind');
const fixtures = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.json'));

// Token estimation - simple approximation
function estimateTokens(str) {
  // Rough approximation: ~4 chars per token
  return Math.ceil(str.length / 4);
}

console.log('=== TOON Compression Test on Mind Fixtures ===\n');

let totalJsonSize = 0;
let totalToxSize = 0;
let totalJsonTokens = 0;
let totalToxTokens = 0;

for (const file of fixtures) {
  const filePath = path.join(fixturesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  const jsonStr = JSON.stringify(data);
  const toonStr = encode(data);
  
  const jsonSize = jsonStr.length;
  const toonSize = toonStr.length;
  
  // Token estimation
  const jsonTokens = estimateTokens(jsonStr);
  const toonTokens = estimateTokens(toonStr);
  
  const byteCompression = ((1 - toonSize / jsonSize) * 100).toFixed(1);
  const tokenCompression = ((1 - toonTokens / jsonTokens) * 100).toFixed(1);
  
  totalJsonSize += jsonSize;
  totalToxSize += toonSize;
  totalJsonTokens += jsonTokens;
  totalToxTokens += toonTokens;
  
  const name = file.replace('.json', '');
  const status = parseFloat(tokenCompression) >= 0 ? '✅' : 
                 jsonSize < 1000 ? '⚠️' : '❌';
  
  console.log(`${status} ${name}:`);
  console.log(`  Bytes:  ${jsonSize.toLocaleString().padStart(10)} → ${toonSize.toLocaleString().padStart(10)} (${byteCompression.padStart(6)}%)`);
  console.log(`  Tokens: ${jsonTokens.toLocaleString().padStart(8)} → ${toonTokens.toLocaleString().padStart(8)} (${tokenCompression.padStart(6)}%)`);
  
  // Show sample for large files
  if (jsonSize > 2000) {
    console.log(`  Sample (first 200 chars): ${toonStr.substring(0, 200)}...`);
  }
  console.log();
}

console.log('=== Summary ===');
const overallByteCompression = ((1 - totalToxSize / totalJsonSize) * 100).toFixed(1);
const overallTokenCompression = ((1 - totalToxTokens / totalJsonTokens) * 100).toFixed(1);

console.log(`Total Bytes:  ${totalJsonSize.toLocaleString()} → ${totalToxSize.toLocaleString()} (${overallByteCompression}%)`);
console.log(`Total Tokens: ${totalJsonTokens.toLocaleString()} → ${totalToxTokens.toLocaleString()} (${overallTokenCompression}%)`);

