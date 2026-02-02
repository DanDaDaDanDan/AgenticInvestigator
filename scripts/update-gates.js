#!/usr/bin/env node
/**
 * update-gates.js - Derive gates from artifacts and deterministic checks, and optionally write state.json.
 *
 * Usage:
 *   node scripts/update-gates.js cases/<case-id> [--json] [--write] [--strict]
 *
 * Notes:
 * - If EVIDENCE_RECEIPT_KEY is configured, cryptographic receipts are enforced by default for cited sources.
 * - --strict can be used to explicitly enable receipt enforcement (and is still required to enforce receipts
 *   when EVIDENCE_RECEIPT_KEY is not set).
 * - Gate 5 is strict: requires deterministic preflight + semantic-verification.json + compute-verification.json.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { deriveAllGates } = require('./gates');

function printUsage() {
  console.log('update-gates.js - derive gate statuses from artifacts');
  console.log('');
  console.log('Usage: node scripts/update-gates.js <case_dir> [--json] [--write] [--strict]');
}

function main() {
  const args = process.argv.slice(2);
  const caseDir = args.find(a => !a.startsWith('--'));
  const jsonOutput = args.includes('--json');
  const write = args.includes('--write');
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

  const derived = deriveAllGates(caseDir, { strict });

  const statePath = path.join(caseDir, 'state.json');
  const stateText = fs.existsSync(statePath) ? fs.readFileSync(statePath, 'utf-8') : null;
  const state = stateText ? JSON.parse(stateText) : null;

  let changed = false;
  if (state && state.gates && write) {
    for (const [k, v] of Object.entries(derived.gates)) {
      if (state.gates[k] !== v) {
        state.gates[k] = v;
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    }
  }

  const out = {
    caseDir,
    strict,
    strictRequested,
    receiptKeyConfigured,
    derived: derived.gates,
    changed: write ? changed : false,
    details: derived.details
  };

  if (jsonOutput) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log('='.repeat(70));
    console.log('GATE DERIVATION');
    console.log('='.repeat(70));
    console.log(`Case: ${caseDir}`);
    console.log(`Strict receipts: ${strict ? 'ON' : 'OFF'}${receiptKeyConfigured && !strictRequested ? ' (env)' : ''}`);
    console.log(`Write state.json: ${write ? (changed ? 'YES (updated)' : 'YES (no changes)') : 'NO'}`);
    console.log('');
    for (const [k, v] of Object.entries(derived.gates)) {
      console.log(`${k.padEnd(13)} ${v ? 'PASS' : 'FAIL'}`);
    }
    console.log('='.repeat(70));
  }

  process.exit(Object.values(derived.gates).every(Boolean) ? 0 : 1);
}

if (require.main === module) {
  main();
}
