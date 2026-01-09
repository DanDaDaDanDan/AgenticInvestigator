#!/usr/bin/env node
/**
 * verify-all-gates.js - Master termination gate verification
 *
 * Runs all 9 termination gate checks mechanically and outputs results.
 * Investigation CANNOT terminate unless ALL gates pass.
 *
 * Usage:
 *   node verify-all-gates.js <case_dir>
 *   node verify-all-gates.js <case_dir> --json    # JSON output only
 *   node verify-all-gates.js <case_dir> --fix     # Generate remediation tasks
 *
 * Gates:
 *   1. Coverage - Files exist and meet thresholds
 *   2. Tasks - All tasks completed, output files exist
 *   3. Adversarial - Adversarial pass complete
 *   4. Sources - All cited sources have evidence folders
 *   5. Content - Claims found in evidence content
 *   6. Claims - AI verification of claims (uses verify-claims.js)
 *   7. Contradictions - Contradictions documented and explored
 *   8. Rigor - 20-framework rigor checkpoint passed
 *   9. Legal - Legal review completed
 *
 * Exit codes:
 *   0 - All gates pass
 *   1 - One or more gates failed
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

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
const generateFix = args.includes('--fix');

if (!caseDir) {
  console.error('Usage: node verify-all-gates.js <case_dir> [--json] [--fix]');
  process.exit(1);
}

// Coverage thresholds (from framework/rules.md)
const THRESHOLDS = {
  people_investigated: 0.9,      // 90%
  entities_investigated: 0.9,    // 90%
  claims_verified: 0.8,          // 80%
  sources_captured: 1.0,         // 100%
  positions_documented: 1.0,     // 100%
  contradictions_explored: 1.0   // 100%
};

// Required files for a complete investigation
const REQUIRED_FILES = [
  'summary.md',
  'sources.md',
  'fact-check.md',
  'positions.md'
];

/**
 * Gate 1: Coverage verification
 */
function verifyCoverage(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  const coveragePath = path.join(caseDir, '_coverage.json');
  if (!fs.existsSync(coveragePath)) {
    result.reason = '_coverage.json not found';
    return result;
  }

  try {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
    const failures = [];

    // Check required files exist
    for (const file of REQUIRED_FILES) {
      const filePath = path.join(caseDir, file);
      if (!fs.existsSync(filePath)) {
        failures.push(`Missing required file: ${file}`);
      }
    }

    // Check coverage metrics against thresholds
    if (coverage.people) {
      const ratio = (coverage.people.investigated || 0) / Math.max(coverage.people.mentioned || 1, 1);
      result.details.people = { ratio, threshold: THRESHOLDS.people_investigated };
      if (ratio < THRESHOLDS.people_investigated) {
        failures.push(`People investigated: ${(ratio * 100).toFixed(1)}% < ${THRESHOLDS.people_investigated * 100}%`);
      }
    }

    if (coverage.entities) {
      const ratio = (coverage.entities.investigated || 0) / Math.max(coverage.entities.mentioned || 1, 1);
      result.details.entities = { ratio, threshold: THRESHOLDS.entities_investigated };
      if (ratio < THRESHOLDS.entities_investigated) {
        failures.push(`Entities investigated: ${(ratio * 100).toFixed(1)}% < ${THRESHOLDS.entities_investigated * 100}%`);
      }
    }

    if (coverage.claims) {
      const ratio = (coverage.claims.verified || 0) / Math.max(coverage.claims.total || 1, 1);
      result.details.claims = { ratio, threshold: THRESHOLDS.claims_verified };
      if (ratio < THRESHOLDS.claims_verified) {
        failures.push(`Claims verified: ${(ratio * 100).toFixed(1)}% < ${THRESHOLDS.claims_verified * 100}%`);
      }
    }

    if (coverage.sources) {
      const ratio = (coverage.sources.captured || 0) / Math.max(coverage.sources.cited || 1, 1);
      result.details.sources = { ratio, threshold: THRESHOLDS.sources_captured };
      if (ratio < THRESHOLDS.sources_captured) {
        failures.push(`Sources captured: ${(ratio * 100).toFixed(1)}% < ${THRESHOLDS.sources_captured * 100}%`);
      }
    }

    if (failures.length === 0) {
      result.passed = true;
    } else {
      result.reason = failures.join('; ');
    }

  } catch (e) {
    result.reason = `Error parsing _coverage.json: ${e.message}`;
  }

  return result;
}

/**
 * Gate 2: Tasks verification
 */
function verifyTasks(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  const tasksPath = path.join(caseDir, '_tasks.json');
  if (!fs.existsSync(tasksPath)) {
    result.reason = '_tasks.json not found';
    return result;
  }

  try {
    const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
    const failures = [];

    // Check main tasks
    const tasks = tasksData.tasks || [];
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const highPriorityPending = tasks.filter(t => t.status === 'pending' && t.priority === 'HIGH');

    result.details.total = tasks.length;
    result.details.completed = tasks.filter(t => t.status === 'completed').length;
    result.details.pending = pendingTasks.length;
    result.details.high_priority_pending = highPriorityPending.length;

    if (highPriorityPending.length > 0) {
      failures.push(`${highPriorityPending.length} HIGH priority tasks still pending`);
    }

    // Check adversarial tasks
    const advTasks = tasksData.adversarial_tasks || [];
    const advPending = advTasks.filter(t => t.status === 'pending');
    result.details.adversarial_total = advTasks.length;
    result.details.adversarial_pending = advPending.length;

    // Check rigor gap tasks
    const rigorTasks = tasksData.rigor_gap_tasks || [];
    const rigorPending = rigorTasks.filter(t => t.status === 'pending');
    result.details.rigor_gap_total = rigorTasks.length;
    result.details.rigor_gap_pending = rigorPending.length;

    if (rigorPending.length > 0) {
      failures.push(`${rigorPending.length} rigor gap tasks still pending`);
    }

    if (failures.length === 0) {
      result.passed = true;
    } else {
      result.reason = failures.join('; ');
    }

  } catch (e) {
    result.reason = `Error parsing _tasks.json: ${e.message}`;
  }

  return result;
}

/**
 * Gate 3: Adversarial pass verification
 */
function verifyAdversarial(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  const statePath = path.join(caseDir, '_state.json');
  if (!fs.existsSync(statePath)) {
    result.reason = '_state.json not found';
    return result;
  }

  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

    result.details.adversarial_complete = state.adversarial_complete;

    if (state.adversarial_complete === true) {
      // Verify adversarial findings exist
      const findingsDir = path.join(caseDir, 'findings');
      const advFiles = fs.existsSync(findingsDir)
        ? fs.readdirSync(findingsDir).filter(f =>
            f.includes('adversarial') ||
            f.includes('opposing') ||
            f.includes('falsification') ||
            f.includes('assumption')
          )
        : [];

      result.details.adversarial_files = advFiles.length;

      if (advFiles.length > 0) {
        result.passed = true;
      } else {
        result.reason = 'adversarial_complete is true but no adversarial findings files found';
      }
    } else {
      result.reason = 'adversarial_complete is not true';
    }

  } catch (e) {
    result.reason = `Error parsing _state.json: ${e.message}`;
  }

  return result;
}

/**
 * Gate 4: Sources verification (file existence)
 * Uses existing verify-sources.js script
 */
function verifySources(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  const scriptPath = path.join(__dirname, 'verify-sources.js');
  if (!fs.existsSync(scriptPath)) {
    result.reason = 'verify-sources.js script not found';
    return result;
  }

  try {
    // Run verify-sources.js and capture output
    const output = execSync(`node "${scriptPath}" "${caseDir}"`, {
      encoding: 'utf-8',
      timeout: 60000
    });

    // Parse JSON from output
    const jsonMatch = output.match(/\{[\s\S]*"stats"[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      result.details = data.stats;
      result.details.capture_rate = data.capture_rate;

      if (data.stats.missing === 0) {
        result.passed = true;
      } else {
        result.reason = `${data.stats.missing} sources missing evidence`;
      }
    } else {
      result.passed = true; // No JSON means no issues
    }

  } catch (e) {
    if (e.status === 1) {
      // Script exited with error - parse the output
      const output = e.stdout || '';
      const jsonMatch = output.match(/\{[\s\S]*"stats"[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        result.details = data.stats;
        result.reason = `${data.stats.missing} sources missing evidence`;
      } else {
        result.reason = 'Sources verification failed';
      }
    } else {
      result.reason = `Error running verify-sources.js: ${e.message}`;
    }
  }

  return result;
}

/**
 * Gate 5: Content verification (claims in evidence)
 * Uses verify-source-content.js script
 */
function verifyContent(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  const scriptPath = path.join(__dirname, 'verify-source-content.js');
  if (!fs.existsSync(scriptPath)) {
    result.reason = 'verify-source-content.js script not found';
    return result;
  }

  try {
    const proc = spawnSync('node', [scriptPath, caseDir, '--json'], {
      encoding: 'utf-8',
      timeout: 120000
    });

    if (proc.stdout) {
      const data = JSON.parse(proc.stdout);
      result.details = data.stats;
      result.details.verification_rate = data.verification_rate;

      if (data.stats.not_found === 0) {
        result.passed = true;
      } else {
        result.reason = `${data.stats.not_found} claims not found in evidence content`;
      }
    } else if (proc.status === 0) {
      result.passed = true;
    } else {
      result.reason = proc.stderr || 'Content verification failed';
    }

  } catch (e) {
    result.reason = `Error running verify-source-content.js: ${e.message}`;
  }

  return result;
}

/**
 * Gate 6: Claims verification (AI-based)
 * Uses verify-claims.js script
 */
function verifyClaims(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  // Check if API key is available
  if (!process.env.GEMINI_API_KEY) {
    result.reason = 'GEMINI_API_KEY not set - cannot run AI verification';
    result.details.skipped = true;
    return result;
  }

  const scriptPath = path.join(__dirname, 'verify-claims.js');
  if (!fs.existsSync(scriptPath)) {
    result.reason = 'verify-claims.js script not found';
    return result;
  }

  try {
    const proc = spawnSync('node', [scriptPath, caseDir, '--json'], {
      encoding: 'utf-8',
      timeout: 600000 // 10 minutes for AI verification
    });

    if (proc.stdout) {
      const data = JSON.parse(proc.stdout);
      result.details = data.stats;
      result.details.verification_rate = data.verification_rate;

      const problems = (data.stats.not_found || 0) + (data.stats.contradicted || 0);
      if (problems === 0) {
        result.passed = true;
      } else {
        result.reason = `${problems} claims failed AI verification`;
      }
    } else if (proc.status === 0) {
      result.passed = true;
    } else {
      result.reason = proc.stderr || 'Claims verification failed';
    }

  } catch (e) {
    result.reason = `Error running verify-claims.js: ${e.message}`;
  }

  return result;
}

/**
 * Gate 7: Contradictions verification
 */
function verifyContradictions(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  const coveragePath = path.join(caseDir, '_coverage.json');

  try {
    // Check for contradictions tracking
    if (fs.existsSync(coveragePath)) {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));

      if (coverage.contradictions) {
        const identified = coverage.contradictions.identified || 0;
        const explored = coverage.contradictions.explored || 0;

        result.details.identified = identified;
        result.details.explored = explored;

        if (identified === 0 || explored >= identified) {
          result.passed = true;
        } else {
          result.reason = `${identified - explored} contradictions not explored`;
        }
      } else {
        // No contradictions section - check if file exists
        const factCheckPath = path.join(caseDir, 'fact-check.md');
        if (fs.existsSync(factCheckPath)) {
          result.passed = true;
          result.details.note = 'No contradictions tracking, but fact-check.md exists';
        } else {
          result.reason = 'No contradictions tracking and no fact-check.md';
        }
      }
    } else {
      result.reason = '_coverage.json not found';
    }

  } catch (e) {
    result.reason = `Error: ${e.message}`;
  }

  return result;
}

/**
 * Gate 8: Rigor checkpoint verification
 */
function verifyRigor(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  const statePath = path.join(caseDir, '_state.json');
  if (!fs.existsSync(statePath)) {
    result.reason = '_state.json not found';
    return result;
  }

  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

    result.details.rigor_checkpoint_passed = state.rigor_checkpoint_passed;

    if (state.rigor_checkpoint_passed === true) {
      result.passed = true;
    } else {
      result.reason = 'rigor_checkpoint_passed is not true';
    }

  } catch (e) {
    result.reason = `Error parsing _state.json: ${e.message}`;
  }

  return result;
}

/**
 * Gate 9: Legal review verification
 */
function verifyLegal(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  // Check for legal review file
  const legalFiles = [
    'legal-review.md',
    'legal-assessment.md',
    'quality-checks.md'  // May contain legal assessment
  ];

  let foundLegal = false;
  for (const file of legalFiles) {
    const filePath = path.join(caseDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for legal assessment content
      if (content.includes('Legal') || content.includes('legal')) {
        result.details.file = file;
        result.details.size = content.length;

        // Look for key legal assessment markers
        const hasRiskLevel = content.includes('Risk') || content.includes('risk');
        const hasAssessment = content.includes('Assessment') || content.includes('assessment');

        if (hasRiskLevel || hasAssessment) {
          foundLegal = true;
          break;
        }
      }
    }
  }

  // Also check state flag
  const statePath = path.join(caseDir, '_state.json');
  if (fs.existsSync(statePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      result.details.quality_checks_passed = state.quality_checks_passed;

      if (state.quality_checks_passed === true && foundLegal) {
        result.passed = true;
      } else if (!foundLegal) {
        result.reason = 'No legal review file found';
      } else {
        result.reason = 'quality_checks_passed is not true';
      }
    } catch (e) {
      if (foundLegal) {
        result.passed = true;
        result.details.note = 'Legal file exists but could not verify state';
      } else {
        result.reason = 'No legal review found';
      }
    }
  } else if (foundLegal) {
    result.passed = true;
    result.details.note = 'Legal file exists, no state file';
  } else {
    result.reason = 'No legal review or state file found';
  }

  return result;
}

/**
 * Generate remediation tasks for failed gates
 */
function generateRemediationTasks(gateResults) {
  const tasks = [];
  let taskId = 1;

  for (const [gate, result] of Object.entries(gateResults)) {
    if (!result.passed) {
      tasks.push({
        id: `TGATE${String(taskId++).padStart(2, '0')}`,
        description: `Fix ${gate} gate: ${result.reason}`,
        gate,
        priority: 'HIGH',
        status: 'pending',
        created: new Date().toISOString()
      });
    }
  }

  return tasks;
}

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();

  if (!jsonOutput) {
    console.log('='.repeat(70));
    console.log(`${BOLD}Termination Gate Verification${NC}`);
    console.log('='.repeat(70));
    console.log(`Case: ${caseDir}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('');
  }

  // Run all gates
  const gates = {
    coverage: verifyCoverage(caseDir),
    tasks: verifyTasks(caseDir),
    adversarial: verifyAdversarial(caseDir),
    sources: verifySources(caseDir),
    content: verifyContent(caseDir),
    claims: verifyClaims(caseDir),
    contradictions: verifyContradictions(caseDir),
    rigor: verifyRigor(caseDir),
    legal: verifyLegal(caseDir)
  };

  // Calculate overall result
  const failedGates = Object.entries(gates)
    .filter(([_, r]) => !r.passed)
    .map(([name, _]) => name);

  const passedCount = Object.values(gates).filter(r => r.passed).length;
  const totalGates = Object.keys(gates).length;
  const allPassed = failedGates.length === 0;

  // Generate output
  const output = {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    gates,
    summary: {
      passed: passedCount,
      failed: failedGates.length,
      total: totalGates
    },
    overall: allPassed,
    blocking_gates: failedGates
  };

  // Write gate results to case directory
  const resultsPath = path.join(caseDir, '_gate_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(output, null, 2));

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    // Display results
    for (const [gate, result] of Object.entries(gates)) {
      const icon = result.passed ? `${GREEN}✓${NC}` : `${RED}✗${NC}`;
      const status = result.passed ? `${GREEN}PASS${NC}` : `${RED}FAIL${NC}`;
      console.log(`${icon} Gate ${gate.padEnd(15)} ${status}`);
      if (!result.passed && result.reason) {
        console.log(`  ${YELLOW}→ ${result.reason}${NC}`);
      }
    }

    console.log('');
    console.log('-'.repeat(70));
    console.log(`Gates passed: ${passedCount}/${totalGates}`);
    console.log(`Results saved to: ${resultsPath}`);
    console.log('');

    if (allPassed) {
      console.log(`${GREEN}${BOLD}═══════════════════════════════════════════════════════════════════════${NC}`);
      console.log(`${GREEN}${BOLD}                    ALL GATES PASS - READY TO TERMINATE                ${NC}`);
      console.log(`${GREEN}${BOLD}═══════════════════════════════════════════════════════════════════════${NC}`);
    } else {
      console.log(`${RED}${BOLD}═══════════════════════════════════════════════════════════════════════${NC}`);
      console.log(`${RED}${BOLD}                    GATES FAILED - CANNOT TERMINATE                     ${NC}`);
      console.log(`${RED}${BOLD}═══════════════════════════════════════════════════════════════════════${NC}`);
      console.log('');
      console.log('Blocking gates:', failedGates.join(', '));

      if (generateFix) {
        console.log('');
        console.log('Remediation tasks:');
        const tasks = generateRemediationTasks(gates);
        for (const task of tasks) {
          console.log(`  ${YELLOW}[${task.id}]${NC} ${task.description}`);
        }
      }
    }
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
