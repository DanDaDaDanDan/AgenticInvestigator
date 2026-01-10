#!/usr/bin/env node
/**
 * active-case.js - Get/set/resolve the active case.
 *
 * Stores the active case id in `cases/.active` (repo root).
 *
 * Usage:
 *   node scripts/active-case.js get [--json]
 *   node scripts/active-case.js set <case-id> [--json]
 *   node scripts/active-case.js clear [--json]
 *   node scripts/active-case.js resolve [case-id|case_dir] [--json]
 *
 * Resolution order (resolve):
 *   1) explicit arg
 *   2) cases/.active
 *   3) error with hint
 */

'use strict';

const fs = require('fs');
const path = require('path');

function projectRoot() {
  return path.join(__dirname, '..');
}

function casesRoot() {
  return path.join(projectRoot(), 'cases');
}

function activeFilePath() {
  return path.join(casesRoot(), '.active');
}

function readActiveCaseId() {
  const filePath = activeFilePath();
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const trimmed = raw.trim();
  return trimmed ? trimmed : null;
}

function writeActiveCaseId(caseId) {
  if (typeof caseId !== 'string' || !caseId.trim()) {
    throw new Error('case-id must be a non-empty string');
  }
  fs.mkdirSync(casesRoot(), { recursive: true });
  fs.writeFileSync(activeFilePath(), `${caseId.trim()}\n`, 'utf-8');
}

function clearActiveCaseId() {
  const filePath = activeFilePath();
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

function resolveCaseDir(explicit) {
  if (explicit && typeof explicit === 'string') {
    const candidatePath = path.isAbsolute(explicit)
      ? explicit
      : path.join(projectRoot(), explicit);

    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
      return { caseDir: candidatePath, caseId: path.basename(candidatePath), source: 'arg_path' };
    }

    // Treat explicit arg as case id
    const byId = path.join(casesRoot(), explicit);
    if (fs.existsSync(byId) && fs.statSync(byId).isDirectory()) {
      return { caseDir: byId, caseId: explicit, source: 'arg_id' };
    }
  }

  const activeId = readActiveCaseId();
  if (activeId) {
    const byActive = path.join(casesRoot(), activeId);
    if (fs.existsSync(byActive) && fs.statSync(byActive).isDirectory()) {
      return { caseDir: byActive, caseId: activeId, source: 'active' };
    }
    return { error: `cases/.active points to missing directory: cases/${activeId}` };
  }

  return { error: 'No active case set (cases/.active missing). Run: node scripts/active-case.js set <case-id>' };
}

function parseCliArgs(argv) {
  const args = argv.slice(2);
  const jsonOutput = args.includes('--json');
  const positional = args.filter(a => !a.startsWith('--'));
  const command = positional[0];
  const value = positional[1];
  return { command, value, jsonOutput };
}

function printUsage() {
  console.log('active-case.js - Manage active case selection');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/active-case.js get [--json]');
  console.log('  node scripts/active-case.js set <case-id> [--json]');
  console.log('  node scripts/active-case.js clear [--json]');
  console.log('  node scripts/active-case.js resolve [case-id|case_dir] [--json]');
}

function main() {
  const { command, value, jsonOutput } = parseCliArgs(process.argv);
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    printUsage();
    process.exit(command ? 0 : 1);
  }

  try {
    if (command === 'get') {
      const caseId = readActiveCaseId();
      const out = { ok: Boolean(caseId), case_id: caseId, file: 'cases/.active' };
      if (jsonOutput) {
        console.log(JSON.stringify(out, null, 2));
      } else {
        if (caseId) console.log(caseId);
      }
      process.exit(caseId ? 0 : 1);
    }

    if (command === 'set') {
      if (!value) throw new Error('Missing <case-id>');
      writeActiveCaseId(value);
      const resolved = resolveCaseDir(value);
      const out = {
        ok: true,
        case_id: value,
        case_dir: resolved.caseDir || null,
        note: resolved.caseDir ? null : 'Case directory does not exist yet (will be created later).'
      };
      if (jsonOutput) {
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log(value);
      }
      process.exit(0);
    }

    if (command === 'clear') {
      clearActiveCaseId();
      const out = { ok: true, cleared: true, file: 'cases/.active' };
      if (jsonOutput) {
        console.log(JSON.stringify(out, null, 2));
      }
      process.exit(0);
    }

    if (command === 'resolve') {
      const resolved = resolveCaseDir(value);
      if (resolved.error) {
        if (jsonOutput) console.log(JSON.stringify({ ok: false, error: resolved.error }, null, 2));
        else console.error(`Error: ${resolved.error}`);
        process.exit(1);
      }
      const out = { ok: true, case_id: resolved.caseId, case_dir: resolved.caseDir, source: resolved.source };
      if (jsonOutput) console.log(JSON.stringify(out, null, 2));
      else console.log(resolved.caseDir);
      process.exit(0);
    }

    throw new Error(`Unknown command: ${command}`);
  } catch (e) {
    if (jsonOutput) console.log(JSON.stringify({ ok: false, error: e.message }, null, 2));
    else console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

