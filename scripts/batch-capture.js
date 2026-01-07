#!/usr/bin/env node
/**
 * batch-capture.js - Batch capture URLs from a list file
 *
 * Usage: node batch-capture.js <url-list-file> <case-dir> [--start=N] [--limit=N]
 *
 * URL list format (one per line):
 *   SOURCE_ID|URL|TITLE
 *   # Comments start with #
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node batch-capture.js <url-list-file> <case-dir> [--start=N] [--limit=N]');
  process.exit(1);
}

const urlListFile = args[0];
const caseDir = args[1];

// Parse options
let startIndex = 0;
let limit = Infinity;
for (const arg of args.slice(2)) {
  if (arg.startsWith('--start=')) {
    startIndex = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--limit=')) {
    limit = parseInt(arg.split('=')[1], 10);
  }
}

const SCRIPT_DIR = __dirname;

// Read and parse URL list
const content = fs.readFileSync(urlListFile, 'utf-8');
const lines = content.split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'));

const entries = [];
for (const line of lines) {
  const parts = line.split('|');
  if (parts.length >= 2) {
    entries.push({
      sourceId: parts[0].trim(),
      url: parts[1].trim(),
      title: parts[2] ? parts[2].trim() : ''
    });
  }
}

console.log(`Found ${entries.length} URLs to capture`);
console.log(`Starting from index ${startIndex}, limit ${limit}`);
console.log('');

const toCapture = entries.slice(startIndex, startIndex + limit);
const results = {
  success: [],
  failed: [],
  skipped: []
};

async function captureUrl(entry, index, total) {
  const { sourceId, url, title } = entry;
  const evidenceDir = path.join(caseDir, 'evidence', 'web', sourceId);

  // Check if already captured
  if (fs.existsSync(path.join(evidenceDir, 'metadata.json'))) {
    console.log(`[${index + 1}/${total}] SKIP ${sourceId} - already captured`);
    results.skipped.push(entry);
    return;
  }

  console.log(`[${index + 1}/${total}] Capturing ${sourceId}: ${url.substring(0, 60)}...`);

  return new Promise((resolve) => {
    const proc = spawn('node', [
      path.join(SCRIPT_DIR, 'capture-url.js'),
      sourceId,
      url,
      evidenceDir
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0 || fs.existsSync(path.join(evidenceDir, 'metadata.json'))) {
        console.log(`  ✓ ${sourceId} captured`);
        results.success.push(entry);
      } else {
        console.log(`  ✗ ${sourceId} FAILED: ${stderr.substring(0, 100)}`);
        results.failed.push({ ...entry, error: stderr.substring(0, 200) });
      }
      resolve();
    });

    proc.on('error', (err) => {
      console.log(`  ✗ ${sourceId} ERROR: ${err.message}`);
      results.failed.push({ ...entry, error: err.message });
      resolve();
    });
  });
}

async function main() {
  const startTime = Date.now();

  for (let i = 0; i < toCapture.length; i++) {
    await captureUrl(toCapture[i], i, toCapture.length);

    // Small delay between captures to be nice to servers
    if (i < toCapture.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('='.repeat(60));
  console.log('BATCH CAPTURE SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total time: ${elapsed}s`);
  console.log(`Success: ${results.success.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('');
    console.log('Failed captures:');
    for (const f of results.failed) {
      console.log(`  ${f.sourceId}: ${f.url}`);
      console.log(`    Error: ${f.error}`);
    }
  }

  // Write results to file
  const resultsFile = path.join(caseDir, 'capture-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    elapsed_seconds: parseFloat(elapsed),
    results
  }, null, 2));
  console.log(`\nResults saved to: ${resultsFile}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
