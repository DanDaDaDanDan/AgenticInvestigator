#!/usr/bin/env node
/**
 * gate5-preflight.js - Deterministic preflight checks for Gate 5 (Sources)
 *
 * Runs all non-LLM checks that should block publication:
 * - Findings hygiene (duplicate IDs / non-canonical filenames)
 * - Citation integrity (sources.json + evidence integrity via verify-source)
 * - Evidence integrity for cited sources (verify-source --check-article)
 * - Numeric citation hygiene (audit-numerics)
 *
 * Usage:
 *   node scripts/gate5-preflight.js <case_dir> [--json] [--strict]
 *
 * Notes:
 * - If EVIDENCE_RECEIPT_KEY is configured, cryptographic receipts are enforced by default for cited sources.
 * - --strict can be used to explicitly enable receipt enforcement (and is still required to enforce receipts
 *   when EVIDENCE_RECEIPT_KEY is not set).
 * - This script does NOT run LLM semantic verification; it is a deterministic preflight only.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { auditFindings } = require('./audit-findings');
const { auditCitations } = require('./audit-citations');
const { verifyArticleSources } = require('./verify-source');
const { auditFile } = require('./audit-numerics');

function printUsage() {
  console.log('gate5-preflight.js - Deterministic Gate 5 preflight checks');
  console.log('');
  console.log('Usage: node scripts/gate5-preflight.js <case_dir> [--json] [--strict]');
}

function main() {
  const args = process.argv.slice(2);
  const caseDir = args.find(a => !a.startsWith('--'));
  const jsonOutput = args.includes('--json');
  const strictRequested = args.includes('--strict');
  const receiptKeyConfigured = typeof process.env.EVIDENCE_RECEIPT_KEY === 'string' && process.env.EVIDENCE_RECEIPT_KEY.trim().length > 0;
  const strict = strictRequested || receiptKeyConfigured;

  if (!caseDir) {
    printUsage();
    process.exit(2);
  }
  if (!fs.existsSync(caseDir)) {
    console.error(`Case directory not found: ${caseDir}`);
    process.exit(2);
  }

  const findings = auditFindings(caseDir);
  const findingsOk = !findings.error &&
    (findings.summary?.errors || 0) === 0 &&
    (findings.duplicates || []).length === 0 &&
    (findings.manifest?.missingCanonicalInAssemblyOrder || []).length === 0;

  const citations = auditCitations(caseDir);
  const citationsOk = !!citations.allPassed;

  const sources = verifyArticleSources(caseDir, { strict });
  const sourcesOk = (sources.summary?.failed || 0) === 0 && (sources.summary?.missing || 0) === 0;

  const fullArticlePath = path.join(caseDir, 'articles', 'full.md');
  const numerics = fs.existsSync(fullArticlePath) ? auditFile(fullArticlePath) : { error: 'ARTICLE_NOT_FOUND' };
  const numericHardErrors = numerics.details ? numerics.details.filter(d => d.severity === 'error').length : 0;
  const numericsOk = !numerics.error && numericHardErrors === 0;

  const ok = findingsOk && citationsOk && sourcesOk && numericsOk;
  const out = {
    caseDir,
    strict,
    strictRequested,
    receiptKeyConfigured,
    ok,
    findings: {
      ok: findingsOk,
      summary: findings.summary,
      duplicates: findings.duplicates
    },
    citations: {
      ok: citationsOk,
      passed: citations.passed,
      failed: citations.failed,
      warnings: citations.warnings
    },
    sources: {
      ok: sourcesOk,
      summary: sources.summary
    },
    numerics: {
      ok: numericsOk,
      totalNumericSentences: numerics.totalNumericSentences,
      uncitedNumericSentences: numerics.uncitedNumericSentences,
      hardErrors: numericHardErrors
    }
  };

  if (jsonOutput) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log('='.repeat(70));
    console.log('GATE 5 PREFLIGHT');
    console.log('='.repeat(70));
    console.log(`Case: ${caseDir}`);
    console.log(`Strict receipts: ${strict ? 'ON' : 'OFF'}${receiptKeyConfigured && !strictRequested ? ' (env)' : ''}`);
    console.log(`Status: ${ok ? 'PASS' : 'FAIL'}`);
    console.log('');
    console.log(`Findings hygiene: ${findingsOk ? 'PASS' : 'FAIL'} (errors: ${findings.summary?.errors || 0}, dupIds: ${(findings.duplicates || []).length})`);
    console.log(`Citations audit:   ${citationsOk ? 'PASS' : 'FAIL'} (failed sources: ${citations.failed})`);
    console.log(`Evidence integrity:${sourcesOk ? 'PASS' : 'FAIL'} (failed: ${sources.summary?.failed || 0})`);
    console.log(`Numeric citations: ${numericsOk ? 'PASS' : 'FAIL'} (uncited numeric sentences: ${numerics.uncitedNumericSentences || 0})`);
    console.log('='.repeat(70));
  }

  process.exit(ok ? 0 : 1);
}

if (require.main === module) {
  main();
}
