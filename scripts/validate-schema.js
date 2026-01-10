#!/usr/bin/env node
/**
 * validate-schema.js - Minimal schema validator for core case state files.
 *
 * Purpose: prevent silent drift between docs/scripts/case files.
 * This is intentionally minimal: it validates required fields and types without
 * enforcing a huge JSON Schema dependency.
 *
 * Usage:
 *   node scripts/validate-schema.js <case_dir>
 *   node scripts/validate-schema.js <case_dir> --json
 */

'use strict';

const fs = require('fs');
const path = require('path');

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    caseDir: args.find(a => !a.startsWith('--')),
    jsonOutput: args.includes('--json')
  };
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateState(caseDir, gaps, stats) {
  const statePath = path.join(caseDir, 'state.json');
  if (!fs.existsSync(statePath)) {
    gaps.push({
      type: 'SCHEMA_INVALID',
      object: { file: 'state.json' },
      message: 'state.json not found',
      suggested_actions: ['create_state_json']
    });
    return;
  }

  let state;
  try {
    state = readJson(statePath);
  } catch (e) {
    gaps.push({
      type: 'SCHEMA_INVALID',
      object: { file: 'state.json' },
      message: `state.json parse error: ${e.message}`,
      suggested_actions: ['fix_state_json']
    });
    return;
  }

  if (!isPlainObject(state)) {
    gaps.push({
      type: 'SCHEMA_INVALID',
      object: { file: 'state.json' },
      message: 'state.json must be a JSON object',
      suggested_actions: ['fix_state_json']
    });
    return;
  }

  stats.state_present = true;

  const created = typeof state.created === 'string' ? state.created : (typeof state.created_at === 'string' ? state.created_at : null);
  const required = [
    ['case_id', 'string'],
    ['topic', 'string'],
    ['status', 'string'],
    ['iteration', 'number'],
    ['created', 'string']
  ];

  const missing = [];
  for (const [key, type] of required) {
    const value = key === 'created' ? created : state[key];
    if (value === undefined || value === null) {
      missing.push(key);
      continue;
    }
    if (typeof value !== type) {
      gaps.push({
        type: 'SCHEMA_INVALID',
        object: { file: 'state.json', field: key, expected: type, actual: typeof value },
        message: `state.json field '${key}' must be ${type} (got ${typeof value})`,
        suggested_actions: ['fix_state_json_schema']
      });
    }
  }

  if (missing.length > 0) {
    gaps.push({
      type: 'SCHEMA_INVALID',
      object: { file: 'state.json', missing_fields: missing },
      message: `state.json missing required fields: ${missing.join(', ')}`,
      suggested_actions: ['fix_state_json_schema']
    });
  }

  const nested = Object.entries(state)
    .filter(([_, v]) => v && typeof v === 'object')
    .map(([k]) => k);
  if (nested.length > 0) {
    gaps.push({
      type: 'SCHEMA_INVALID',
      object: { file: 'state.json', nested_fields: nested },
      message: `state.json must be flat (no arrays/objects). Found nested values for: ${nested.join(', ')}`,
      suggested_actions: ['move_nested_state_to_control_or_findings']
    });
  }
}

function validateSources(caseDir, gaps, stats) {
  const sourcesPath = path.join(caseDir, 'sources.json');
  if (!fs.existsSync(sourcesPath)) return;

  let sources;
  try {
    sources = readJson(sourcesPath);
  } catch (e) {
    gaps.push({
      type: 'SCHEMA_INVALID',
      object: { file: 'sources.json' },
      message: `sources.json parse error: ${e.message}`,
      suggested_actions: ['fix_sources_json']
    });
    return;
  }

  if (!isPlainObject(sources)) {
    gaps.push({
      type: 'SCHEMA_INVALID',
      object: { file: 'sources.json' },
      message: 'sources.json must be an object mapping S### -> metadata',
      suggested_actions: ['fix_sources_json_schema']
    });
    return;
  }

  if (Array.isArray(sources.baseline) || Array.isArray(sources.discovered)) {
    gaps.push({
      type: 'SCHEMA_INVALID',
      object: { file: 'sources.json' },
      message: 'sources.json appears to be a discovery registry (baseline/discovered). Keep sources.json as captured source registry mapping by S###.',
      suggested_actions: ['rename_discovery_registry_file']
    });
  }

  const sourceIds = Object.keys(sources).filter(k => /^S\d{3,4}$/.test(k));
  stats.sources = sourceIds.length;

  for (const id of sourceIds) {
    const rec = sources[id];
    if (!isPlainObject(rec)) {
      gaps.push({
        type: 'SCHEMA_INVALID',
        object: { file: 'sources.json', source_id: id },
        message: `sources.json entry ${id} must be an object`,
        suggested_actions: ['fix_sources_json_schema']
      });
      continue;
    }
    if (rec.url !== undefined && typeof rec.url !== 'string') {
      gaps.push({
        type: 'SCHEMA_INVALID',
        object: { file: 'sources.json', source_id: id, field: 'url' },
        message: `sources.json entry ${id}.url must be a string`,
        suggested_actions: ['fix_sources_json_schema']
      });
    }
  }
}

function validateTasks(caseDir, gaps, stats) {
  const tasksDir = path.join(caseDir, 'tasks');
  if (!fs.existsSync(tasksDir)) return;
  const files = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
  stats.task_files = files.length;

  const allowed = new Set(['pending', 'in_progress', 'completed']);

  for (const file of files) {
    const rel = `tasks/${file}`;
    const filePath = path.join(tasksDir, file);
    let task;
    try {
      task = readJson(filePath);
    } catch (e) {
      gaps.push({
        type: 'SCHEMA_INVALID',
        object: { file: rel },
        message: `Failed to parse ${rel}: ${e.message}`,
        suggested_actions: ['fix_task_json']
      });
      continue;
    }

    if (!isPlainObject(task)) {
      gaps.push({
        type: 'SCHEMA_INVALID',
        object: { file: rel },
        message: `${rel} must be a JSON object`,
        suggested_actions: ['fix_task_json']
      });
      continue;
    }

    const id = typeof task.id === 'string' ? task.id : null;
    if (!id) {
      gaps.push({
        type: 'SCHEMA_INVALID',
        object: { file: rel, field: 'id' },
        message: `${rel} missing required field: id`,
        suggested_actions: ['fix_task_json_schema']
      });
    }

    const status = typeof task.status === 'string' ? task.status.toLowerCase() : null;
    if (!status || !allowed.has(status)) {
      gaps.push({
        type: 'SCHEMA_INVALID',
        object: { file: rel, field: 'status', value: task.status ?? null },
        message: `${rel} has invalid status (expected pending|in_progress|completed)`,
        suggested_actions: ['fix_task_status']
      });
    }
  }
}

function validateClaims(caseDir, gaps, stats) {
  const claimsDir = path.join(caseDir, 'claims');
  if (!fs.existsSync(claimsDir)) return;
  const files = fs.readdirSync(claimsDir).filter(f => /^C\d{4,}\.json$/i.test(f));
  stats.claim_files = files.length;

  for (const file of files) {
    const rel = `claims/${file}`;
    const filePath = path.join(claimsDir, file);
    let claim;
    try {
      claim = readJson(filePath);
    } catch (e) {
      gaps.push({
        type: 'SCHEMA_INVALID',
        object: { file: rel },
        message: `Failed to parse ${rel}: ${e.message}`,
        suggested_actions: ['fix_claim_json']
      });
      continue;
    }

    if (!isPlainObject(claim)) {
      gaps.push({
        type: 'SCHEMA_INVALID',
        object: { file: rel },
        message: `${rel} must be a JSON object`,
        suggested_actions: ['fix_claim_json']
      });
      continue;
    }

    if (!claim.id || typeof claim.id !== 'string') {
      gaps.push({
        type: 'SCHEMA_INVALID',
        object: { file: rel, field: 'id' },
        message: `${rel} missing required field: id`,
        suggested_actions: ['fix_claim_json_schema']
      });
    }

    if (claim.supporting_sources !== undefined && !Array.isArray(claim.supporting_sources)) {
      gaps.push({
        type: 'SCHEMA_INVALID',
        object: { file: rel, field: 'supporting_sources' },
        message: `${rel} supporting_sources must be an array`,
        suggested_actions: ['fix_claim_json_schema']
      });
    }
  }
}

function run(caseDir) {
  const startTime = Date.now();
  const gaps = [];
  const stats = {
    state_present: false,
    sources: 0,
    task_files: 0,
    claim_files: 0
  };

  validateState(caseDir, gaps, stats);
  validateSources(caseDir, gaps, stats);
  validateTasks(caseDir, gaps, stats);
  validateClaims(caseDir, gaps, stats);

  const passed = gaps.length === 0;
  return {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed,
    reason: passed ? 'Schemas valid' : `${gaps.length} schema issue(s) detected`,
    stats,
    gaps
  };
}

function printHuman(output) {
  console.log('='.repeat(60));
  console.log('Schema Validation');
  console.log('='.repeat(60));
  console.log(`Case: ${output.case_dir}`);
  console.log('');
  console.log(`state.json: ${output.stats.state_present ? 'present' : 'missing'}`);
  console.log(`sources.json entries: ${output.stats.sources}`);
  console.log(`tasks/*.json: ${output.stats.task_files}`);
  console.log(`claims/*.json: ${output.stats.claim_files}`);
  console.log('');
  console.log(output.passed ? 'PASS' : `FAIL (${output.gaps.length} issue(s))`);
  if (!output.passed) {
    for (const gap of output.gaps.slice(0, 25)) {
      console.log(`- ${gap.message}`);
    }
  }
}

function cli() {
  const parsed = parseCliArgs(process.argv);
  if (!parsed.caseDir) {
    console.error('Usage: node scripts/validate-schema.js <case_dir> [--json]');
    process.exit(1);
  }

  const output = run(parsed.caseDir);
  if (parsed.jsonOutput) console.log(JSON.stringify(output, null, 2));
  else printHuman(output);
  process.exit(output.passed ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  cli();
}

