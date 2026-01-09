#!/usr/bin/env node
/**
 * audit-append.js - Append entries to _audit.json
 *
 * Provides atomic append-only logging for investigation audit trail.
 *
 * Usage:
 *   node audit-append.js <case_dir> --init                    # Initialize empty audit log
 *   node audit-append.js <case_dir> <actor> <action>          # Minimal entry
 *   node audit-append.js <case_dir> <actor> <action> \
 *     --target T001 \
 *     --input '{"task": "..."}' \
 *     --output '{"file": "..."}' \
 *     --verification '{"passed": true}'
 *
 * Examples:
 *   node audit-append.js cases/topic-slug --init
 *   node audit-append.js cases/topic-slug orchestrator phase_start --target RESEARCH
 *   node audit-append.js cases/topic-slug task-agent task_complete --target T001 --output '{"findings_file": "findings/T001.md"}'
 *   node audit-append.js cases/topic-slug capture-agent capture_source --target S001 --input '{"url": "https://..."}' --output '{"files": 3}'
 */

const fs = require('fs');
const path = require('path');

// Parse arguments
const args = process.argv.slice(2);

function printUsage() {
  console.log(`
Usage:
  node audit-append.js <case_dir> --init                    # Initialize
  node audit-append.js <case_dir> <actor> <action> [opts]   # Append entry

Options:
  --target <value>       Target of the action (task ID, source ID, phase name)
  --input <json>         Input data as JSON string
  --output <json>        Output data as JSON string
  --verification <json>  Verification result as JSON string

Actors: orchestrator, task-agent, capture-agent, verify-agent, research-agent
Actions: phase_start, phase_complete, task_start, task_complete, capture_source, verification_run, gate_check
`);
}

if (args.length < 2) {
  printUsage();
  process.exit(1);
}

const caseDir = args[0];
const auditPath = path.join(caseDir, '_audit.json');

// Handle --init
if (args[1] === '--init') {
  const initial = {
    created_at: new Date().toISOString(),
    case_dir: caseDir,
    log: []
  };

  fs.writeFileSync(auditPath, JSON.stringify(initial, null, 2));
  console.log(`Initialized: ${auditPath}`);
  process.exit(0);
}

// Parse entry arguments
const actor = args[1];
const action = args[2];

if (!actor || !action) {
  console.error('Error: actor and action are required');
  printUsage();
  process.exit(1);
}

// Parse optional arguments
function parseArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx === args.length - 1) return null;
  return args[idx + 1];
}

function parseJsonArg(args, flag) {
  const value = parseArg(args, flag);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (e) {
    console.error(`Error parsing ${flag}: ${e.message}`);
    return value; // Return as string if not valid JSON
  }
}

const target = parseArg(args, '--target');
const input = parseJsonArg(args, '--input');
const output = parseJsonArg(args, '--output');
const verification = parseJsonArg(args, '--verification');

// Load existing audit log
let audit;
if (fs.existsSync(auditPath)) {
  try {
    audit = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
  } catch (e) {
    console.error(`Error reading ${auditPath}: ${e.message}`);
    process.exit(1);
  }
} else {
  // Auto-initialize if doesn't exist
  audit = {
    created_at: new Date().toISOString(),
    case_dir: caseDir,
    log: []
  };
}

// Generate next ID
const nextId = `A${String(audit.log.length + 1).padStart(3, '0')}`;

// Create entry
const entry = {
  id: nextId,
  timestamp: new Date().toISOString(),
  actor,
  action
};

if (target) entry.target = target;
if (input) entry.input = input;
if (output) entry.output = output;
if (verification) entry.verification = verification;

// Append entry
audit.log.push(entry);
audit.last_updated = new Date().toISOString();

// Write atomically (write to temp, then rename)
const tempPath = `${auditPath}.tmp`;
fs.writeFileSync(tempPath, JSON.stringify(audit, null, 2));
fs.renameSync(tempPath, auditPath);

console.log(`Appended: ${nextId} | ${actor} | ${action}${target ? ` | ${target}` : ''}`);
