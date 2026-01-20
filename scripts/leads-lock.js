#!/usr/bin/env node
/**
 * leads-lock.js - Optimistic locking for parallel lead processing
 *
 * Provides atomic operations on leads.json with version tracking and claim management.
 *
 * Commands:
 *   claim <case-path> <lead-id>                  - Claim a lead for processing
 *   release <case-path> <lead-id>                - Release a claimed lead
 *   update <case-path> <lead-id> <status> <result> [sources] - Update lead status
 *   add-child <case-path> <parent-id> <child-json> - Add child lead
 *   batch-select <case-path> <count>             - Select N leads for parallel processing
 *   cleanup-stale <case-path>                    - Release claims older than 30 minutes
 *
 * Usage: node scripts/leads-lock.js <command> [args...]
 */

const fs = require('fs');
const path = require('path');

// Stale claim threshold (30 minutes)
const STALE_THRESHOLD_MS = 30 * 60 * 1000;

// Simple file lock using .lock file
const LOCK_TIMEOUT_MS = 5000;
const LOCK_RETRY_MS = 50;

/**
 * Acquire file lock with timeout
 *
 * Note: Uses synchronous busy-wait for retry delays because this module
 * provides sync APIs for use in CLI tools. The 50ms retry interval keeps
 * CPU impact minimal while maintaining simplicity. For high-contention
 * scenarios, consider using async locking libraries instead.
 */
function acquireLock(lockPath) {
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      fs.writeFileSync(lockPath, process.pid.toString(), { flag: 'wx' });
      return true;
    } catch (e) {
      if (e.code === 'EEXIST') {
        // Check if lock is stale (>30s old)
        try {
          const stat = fs.statSync(lockPath);
          if (Date.now() - stat.mtimeMs > 30000) {
            fs.unlinkSync(lockPath);
            continue;
          }
        } catch {}
        // Wait and retry (sync busy-wait - see function comment)
        const waitUntil = Date.now() + LOCK_RETRY_MS;
        while (Date.now() < waitUntil) {}
        continue;
      }
      throw e;
    }
  }
  return false;
}

/**
 * Release file lock
 */
function releaseLock(lockPath) {
  try {
    fs.unlinkSync(lockPath);
  } catch {}
}

/**
 * Read leads.json with locking awareness
 */
function readLeads(casePath) {
  const leadsPath = path.join(casePath, 'leads.json');
  if (!fs.existsSync(leadsPath)) {
    return {
      version: 1,
      max_depth: 3,
      leads: []
    };
  }
  const data = JSON.parse(fs.readFileSync(leadsPath, 'utf-8'));
  // Ensure version field exists
  if (typeof data.version !== 'number') {
    data.version = 1;
  }
  return data;
}

/**
 * Write leads.json with version increment
 */
function writeLeads(casePath, data) {
  const leadsPath = path.join(casePath, 'leads.json');
  data.version = (data.version || 0) + 1;
  fs.writeFileSync(leadsPath, JSON.stringify(data, null, 2));
  return data.version;
}

/**
 * Check if a claim is stale (>30 minutes old)
 */
function isClaimStale(lead) {
  if (!lead.claimed_at) return false;
  const claimTime = new Date(lead.claimed_at).getTime();
  return Date.now() - claimTime > STALE_THRESHOLD_MS;
}

/**
 * Generate a unique claim ID
 */
function generateClaimId() {
  return `pid_${process.pid}_${Date.now()}`;
}

/**
 * Claim a lead for processing (with file locking)
 */
function claimLead(casePath, leadId) {
  const lockPath = path.join(casePath, 'leads.json.lock');
  if (!acquireLock(lockPath)) {
    return { success: false, error: 'Could not acquire lock' };
  }

  try {
    const data = readLeads(casePath);
    const lead = data.leads.find(l => l.id === leadId);

    if (!lead) {
      return { success: false, error: `Lead ${leadId} not found` };
    }

    if (lead.status !== 'pending') {
      return { success: false, error: `Lead ${leadId} is not pending (status: ${lead.status})` };
    }

    // Check if already claimed and not stale
    if (lead.claimed_by && !isClaimStale(lead)) {
      return { success: false, error: `Lead ${leadId} already claimed by ${lead.claimed_by}` };
    }

    // Claim the lead
    const claimId = generateClaimId();
    lead.claimed_by = claimId;
    lead.claimed_at = new Date().toISOString();

    const version = writeLeads(casePath, data);

    return {
      success: true,
      lead: lead,
      claim_id: claimId,
      version: version
    };
  } finally {
    releaseLock(lockPath);
  }
}

/**
 * Claim multiple leads atomically (all or none)
 */
function batchClaim(casePath, leadIds) {
  const lockPath = path.join(casePath, 'leads.json.lock');
  if (!acquireLock(lockPath)) {
    return { success: false, error: 'Could not acquire lock' };
  }

  try {
    const data = readLeads(casePath);
    const claimId = generateClaimId();
    const claimedLeads = [];
    const errors = [];

    // Validate all leads first
    for (const leadId of leadIds) {
      const lead = data.leads.find(l => l.id === leadId);
      if (!lead) {
        errors.push(`${leadId}: not found`);
        continue;
      }
      if (lead.status !== 'pending') {
        errors.push(`${leadId}: not pending (${lead.status})`);
        continue;
      }
      if (lead.claimed_by && !isClaimStale(lead)) {
        errors.push(`${leadId}: already claimed`);
        continue;
      }
    }

    // If any errors, fail entirely (atomic)
    if (errors.length > 0) {
      return { success: false, errors: errors };
    }

    // Claim all leads
    const now = new Date().toISOString();
    for (const leadId of leadIds) {
      const lead = data.leads.find(l => l.id === leadId);
      lead.claimed_by = claimId;
      lead.claimed_at = now;
      claimedLeads.push(lead);
    }

    const version = writeLeads(casePath, data);

    return {
      success: true,
      claim_id: claimId,
      leads: claimedLeads,
      version: version
    };
  } finally {
    releaseLock(lockPath);
  }
}

/**
 * Release a claimed lead
 */
function releaseLead(casePath, leadId) {
  const lockPath = path.join(casePath, 'leads.json.lock');
  if (!acquireLock(lockPath)) {
    return { success: false, error: 'Could not acquire lock' };
  }

  try {
    const data = readLeads(casePath);
    const lead = data.leads.find(l => l.id === leadId);

    if (!lead) {
      return { success: false, error: `Lead ${leadId} not found` };
    }

    delete lead.claimed_by;
    delete lead.claimed_at;

    const version = writeLeads(casePath, data);
    return { success: true, version: version };
  } finally {
    releaseLock(lockPath);
  }
}

/**
 * Update a lead's status and result
 */
function updateLead(casePath, leadId, status, result, sources = []) {
  const lockPath = path.join(casePath, 'leads.json.lock');
  if (!acquireLock(lockPath)) {
    return { success: false, error: 'Could not acquire lock' };
  }

  try {
    const data = readLeads(casePath);
    const lead = data.leads.find(l => l.id === leadId);

    if (!lead) {
      return { success: false, error: `Lead ${leadId} not found` };
    }

    lead.status = status;
    lead.result = result;
    lead.sources = sources;

    // Clear claim after update
    delete lead.claimed_by;
    delete lead.claimed_at;

    const version = writeLeads(casePath, data);
    return { success: true, lead: lead, version: version };
  } finally {
    releaseLock(lockPath);
  }
}

/**
 * Add a child lead (generated while investigating parent)
 */
function addChildLead(casePath, parentId, childData) {
  const lockPath = path.join(casePath, 'leads.json.lock');
  if (!acquireLock(lockPath)) {
    return { success: false, error: 'Could not acquire lock' };
  }

  try {
    const data = readLeads(casePath);
    const parent = data.leads.find(l => l.id === parentId);

    if (!parent) {
      return { success: false, error: `Parent lead ${parentId} not found` };
    }

    const newDepth = (parent.depth || 0) + 1;

    // Check if exceeds max_depth
    if (newDepth > data.max_depth) {
      return {
        success: false,
        error: 'exceeds_max_depth',
        depth: newDepth,
        max_depth: data.max_depth,
        lead: childData
      };
    }

    // Generate new lead ID
    const maxId = data.leads.reduce((max, l) => {
      const num = parseInt(l.id.replace('L', ''), 10);
      return num > max ? num : max;
    }, 0);
    const newId = `L${String(maxId + 1).padStart(3, '0')}`;

    const newLead = {
      id: newId,
      lead: childData.lead,
      from: parentId,
      priority: childData.priority || 'MEDIUM',
      depth: newDepth,
      parent: parentId,
      status: 'pending',
      result: null,
      sources: []
    };

    data.leads.push(newLead);
    const version = writeLeads(casePath, data);
    return { success: true, lead: newLead, version: version };
  } finally {
    releaseLock(lockPath);
  }
}

/**
 * Select a batch of leads for parallel processing
 */
function batchSelect(casePath, count) {
  const data = readLeads(casePath);
  const priorityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };

  // Filter to pending, unclaimed leads
  const available = data.leads.filter(l => {
    if (l.status !== 'pending') return false;
    if (l.claimed_by && !isClaimStale(l)) return false;
    return true;
  });

  // Sort by priority (HIGH first), then depth (shallower first)
  available.sort((a, b) => {
    const aPriority = priorityOrder[a.priority] ?? 3;
    const bPriority = priorityOrder[b.priority] ?? 3;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return (a.depth || 0) - (b.depth || 0);
  });

  const selected = available.slice(0, count);

  return {
    success: true,
    leads: selected,
    available_count: available.length,
    total_pending: data.leads.filter(l => l.status === 'pending').length
  };
}

/**
 * Clean up stale claims
 */
function cleanupStale(casePath) {
  const lockPath = path.join(casePath, 'leads.json.lock');
  if (!acquireLock(lockPath)) {
    return { success: false, error: 'Could not acquire lock' };
  }

  try {
    const data = readLeads(casePath);
    let cleaned = 0;

    data.leads.forEach(lead => {
      if (lead.claimed_by && isClaimStale(lead)) {
        delete lead.claimed_by;
        delete lead.claimed_at;
        cleaned++;
      }
    });

    if (cleaned > 0) {
      const version = writeLeads(casePath, data);
      return { success: true, cleaned: cleaned, version: version };
    }

    return { success: true, cleaned: 0 };
  } finally {
    releaseLock(lockPath);
  }
}

/**
 * Get current leads statistics
 */
function getStats(casePath) {
  const data = readLeads(casePath);
  const stats = {
    total: data.leads.length,
    pending: 0,
    investigated: 0,
    dead_end: 0,
    claimed: 0,
    stale_claims: 0,
    by_priority: { HIGH: 0, MEDIUM: 0, LOW: 0 },
    by_depth: {}
  };

  data.leads.forEach(lead => {
    if (lead.status === 'pending') stats.pending++;
    else if (lead.status === 'investigated') stats.investigated++;
    else if (lead.status === 'dead_end') stats.dead_end++;

    if (lead.claimed_by) {
      if (isClaimStale(lead)) stats.stale_claims++;
      else stats.claimed++;
    }

    if (lead.priority && stats.by_priority[lead.priority] !== undefined) {
      stats.by_priority[lead.priority]++;
    }

    const depth = lead.depth || 0;
    stats.by_depth[depth] = (stats.by_depth[depth] || 0) + 1;
  });

  return { success: true, stats: stats, version: data.version };
}

// CLI
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`Usage: node scripts/leads-lock.js <command> [args...]

Commands:
  claim <case-path> <lead-id>              Claim a lead for processing
  batch-claim <case-path> <lead-id>...     Claim multiple leads atomically
  release <case-path> <lead-id>            Release a claimed lead
  update <case-path> <lead-id> <status> <result> [sources-json]
                                           Update lead status and result
  add-child <case-path> <parent-id> <child-json>
                                           Add child lead from parent
  batch-select <case-path> <count>         Select N leads for parallel processing
  cleanup-stale <case-path>                Release claims older than 30 minutes
  stats <case-path>                        Get leads statistics
`);
    process.exit(1);
  }

  let result;

  switch (command) {
    case 'claim':
      if (args.length < 3) {
        console.error('Usage: claim <case-path> <lead-id>');
        process.exit(1);
      }
      result = claimLead(args[1], args[2]);
      break;

    case 'batch-claim':
      if (args.length < 3) {
        console.error('Usage: batch-claim <case-path> <lead-id>...');
        process.exit(1);
      }
      result = batchClaim(args[1], args.slice(2));
      break;

    case 'release':
      if (args.length < 3) {
        console.error('Usage: release <case-path> <lead-id>');
        process.exit(1);
      }
      result = releaseLead(args[1], args[2]);
      break;

    case 'update':
      if (args.length < 5) {
        console.error('Usage: update <case-path> <lead-id> <status> <result> [sources-json]');
        process.exit(1);
      }
      const sources = args[5] ? JSON.parse(args[5]) : [];
      result = updateLead(args[1], args[2], args[3], args[4], sources);
      break;

    case 'add-child':
      if (args.length < 4) {
        console.error('Usage: add-child <case-path> <parent-id> <child-json>');
        process.exit(1);
      }
      const childData = JSON.parse(args[3]);
      result = addChildLead(args[1], args[2], childData);
      break;

    case 'batch-select':
      if (args.length < 3) {
        console.error('Usage: batch-select <case-path> <count>');
        process.exit(1);
      }
      result = batchSelect(args[1], parseInt(args[2], 10));
      break;

    case 'cleanup-stale':
      if (args.length < 2) {
        console.error('Usage: cleanup-stale <case-path>');
        process.exit(1);
      }
      result = cleanupStale(args[1]);
      break;

    case 'stats':
      if (args.length < 2) {
        console.error('Usage: stats <case-path>');
        process.exit(1);
      }
      result = getStats(args[1]);
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
  readLeads,
  writeLeads,
  claimLead,
  batchClaim,
  releaseLead,
  updateLead,
  addChildLead,
  batchSelect,
  cleanupStale,
  getStats,
  isClaimStale,
  acquireLock,
  releaseLock
};

// Run CLI if executed directly
if (require.main === module) {
  main();
}
