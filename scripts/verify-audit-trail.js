#!/usr/bin/env node
/**
 * verify-audit-trail.js - Verify audit trail completeness
 *
 * Checks that the audit trail (_audit.json, iterations.md) exists and is complete.
 * Cross-references with _tasks.json and _state.json to find gaps.
 *
 * Usage:
 *   node verify-audit-trail.js <case_dir>
 *   node verify-audit-trail.js <case_dir> --json
 *   node verify-audit-trail.js <case_dir> --fix    # Show fix suggestions
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
const showFix = args.includes('--fix');

if (!caseDir) {
  console.error('Usage: node verify-audit-trail.js <case_dir> [--json] [--fix]');
  process.exit(1);
}

/**
 * Check 1: _audit.json exists and has entries
 */
function checkAuditJson(caseDir) {
  const result = {
    name: 'audit_json',
    passed: true,
    issues: [],
    stats: {}
  };

  const auditPath = path.join(caseDir, '_audit.json');

  if (!fs.existsSync(auditPath)) {
    result.passed = false;
    result.issues.push({
      type: 'missing_file',
      message: '_audit.json does not exist',
      fix: `node scripts/audit-append.js ${caseDir} --init`
    });
    return result;
  }

  try {
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));

    if (!audit.log || !Array.isArray(audit.log)) {
      result.passed = false;
      result.issues.push({
        type: 'invalid_format',
        message: '_audit.json missing log array'
      });
      return result;
    }

    result.stats.total_entries = audit.log.length;

    if (audit.log.length === 0) {
      result.passed = false;
      result.issues.push({
        type: 'empty_log',
        message: '_audit.json has no entries'
      });
      return result;
    }

    // Count by action type
    const actionCounts = {};
    const actorCounts = {};
    for (const entry of audit.log) {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      actorCounts[entry.actor] = (actorCounts[entry.actor] || 0) + 1;
    }
    result.stats.by_action = actionCounts;
    result.stats.by_actor = actorCounts;

    // Check for required action types
    const requiredActions = ['phase_start', 'task_complete'];
    for (const action of requiredActions) {
      if (!actionCounts[action]) {
        result.issues.push({
          type: 'missing_action',
          message: `No ${action} entries found`,
          severity: 'warning'
        });
      }
    }

  } catch (e) {
    result.passed = false;
    result.issues.push({
      type: 'parse_error',
      message: `Error parsing _audit.json: ${e.message}`
    });
  }

  return result;
}

/**
 * Check 2: iterations.md exists and has content
 */
function checkIterationsMd(caseDir) {
  const result = {
    name: 'iterations_md',
    passed: true,
    issues: [],
    stats: {}
  };

  const iterPath = path.join(caseDir, 'iterations.md');

  if (!fs.existsSync(iterPath)) {
    result.passed = false;
    result.issues.push({
      type: 'missing_file',
      message: 'iterations.md does not exist'
    });
    return result;
  }

  const content = fs.readFileSync(iterPath, 'utf-8');
  result.stats.file_size = content.length;

  if (content.trim().length === 0) {
    result.passed = false;
    result.issues.push({
      type: 'empty_file',
      message: 'iterations.md is empty'
    });
    return result;
  }

  // Count iterations
  const iterMatches = content.match(/## Iteration \d+/g);
  result.stats.iterations_logged = iterMatches ? iterMatches.length : 0;

  // Check for required sections
  if (!content.includes('Phase Summary') && !content.includes('Tasks Completed')) {
    result.issues.push({
      type: 'missing_sections',
      message: 'iterations.md missing expected sections',
      severity: 'warning'
    });
  }

  return result;
}

/**
 * Check 3: Cross-reference tasks with audit
 */
function checkTaskAuditConsistency(caseDir) {
  const result = {
    name: 'task_audit_consistency',
    passed: true,
    issues: [],
    stats: {}
  };

  const tasksPath = path.join(caseDir, '_tasks.json');
  const auditPath = path.join(caseDir, '_audit.json');

  if (!fs.existsSync(tasksPath)) {
    result.issues.push({
      type: 'missing_file',
      message: '_tasks.json does not exist',
      severity: 'warning'
    });
    return result;
  }

  if (!fs.existsSync(auditPath)) {
    // Already checked in checkAuditJson
    return result;
  }

  try {
    const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));

    // Get all completed tasks
    const allTasks = [
      ...(tasks.tasks || []),
      ...(tasks.adversarial_tasks || []),
      ...(tasks.rigor_gap_tasks || [])
    ];

    const completedTasks = allTasks.filter(t => t.status === 'completed');
    result.stats.completed_tasks = completedTasks.length;

    // Get task_complete entries from audit
    const taskCompleteEntries = audit.log.filter(e => e.action === 'task_complete');
    result.stats.task_complete_entries = taskCompleteEntries.length;

    // Find tasks completed but not logged
    const loggedTaskIds = new Set(taskCompleteEntries.map(e => e.target));
    const unloggedTasks = completedTasks.filter(t => !loggedTaskIds.has(t.id));

    if (unloggedTasks.length > 0) {
      result.issues.push({
        type: 'unlogged_tasks',
        message: `${unloggedTasks.length} completed tasks not in audit log`,
        tasks: unloggedTasks.slice(0, 5).map(t => t.id),
        severity: 'warning'
      });
    }

  } catch (e) {
    result.issues.push({
      type: 'parse_error',
      message: `Error checking task consistency: ${e.message}`
    });
  }

  return result;
}

/**
 * Check 4: Cross-reference state with audit
 */
function checkStateAuditConsistency(caseDir) {
  const result = {
    name: 'state_audit_consistency',
    passed: true,
    issues: [],
    stats: {}
  };

  const statePath = path.join(caseDir, '_state.json');
  const auditPath = path.join(caseDir, '_audit.json');

  if (!fs.existsSync(statePath) || !fs.existsSync(auditPath)) {
    return result;
  }

  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));

    result.stats.current_iteration = state.current_iteration || 0;

    // Check if there are phase entries for iteration count
    const phaseStartEntries = audit.log.filter(e => e.action === 'phase_start');
    result.stats.phase_starts_logged = phaseStartEntries.length;

    // Check if gate checks are logged
    if (state.verification_passed || state.adversarial_complete) {
      const gateCheckEntries = audit.log.filter(e => e.action === 'gate_check');
      if (gateCheckEntries.length === 0) {
        result.issues.push({
          type: 'unlogged_gate_check',
          message: 'State shows gate progress but no gate_check entries in audit',
          severity: 'warning'
        });
      }
    }

  } catch (e) {
    result.issues.push({
      type: 'parse_error',
      message: `Error checking state consistency: ${e.message}`
    });
  }

  return result;
}

/**
 * Check 5: Source capture logging
 */
function checkSourceCaptureLogs(caseDir) {
  const result = {
    name: 'source_capture_logs',
    passed: true,
    issues: [],
    stats: {}
  };

  const evidenceDir = path.join(caseDir, 'evidence', 'web');
  const auditPath = path.join(caseDir, '_audit.json');

  if (!fs.existsSync(evidenceDir)) {
    result.stats.evidence_folders = 0;
    return result;
  }

  if (!fs.existsSync(auditPath)) {
    return result;
  }

  try {
    const evidenceFolders = fs.readdirSync(evidenceDir).filter(f => {
      const fullPath = path.join(evidenceDir, f);
      return fs.statSync(fullPath).isDirectory();
    });
    result.stats.evidence_folders = evidenceFolders.length;

    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf-8'));
    const captureEntries = audit.log.filter(e => e.action === 'capture_source');
    result.stats.capture_entries = captureEntries.length;

    // Find unlogged captures
    const loggedSources = new Set(captureEntries.map(e => e.target));
    const unloggedCaptures = evidenceFolders.filter(f => !loggedSources.has(f));

    if (unloggedCaptures.length > 0) {
      result.issues.push({
        type: 'unlogged_captures',
        message: `${unloggedCaptures.length} evidence folders not logged in audit`,
        sources: unloggedCaptures.slice(0, 5),
        severity: 'warning'
      });
    }

  } catch (e) {
    result.issues.push({
      type: 'error',
      message: `Error checking source captures: ${e.message}`
    });
  }

  return result;
}

/**
 * Main function
 */
function main() {
  const startTime = Date.now();

  if (!jsonOutput) {
    console.log('='.repeat(70));
    console.log(`${BOLD}Audit Trail Verification${NC}`);
    console.log('='.repeat(70));
    console.log(`Case: ${caseDir}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('');
  }

  // Run all checks
  const checks = [
    checkAuditJson(caseDir),
    checkIterationsMd(caseDir),
    checkTaskAuditConsistency(caseDir),
    checkStateAuditConsistency(caseDir),
    checkSourceCaptureLogs(caseDir)
  ];

  const allPassed = checks.every(c => c.passed);
  const totalIssues = checks.reduce((sum, c) => sum + c.issues.length, 0);
  const criticalIssues = checks.reduce((sum, c) =>
    sum + c.issues.filter(i => i.severity !== 'warning').length, 0);

  const output = {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    overall: allPassed,
    total_issues: totalIssues,
    critical_issues: criticalIssues,
    checks
  };

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    for (const check of checks) {
      const icon = check.passed ? `${GREEN}✓${NC}` : `${RED}✗${NC}`;
      const status = check.passed ? `${GREEN}PASS${NC}` : `${RED}ISSUES${NC}`;
      console.log(`${icon} ${check.name.padEnd(25)} ${status}`);

      // Show stats
      if (Object.keys(check.stats).length > 0) {
        console.log(`  ${BLUE}Stats:${NC} ${JSON.stringify(check.stats)}`);
      }

      // Show issues
      for (const issue of check.issues) {
        const severity = issue.severity === 'warning' ? YELLOW : RED;
        console.log(`  ${severity}→ ${issue.message}${NC}`);
        if (showFix && issue.fix) {
          console.log(`    ${GREEN}Fix: ${issue.fix}${NC}`);
        }
      }
      console.log('');
    }

    console.log('-'.repeat(70));

    if (allPassed && totalIssues === 0) {
      console.log(`${GREEN}${BOLD}AUDIT TRAIL COMPLETE${NC}`);
    } else if (criticalIssues > 0) {
      console.log(`${RED}${BOLD}AUDIT TRAIL INCOMPLETE: ${criticalIssues} critical issues${NC}`);
    } else {
      console.log(`${YELLOW}${BOLD}AUDIT TRAIL HAS WARNINGS: ${totalIssues} issues${NC}`);
    }
  }

  // Exit with appropriate code
  process.exit(criticalIssues > 0 ? 1 : 0);
}

main();
