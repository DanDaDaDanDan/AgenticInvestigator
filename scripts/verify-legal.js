#!/usr/bin/env node
/**
 * verify-legal.js - Structural legal verification checks
 *
 * ARCHITECTURE NOTE:
 * This script handles STRUCTURAL checks only:
 * - Does legal-review.md exist?
 * - Does it indicate NOT READY?
 *
 * SEMANTIC checks (legal risk language, PII detection) are handled by
 * LLM verification via Gemini 3 Pro MCP calls. See .claude/commands/verify.md
 * and .claude/commands/legal-review.md for semantic verification criteria.
 *
 * Usage:
 *   node scripts/verify-legal.js <case_dir>
 *   node scripts/verify-legal.js <case_dir> --json
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
    legal_review_ready: false
  };

  // Structural check 1: Does legal-review.md exist?
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

    // Structural check 2: Does it indicate NOT READY?
    const upper = legalReview.toUpperCase();
    if (upper.includes('NOT READY')) {
      gaps.push({
        type: 'LEGAL_DEFAMATION_RISK',
        object: { file: 'legal-review.md' },
        message: 'legal-review.md indicates NOT READY',
        suggested_actions: ['address_legal_review', 'revise_language', 'add_attribution']
      });
    } else {
      stats.legal_review_ready = true;
    }
  }

  // NOTE: Semantic checks (legal wording risk, PII detection) are NOT done here.
  // Those checks are performed by LLM verification via Gemini 3 Pro MCP calls.
  // See .claude/commands/verify.md for the verification flow.

  const passed = gaps.length === 0;
  const output = {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed,
    stats,
    gaps,
    note: 'Semantic checks (legal wording, PII) handled by LLM verification'
  };

  return output;
}

function printHuman(output) {
  console.log('='.repeat(60));
  console.log('Legal Verification (Structural)');
  console.log('='.repeat(60));
  console.log(`Case: ${output.case_dir}`);
  console.log('');
  console.log(`Legal review present: ${output.stats.legal_review_present ? 'YES' : 'NO'}`);
  console.log(`Legal review ready: ${output.stats.legal_review_ready ? 'YES' : 'NO'}`);
  console.log('');
  console.log('NOTE: Semantic checks (legal wording, PII) are handled by');
  console.log('LLM verification via Gemini 3 Pro. Run /verify for full check.');
  console.log('');
  console.log(output.passed ? 'PASS: structural checks passed' : `FAIL: ${output.gaps.length} gap(s) detected`);
}

function cli() {
  const { caseDir, jsonOutput } = parseCliArgs(process.argv);
  if (!caseDir) {
    console.error('Usage: node scripts/verify-legal.js <case_dir> [--json]');
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
