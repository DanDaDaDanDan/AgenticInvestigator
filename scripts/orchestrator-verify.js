#!/usr/bin/env node
/**
 * orchestrator-verify.js - Strict, summary-only verification wrapper for orchestrators.
 *
 * Runs:
 * - scripts/generate-gaps.js (writes control/gaps.json + control/digest.json)
 * - scripts/verify-all-gates.js (writes control/gate_results.json)
 *
 * Output is intentionally small: counts + gate names + file paths.
 *
 * Usage:
 *   node scripts/orchestrator-verify.js [case_dir|case_id] [--json] [--full]
 */

'use strict';

const fs = require('fs');
const path = require('path');

function projectRoot() {
  return path.join(__dirname, '..');
}

function readActiveCaseId() {
  const p = path.join(projectRoot(), 'cases', '.active');
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, 'utf-8').trim();
  return raw ? raw : null;
}

function looksLikeCaseDir(dir) {
  return fs.existsSync(path.join(dir, 'sources.md')) || fs.existsSync(path.join(dir, 'state.json'));
}

function resolveCaseDir(maybeCase) {
  if (maybeCase && typeof maybeCase === 'string') {
    const candidatePath = path.isAbsolute(maybeCase) ? maybeCase : path.join(projectRoot(), maybeCase);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) return candidatePath;

    const byId = path.join(projectRoot(), 'cases', maybeCase);
    if (fs.existsSync(byId) && fs.statSync(byId).isDirectory()) return byId;
  }

  const active = readActiveCaseId();
  if (active) {
    const byActive = path.join(projectRoot(), 'cases', active);
    if (fs.existsSync(byActive) && fs.statSync(byActive).isDirectory()) return byActive;
    throw new Error(`cases/.active points to missing directory: cases/${active}`);
  }

  const cwd = process.cwd();
  if (looksLikeCaseDir(cwd)) return cwd;

  throw new Error('Could not resolve case directory. Provide [case_dir|case_id] or set active case with: node scripts/active-case.js set <case-id>');
}

function parseCliArgs(argv) {
  const args = argv.slice(2);
  const positional = args.filter(a => !a.startsWith('--'));
  return {
    caseArg: positional[0] || null,
    jsonOutput: args.includes('--json'),
    full: args.includes('--full')
  };
}

function summarizeGaps(gapsOutput) {
  const blocking = Array.isArray(gapsOutput?.blocking) ? gapsOutput.blocking : [];
  const nonBlocking = Array.isArray(gapsOutput?.non_blocking) ? gapsOutput.non_blocking : [];

  const byType = {};
  for (const g of [...blocking, ...nonBlocking]) {
    byType[g.type] = (byType[g.type] || 0) + 1;
  }

  return {
    total: (gapsOutput?.stats?.total_gaps ?? (blocking.length + nonBlocking.length)),
    blocking: blocking.length,
    high: gapsOutput?.stats?.high_count ?? null,
    medium: gapsOutput?.stats?.medium_count ?? null,
    low: gapsOutput?.stats?.low_count ?? null,
    top_blocking: blocking.slice(0, 10).map(g => ({
      gap_id: g.gap_id,
      type: g.type,
      message: typeof g.message === 'string' ? g.message.slice(0, 200) : ''
    })),
    by_type: byType
  };
}

function summarizeGates(gatesOutput) {
  const gates = gatesOutput?.gates && typeof gatesOutput.gates === 'object' ? gatesOutput.gates : {};
  const failed = Array.isArray(gatesOutput?.blocking_gates) ? gatesOutput.blocking_gates : [];
  return {
    overall: gatesOutput?.overall === true,
    failed_gates: failed,
    failures: failed.slice(0, 20).map(g => ({
      gate: g,
      reason: typeof gates[g]?.reason === 'string' ? gates[g].reason.slice(0, 240) : null
    }))
  };
}

async function main() {
  const { caseArg, jsonOutput, full } = parseCliArgs(process.argv);
  const caseDir = resolveCaseDir(caseArg);

  const gapsOutput = await require('./generate-gaps').run(caseDir);
  const gatesOutput = await require('./verify-all-gates').run(caseDir);

  const summary = {
    case_dir: caseDir,
    gaps: summarizeGaps(gapsOutput),
    gates: summarizeGates(gatesOutput),
    paths: {
      gaps_json: path.join(caseDir, 'control', 'gaps.json'),
      digest_json: path.join(caseDir, 'control', 'digest.json'),
      gate_results_json: path.join(caseDir, 'control', 'gate_results.json')
    }
  };

  if (jsonOutput) {
    console.log(JSON.stringify(full ? { ...summary, gaps_output: gapsOutput, gates_output: gatesOutput } : summary, null, 2));
    process.exit(summary.gaps.blocking === 0 && summary.gates.overall ? 0 : 1);
  }

  console.log(`Case: ${summary.case_dir}`);
  console.log(`Blocking gaps: ${summary.gaps.blocking} (total ${summary.gaps.total})`);
  if (summary.gaps.blocking > 0) {
    for (const g of summary.gaps.top_blocking) {
      console.log(`- [${g.gap_id}] ${g.type}: ${g.message}`);
    }
  }
  console.log(`Gates: ${summary.gates.overall ? 'PASS' : 'FAIL'}`);
  if (!summary.gates.overall) {
    for (const f of summary.gates.failures) {
      console.log(`- ${f.gate}: ${f.reason || 'failed'}`);
    }
  }
  console.log(`gaps.json: ${summary.paths.gaps_json}`);
  console.log(`gate_results.json: ${summary.paths.gate_results_json}`);

  process.exit(summary.gaps.blocking === 0 && summary.gates.overall ? 0 : 1);
}

if (require.main === module) {
  main().catch(err => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}

