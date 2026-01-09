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
 *   1. _sources.json entries vs evidence/web/ folders
 *   2. _coverage.json counts vs actual file counts
 *   3. _tasks.json completed tasks vs findings files
 *   4. _state.json flags vs verification script results
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

// Parse arguments
const args = process.argv.slice(2);
const caseDir = args.find(a => !a.startsWith('--'));
const jsonOutput = args.includes('--json');
const suggestFix = args.includes('--fix');

if (!caseDir) {
  console.error('Usage: node verify-state-consistency.js <case_dir> [--json] [--fix]');
  process.exit(1);
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
  const matches = content.matchAll(/\[S(\d+)\]/g);
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
  const sourcesJsonPath = path.join(caseDir, '_sources.json');
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

  // Check _sources.json if exists
  if (fs.existsSync(sourcesJsonPath)) {
    try {
      const sourcesJson = JSON.parse(fs.readFileSync(sourcesJsonPath, 'utf-8'));
      const jsonSourceCount = (sourcesJson.baseline?.length || 0) + (sourcesJson.discovered?.length || 0);
      result.state.sources_json_count = jsonSourceCount;
    } catch (e) {
      result.discrepancies.push({
        type: 'parse_error',
        message: `Error parsing _sources.json: ${e.message}`
      });
    }
  }

  return result;
}

/**
 * Check 2: Coverage state vs filesystem
 */
function checkCoverage(caseDir) {
  const result = {
    name: 'coverage',
    passed: true,
    discrepancies: [],
    state: {},
    filesystem: {}
  };

  const coveragePath = path.join(caseDir, '_coverage.json');
  if (!fs.existsSync(coveragePath)) {
    result.discrepancies.push({
      type: 'missing_file',
      message: '_coverage.json not found'
    });
    result.passed = false;
    return result;
  }

  try {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));

    // Check outlet/profile counts
    if (coverage.outlet_coverage) {
      const claimedOutlets = coverage.outlet_coverage.outlets_documented || 0;
      result.state.outlets_documented = claimedOutlets;

      // Count actual outlet profile files
      const profilesDir = path.join(caseDir, 'outlet-profiles');
      const findingsDir = path.join(caseDir, 'findings');

      let actualProfiles = 0;
      if (fs.existsSync(profilesDir)) {
        actualProfiles = countFiles(profilesDir, /\.md$/);
      }

      // Also check findings folder for outlet data
      let findingsCount = 0;
      if (fs.existsSync(findingsDir)) {
        findingsCount = countFiles(findingsDir, /\.md$/);
      }

      result.filesystem.profile_files = actualProfiles;
      result.filesystem.findings_files = findingsCount;

      // Profile files should exist for claimed outlets (rough check)
      if (claimedOutlets > 0 && actualProfiles === 0 && findingsCount === 0) {
        result.passed = false;
        result.discrepancies.push({
          type: 'missing_profiles',
          message: `${claimedOutlets} outlets claimed but no profile files found`,
          claimed: claimedOutlets,
          found: actualProfiles
        });
      }
    }

    // Check source counts
    if (coverage.source_coverage) {
      const claimedSources = coverage.source_coverage.source_count || coverage.sources?.cited || 0;
      result.state.sources_claimed = claimedSources;

      // Count actual evidence folders
      const evidenceDir = path.join(caseDir, 'evidence', 'web');
      const actualEvidence = getDirectories(evidenceDir).length;
      result.filesystem.evidence_count = actualEvidence;

      if (claimedSources > 0 && actualEvidence === 0) {
        result.passed = false;
        result.discrepancies.push({
          type: 'missing_evidence',
          message: `${claimedSources} sources claimed but evidence folder is empty`,
          claimed: claimedSources,
          found: actualEvidence
        });
      }
    }

  } catch (e) {
    result.discrepancies.push({
      type: 'parse_error',
      message: `Error parsing _coverage.json: ${e.message}`
    });
    result.passed = false;
  }

  return result;
}

/**
 * Check 3: Tasks state vs filesystem
 */
function checkTasks(caseDir) {
  const result = {
    name: 'tasks',
    passed: true,
    discrepancies: [],
    state: {},
    filesystem: {}
  };

  const tasksPath = path.join(caseDir, '_tasks.json');
  if (!fs.existsSync(tasksPath)) {
    result.discrepancies.push({
      type: 'missing_file',
      message: '_tasks.json not found'
    });
    result.passed = false;
    return result;
  }

  try {
    const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
    const allTasks = [
      ...(tasksData.tasks || []),
      ...(tasksData.adversarial_tasks || []),
      ...(tasksData.rigor_gap_tasks || [])
    ];

    const completedTasks = allTasks.filter(t => t.status === 'completed');
    result.state.completed_tasks = completedTasks.length;
    result.state.total_tasks = allTasks.length;

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

  } catch (e) {
    result.discrepancies.push({
      type: 'parse_error',
      message: `Error parsing _tasks.json: ${e.message}`
    });
    result.passed = false;
  }

  return result;
}

/**
 * Check 4: State flags vs reality
 */
function checkStateFlags(caseDir) {
  const result = {
    name: 'state_flags',
    passed: true,
    discrepancies: [],
    state: {},
    filesystem: {}
  };

  const statePath = path.join(caseDir, '_state.json');
  if (!fs.existsSync(statePath)) {
    result.discrepancies.push({
      type: 'missing_file',
      message: '_state.json not found'
    });
    result.passed = false;
    return result;
  }

  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

    result.state.verification_passed = state.verification_passed;
    result.state.adversarial_complete = state.adversarial_complete;
    result.state.rigor_checkpoint_passed = state.rigor_checkpoint_passed;
    result.state.quality_checks_passed = state.quality_checks_passed;

    // If verification_passed is true, check if evidence actually exists
    if (state.verification_passed === true) {
      const evidenceDir = path.join(caseDir, 'evidence', 'web');
      const evidenceCount = getDirectories(evidenceDir).length;
      result.filesystem.evidence_folders = evidenceCount;

      const sourceIds = extractSourceIdsFromMd(caseDir);
      result.filesystem.sources_cited = sourceIds.length;

      if (sourceIds.length > 0 && evidenceCount === 0) {
        result.passed = false;
        result.discrepancies.push({
          type: 'verification_inconsistent',
          message: 'verification_passed=true but no evidence folders exist',
          sources_cited: sourceIds.length,
          evidence_folders: evidenceCount
        });
      }
    }

    // If quality_checks_passed is true, check for quality file
    if (state.quality_checks_passed === true) {
      const qualityFile = path.join(caseDir, 'quality-checks.md');
      const legalFile = path.join(caseDir, 'legal-review.md');

      result.filesystem.quality_file_exists = fs.existsSync(qualityFile);
      result.filesystem.legal_file_exists = fs.existsSync(legalFile);

      if (!fs.existsSync(qualityFile) && !fs.existsSync(legalFile)) {
        result.passed = false;
        result.discrepancies.push({
          type: 'quality_inconsistent',
          message: 'quality_checks_passed=true but no quality/legal review file exists'
        });
      }
    }

    // If adversarial_complete is true, check for adversarial findings
    if (state.adversarial_complete === true) {
      const findingsDir = path.join(caseDir, 'findings');
      const advFiles = fs.existsSync(findingsDir)
        ? fs.readdirSync(findingsDir).filter(f =>
            f.includes('adversarial') ||
            f.includes('opposing') ||
            f.includes('falsification')
          ).length
        : 0;

      result.filesystem.adversarial_files = advFiles;

      if (advFiles === 0) {
        result.passed = false;
        result.discrepancies.push({
          type: 'adversarial_inconsistent',
          message: 'adversarial_complete=true but no adversarial findings files exist'
        });
      }
    }

  } catch (e) {
    result.discrepancies.push({
      type: 'parse_error',
      message: `Error parsing _state.json: ${e.message}`
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

        case 'verification_inconsistent':
          fixes.push({
            issue: disc.message,
            fix: 'Set verification_passed=false in _state.json OR capture missing evidence'
          });
          break;

        case 'quality_inconsistent':
          fixes.push({
            issue: disc.message,
            fix: 'Run /legal-review skill OR set quality_checks_passed=false'
          });
          break;

        case 'adversarial_inconsistent':
          fixes.push({
            issue: disc.message,
            fix: 'Run adversarial pass OR set adversarial_complete=false'
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

/**
 * Main function
 */
function main() {
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
    checkStateFlags(caseDir)
  ];

  const allPassed = checks.every(c => c.passed);
  const totalDiscrepancies = checks.reduce((sum, c) => sum + c.discrepancies.length, 0);

  const output = {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    overall: allPassed,
    total_discrepancies: totalDiscrepancies,
    checks
  };

  if (suggestFix) {
    output.suggested_fixes = generateFixes(checks);
  }

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
}

main();
