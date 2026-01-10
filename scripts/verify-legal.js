#!/usr/bin/env node
/**
 * verify-legal.js - Mechanical legal risk checks
 *
 * Intended for generate-gaps.js consumption.
 *
 * Usage:
 *   node verify-legal.js <case_dir>
 *   node verify-legal.js <case_dir> --json
 */

'use strict';

const fs = require('fs');
const path = require('path');

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    caseDir: args.find(a => !a.startsWith('--')),
    jsonOutput: args.includes('--json')
  };
}

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

function run(caseDir) {
  const startTime = Date.now();
  const gaps = [];
  const stats = {
    legal_review_present: false,
    wording_risks: 0,
    privacy_risks: 0
  };

  const legalReviewPath = path.join(caseDir, 'legal-review.md');
  const legalReview = readIfExists(legalReviewPath);
  if (!legalReview) {
    gaps.push({
      type: 'LEGAL_REVIEW_MISSING',
      object: { file: 'legal-review.md' },
      message: 'legal-review.md not found (termination gate requires legal review)',
      suggested_actions: ['run_legal_review']
    });
  } else {
    stats.legal_review_present = true;
    const upper = legalReview.toUpperCase();
    if (upper.includes('NOT READY')) {
      gaps.push({
        type: 'LEGAL_DEFAMATION_RISK',
        object: { file: 'legal-review.md' },
        message: 'legal-review.md indicates NOT READY',
        suggested_actions: ['address_legal_review', 'revise_language', 'add_attribution']
      });
    }
  }

  const summaryPath = path.join(caseDir, 'summary.md');
  const summary = readIfExists(summaryPath);
  if (summary) {
    const lines = summary.split('\n');

    const riskPatterns = [
      { pattern: /\bcommitted fraud\b/i, issue: 'States fraud as fact' },
      { pattern: /\bstole\b/i, issue: 'States theft as fact' },
      { pattern: /\bcriminal\b/i, issue: 'Criminal accusation' },
      { pattern: /\bguilty\b/i, issue: 'States guilt as fact' },
      { pattern: /\bcorrupt\b/i, issue: 'Corruption accusation' }
    ];

    const attributionPatterns = [
      /according to/i,
      /alleged/i,
      /reportedly/i,
      /claims that/i,
      /accused of/i,
      /said/i
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, issue } of riskPatterns) {
        if (!pattern.test(line)) continue;
        const hasAttribution = attributionPatterns.some(p => p.test(line));
        if (!hasAttribution) {
          stats.wording_risks++;
          gaps.push({
            type: 'LEGAL_WORDING_RISK',
            object: { file: 'summary.md', line: i + 1 },
            message: `${issue} without attribution on line ${i + 1}`,
            suggested_actions: ['add_attribution', 'revise_language']
          });
        }
      }
    }

    const piiPatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, issue: 'SSN-like pattern detected' },
      { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, issue: 'Phone number-like pattern detected' },
      { pattern: /\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr)\b/i, issue: 'Address-like pattern detected' }
    ];

    for (const { pattern, issue } of piiPatterns) {
      if (!pattern.test(summary)) continue;
      stats.privacy_risks++;
      gaps.push({
        type: 'PRIVACY_RISK',
        object: { file: 'summary.md' },
        message: issue,
        suggested_actions: ['remove_pii', 'anonymize']
      });
    }
  }

  const passed = gaps.length === 0;
  const output = {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed,
    stats,
    gaps
  };

  return output;
}

function printHuman(output) {
  console.log('='.repeat(60));
  console.log('Legal Verification');
  console.log('='.repeat(60));
  console.log(`Case: ${output.case_dir}`);
  console.log('');
  console.log(output.passed ? 'PASS: no legal gaps detected' : `FAIL: ${output.gaps.length} gap(s) detected`);
}

function cli() {
  const { caseDir, jsonOutput } = parseCliArgs(process.argv);
  if (!caseDir) {
    console.error('Usage: node verify-legal.js <case_dir> [--json]');
    process.exit(1);
  }

  const output = run(caseDir);
  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printHuman(output);
  }

  process.exit(output.passed ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  cli();
}
