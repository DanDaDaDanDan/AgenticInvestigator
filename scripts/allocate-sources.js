#!/usr/bin/env node
/**
 * allocate-sources.js - Pre-allocate source ID ranges for parallel agents
 *
 * Manages source ID allocation to prevent collisions when multiple agents
 * capture sources simultaneously.
 *
 * Commands:
 *   allocate <case-path> <count> [batch-id]    - Allocate a range of source IDs
 *   release <case-path> <batch-id>             - Release an allocation (on error/cancel)
 *   commit <case-path> <batch-id> <used-count> - Commit allocation, update next_source
 *   status <case-path>                         - Show current allocations
 *   cleanup-stale <case-path>                  - Release allocations older than 1 hour
 *
 * Usage: node scripts/allocate-sources.js <command> [args...]
 */

const fs = require('fs');
const path = require('path');

// Stale allocation threshold (1 hour)
const STALE_THRESHOLD_MS = 60 * 60 * 1000;

// Import locking from leads-lock
const { acquireLock, releaseLock } = require('./leads-lock');

/**
 * Read state.json
 */
function readState(casePath) {
  const statePath = path.join(casePath, 'state.json');
  if (!fs.existsSync(statePath)) {
    throw new Error(`state.json not found at ${casePath}`);
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
}

/**
 * Write state.json
 */
function writeState(casePath, state) {
  const statePath = path.join(casePath, 'state.json');
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Generate a unique batch ID
 */
function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Check if an allocation is stale
 */
function isAllocationStale(allocation) {
  if (!allocation.allocated_at) return false;
  const allocTime = new Date(allocation.allocated_at).getTime();
  return Date.now() - allocTime > STALE_THRESHOLD_MS;
}

/**
 * Allocate a range of source IDs (with file locking)
 */
function allocateRange(casePath, count, providedBatchId = null, metadata = {}) {
  const lockPath = path.join(casePath, 'state.json.lock');
  if (!acquireLock(lockPath)) {
    return { success: false, error: 'Could not acquire lock' };
  }

  try {
    const state = readState(casePath);

    // Initialize source_allocations if not present
    if (!state.source_allocations) {
      state.source_allocations = {};
    }

    // Clean up stale allocations first
    Object.keys(state.source_allocations).forEach(batchId => {
      if (isAllocationStale(state.source_allocations[batchId])) {
        delete state.source_allocations[batchId];
      }
    });

    // Find highest allocated source ID
    let highestAllocated = state.next_source || 1;
    Object.values(state.source_allocations).forEach(alloc => {
      if (alloc.end > highestAllocated) {
        highestAllocated = alloc.end;
      }
    });

    // Allocate new range
    const batchId = providedBatchId || generateBatchId();
    const start = highestAllocated;
    const end = start + count;

    state.source_allocations[batchId] = {
      start: start,
      end: end,
      count: count,
      allocated_at: new Date().toISOString(),
      status: 'active',
      ...metadata
    };

    writeState(casePath, state);

    return {
      success: true,
      batch_id: batchId,
      start: start,
      end: end,
      count: count
    };
  } finally {
    releaseLock(lockPath);
  }
}

/**
 * Release an allocation (e.g., on error)
 */
function releaseAllocation(casePath, batchId) {
  const lockPath = path.join(casePath, 'state.json.lock');
  if (!acquireLock(lockPath)) {
    return { success: false, error: 'Could not acquire lock' };
  }

  try {
    const state = readState(casePath);

    if (!state.source_allocations || !state.source_allocations[batchId]) {
      return { success: false, error: `Allocation ${batchId} not found` };
    }

    delete state.source_allocations[batchId];
    writeState(casePath, state);

    return { success: true, batch_id: batchId };
  } finally {
    releaseLock(lockPath);
  }
}

/**
 * Commit an allocation after successful use
 * Updates next_source to the highest actually used ID
 */
function commitAllocation(casePath, batchId, usedCount) {
  const lockPath = path.join(casePath, 'state.json.lock');
  if (!acquireLock(lockPath)) {
    return { success: false, error: 'Could not acquire lock' };
  }

  try {
    const state = readState(casePath);

    if (!state.source_allocations || !state.source_allocations[batchId]) {
      return { success: false, error: `Allocation ${batchId} not found` };
    }

    const allocation = state.source_allocations[batchId];
    const actualEnd = allocation.start + usedCount;

    // Update next_source to the next available after what was used
    if (actualEnd > state.next_source) {
      state.next_source = actualEnd;
    }

    // Mark as committed and remove from active allocations
    allocation.status = 'committed';
    allocation.committed_at = new Date().toISOString();
    allocation.used_count = usedCount;

    delete state.source_allocations[batchId];

    writeState(casePath, state);

    return {
      success: true,
      batch_id: batchId,
      used_count: usedCount,
      next_source: state.next_source
    };
  } finally {
    releaseLock(lockPath);
  }
}

/**
 * Get status of all allocations
 */
function getStatus(casePath) {
  const state = readState(casePath);

  const allocations = state.source_allocations || {};
  const active = [];
  const stale = [];

  Object.entries(allocations).forEach(([batchId, alloc]) => {
    const info = { batch_id: batchId, ...alloc };
    if (isAllocationStale(alloc)) {
      stale.push(info);
    } else {
      active.push(info);
    }
  });

  return {
    success: true,
    next_source: state.next_source || 1,
    active_allocations: active,
    stale_allocations: stale
  };
}

/**
 * Clean up stale allocations
 */
function cleanupStale(casePath) {
  const state = readState(casePath);

  if (!state.source_allocations) {
    return { success: true, cleaned: 0 };
  }

  let cleaned = 0;
  Object.keys(state.source_allocations).forEach(batchId => {
    if (isAllocationStale(state.source_allocations[batchId])) {
      delete state.source_allocations[batchId];
      cleaned++;
    }
  });

  if (cleaned > 0) {
    writeState(casePath, state);
  }

  return { success: true, cleaned: cleaned };
}

/**
 * Allocate lead ID range (similar pattern for leads)
 * Uses file locking to prevent race conditions in parallel processing
 */
function allocateLeadRange(casePath, count, batchId) {
  const leadsPath = path.join(casePath, 'leads.json');
  const lockPath = path.join(casePath, 'leads.json.lock');

  if (!fs.existsSync(leadsPath)) {
    return { success: false, error: 'leads.json not found' };
  }

  if (!acquireLock(lockPath)) {
    return { success: false, error: 'Could not acquire lock' };
  }

  try {
    const leads = JSON.parse(fs.readFileSync(leadsPath, 'utf-8'));

    // Find highest lead ID
    const maxId = (leads.leads || []).reduce((max, l) => {
      const num = parseInt(l.id.replace('L', ''), 10);
      return num > max ? num : max;
    }, 0);

    const start = maxId + 1;
    const end = start + count;

    return {
      success: true,
      batch_id: batchId,
      start: start,
      end: end,
      count: count
    };
  } finally {
    releaseLock(lockPath);
  }
}

// CLI
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`Usage: node scripts/allocate-sources.js <command> [args...]

Commands:
  allocate <case-path> <count> [batch-id]     Allocate source ID range
  release <case-path> <batch-id>              Release an allocation
  commit <case-path> <batch-id> <used-count>  Commit and update next_source
  status <case-path>                          Show current allocations
  cleanup-stale <case-path>                   Release stale allocations
  allocate-leads <case-path> <count> <batch-id>  Allocate lead ID range
`);
    process.exit(1);
  }

  let result;

  switch (command) {
    case 'allocate':
      if (args.length < 3) {
        console.error('Usage: allocate <case-path> <count> [batch-id]');
        process.exit(1);
      }
      result = allocateRange(args[1], parseInt(args[2], 10), args[3] || null);
      break;

    case 'release':
      if (args.length < 3) {
        console.error('Usage: release <case-path> <batch-id>');
        process.exit(1);
      }
      result = releaseAllocation(args[1], args[2]);
      break;

    case 'commit':
      if (args.length < 4) {
        console.error('Usage: commit <case-path> <batch-id> <used-count>');
        process.exit(1);
      }
      result = commitAllocation(args[1], args[2], parseInt(args[3], 10));
      break;

    case 'status':
      if (args.length < 2) {
        console.error('Usage: status <case-path>');
        process.exit(1);
      }
      result = getStatus(args[1]);
      break;

    case 'cleanup-stale':
      if (args.length < 2) {
        console.error('Usage: cleanup-stale <case-path>');
        process.exit(1);
      }
      result = cleanupStale(args[1]);
      break;

    case 'allocate-leads':
      if (args.length < 4) {
        console.error('Usage: allocate-leads <case-path> <count> <batch-id>');
        process.exit(1);
      }
      result = allocateLeadRange(args[1], parseInt(args[2], 10), args[3]);
      break;

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}

// Export functions for programmatic use
module.exports = {
  allocateRange,
  releaseAllocation,
  commitAllocation,
  getStatus,
  cleanupStale,
  allocateLeadRange,
  isAllocationStale
};

// Run CLI if executed directly
if (require.main === module) {
  main();
}
