#!/usr/bin/env node
/**
 * check-continue.js - Gate checker for orchestrator continuation
 *
 * Reads state.json and outputs continuation signal.
 * Called by /action after each command to tell orchestrator what to do next.
 *
 * Usage: node scripts/check-continue.js [case-path]
 *
 * Output format:
 * ═══════════════════════════════════════════════════════
 * ORCHESTRATOR SIGNAL
 * ═══════════════════════════════════════════════════════
 * Status: CONTINUE | COMPLETE
 * Phase: <current phase>
 * Next: <next action to take>
 * Gates: X/6 passing
 * ═══════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

function findCasePath(providedPath) {
  // If path provided, use it
  if (providedPath) {
    const statePath = path.join(providedPath, 'state.json');
    if (fs.existsSync(statePath)) {
      return providedPath;
    }
  }

  // Look for cases directory
  const casesDir = path.join(process.cwd(), 'cases');
  if (!fs.existsSync(casesDir)) {
    return null;
  }

  // Find most recently modified case
  const cases = fs.readdirSync(casesDir)
    .map(name => ({
      name,
      path: path.join(casesDir, name),
      mtime: fs.statSync(path.join(casesDir, name)).mtime
    }))
    .filter(c => fs.existsSync(path.join(c.path, 'state.json')))
    .sort((a, b) => b.mtime - a.mtime);

  return cases.length > 0 ? cases[0].path : null;
}

function countPassingGates(gates) {
  return Object.values(gates).filter(Boolean).length;
}

function determineNextAction(state) {
  const { phase, gates } = state;

  // Check if all gates pass
  const allGatesPass = Object.values(gates).every(Boolean);
  if (allGatesPass) {
    return { status: 'COMPLETE', next: null, reason: 'All 6 gates passing' };
  }

  // Determine next action based on phase
  switch (phase) {
    case 'BOOTSTRAP':
      return {
        status: 'CONTINUE',
        next: '/action research',
        reason: 'Bootstrap phase - need initial research'
      };

    case 'QUESTION':
      if (!gates.questions) {
        // Check which batch to run (would need leads.json to determine)
        return {
          status: 'CONTINUE',
          next: '/action question',
          reason: 'Questions phase - answer framework questions'
        };
      }
      return {
        status: 'CONTINUE',
        next: 'Update phase to FOLLOW',
        reason: 'Questions complete, move to FOLLOW phase'
      };

    case 'FOLLOW':
      if (!gates.curiosity) {
        return {
          status: 'CONTINUE',
          next: '/action follow OR /action curiosity',
          reason: 'Follow phase - pursue leads until curiosity satisfied'
        };
      }
      return {
        status: 'CONTINUE',
        next: 'Update phase to WRITE',
        reason: 'Curiosity satisfied, move to WRITE phase'
      };

    case 'WRITE':
      if (!gates.article) {
        return {
          status: 'CONTINUE',
          next: '/action article',
          reason: 'Write phase - generate articles'
        };
      }
      return {
        status: 'CONTINUE',
        next: 'Update phase to VERIFY',
        reason: 'Article complete, move to VERIFY phase'
      };

    case 'VERIFY':
      // Check which gates are failing
      const failingGates = Object.entries(gates)
        .filter(([_, v]) => !v)
        .map(([k, _]) => k);

      if (failingGates.length > 0) {
        return {
          status: 'CONTINUE',
          next: `/action verify (failing: ${failingGates.join(', ')})`,
          reason: 'Verify phase - fix failing gates'
        };
      }
      return { status: 'COMPLETE', next: null, reason: 'All gates pass' };

    case 'COMPLETE':
      return { status: 'COMPLETE', next: null, reason: 'Investigation complete' };

    default:
      return {
        status: 'CONTINUE',
        next: '/action verify',
        reason: `Unknown phase: ${phase}`
      };
  }
}

function main() {
  const args = process.argv.slice(2);
  const casePath = findCasePath(args[0]);

  if (!casePath) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('ORCHESTRATOR SIGNAL');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Status: ERROR');
    console.log('Reason: No active case found');
    console.log('Next: /investigate --new [topic]');
    console.log('═══════════════════════════════════════════════════════');
    process.exit(1);
  }

  const statePath = path.join(casePath, 'state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

  const passingGates = countPassingGates(state.gates);
  const result = determineNextAction(state);

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('ORCHESTRATOR SIGNAL');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Case: ${state.case}`);
  console.log(`Phase: ${state.phase}`);
  console.log(`Iteration: ${state.iteration}`);
  console.log(`Gates: ${passingGates}/6 passing`);
  console.log('───────────────────────────────────────────────────────');

  if (result.status === 'COMPLETE') {
    console.log('Status: ✓ COMPLETE');
    console.log(`Reason: ${result.reason}`);
    console.log('');
    console.log('Investigation finished. All 6 gates pass.');
  } else {
    console.log('Status: → CONTINUE');
    console.log(`Reason: ${result.reason}`);
    console.log(`Next: ${result.next}`);
    console.log('');
    console.log('DO NOT STOP. Execute the next action immediately.');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Exit with 0 for CONTINUE, 1 for COMPLETE (so scripts can check)
  process.exit(result.status === 'COMPLETE' ? 0 : 2);
}

main();
