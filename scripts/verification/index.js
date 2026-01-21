#!/usr/bin/env node
/**
 * index.js - Unified verification pipeline entry point
 *
 * Runs the complete 5-step verification pipeline:
 * 1. CAPTURE - Source capture verification
 * 2. INTEGRITY - Hash and red flag detection
 * 3. BINDING - Citation URL consistency (NEW)
 * 4. SEMANTIC - Claim-evidence verification
 * 5. STATISTICS - Number matching
 *
 * Usage:
 *   node scripts/verification/index.js <case_dir>
 *   node scripts/verification/index.js <case_dir> --generate-report
 *   node scripts/verification/index.js <case_dir> --step binding
 *   node scripts/verification/index.js <case_dir> --block
 *   node scripts/verification/index.js <case_dir> --json
 *
 * Options:
 *   --generate-report  Write verification-report.md
 *   --step <name>      Run only specified step (capture, integrity, binding, semantic, statistics)
 *   --block            Exit 1 if verification fails
 *   --json             JSON output only
 *   --verbose          Show step-by-step progress
 *
 * Exit codes:
 *   0 - Verification passed (or no --block)
 *   1 - Verification failed (with --block)
 *   2 - Usage error
 *   3 - File/path error
 */

'use strict';

const fs = require('fs');
const path = require('path');
const CONST = require('./constants');
const { runPipeline, runSingleStep, getVerificationSummary, isVerificationCurrent, STEPS } = require('./pipeline');
const { generateReport } = require('./report');

// Parse command line arguments
const args = process.argv.slice(2);
const caseDir = args.find(a => !a.startsWith('--'));
const jsonOutput = args.includes('--json');
const generateReportFlag = args.includes('--generate-report');
const blockMode = args.includes('--block');
const verbose = args.includes('--verbose');
const stepArgIdx = args.indexOf('--step');
const singleStep = stepArgIdx !== -1 ? args[stepArgIdx + 1] : null;

function printUsage() {
  console.log('Unified Verification Pipeline');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/verification/index.js <case_dir> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --generate-report  Write verification-report.md');
  console.log('  --step <name>      Run only specified step');
  console.log('  --block            Exit 1 if verification fails');
  console.log('  --json             JSON output only');
  console.log('  --verbose          Show step-by-step progress');
  console.log('');
  console.log('Steps:');
  for (const step of STEPS) {
    console.log(`  ${step.id}. ${step.name.padEnd(12)} - ${step.description}`);
  }
  console.log('');
  console.log('Exit codes:');
  console.log('  0 - Verification passed');
  console.log('  1 - Verification failed (with --block)');
  console.log('  2 - Usage error');
}

if (!caseDir) {
  printUsage();
  process.exit(2);
}

// Resolve case directory
function resolveCaseDir(dir) {
  if (path.isAbsolute(dir) && fs.existsSync(dir)) {
    return dir;
  }
  const fromCwd = path.join(process.cwd(), dir);
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }
  const fromCases = path.join(process.cwd(), 'cases', dir);
  if (fs.existsSync(fromCases)) {
    return fromCases;
  }
  return null;
}

const resolvedCaseDir = resolveCaseDir(caseDir);
if (!resolvedCaseDir) {
  console.error(`Error: Case directory not found: ${caseDir}`);
  process.exit(3);
}

// Main execution
async function main() {
  let result;

  if (singleStep) {
    // Run single step
    if (verbose) {
      console.log(`Running single step: ${singleStep}`);
    }
    try {
      result = runSingleStep(resolvedCaseDir, singleStep);
    } catch (e) {
      console.error(`Error: ${e.message}`);
      process.exit(2);
    }
  } else {
    // Run full pipeline
    if (verbose) {
      console.log('Running full verification pipeline...');
      console.log(`Case: ${path.basename(resolvedCaseDir)}`);
      console.log('');
    }
    result = runPipeline(resolvedCaseDir, {
      stopOnFail: true,
      generateState: true,
      verbose
    });
  }

  // Generate report if requested
  if (generateReportFlag && !singleStep) {
    const reportPath = path.join(resolvedCaseDir, CONST.PATHS.VERIFICATION_REPORT);
    const report = generateReport(result);
    fs.writeFileSync(reportPath, report);
    if (!jsonOutput) {
      console.log(`Report written to: ${reportPath}`);
    }
  }

  // Output results
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!singleStep) {
    printSummary(result);
  } else {
    printStepResult(result);
  }

  // Exit code
  if (blockMode) {
    const failed = singleStep
      ? (result.status === 'fail' || result.status === 'error')
      : (result.final_status === 'FAILED');

    process.exit(failed ? 1 : 0);
  }
}

/**
 * Print summary to console
 */
function printSummary(state) {
  console.log('');
  console.log('='.repeat(70));
  console.log('UNIFIED VERIFICATION PIPELINE');
  console.log('='.repeat(70));
  console.log(`Case: ${state.case_id}`);
  console.log(`Generated: ${state.generated_at}`);
  console.log(`Duration: ${state.duration_ms}ms`);
  console.log('');

  // Article info
  if (state.article) {
    console.log(`Article: ${state.article.path}`);
    console.log(`  Words: ${state.article.word_count}`);
    console.log(`  Citations: ${state.article.citation_count}`);
    console.log(`  Hash: ${state.article.hash.substring(0, 20)}...`);
    console.log('');
  }

  // Step results
  console.log('Pipeline Results:');
  console.log('-'.repeat(70));

  for (const step of state.pipeline) {
    const statusColor = getStatusColor(step.status);
    const statusIcon = getStatusIcon(step.status);
    const duration = step.duration_ms ? ` (${step.duration_ms}ms)` : '';

    console.log(`  ${step.step}. ${step.name.padEnd(12)} ${statusColor}${statusIcon} ${step.status.toUpperCase()}${'\x1b[0m'}${duration}`);

    // Show metrics for completed steps
    if (step.metrics && step.status !== 'skipped') {
      const metricsStr = Object.entries(step.metrics)
        .filter(([k, v]) => v > 0)
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
        .join(', ');
      if (metricsStr) {
        console.log(`     ${metricsStr}`);
      }
    }
  }

  console.log('');

  // Summary
  console.log('Summary:');
  console.log(`  Steps passed: ${state.summary.steps_passed}`);
  console.log(`  Steps warned: ${state.summary.steps_warned}`);
  console.log(`  Steps failed: ${state.summary.steps_failed}`);
  console.log(`  Steps skipped: ${state.summary.steps_skipped}`);
  console.log('');

  // Blocking issues
  if (state.blocking_issues.length > 0) {
    console.log('\x1b[31mBlocking Issues:\x1b[0m');
    for (const issue of state.blocking_issues.slice(0, 5)) {
      console.log(`  [${issue.step}] ${issue.type}: ${issue.message}`);
      if (issue.sourceId) {
        console.log(`    Source: ${issue.sourceId}`);
      }
    }
    if (state.blocking_issues.length > 5) {
      console.log(`  ... and ${state.blocking_issues.length - 5} more`);
    }
    console.log('');
  }

  // Warnings
  if (state.warnings.length > 0) {
    console.log('\x1b[33mWarnings:\x1b[0m');
    for (const warning of state.warnings.slice(0, 3)) {
      console.log(`  [${warning.step}] ${warning.type}: ${warning.message}`);
    }
    if (state.warnings.length > 3) {
      console.log(`  ... and ${state.warnings.length - 3} more`);
    }
    console.log('');
  }

  // Final status
  console.log('='.repeat(70));
  const finalColor = getFinalStatusColor(state.final_status);
  console.log(`${finalColor}FINAL STATUS: ${state.final_status}\x1b[0m`);
  console.log(`Chain Hash: ${state.chain_hash}`);
  console.log('='.repeat(70));
}

/**
 * Print single step result
 */
function printStepResult(result) {
  console.log('');
  console.log('='.repeat(70));
  console.log(`STEP ${result.step}: ${result.name.toUpperCase()}`);
  console.log('='.repeat(70));
  console.log(`Status: ${result.status}`);
  console.log(`Duration: ${result.duration_ms}ms`);
  console.log('');

  if (result.metrics) {
    console.log('Metrics:');
    for (const [key, value] of Object.entries(result.metrics)) {
      console.log(`  ${key}: ${value}`);
    }
    console.log('');
  }

  if (result.issues && result.issues.length > 0) {
    console.log('Issues:');
    for (const issue of result.issues) {
      const color = issue.severity === 'blocking' ? '\x1b[31m' : '\x1b[33m';
      console.log(`  ${color}[${issue.severity}]\x1b[0m ${issue.type}: ${issue.message}`);
    }
  }

  console.log('='.repeat(70));
}

function getStatusColor(status) {
  switch (status) {
    case 'pass': return '\x1b[32m';
    case 'warn': return '\x1b[33m';
    case 'fail': return '\x1b[31m';
    case 'error': return '\x1b[31m';
    case 'skipped': return '\x1b[90m';
    default: return '';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'pass': return '✓';
    case 'warn': return '!';
    case 'fail': return '✗';
    case 'error': return '✗';
    case 'skipped': return '-';
    default: return '?';
  }
}

function getFinalStatusColor(status) {
  switch (status) {
    case 'VERIFIED': return '\x1b[32m';
    case 'NEEDS_REVIEW': return '\x1b[33m';
    case 'FAILED': return '\x1b[31m';
    default: return '\x1b[33m';
  }
}

// Run
main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  if (verbose) {
    console.error(err.stack);
  }
  process.exit(2);
});
