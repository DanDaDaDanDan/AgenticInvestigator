#!/usr/bin/env node
/**
 * Extract failed verification prompts for reprocessing
 */

const fs = require('fs');
const path = require('path');

const caseDir = process.argv[2] || 'cases/ice-in-minnesota-from-agent-culture-to-tragic-consequences';

// Find failed indices
const responseFiles = [
  'verification-responses-batch2.json',
  'verification-responses-batch-2.json',
  'verification-responses-batch3.json',
  'verification-responses-batch-3.json'
];

const failed = new Set();
for (const f of responseFiles) {
  try {
    const filePath = path.join(caseDir, f);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const responses = Array.isArray(data) ? data : data.responses;
    for (const r of responses) {
      if (r.response && r.response.includes('Prompt needs processing')) {
        failed.add(r.index);
      }
    }
  } catch(e) {}
}

console.log(`Found ${failed.size} failed prompts to reprocess`);

// Load batch files to get prompts
const batchFiles = [
  'verification-batch-1.json',
  'verification-batch-2.json',
  'verification-batch-3.json'
];

const allPrompts = [];
for (const f of batchFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(caseDir, f), 'utf8'));
    allPrompts.push(...data.prompts);
  } catch(e) {}
}

// Extract failed prompts
const failedPrompts = [];
for (const idx of [...failed].sort((a,b) => a-b)) {
  const prompt = allPrompts.find(p => p.index === idx);
  if (prompt) {
    failedPrompts.push({
      index: idx,
      promptLength: prompt.prompt.length,
      prompt: prompt.prompt
    });
  }
}

// Output for processing
const outputPath = path.join(caseDir, 'failed-prompts.json');
fs.writeFileSync(outputPath, JSON.stringify(failedPrompts, null, 2));
console.log(`Wrote ${failedPrompts.length} prompts to ${outputPath}`);

// Show summary
console.log('\nPrompt sizes:');
for (const p of failedPrompts) {
  console.log(`  ${p.index}: ${(p.promptLength / 1024).toFixed(1)} KB`);
}
