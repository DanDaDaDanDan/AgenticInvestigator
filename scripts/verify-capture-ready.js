#!/usr/bin/env node
/**
 * verify-capture-ready.js - Quick check if capture threshold is met
 *
 * Fast verification that can run before synthesis to ensure evidence is captured.
 * Exits 0 if threshold met, exits 1 if not.
 *
 * Usage:
 *   node verify-capture-ready.js <case_dir>
 *   node verify-capture-ready.js <case_dir> --threshold 0.9
 *
 * Default threshold: from scripts/config.js (capture_ready)
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node scripts/verify-capture-ready.js <case_dir> [--threshold 1.0]');
  process.exit(1);
}

const caseDir = args[0];

// Parse threshold argument
let threshold = 1.0;
try {
  const config = require('./config');
  if (typeof config?.thresholds?.capture_ready === 'number') {
    threshold = config.thresholds.capture_ready;
  }
} catch (_) {}

const thresholdIdx = args.indexOf('--threshold');
if (thresholdIdx !== -1 && args[thresholdIdx + 1]) {
  threshold = parseFloat(args[thresholdIdx + 1]);
}

// Find all [SXXX] citations in markdown files
function findCitedSources(caseDir) {
  const citations = new Set();
  const mdPattern = /\[S(\d{3,4})\]/g;

  const filesToScan = [
    'summary.md',
    'fact-check.md',
    'people.md',
    'organizations.md',
    'timeline.md',
    'theories.md',
    'positions.md',
    'statements.md'
  ];

  // Also scan findings/ directory
  const findingsDir = path.join(caseDir, 'findings');
  if (fs.existsSync(findingsDir)) {
    const files = fs.readdirSync(findingsDir);
    for (const file of files) {
      if (file.endsWith('.md')) {
        filesToScan.push(`findings/${file}`);
      }
    }
  }

  for (const file of filesToScan) {
    const filePath = path.join(caseDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      let match;
      while ((match = mdPattern.exec(content)) !== null) {
        citations.add(`S${match[1]}`);
      }
    }
  }

  return citations;
}

// Find all captured sources in evidence/web/
function findCapturedSources(caseDir) {
  const captured = new Set();
  const evidenceDir = path.join(caseDir, 'evidence', 'web');

  if (!fs.existsSync(evidenceDir)) {
    return captured;
  }

  const folders = fs.readdirSync(evidenceDir);
  for (const folder of folders) {
    if (folder.match(/^S\d{3,4}$/)) {
      const folderPath = path.join(evidenceDir, folder);
      const metadataPath = path.join(folderPath, 'metadata.json');

      // Only count as captured if metadata.json exists
      if (fs.existsSync(metadataPath)) {
        captured.add(folder);
      }
    }
  }

  return captured;
}

// Main verification
const cited = findCitedSources(caseDir);
const captured = findCapturedSources(caseDir);

// Find missing sources
const missing = [...cited].filter(s => !captured.has(s));
const capturedCited = [...cited].filter(s => captured.has(s));

const total = cited.size;
const capturedCount = capturedCited.length;
const percentage = total > 0 ? capturedCount / total : 1;

console.log(`\nCapture Verification: ${caseDir}`);
console.log(`${'='.repeat(50)}`);
console.log(`\nSources cited: ${total}`);
console.log(`Sources captured: ${capturedCount}`);
console.log(`Capture rate: ${(percentage * 100).toFixed(1)}%`);
console.log(`Threshold: ${(threshold * 100).toFixed(0)}%`);

if (missing.length > 0) {
  console.log(`\nMissing evidence (${missing.length}):`);
  for (const s of missing.sort()) {
    console.log(`  - ${s}`);
  }
}

if (percentage >= threshold) {
  console.log(`\nPASS: Capture threshold met`);
  process.exit(0);
} else {
  console.log(`\nFAIL: Capture threshold NOT met`);
  console.log(`\nRequired: ${Math.ceil(total * threshold)} captured`);
  console.log(`Current: ${capturedCount} captured`);
  console.log(`Need ${Math.ceil(total * threshold) - capturedCount} more sources captured`);
  process.exit(1);
}
