#!/usr/bin/env node
/**
 * verify-state-consistency.js - Verify state files match filesystem reality
 *
 * Compares what state files CLAIM against what the filesystem CONTAINS.
 * State files describe intent; filesystem is truth.
 *
 * Usage:
 *   node verify-state-consistency.js <case_dir>
 *   node verify-state-consistency.js <case_dir> --json    # JSON output
 *   node verify-state-consistency.js <case_dir> --fix     # Suggest fixes
 *
 * Checks:
 *   1. sources.md entries vs evidence/web/ folders
 *   2. Coverage counts from actual files (evidence, findings, claims)
 *   3. tasks/*.json completed tasks vs findings files
 *   4. state.json schema sanity (minimal, flat)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    caseDir: args.find(a => !a.startsWith('--')),
    jsonOutput: args.includes('--json'),
    suggestFix: args.includes('--fix')
  };
}

/**
 * Count files matching pattern in directory
 */
function countFiles(dir, pattern = null) {
  if (!fs.existsSync(dir)) return 0;

  const files = fs.readdirSync(dir);
  if (pattern) {
    return files.filter(f => f.match(pattern)).length;
  }
  return files.length;
}

/**
 * Get all directories in a path
 */
function getDirectories(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir).filter(f => {
    const fullPath = path.join(dir, f);
    return fs.statSync(fullPath).isDirectory();
  });
}

/**
 * Extract source IDs from sources.md
 */
function extractSourceIdsFromMd(caseDir) {
  const sourcesPath = path.join(caseDir, 'sources.md');
  if (!fs.existsSync(sourcesPath)) return [];

  const content = fs.readFileSync(sourcesPath, 'utf-8');
  const ids = new Set();
  const matches = content.matchAll(/\[S(\d{3,4})\]/g);
  for (const match of matches) {
    ids.add(`S${match[1].padStart(3, '0')}`);
  }
  return [...ids].sort();
}

/**
 * Check 1: Sources state vs filesystem
 */
function checkSources(caseDir) {
  const result = {
    name: 'sources',
    passed: true,
    discrepancies: [],
    state: {},
    filesystem: {}
  };

  // Get source IDs from various state files
  const sourcesJsonPath = path.join(caseDir, 'sources.json');
  const sourcesMdPath = path.join(caseDir, 'sources.md');

  // Sources claimed in sources.md
  const claimedIds = extractSourceIdsFromMd(caseDir);
  result.state.claimed_count = claimedIds.length;

  // Actual evidence folders
  const evidenceDir = path.join(caseDir, 'evidence', 'web');
  const actualFolders = getDirectories(evidenceDir);
  result.filesystem.evidence_folders = actualFolders.length;

  // Check for mismatches
  const missingEvidence = claimedIds.filter(id => !actualFolders.includes(id));
  const unexpectedEvidence = actualFolders.filter(id => !claimedIds.includes(id));

  if (missingEvidence.length > 0) {
    result.passed = false;
    result.discrepancies.push({
      type: 'missing_evidence',
      message: `${missingEvidence.length} sources claimed but no evidence folder`,
      items: missingEvidence.slice(0, 10),
      total: missingEvidence.length
    });
  }

  if (unexpectedEvidence.length > 0) {
    result.discrepancies.push({
      type: 'unclaimed_evidence',
      message: `${unexpectedEvidence.length} evidence folders not claimed in sources.md`,
      items: unexpectedEvidence.slice(0, 10),
      total: unexpectedEvidence.length
    });
  }

  // Check sources.json if exists (captured source registry: ID -> metadata)
  if (fs.existsSync(sourcesJsonPath)) {
    try {
      const sourcesJson = JSON.parse(fs.readFileSync(sourcesJsonPath, 'utf-8'));

      if (Array.isArray(sourcesJson)) {
        result.passed = false;
        result.discrepancies.push({
          type: 'sources_json_invalid',
          message: 'sources.json must be an object mapping { S###: { ... } }, but it is an array'
        });
      } else if (sourcesJson && typeof sourcesJson === 'object') {
        if (Array.isArray(sourcesJson.baseline) || Array.isArray(sourcesJson.discovered)) {
          result.passed = false;
          result.discrepancies.push({
            type: 'sources_json_schema_mismatch',
            message: 'sources.json appears to be a discovery registry (baseline/discovered). Expected captured source registry mapping by S###.'
          });
        }

        const registryIds = Object.keys(sourcesJson).filter(k => /^S\d{3,4}$/.test(k));
        result.state.sources_json_count = registryIds.length;

        const missingFromRegistry = claimedIds.filter(id => !registryIds.includes(id));
        if (missingFromRegistry.length > 0) {
          result.discrepancies.push({
            type: 'sources_registry_missing',
            message: `${missingFromRegistry.length} sources referenced in sources.md missing from sources.json registry`,
            items: missingFromRegistry.slice(0, 10),
            total: missingFromRegistry.length
          });
        }
      } else {
        result.passed = false;
        result.discrepancies.push({
          type: 'sources_json_invalid',
          message: 'sources.json must be a JSON object'
        });
      }
    } catch (e) {
      result.discrepancies.push({
        type: 'parse_error',
        message: `Error parsing sources.json: ${e.message}`
      });
    }
  }

  return result;
}

/**
 * Check 2: Coverage - computed from actual files
 * (No coverage.json - coverage is computed on-demand)
 */
function checkCoverage(caseDir) {
  const result = {
    name: 'coverage',
    passed: true,
    discrepancies: [],
    state: {},
    filesystem: {}
  };

  // Count evidence folders
  const evidenceDir = path.join(caseDir, 'evidence', 'web');
  const evidenceFolders = getDirectories(evidenceDir);
  result.filesystem.evidence_count = evidenceFolders.length;

  // Count sources referenced in sources.md
  const sourceIds = extractSourceIdsFromMd(caseDir);
  result.state.sources_cited = sourceIds.length;

  // Count findings files
  const findingsDir = path.join(caseDir, 'findings');
  const findingsCount = fs.existsSync(findingsDir)
    ? countFiles(findingsDir, /\.md$/)
    : 0;
  result.filesystem.findings_files = findingsCount;

  // Count claims files
  const claimsDir = path.join(caseDir, 'claims');
  const claimsCount = fs.existsSync(claimsDir)
    ? countFiles(claimsDir, /\.json$/)
    : 0;
  result.filesystem.claims_files = claimsCount;

  // Check for source/evidence mismatch
  if (sourceIds.length > evidenceFolders.length) {
    const missing = sourceIds.length - evidenceFolders.length;
    result.discrepancies.push({
      type: 'coverage_mismatch',
      message: `${missing} sources cited but missing evidence folders`,
      cited: sourceIds.length,
      captured: evidenceFolders.length
    });
    // Note: This is informational, not a hard fail - checkSources handles the actual validation
  }

  return result;
}

/**
 * Check 3: Tasks state vs filesystem
 * Tasks are stored as individual files in tasks/ directory
 */
function checkTasks(caseDir) {
  const result = {
    name: 'tasks',
    passed: true,
    discrepancies: [],
    state: {},
    filesystem: {}
  };

  const tasksDir = path.join(caseDir, 'tasks');
  if (!fs.existsSync(tasksDir)) {
    // No tasks directory is OK for new investigations
    result.state.total_tasks = 0;
    result.state.completed_tasks = 0;
    result.filesystem.task_files = 0;
    return result;
  }

  // Read all task files from tasks/ directory
  const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
  result.filesystem.task_files = taskFiles.length;

  const allTasks = [];
  for (const file of taskFiles) {
    try {
      const task = JSON.parse(fs.readFileSync(path.join(tasksDir, file), 'utf-8'));
      allTasks.push(task);
    } catch (e) {
      result.discrepancies.push({
        type: 'parse_error',
        message: `Error parsing ${file}: ${e.message}`
      });
    }
  }

  const completedTasks = allTasks.filter(t => t.status === 'completed');
  const pendingTasks = allTasks.filter(t => t.status === 'pending');
  const inProgressTasks = allTasks.filter(t => t.status === 'in_progress');

  result.state.total_tasks = allTasks.length;
  result.state.completed_tasks = completedTasks.length;
  result.state.pending_tasks = pendingTasks.length;
  result.state.in_progress_tasks = inProgressTasks.length;

  // Check that completed tasks have output files
  const missingOutputs = [];
  for (const task of completedTasks.slice(0, 50)) { // Check first 50
    if (task.findings_file || task.output_file) {
      const outputPath = path.join(caseDir, task.findings_file || task.output_file);
      if (!fs.existsSync(outputPath)) {
        missingOutputs.push({
          task_id: task.id,
          expected_file: task.findings_file || task.output_file
        });
      }
    }
  }

  result.filesystem.tasks_with_outputs = completedTasks.length - missingOutputs.length;
  result.filesystem.missing_outputs = missingOutputs.length;

  if (missingOutputs.length > 0) {
    result.passed = false;
    result.discrepancies.push({
      type: 'missing_outputs',
      message: `${missingOutputs.length} completed tasks missing output files`,
      items: missingOutputs.slice(0, 5),
      total: missingOutputs.length
    });
  }

  return result;
}

/**
 * Check 4: State schema sanity
 */
function checkStateSchema(caseDir) {
  const result = {
    name: 'state_schema',
    passed: true,
    discrepancies: [],
    state: {},
    filesystem: {}
  };

  const statePath = path.join(caseDir, 'state.json');
  if (!fs.existsSync(statePath)) {
    result.discrepancies.push({
      type: 'missing_file',
      message: 'state.json not found'
    });
    result.passed = false;
    return result;
  }

  try {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(raw);

    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      result.passed = false;
      result.discrepancies.push({
        type: 'invalid_format',
        message: 'state.json must be a JSON object'
      });
      return result;
    }

    const created = (typeof state.created === 'string' && state.created.trim())
      ? state.created
      : ((typeof state.created_at === 'string' && state.created_at.trim()) ? state.created_at : null);

    result.state.case_id = state.case_id;
    result.state.topic = state.topic;
    result.state.status = state.status;
    result.state.iteration = state.iteration;
    result.state.next_source_id = state.next_source_id;
    result.state.next_claim_id = state.next_claim_id;
    result.state.created = created;

    // Minimal schema checks (flat, small). Counters are optional.
    const required = ['case_id', 'topic', 'status', 'iteration', 'created'];
    const missing = required.filter(k => {
      if (k === 'created') return created === null;
      return state[k] === undefined || state[k] === null;
    });
    if (missing.length > 0) {
      result.passed = false;
      result.discrepancies.push({
        type: 'missing_fields',
        message: `state.json missing required fields: ${missing.join(', ')}`
      });
    }

    const nonFlat = Object.entries(state)
      .filter(([_, v]) => v && typeof v === 'object')
      .map(([k]) => k);
    if (nonFlat.length > 0) {
      result.passed = false;
      result.discrepancies.push({
        type: 'non_flat_state',
        message: `state.json must be flat (no arrays/objects). Found nested values for: ${nonFlat.join(', ')}`
      });
    }

    // Soft size sanity (helps prevent context explosion)
    const lineCount = raw.split('\n').length;
    result.filesystem.state_lines = lineCount;
    if (lineCount > 20) {
      result.discrepancies.push({
        type: 'state_too_large',
        message: `state.json is ${lineCount} lines; expected ~10 lines`
      });
    }

  } catch (e) {
    result.discrepancies.push({
      type: 'parse_error',
      message: `Error parsing state.json: ${e.message}`
    });
    result.passed = false;
  }

  return result;
}

/**
 * Generate fix suggestions
 */
function generateFixes(checks) {
  const fixes = [];

  for (const check of checks) {
    for (const disc of check.discrepancies) {
      switch (disc.type) {
        case 'missing_evidence':
          fixes.push({
            issue: disc.message,
            fix: 'Run capture scripts for missing sources OR update sources.md to remove uncaptured sources'
          });
          break;

        case 'missing_fields':
          fixes.push({
            issue: disc.message,
            fix: 'Update state.json to match the documented minimal schema in framework/architecture.md'
          });
          break;

        case 'sources_json_schema_mismatch':
          fixes.push({
            issue: disc.message,
            fix: 'Rename the discovery registry to a different file, and keep sources.json as the captured source registry mapping'
          });
          break;

        case 'non_flat_state':
          fixes.push({
            issue: disc.message,
            fix: 'Remove nested objects/arrays from state.json (store details in control/ or findings/ instead)'
          });
          break;

        case 'missing_outputs':
          fixes.push({
            issue: disc.message,
            fix: 'Re-run tasks with missing outputs OR mark them as pending'
          });
          break;
      }
    }
  }

  return fixes;
}

function run(caseDir, options = {}) {
  const startTime = Date.now();

  if (!caseDir || typeof caseDir !== 'string') {
    return {
      timestamp: new Date().toISOString(),
      case_dir: caseDir || null,
      duration_ms: Date.now() - startTime,
      passed: false,
      overall: false,
      total_discrepancies: 1,
      checks: [],
      gaps: [{
        type: 'STATE_INCONSISTENT',
        object: { field: 'case_dir' },
        message: 'Missing case directory argument',
        suggested_actions: ['provide_case_dir']
      }]
    };
  }

  const checks = [
    checkSources(caseDir),
    checkCoverage(caseDir),
    checkTasks(caseDir),
    checkStateSchema(caseDir)
  ];

  const allPassed = checks.every(c => c.passed);
  const totalDiscrepancies = checks.reduce((sum, c) => sum + (c.discrepancies || []).length, 0);

  const output = {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed: allPassed,
    overall: allPassed,
    total_discrepancies: totalDiscrepancies,
    checks
  };

  if (options.suggestFix === true) {
    output.suggested_fixes = generateFixes(checks);
  }

  const gaps = [];
  for (const check of checks) {
    for (const disc of check.discrepancies || []) {
      gaps.push({
        type: 'STATE_INCONSISTENT',
        object: { check: check.name, discrepancy_type: disc.type },
        message: `[${check.name}] ${disc.message}`,
        suggested_actions: ['fix_state_schema', 'sync_state_files']
      });
    }
  }
  output.gaps = gaps;

  return output;
}

function printHuman(output, options = {}) {
  console.log('='.repeat(70));
  console.log(`${BOLD}State-Filesystem Consistency Check${NC}`);
  console.log('='.repeat(70));
  console.log(`Case: ${output.case_dir}`);
  console.log(`Time: ${output.timestamp}`);
  console.log('');

  for (const check of output.checks || []) {
    const status = check.passed ? `${GREEN}PASS${NC}` : `${RED}FAIL${NC}`;
    console.log(`${check.name.padEnd(18)} ${status}`);
    for (const disc of check.discrepancies || []) {
      console.log(`  ${YELLOW}- ${disc.message}${NC}`);
    }
  }

  console.log('');
  console.log(output.passed
    ? `${GREEN}OVERALL: PASS${NC}`
    : `${RED}OVERALL: FAIL (${output.total_discrepancies} discrepancy/discrepancies)${NC}`
  );

  if (options.suggestFix === true && Array.isArray(output.suggested_fixes) && output.suggested_fixes.length > 0) {
    console.log('');
    console.log('Suggested fixes:');
    for (const fix of output.suggested_fixes) {
      console.log(`- ${fix.issue}`);
      console.log(`  ${fix.fix}`);
    }
  }
}

/**
 * Main function
 */
function main() {
  const parsed = parseCliArgs(process.argv);
  if (!parsed.caseDir) {
    console.error('Usage: node verify-state-consistency.js <case_dir> [--json] [--fix]');
    process.exit(1);
  }

  const result = run(parsed.caseDir, { suggestFix: parsed.suggestFix });
  if (parsed.jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result, { suggestFix: parsed.suggestFix });
  }

  process.exit(result.passed ? 0 : 1);
  return;

  /* Legacy CLI (disabled):
  const startTime = Date.now();

  if (!jsonOutput) {
    console.log('='.repeat(70));
    console.log(`${BOLD}State-Filesystem Consistency Check${NC}`);
    console.log('='.repeat(70));
    console.log(`Case: ${caseDir}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('');
  }

  // Run all checks
  const checks = [
    checkSources(caseDir),
    checkCoverage(caseDir),
    checkTasks(caseDir),
    checkStateSchema(caseDir)
  ];

  const allPassed = checks.every(c => c.passed);
  const totalDiscrepancies = checks.reduce((sum, c) => sum + c.discrepancies.length, 0);

  const output = {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed: allPassed,
    overall: allPassed,
    total_discrepancies: totalDiscrepancies,
    checks
  };

  if (suggestFix) {
    output.suggested_fixes = generateFixes(checks);
  }

  // Convert discrepancies to gaps for generate-gaps.js consumption
  const gaps = [];
  for (const check of checks) {
    for (const disc of check.discrepancies || []) {
      gaps.push({
        type: 'STATE_INCONSISTENT',
        object: { check: check.name, discrepancy_type: disc.type },
        message: `[${check.name}] ${disc.message}`,
        suggested_actions: ['fix_state_schema', 'sync_state_files']
      });
    }
  }
  output.gaps = gaps;

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    for (const check of checks) {
      const icon = check.passed ? `${GREEN}✓${NC}` : `${RED}✗${NC}`;
      const status = check.passed ? `${GREEN}CONSISTENT${NC}` : `${RED}MISMATCH${NC}`;
      console.log(`${icon} ${check.name.padEnd(15)} ${status}`);

      if (check.discrepancies.length > 0) {
        for (const disc of check.discrepancies) {
          console.log(`  ${YELLOW}→ ${disc.message}${NC}`);
        }
      }

      // Show state vs filesystem comparison
      if (Object.keys(check.state).length > 0 || Object.keys(check.filesystem).length > 0) {
        console.log(`  ${BLUE}State:${NC} ${JSON.stringify(check.state)}`);
        console.log(`  ${BLUE}Filesystem:${NC} ${JSON.stringify(check.filesystem)}`);
      }
      console.log('');
    }

    console.log('-'.repeat(70));

    if (allPassed) {
      console.log(`${GREEN}${BOLD}STATE AND FILESYSTEM ARE CONSISTENT${NC}`);
    } else {
      console.log(`${RED}${BOLD}DISCREPANCIES FOUND: ${totalDiscrepancies}${NC}`);

      if (suggestFix) {
        console.log('');
        console.log('Suggested fixes:');
        const fixes = generateFixes(checks);
        for (const fix of fixes) {
          console.log(`  ${YELLOW}Issue:${NC} ${fix.issue}`);
          console.log(`  ${GREEN}Fix:${NC} ${fix.fix}`);
          console.log('');
        }
      }
    }
  }

  process.exit(allPassed ? 0 : 1);
  */
}

module.exports = { run };

if (require.main === module) {
  main();
}
