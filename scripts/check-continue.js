#!/usr/bin/env node
/**
 * check-continue.js - Gate checker for orchestrator continuation
 *
 * Reads state.json and leads.json to determine next action.
 * Called by /action after each command to tell orchestrator what to do next.
 *
 * Usage: node scripts/check-continue.js [case-path] [--batch] [--batch-size N]
 *
 * Options:
 *   --batch         Enable batch mode for parallel lead processing
 *   --batch-size N  Number of leads per batch (default: 4)
 *
 * Output format:
 * ═══════════════════════════════════════════════════════
 * ORCHESTRATOR SIGNAL
 * ═══════════════════════════════════════════════════════
 * Status: CONTINUE | COMPLETE
 * Phase: <current phase>
 * Next: <next action to take>
 * Gates: X/11 passing
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

/**
 * Get a batch of pending leads for parallel processing
 * @param {Array} leads - All leads
 * @param {number} batchSize - Number of leads to select
 * @returns {Array} Selected leads
 */
function getBatchOfPendingLeads(leads, batchSize = 4) {
  const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
  const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

  // Filter to pending, unclaimed leads
  const available = leads.filter(l => {
    if (l.status !== 'pending') return false;
    // Skip if claimed and not stale
    if (l.claimed_by && l.claimed_at) {
      const claimTime = new Date(l.claimed_at).getTime();
      if (Date.now() - claimTime < STALE_THRESHOLD_MS) return false;
    }
    return true;
  });

  // Sort by priority (HIGH first), then depth (shallower first)
  available.sort((a, b) => {
    const aPriority = priorityOrder[a.priority] ?? 3;
    const bPriority = priorityOrder[b.priority] ?? 3;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (a.depth || 0) - (b.depth || 0);
  });

  return available.slice(0, batchSize);
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

/**
 * Update state.json with new phase
 * @param {string} casePath - Path to case directory
 * @param {object} state - Current state object (will be mutated)
 * @param {string} newPhase - New phase to set
 */
function updatePhase(casePath, state, newPhase) {
  const oldPhase = state.phase;
  state.phase = newPhase;
  const statePath = path.join(casePath, 'state.json');
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(`Phase transition: ${oldPhase} → ${newPhase}`);
}

function determineNextAction(state, casePath, options = {}) {
  const { phase, gates } = state;
  const { batchMode = false, batchSize = 4 } = options;

  // Check if all gates pass
  const allGatesPass = Object.values(gates).every(Boolean);
  if (allGatesPass) {
    return { status: 'COMPLETE', next: null, reason: 'All 11 gates passing', leadInfo: null };
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
      // Auto-transition to BOOTSTRAP and return next action
      updatePhase(casePath, state, 'BOOTSTRAP');
      return determineNextAction(state, casePath, options);

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
      // Auto-transition to FOLLOW and return next action
      updatePhase(casePath, state, 'FOLLOW');
      return determineNextAction(state, casePath, options);

    case 'FOLLOW':
      // Check for pending leads - MUST pursue ALL before reconcile/curiosity
      if (batchMode) {
        // Batch mode: select multiple leads for parallel processing
        const batchLeads = getBatchOfPendingLeads(leads, batchSize);

        if (batchLeads.length > 1) {
          // Multiple leads available - recommend batch processing
          const leadIds = batchLeads.map(l => l.id).join(' ');
          return {
            status: 'CONTINUE',
            next: `/action follow-batch ${leadIds}`,
            reason: `Batch processing ${batchLeads.length} leads in parallel`,
            leadInfo: {
              pending: leadCounts.pending,
              investigated: leadCounts.investigated,
              dead_end: leadCounts.dead_end,
              total: leadCounts.total,
              batchLeads: batchLeads
            },
            batchRecommendation: {
              size: batchLeads.length,
              leads: batchLeads.map(l => ({ id: l.id, priority: l.priority, lead: l.lead }))
            }
          };
        } else if (batchLeads.length === 1) {
          // Only one lead - use single follow
          return {
            status: 'CONTINUE',
            next: `/action follow ${batchLeads[0].id}`,
            reason: `Pending lead: "${batchLeads[0].lead}"`,
            leadInfo: {
              pending: leadCounts.pending,
              investigated: leadCounts.investigated,
              dead_end: leadCounts.dead_end,
              total: leadCounts.total,
              nextLead: batchLeads[0]
            }
          };
        }
        // Fall through to reconcile if no pending leads
      } else {
        // Sequential mode: process one lead at a time
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

      // Auto-transition to WRITE and return next action
      updatePhase(casePath, state, 'WRITE');
      return determineNextAction(state, casePath, options);

    case 'WRITE':
      // SAFETY CHECK: Verify prerequisites before article generation
      // Gates 0-3 must pass before we can write articles
      if (!gates.planning || !gates.questions || !gates.curiosity || !gates.reconciliation) {
        const missingGates = [];
        if (!gates.planning) missingGates.push('planning');
        if (!gates.questions) missingGates.push('questions');
        if (!gates.curiosity) missingGates.push('curiosity');
        if (!gates.reconciliation) missingGates.push('reconciliation');
        return {
          status: 'CONTINUE',
          next: 'ERROR: Cannot write articles - prerequisites not met',
          reason: `Missing gates: ${missingGates.join(', ')}. Return to FOLLOW phase.`,
          leadInfo: null,
          error: true,
          missingPrerequisites: missingGates
        };
      }

      if (!gates.article) {
        return {
          status: 'CONTINUE',
          next: '/action article',
          reason: 'Write phase - generate articles',
          leadInfo: null
        };
      }
      // Auto-transition to VERIFY and return next action
      updatePhase(casePath, state, 'VERIFY');
      return determineNextAction(state, casePath, options);

    case 'VERIFY':
      // Check which gates are failing
      const failingGates = Object.entries(gates)
        .filter(([_, v]) => !v)
        .map(([k, _]) => k);

      if (failingGates.length > 0) {
        // Check for parallel review opportunity: Gate 5 (sources) passes, Gates 6+7 fail
        const sourcesPass = gates.sources;
        const integrityFails = !gates.integrity;
        const legalFails = !gates.legal;

        if (sourcesPass && integrityFails && legalFails) {
          // Both integrity and legal need to run - use parallel review
          return {
            status: 'CONTINUE',
            next: '/action parallel-review',
            reason: 'Parallel integrity + legal review (Gate 5 passed)',
            leadInfo: null,
            parallelReviewOpportunity: true
          };
        }

        // Check for quality gate audits (gates 8-10) - run after process gates pass
        const processGatesPass = gates.planning && gates.questions && gates.curiosity &&
                                  gates.reconciliation && gates.article && gates.sources &&
                                  gates.integrity && gates.legal;

        if (processGatesPass) {
          // Process gates pass, check quality gates in order
          if (!gates.balance) {
            return {
              status: 'CONTINUE',
              next: '/action balance-audit',
              reason: 'Quality Gate 8 - balance audit needed',
              leadInfo: null
            };
          }
          if (!gates.completeness) {
            return {
              status: 'CONTINUE',
              next: '/action completeness-audit',
              reason: 'Quality Gate 9 - completeness audit needed',
              leadInfo: null
            };
          }
          if (!gates.significance) {
            return {
              status: 'CONTINUE',
              next: '/action significance-audit',
              reason: 'Quality Gate 10 - significance audit needed',
              leadInfo: null
            };
          }
        }

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

function parseArgs(args) {
  const options = {
    casePath: null,
    batchMode: false,
    batchSize: 4
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch') {
      options.batchMode = true;
    } else if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (!args[i].startsWith('-')) {
      options.casePath = args[i];
    }
  }

  return options;
}

function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  const casePath = findCasePath(options.casePath);

  if (!casePath) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('ORCHESTRATOR SIGNAL');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Status: ERROR');
    console.log('Reason: No active case found');
    console.log('');
    console.log('To start a new investigation, use --new flag:');
    console.log('  /investigate --new [topic]');
    console.log('');
    console.log('Without --new, only existing cases can be resumed.');
    console.log('═══════════════════════════════════════════════════════');
    process.exit(1);
  }

  const statePath = path.join(casePath, 'state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

  const passingGates = countPassingGates(state.gates);
  const result = determineNextAction(state, casePath, {
    batchMode: options.batchMode,
    batchSize: options.batchSize
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('ORCHESTRATOR SIGNAL');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Case: ${state.case}`);
  console.log(`Phase: ${state.phase}`);
  console.log(`Iteration: ${state.iteration}`);
  console.log(`Gates: ${passingGates}/11 passing`);

  // Show lead status in FOLLOW phase
  if (result.leadInfo) {
    console.log('───────────────────────────────────────────────────────');
    console.log(`Leads: ${result.leadInfo.pending} pending, ${result.leadInfo.investigated} investigated, ${result.leadInfo.dead_end} dead_end`);

    // Show batch recommendation if available
    if (result.batchRecommendation) {
      console.log(`Batch: ${result.batchRecommendation.size} leads selected for parallel processing`);
      result.batchRecommendation.leads.forEach(l => {
        const leadText = l.lead.length > 50 ? l.lead.substring(0, 50) + '...' : l.lead;
        console.log(`  - ${l.id} [${l.priority}]: ${leadText}`);
      });
    }
  }

  // Show parallel review opportunity
  if (result.parallelReviewOpportunity) {
    console.log('───────────────────────────────────────────────────────');
    console.log('Parallel review: integrity + legal can run simultaneously');
  }

  console.log('───────────────────────────────────────────────────────');

  if (result.status === 'COMPLETE') {
    console.log('Status: ✓ COMPLETE');
    console.log(`Reason: ${result.reason}`);
    console.log('');
    console.log('Investigation finished. All 11 gates pass.');
  } else if (result.error) {
    console.log('Status: ✗ ERROR');
    console.log(`Reason: ${result.reason}`);
    console.log(`Next: ${result.next}`);
    console.log('');
    console.log('STOP. Fix the error before continuing.');
    if (result.missingPrerequisites) {
      console.log(`Missing prerequisites: ${result.missingPrerequisites.join(', ')}`);
    }
  } else {
    console.log('Status: → CONTINUE');
    console.log(`Reason: ${result.reason}`);
    console.log(`Next: ${result.next}`);
    console.log('');
    console.log('DO NOT STOP. Execute the next action immediately.');
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Exit with 0 for COMPLETE, 1 for ERROR, 2 for CONTINUE
  process.exit(result.status === 'COMPLETE' ? 0 : (result.error ? 1 : 2));
}

main();
