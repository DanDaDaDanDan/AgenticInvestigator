#!/usr/bin/env node
/**
 * check-continue.js - Gate checker for orchestrator continuation
 *
 * Reads state.json and leads.json to determine next action.
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
 * Gates: X/8 passing
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

function loadLeads(casePath) {
  const leadsPath = path.join(casePath, 'leads.json');
  if (!fs.existsSync(leadsPath)) {
    return { leads: [] };
  }
  return JSON.parse(fs.readFileSync(leadsPath, 'utf-8'));
}

function getNextPendingLead(leads) {
  // Priority order: HIGH first, then MEDIUM
  const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };

  const pendingLeads = leads
    .filter(l => l.status === 'pending')
    .sort((a, b) => {
      const aPriority = priorityOrder[a.priority] ?? 3;
      const bPriority = priorityOrder[b.priority] ?? 3;
      return aPriority - bPriority;
    });

  return pendingLeads.length > 0 ? pendingLeads[0] : null;
}

function countLeadsByStatus(leads) {
  const counts = { pending: 0, investigated: 0, dead_end: 0, total: leads.length };
  leads.forEach(l => {
    if (counts[l.status] !== undefined) {
      counts[l.status]++;
    }
  });
  return counts;
}

function determineNextAction(state, casePath) {
  const { phase, gates } = state;

  // Check if all gates pass
  const allGatesPass = Object.values(gates).every(Boolean);
  if (allGatesPass) {
    return { status: 'COMPLETE', next: null, reason: 'All 8 gates passing', leadInfo: null };
  }

  // Load leads for FOLLOW phase decisions
  const leadsData = loadLeads(casePath);
  const leads = leadsData.leads || [];
  const leadCounts = countLeadsByStatus(leads);

  // Determine next action based on phase
  switch (phase) {
    case 'PLAN':
      if (!gates.planning) {
        return {
          status: 'CONTINUE',
          next: '/action plan-investigation',
          reason: 'Plan phase - design investigation strategy',
          leadInfo: null
        };
      }
      return {
        status: 'CONTINUE',
        next: 'Update phase to BOOTSTRAP',
        reason: 'Planning complete, move to BOOTSTRAP phase',
        leadInfo: null
      };

    case 'BOOTSTRAP':
      return {
        status: 'CONTINUE',
        next: '/action research',
        reason: 'Bootstrap phase - need initial research',
        leadInfo: null
      };

    case 'QUESTION':
      if (!gates.questions) {
        return {
          status: 'CONTINUE',
          next: '/action question',
          reason: 'Questions phase - answer framework questions',
          leadInfo: null
        };
      }
      return {
        status: 'CONTINUE',
        next: 'Update phase to FOLLOW',
        reason: 'Questions complete, move to FOLLOW phase',
        leadInfo: null
      };

    case 'FOLLOW':
      // Check for pending leads - MUST pursue ALL before reconcile/curiosity
      const nextLead = getNextPendingLead(leads);

      if (nextLead) {
        // There are pending leads - MUST follow them
        return {
          status: 'CONTINUE',
          next: `/action follow ${nextLead.id}`,
          reason: `Pending lead: "${nextLead.lead}"`,
          leadInfo: {
            pending: leadCounts.pending,
            investigated: leadCounts.investigated,
            dead_end: leadCounts.dead_end,
            total: leadCounts.total,
            nextLead: nextLead
          }
        };
      }

      // All leads are terminal - first reconcile lead results with summary
      if (!gates.reconciliation) {
        return {
          status: 'CONTINUE',
          next: '/action reconcile',
          reason: 'All leads terminal - reconcile results with summary',
          leadInfo: {
            pending: 0,
            investigated: leadCounts.investigated,
            dead_end: leadCounts.dead_end,
            total: leadCounts.total
          }
        };
      }

      // After reconciliation - check curiosity
      if (!gates.curiosity) {
        return {
          status: 'CONTINUE',
          next: '/action curiosity',
          reason: 'Reconciled - evaluate completeness',
          leadInfo: {
            pending: 0,
            investigated: leadCounts.investigated,
            dead_end: leadCounts.dead_end,
            total: leadCounts.total
          }
        };
      }

      return {
        status: 'CONTINUE',
        next: 'Update phase to WRITE',
        reason: 'Curiosity satisfied, move to WRITE phase',
        leadInfo: null
      };

    case 'WRITE':
      if (!gates.article) {
        return {
          status: 'CONTINUE',
          next: '/action article',
          reason: 'Write phase - generate articles',
          leadInfo: null
        };
      }
      return {
        status: 'CONTINUE',
        next: 'Update phase to VERIFY',
        reason: 'Article complete, move to VERIFY phase',
        leadInfo: null
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
          reason: 'Verify phase - fix failing gates',
          leadInfo: null
        };
      }
      return { status: 'COMPLETE', next: null, reason: 'All gates pass', leadInfo: null };

    case 'COMPLETE':
      return { status: 'COMPLETE', next: null, reason: 'Investigation complete', leadInfo: null };

    default:
      return {
        status: 'CONTINUE',
        next: '/action verify',
        reason: `Unknown phase: ${phase}`,
        leadInfo: null
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
  const result = determineNextAction(state, casePath);

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('ORCHESTRATOR SIGNAL');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Case: ${state.case}`);
  console.log(`Phase: ${state.phase}`);
  console.log(`Iteration: ${state.iteration}`);
  console.log(`Gates: ${passingGates}/8 passing`);

  // Show lead status in FOLLOW phase
  if (result.leadInfo) {
    console.log('───────────────────────────────────────────────────────');
    console.log(`Leads: ${result.leadInfo.pending} pending, ${result.leadInfo.investigated} investigated, ${result.leadInfo.dead_end} dead_end`);
  }

  console.log('───────────────────────────────────────────────────────');

  if (result.status === 'COMPLETE') {
    console.log('Status: ✓ COMPLETE');
    console.log(`Reason: ${result.reason}`);
    console.log('');
    console.log('Investigation finished. All 8 gates pass.');
  } else {
    console.log('Status: → CONTINUE');
    console.log(`Reason: ${result.reason}`);
    console.log(`Next: ${result.next}`);
    console.log('');
    console.log('DO NOT STOP. Execute the next action immediately.');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Exit with 0 for COMPLETE, 2 for CONTINUE
  process.exit(result.status === 'COMPLETE' ? 0 : 2);
}

main();
