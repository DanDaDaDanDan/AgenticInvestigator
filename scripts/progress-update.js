#!/usr/bin/env node
/**
 * progress-update.js - Real-time progress tracking for long-running operations
 *
 * Provides visibility into what's happening during multi-minute operations
 * like deep research calls.
 *
 * Usage:
 *   node progress-update.js <case_dir> start --type <type> --engine <engine> --desc <description>
 *   node progress-update.js <case_dir> complete --id <op-id> --duration <seconds>
 *   node progress-update.js <case_dir> status
 *
 * Examples:
 *   node progress-update.js cases/topic-slug start --type deep_research --engine openai --desc "Research on outlets"
 *   node progress-update.js cases/topic-slug complete --id op-001 --duration 1200
 *   node progress-update.js cases/topic-slug status
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
Usage:
  node progress-update.js <case_dir> start --type <type> --engine <engine> --desc <description>
  node progress-update.js <case_dir> complete --id <op-id> --duration <seconds>
  node progress-update.js <case_dir> status

Options for 'start':
  --type <type>       Operation type (deep_research, web_search, capture, etc.)
  --engine <engine>   Engine/service (openai, gemini, xai, firecrawl, etc.)
  --desc <desc>       Human-readable description

Options for 'complete':
  --id <op-id>        Operation ID to complete
  --duration <sec>    Duration in seconds

Examples:
  node progress-update.js cases/topic-slug start --type deep_research --engine openai --desc "Research on outlets"
  node progress-update.js cases/topic-slug complete --id op-001 --duration 1200
  node progress-update.js cases/topic-slug status
`);
}

if (args.length < 2) {
  printUsage();
  process.exit(1);
}

const caseDir = args[0];
const command = args[1];
const progressPath = path.join(caseDir, 'progress.json');

// Parse command-line arguments
function parseArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx === args.length - 1) return null;
  return args[idx + 1];
}

// Load or initialize progress file
function loadProgress() {
  if (fs.existsSync(progressPath)) {
    try {
      return JSON.parse(fs.readFileSync(progressPath, 'utf-8'));
    } catch (e) {
      console.error(`Error reading ${progressPath}: ${e.message}`);
      process.exit(1);
    }
  }
  return {
    last_updated: new Date().toISOString(),
    current_phase: 'UNKNOWN',
    iteration: 0,
    active_operations: [],
    completed_this_phase: []
  };
}

// Save progress file
function saveProgress(progress) {
  progress.last_updated = new Date().toISOString();
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2));
}

// Generate next operation ID
function nextOpId(progress) {
  const maxId = progress.active_operations.concat(progress.completed_this_phase)
    .map(op => parseInt(op.id?.replace('op-', '') || '0'))
    .reduce((max, n) => Math.max(max, n), 0);
  return `op-${String(maxId + 1).padStart(3, '0')}`;
}

// Command: start
if (command === 'start') {
  const type = parseArg(args, '--type');
  const engine = parseArg(args, '--engine');
  const desc = parseArg(args, '--desc');

  if (!type) {
    console.error('Error: --type is required');
    process.exit(1);
  }

  const progress = loadProgress();
  const opId = nextOpId(progress);

  progress.active_operations.push({
    id: opId,
    type,
    engine: engine || 'unknown',
    started: new Date().toISOString(),
    status: 'running',
    description: desc || `${type} operation`
  });

  saveProgress(progress);
  console.log(`Started: ${opId} | ${type} | ${engine || 'unknown'}`);
  console.log(`ID: ${opId}`);
  process.exit(0);
}

// Command: complete
if (command === 'complete') {
  const opId = parseArg(args, '--id');
  const duration = parseArg(args, '--duration');

  if (!opId) {
    console.error('Error: --id is required');
    process.exit(1);
  }

  const progress = loadProgress();
  const opIdx = progress.active_operations.findIndex(op => op.id === opId);

  if (opIdx === -1) {
    console.error(`Error: Operation ${opId} not found in active operations`);
    process.exit(1);
  }

  const op = progress.active_operations[opIdx];
  progress.active_operations.splice(opIdx, 1);

  progress.completed_this_phase.push({
    ...op,
    status: 'completed',
    completed: new Date().toISOString(),
    duration_sec: duration ? parseInt(duration) : null
  });

  saveProgress(progress);
  console.log(`Completed: ${opId} | ${op.type} | ${duration || 'unknown'}s`);
  process.exit(0);
}

// Command: status
if (command === 'status') {
  const progress = loadProgress();

  console.log(`\nProgress Status: ${caseDir}`);
  console.log(`Last Updated: ${progress.last_updated}`);
  console.log(`Current Phase: ${progress.current_phase}`);
  console.log(`Iteration: ${progress.iteration}`);

  console.log(`\nActive Operations (${progress.active_operations.length}):`);
  if (progress.active_operations.length === 0) {
    console.log('  (none)');
  } else {
    for (const op of progress.active_operations) {
      const elapsed = Math.round((Date.now() - new Date(op.started).getTime()) / 1000);
      console.log(`  ${op.id} | ${op.type} | ${op.engine} | ${elapsed}s elapsed`);
      console.log(`    ${op.description}`);
    }
  }

  console.log(`\nCompleted This Phase (${progress.completed_this_phase.length}):`);
  if (progress.completed_this_phase.length === 0) {
    console.log('  (none)');
  } else {
    for (const op of progress.completed_this_phase) {
      console.log(`  ${op.id} | ${op.type} | ${op.engine} | ${op.duration_sec || '?'}s`);
    }
  }

  process.exit(0);
}

// Command: set-phase (helper to update current phase)
if (command === 'set-phase') {
  const phase = parseArg(args, '--phase');
  const iteration = parseArg(args, '--iteration');

  if (!phase) {
    console.error('Error: --phase is required');
    process.exit(1);
  }

  const progress = loadProgress();

  // Archive completed operations from previous phase
  if (progress.current_phase !== phase) {
    progress.completed_this_phase = [];
  }

  progress.current_phase = phase;
  if (iteration) {
    progress.iteration = parseInt(iteration);
  }

  saveProgress(progress);
  console.log(`Phase: ${phase} | Iteration: ${progress.iteration}`);
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
printUsage();
process.exit(1);
