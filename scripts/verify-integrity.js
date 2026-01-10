#!/usr/bin/env node
/**
 * verify-integrity.js - Verify ledger consistency and file ownership invariants.
 *
 * This verifier is intended for generate-gaps.js consumption.
 *
 * Checks:
 * - ledger.json exists and is valid JSON with an entries array
 * - ledger entry ids are unique and monotonically increasing (L001, L002, ...)
 * - file_lock/file_unlock pairs are balanced (no outstanding locks)
 *
 * Usage:
 *   node scripts/verify-integrity.js <case_dir>
 *   node scripts/verify-integrity.js <case_dir> --json
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

function readJsonSafe(filePath) {
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(filePath, 'utf-8')) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function parseLedgerId(id) {
  const m = typeof id === 'string' ? id.match(/^L(\d{3,})$/) : null;
  return m ? Number(m[1]) : null;
}

function run(caseDir) {
  const startTime = Date.now();
  const gaps = [];

  const ledgerPath = path.join(caseDir, 'ledger.json');
  if (!fs.existsSync(ledgerPath)) {
    gaps.push({
      type: 'INTEGRITY_VIOLATION',
      object: { file: 'ledger.json' },
      message: 'ledger.json not found (append-only audit trail is missing)',
      suggested_actions: ['initialize_ledger', 'run_ledger_append_init']
    });

    return {
      timestamp: new Date().toISOString(),
      case_dir: caseDir,
      duration_ms: Date.now() - startTime,
      passed: false,
      reason: 'ledger.json missing',
      stats: { entries: 0, outstanding_locks: 0, id_gaps: 0, id_duplicates: 0 },
      gaps
    };
  }

  const parsed = readJsonSafe(ledgerPath);
  if (!parsed.ok) {
    gaps.push({
      type: 'INTEGRITY_VIOLATION',
      object: { file: 'ledger.json' },
      message: `ledger.json parse error: ${parsed.error}`,
      suggested_actions: ['fix_ledger_json']
    });
    return {
      timestamp: new Date().toISOString(),
      case_dir: caseDir,
      duration_ms: Date.now() - startTime,
      passed: false,
      reason: 'ledger.json invalid JSON',
      stats: { entries: 0, outstanding_locks: 0, id_gaps: 0, id_duplicates: 0 },
      gaps
    };
  }

  const ledger = parsed.data;
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  if (!Array.isArray(ledger?.entries)) {
    gaps.push({
      type: 'INTEGRITY_VIOLATION',
      object: { file: 'ledger.json', field: 'entries' },
      message: 'ledger.json missing `entries` array',
      suggested_actions: ['fix_ledger_schema']
    });
  }

  const seenIds = new Set();
  const numericIds = [];
  let duplicates = 0;

  for (const entry of entries) {
    const id = entry?.id;
    if (typeof id !== 'string') continue;
    if (seenIds.has(id)) duplicates++;
    seenIds.add(id);

    const n = parseLedgerId(id);
    if (n !== null) numericIds.push(n);
  }

  if (duplicates > 0) {
    gaps.push({
      type: 'INTEGRITY_VIOLATION',
      object: { file: 'ledger.json', duplicates },
      message: `ledger.json contains ${duplicates} duplicate entry id(s)`,
      suggested_actions: ['deduplicate_ledger_ids']
    });
  }

  numericIds.sort((a, b) => a - b);
  let idGaps = 0;
  for (let i = 1; i < numericIds.length; i++) {
    if (numericIds[i] === numericIds[i - 1]) continue;
    const expected = numericIds[i - 1] + 1;
    if (numericIds[i] !== expected) {
      idGaps++;
    }
  }

  if (idGaps > 0) {
    gaps.push({
      type: 'INTEGRITY_VIOLATION',
      object: { file: 'ledger.json', id_gaps: idGaps },
      message: `ledger.json has ${idGaps} discontinuity gap(s) in L### ids (non-fatal but suspicious)`,
      suggested_actions: ['inspect_ledger_generation']
    });
  }

  // File lock/unlock balance
  const locks = new Map(); // file -> { agent, ts, entryId }
  for (const entry of entries) {
    const type = entry?.type;
    if (type !== 'file_lock' && type !== 'file_unlock') continue;
    const file = typeof entry?.file === 'string' ? entry.file : null;
    if (!file) continue;
    const agent = typeof entry?.agent === 'string' ? entry.agent : null;
    const ts = typeof entry?.ts === 'string' ? entry.ts : null;
    const entryId = typeof entry?.id === 'string' ? entry.id : null;

    if (type === 'file_lock') {
      locks.set(file, { agent, ts, entryId });
    } else if (type === 'file_unlock') {
      locks.delete(file);
    }
  }

  const outstanding = Array.from(locks.entries());
  if (outstanding.length > 0) {
    gaps.push({
      type: 'INTEGRITY_VIOLATION',
      object: { outstanding_locks: outstanding.map(([file, info]) => ({ file, agent: info.agent || null, ts: info.ts || null })) },
      message: `${outstanding.length} file lock(s) remain without matching unlock`,
      suggested_actions: ['release_file_locks', 'append_file_unlock']
    });
  }

  const passed = gaps.length === 0;
  return {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed,
    reason: passed ? 'Ledger and ownership checks passed' : `${gaps.length} integrity issue(s) found`,
    stats: {
      entries: entries.length,
      outstanding_locks: outstanding.length,
      id_gaps: idGaps,
      id_duplicates: duplicates
    },
    gaps
  };
}

function printHuman(output) {
  console.log('='.repeat(60));
  console.log('Integrity Verification');
  console.log('='.repeat(60));
  console.log(`Case: ${output.case_dir}`);
  console.log('');
  console.log(`Entries: ${output.stats.entries}`);
  console.log(`Outstanding locks: ${output.stats.outstanding_locks}`);
  console.log(`ID gaps: ${output.stats.id_gaps}`);
  console.log(`ID duplicates: ${output.stats.id_duplicates}`);
  console.log('');
  console.log(output.passed ? 'PASS' : `FAIL (${output.gaps.length} gap(s))`);
  if (!output.passed) {
    for (const gap of output.gaps.slice(0, 25)) {
      console.log(`- ${gap.message}`);
    }
  }
}

function cli() {
  const parsed = parseCliArgs(process.argv);
  if (!parsed.caseDir) {
    console.error('Usage: node scripts/verify-integrity.js <case_dir> [--json]');
    process.exit(1);
  }

  const output = run(parsed.caseDir);
  if (parsed.jsonOutput) console.log(JSON.stringify(output, null, 2));
  else printHuman(output);
  process.exit(output.passed ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  cli();
}

