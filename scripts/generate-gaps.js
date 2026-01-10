#!/usr/bin/env node
/**
 * generate-gaps.js - Master gap generator for verification-first loop
 *
 * Runs all verifiers and aggregates failures into control/gaps.json
 * This is THE single input for the orchestrator's "what to do next" decision.
 *
 * Usage:
 *   node scripts/generate-gaps.js <case_dir>
 *   node scripts/generate-gaps.js <case_dir> --json   # JSON output only
 *
 * Output:
 *   control/gaps.json
 *   control/digest.json (iteration summary)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
    jsonOutput: args.includes('--json')
  };
}

// Gap severity levels
const SEVERITY = {
  BLOCKER: 'BLOCKER',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

// Gap types and their severities
const GAP_TYPES = {
  MISSING_EVIDENCE: SEVERITY.BLOCKER,
  INSUFFICIENT_CORROBORATION: SEVERITY.BLOCKER,
  CONTENT_MISMATCH: SEVERITY.BLOCKER,
  CONTRADICTED_CLAIM: SEVERITY.BLOCKER,
  LEGAL_DEFAMATION_RISK: SEVERITY.BLOCKER,
  LEGAL_REVIEW_MISSING: SEVERITY.BLOCKER,
  LEGAL_WORDING_RISK: SEVERITY.HIGH,
  PRIVACY_RISK: SEVERITY.HIGH,
  UNCITED_ASSERTION: SEVERITY.BLOCKER,
  TASK_INCOMPLETE: SEVERITY.BLOCKER,
  PERSPECTIVE_MISSING: SEVERITY.MEDIUM,
  ADVERSARIAL_INCOMPLETE: SEVERITY.BLOCKER,
  CURIOSITY_DEFICIT: SEVERITY.LOW,
  STATE_INCONSISTENT: SEVERITY.HIGH,
  SCHEMA_INVALID: SEVERITY.BLOCKER,
  DUPLICATE_SOURCE_URL: SEVERITY.BLOCKER,
  CIRCULAR_REPORTING_RISK: SEVERITY.BLOCKER,
  INTEGRITY_VIOLATION: SEVERITY.HIGH,
  GATE_FAILED: SEVERITY.BLOCKER
};

let gapCounter = 1;

function nextGapId() {
  return `G${String(gapCounter++).padStart(4, '0')}`;
}

/**
 * Run a verifier script and collect its gaps
 */
async function runVerifier(script, caseDir, options = {}) {
  const scriptPath = path.join(__dirname, script);
  if (!fs.existsSync(scriptPath)) {
    return { ok: false, gaps: [], error: `Script not found: ${script}` };
  }

  try {
    const mod = require(scriptPath);
    if (!mod || typeof mod.run !== 'function') {
      return { ok: false, gaps: [], error: `Verifier ${script} does not export run()` };
    }

    const data = await mod.run(caseDir, options);
    const gaps = Array.isArray(data?.gaps) ? data.gaps : [];
    const passed = typeof data?.passed === 'boolean'
      ? data.passed
      : (typeof data?.overall === 'boolean' ? data.overall : false);

    return { ok: true, passed, gaps, data };
  } catch (e) {
    return { ok: false, gaps: [], error: e.message };
  }
}

function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function computeGapId(gap) {
  const key = stableStringify({
    type: gap.type,
    object: gap.object || null,
    message: gap.message || ''
  });
  const hex = crypto.createHash('sha1').update(key).digest('hex').slice(0, 8).toUpperCase();
  return `G${hex}`;
}

function normalizeGap(raw, verifierName) {
  if (!raw || typeof raw !== 'object') return null;
  const type = raw.type;
  if (typeof type !== 'string' || !type.trim()) return null;

  const message = typeof raw.message === 'string' ? raw.message : String(raw.message || '');
  const object = raw.object && typeof raw.object === 'object' && !Array.isArray(raw.object) ? raw.object : {};
  const suggestedActions = Array.isArray(raw.suggested_actions) ? raw.suggested_actions : [];

  const severity = GAP_TYPES[type] || raw.severity || SEVERITY.MEDIUM;

  const gap = {
    gap_id: 'G0000',
    type,
    severity,
    message,
    object,
    suggested_actions: suggestedActions
  };

  if (verifierName) {
    gap.verifier = verifierName;
  }

  gap.gap_id = computeGapId(gap);
  return gap;
}

/**
 * Check for missing evidence (CAPTURE BEFORE CITE)
 */
function checkMissingEvidence(caseDir) {
  const gaps = [];
  const pattern = /\[S(\d{3,4})\]/g;

  // Files to scan
  const filesToScan = [
    'summary.md', 'sources.md', 'fact-check.md', 'positions.md',
    'people.md', 'timeline.md', 'theories.md'
  ];

  const findingsDir = path.join(caseDir, 'findings');
  if (fs.existsSync(findingsDir)) {
    const findings = fs.readdirSync(findingsDir).filter(f => f.endsWith('.md'));
    filesToScan.push(...findings.map(f => `findings/${f}`));
  }

  const citations = new Set();
  for (const file of filesToScan) {
    const filePath = path.join(caseDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      let match;
      while ((match = pattern.exec(content)) !== null) {
        citations.add(`S${match[1]}`);
      }
    }
  }

  const evidenceDir = path.join(caseDir, 'evidence', 'web');
  const evidenceFolders = fs.existsSync(evidenceDir)
    ? fs.readdirSync(evidenceDir).filter(f => f.startsWith('S'))
    : [];

  for (const citation of citations) {
    if (!evidenceFolders.includes(citation)) {
      gaps.push({
        gap_id: nextGapId(),
        type: 'MISSING_EVIDENCE',
        object: { source_id: citation },
        severity: SEVERITY.BLOCKER,
        message: `${citation} cited but evidence/web/${citation}/ does not exist`,
        suggested_actions: ['capture_source', 'remove_citation']
      });
    } else {
      // Check folder has content
      const folderPath = path.join(evidenceDir, citation);
      const files = fs.readdirSync(folderPath);
      if (files.length === 0) {
        gaps.push({
          gap_id: nextGapId(),
          type: 'MISSING_EVIDENCE',
          object: { source_id: citation },
          severity: SEVERITY.BLOCKER,
          message: `${citation} evidence folder exists but is empty`,
          suggested_actions: ['recapture_source']
        });
      }
    }
  }

  return gaps;
}

/**
 * Check corroboration requirements from claims
 */
function checkCorroboration(caseDir) {
  const gaps = [];
  const claimsDir = path.join(caseDir, 'claims');

  if (!fs.existsSync(claimsDir)) {
    return gaps;
  }

  const claimFiles = fs.readdirSync(claimsDir)
    .filter(f => f.startsWith('C') && f.endsWith('.json'));

  for (const file of claimFiles) {
    try {
      const claim = JSON.parse(fs.readFileSync(path.join(claimsDir, file), 'utf-8'));

      if (!claim.corroboration) continue;

      const minSources = claim.corroboration.min_sources || 1;
      const currentSources = (claim.supporting_sources || []).length;

      if (currentSources < minSources) {
        gaps.push({
          gap_id: nextGapId(),
          type: 'INSUFFICIENT_CORROBORATION',
          object: { claim_id: claim.id },
          severity: SEVERITY.BLOCKER,
          message: `Claim ${claim.id} has ${currentSources} source(s); requires >=${minSources}`,
          suggested_actions: ['find_independent_source', 'capture', 'update_claim_record']
        });
      }

      // Check if primary required but missing
      if (claim.corroboration.requires_primary && !claim.primary_source) {
        const hasPrimary = (claim.supporting_sources || []).some(s => {
          // Check if source is marked as primary in sources.json
          const sourcesPath = path.join(caseDir, 'sources.json');
          if (fs.existsSync(sourcesPath)) {
            const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
            return sources[s]?.category === 'primary';
          }
          return false;
        });

        if (!hasPrimary) {
          gaps.push({
            gap_id: nextGapId(),
            type: 'INSUFFICIENT_CORROBORATION',
            object: { claim_id: claim.id },
            severity: SEVERITY.HIGH,
            message: `Claim ${claim.id} requires primary source but none found`,
            suggested_actions: ['find_primary_document', 'capture']
          });
        }
      }
    } catch (e) {
      // Skip malformed claim files
    }
  }

  return gaps;
}

/**
 * Check task completion
 */
function checkTasks(caseDir) {
  const gaps = [];
  const tasksDir = path.join(caseDir, 'tasks');

  if (!fs.existsSync(tasksDir)) {
    return gaps;
  }

  const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));
  let hasAdversarial = false;
  let adversarialComplete = true;
  let curiosityTasks = 0;

  for (const file of taskFiles) {
    try {
      const task = JSON.parse(fs.readFileSync(path.join(tasksDir, file), 'utf-8'));

      // Track adversarial tasks
      if (task.id && task.id.startsWith('A')) {
        hasAdversarial = true;
        if (task.status !== 'completed') {
          adversarialComplete = false;
        }
      }

      // Track curiosity tasks
      if (task.type === 'curiosity' || task.perspective === 'Curiosity') {
        curiosityTasks++;
      }

      // Check HIGH priority incomplete
      if (task.priority === 'HIGH' && task.status !== 'completed') {
        gaps.push({
          gap_id: nextGapId(),
          type: 'TASK_INCOMPLETE',
          object: { task_id: task.id },
          severity: SEVERITY.HIGH,
          message: `HIGH priority task ${task.id} not completed`,
          suggested_actions: ['execute_task']
        });
      }

      // Check completed tasks have findings
      if (task.status === 'completed') {
        const findingsFile = task.findings_file || `findings/${task.id}-findings.md`;
        const findingsPath = path.join(caseDir, findingsFile);
        if (!fs.existsSync(findingsPath)) {
          gaps.push({
            gap_id: nextGapId(),
            type: 'TASK_INCOMPLETE',
            object: { task_id: task.id },
            severity: SEVERITY.HIGH,
            message: `Task ${task.id} marked complete but findings file missing`,
            suggested_actions: ['write_findings', 'revert_task_status']
          });
        }
      }
    } catch (e) {
      // Skip malformed task files
    }
  }

  // Check adversarial requirements
  if (!hasAdversarial) {
    gaps.push({
      gap_id: nextGapId(),
      type: 'ADVERSARIAL_INCOMPLETE',
      object: {},
      severity: SEVERITY.MEDIUM,
      message: 'No adversarial tasks (A###) found',
      suggested_actions: ['run_adversarial_pass']
    });
  } else if (!adversarialComplete) {
    gaps.push({
      gap_id: nextGapId(),
      type: 'ADVERSARIAL_INCOMPLETE',
      object: {},
      severity: SEVERITY.MEDIUM,
      message: 'Adversarial tasks exist but not all completed',
      suggested_actions: ['complete_adversarial_tasks']
    });
  }

  // Check curiosity requirement (2+ per cycle)
  if (curiosityTasks < 2) {
    gaps.push({
      gap_id: nextGapId(),
      type: 'CURIOSITY_DEFICIT',
      object: { current: curiosityTasks, required: 2 },
      severity: SEVERITY.LOW,
      message: `Only ${curiosityTasks} curiosity tasks; require >=2 per cycle`,
      suggested_actions: ['generate_curiosity_tasks']
    });
  }

  return gaps;
}

/**
 * Check required perspectives
 */
function checkPerspectives(caseDir) {
  const gaps = [];
  const required = [
    'Money', 'Timeline', 'Silence', 'Documents', 'Contradictions',
    'Relationships', 'Hypotheses', 'Assumptions', 'Counterfactual', 'Blind Spots'
  ];

  const tasksDir = path.join(caseDir, 'tasks');
  if (!fs.existsSync(tasksDir)) {
    // No tasks yet, all perspectives missing
    for (const perspective of required) {
      gaps.push({
        gap_id: nextGapId(),
        type: 'PERSPECTIVE_MISSING',
        object: { perspective },
        severity: SEVERITY.MEDIUM,
        message: `No task addresses '${perspective}' perspective`,
        suggested_actions: ['create_perspective_task']
      });
    }
    return gaps;
  }

  const coveredPerspectives = new Set();
  const taskFiles = fs.readdirSync(tasksDir).filter(f => f.endsWith('.json'));

  for (const file of taskFiles) {
    try {
      const task = JSON.parse(fs.readFileSync(path.join(tasksDir, file), 'utf-8'));
      if (task.perspective) {
        coveredPerspectives.add(task.perspective);
      }
    } catch (e) {}
  }

  for (const perspective of required) {
    if (!coveredPerspectives.has(perspective)) {
      gaps.push({
        gap_id: nextGapId(),
        type: 'PERSPECTIVE_MISSING',
        object: { perspective },
        severity: SEVERITY.MEDIUM,
        message: `No task addresses '${perspective}' perspective`,
        suggested_actions: ['create_perspective_task']
      });
    }
  }

  return gaps;
}

/**
 * Check legal risks (basic mechanical checks)
 */
function checkLegal(caseDir) {
  const gaps = [];

  // Check summary.md for legal issues
  const summaryPath = path.join(caseDir, 'summary.md');
  if (!fs.existsSync(summaryPath)) {
    return gaps;
  }

  const content = fs.readFileSync(summaryPath, 'utf-8');
  const lines = content.split('\n');

  // Patterns that suggest legal risk
  const riskPatterns = [
    { pattern: /\bcommitted fraud\b/i, issue: 'States fraud as fact' },
    { pattern: /\bstole\b/i, issue: 'States theft as fact' },
    { pattern: /\bcriminal\b/i, issue: 'Criminal accusation' },
    { pattern: /\bguilty\b/i, issue: 'States guilt as fact' },
    { pattern: /\bcorrupt\b/i, issue: 'Corruption accusation' }
  ];

  // Attribution patterns that mitigate risk
  const attributionPatterns = [
    /according to/i,
    /alleged/i,
    /reportedly/i,
    /claims that/i,
    /accused of/i
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { pattern, issue } of riskPatterns) {
      if (pattern.test(line)) {
        // Check if line has attribution
        const hasAttribution = attributionPatterns.some(p => p.test(line));

        if (!hasAttribution) {
          gaps.push({
            gap_id: nextGapId(),
            type: 'LEGAL_WORDING_RISK',
            object: { file: 'summary.md', line: i + 1 },
            severity: SEVERITY.HIGH,
            message: `${issue} without attribution on line ${i + 1}`,
            suggested_actions: ['add_attribution', 'revise_language']
          });
        }
      }
    }
  }

  // Check for PII patterns
  const piiPatterns = [
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/, issue: 'SSN detected' },
    { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, issue: 'Phone number detected' },
    { pattern: /\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr)\b/i, issue: 'Address detected' }
  ];

  for (const { pattern, issue } of piiPatterns) {
    if (pattern.test(content)) {
      gaps.push({
        gap_id: nextGapId(),
        type: 'PRIVACY_RISK',
        object: { file: 'summary.md' },
        severity: SEVERITY.HIGH,
        message: issue,
        suggested_actions: ['remove_pii', 'anonymize']
      });
    }
  }

  return gaps;
}

async function run(caseDir, options = {}) {
  const startTime = Date.now();
  if (!caseDir) throw new Error('Missing case directory argument');

  // Ensure control directory exists
  const controlDir = path.join(caseDir, 'control');
  if (!fs.existsSync(controlDir)) {
    fs.mkdirSync(controlDir, { recursive: true });
  }

  // Collect all gaps (canonical gap contract: verifiers emit { gaps: [...] })
  const allGaps = [];
  const verifierResults = [];

  const verifiers = [
    { name: 'schema', script: 'validate-schema.js', options: {} },
    { name: 'sources', script: 'verify-sources.js', options: {} },
    { name: 'sources_dedup', script: 'verify-sources-dedup.js', options: {} },
    { name: 'citation_density', script: 'verify-citation-density.js', options: {} },
    { name: 'source_content', script: 'verify-source-content.js', options: { summaryOnly: true } },
    { name: 'corroboration', script: 'verify-corroboration.js', options: {} },
    { name: 'circular_reporting', script: 'verify-circular-reporting.js', options: {} },
    { name: 'tasks', script: 'verify-tasks.js', options: {} },
    { name: 'state_consistency', script: 'verify-state-consistency.js', options: {} },
    { name: 'legal', script: 'verify-legal.js', options: {} },
    { name: 'integrity', script: 'verify-integrity.js', options: {} }
  ];

  for (const v of verifiers) {
    const result = await runVerifier(v.script, caseDir, v.options);
    verifierResults.push({
      name: v.name,
      script: v.script,
      ok: result.ok,
      passed: result.passed,
      gap_count: (result.gaps || []).length,
      error: result.error || null
    });

    if (!result.ok) {
      const synthetic = normalizeGap({
        type: 'STATE_INCONSISTENT',
        object: { verifier: v.name, script: v.script },
        message: `Verifier ${v.script} failed: ${result.error || 'unknown error'}`,
        suggested_actions: ['fix_verifier']
      }, 'generate-gaps');
      if (synthetic) allGaps.push(synthetic);
    }

    for (const gap of (result.gaps || [])) {
      const normalized = normalizeGap(gap, v.name);
      if (normalized) allGaps.push(normalized);
    }
  }

  // Cross-check termination gates so gap output is faithful to "can terminate" reality
  const gatesResult = await runVerifier('verify-all-gates.js', caseDir, {});
  if (gatesResult.ok && gatesResult.data && typeof gatesResult.data === 'object') {
    const failedGates = Array.isArray(gatesResult.data.blocking_gates) ? gatesResult.data.blocking_gates : [];
    verifierResults.push({
      name: 'termination_gates',
      script: 'verify-all-gates.js',
      ok: true,
      passed: gatesResult.data.overall === true,
      failed_gates: failedGates.length
    });

    if (failedGates.length > 0) {
      for (const gate of failedGates) {
        const gateDetails = gatesResult.data.gates && gatesResult.data.gates[gate];
        const reason = gateDetails && gateDetails.reason ? gateDetails.reason : 'Gate failed';
        const gateGap = normalizeGap({
          type: 'GATE_FAILED',
          object: { gate },
          message: `Gate ${gate} failed: ${reason}`,
          suggested_actions: ['fix_gate']
        }, 'verify-all-gates');
        if (gateGap) allGaps.push(gateGap);
      }
    }
  } else {
    const gateGap = normalizeGap({
      type: 'STATE_INCONSISTENT',
      object: { verifier: 'verify-all-gates.js' },
      message: `verify-all-gates.js failed: ${gatesResult.error || 'unknown error'}`,
      suggested_actions: ['fix_verifier']
    }, 'generate-gaps');
    if (gateGap) allGaps.push(gateGap);
  }

  // Deduplicate gaps by stable gap_id
  const deduped = [];
  const seen = new Set();
  for (const g of allGaps) {
    if (!g || !g.gap_id) continue;
    if (seen.has(g.gap_id)) continue;
    seen.add(g.gap_id);
    deduped.push(g);
  }

  // Separate blocking and non-blocking
  const blocking = deduped.filter(g => g.severity === SEVERITY.BLOCKER);
  const nonBlocking = deduped.filter(g => g.severity !== SEVERITY.BLOCKER);

  // Get iteration number (best-effort)
  const statePath = path.join(caseDir, 'state.json');
  let iteration = 1;
  if (fs.existsSync(statePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      iteration = state.iteration || 1;
    } catch (_) {}
  }

  const output = {
    case_dir: caseDir,
    iteration,
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    verifiers: verifierResults,
    blocking,
    non_blocking: nonBlocking,
    stats: {
      total_gaps: deduped.length,
      blocking_count: blocking.length,
      high_count: nonBlocking.filter(g => g.severity === SEVERITY.HIGH).length,
      medium_count: nonBlocking.filter(g => g.severity === SEVERITY.MEDIUM).length,
      low_count: nonBlocking.filter(g => g.severity === SEVERITY.LOW).length
    },
    paths: {
      gaps_json: 'control/gaps.json',
      digest_json: 'control/digest.json'
    }
  };

  fs.writeFileSync(path.join(controlDir, 'gaps.json'), JSON.stringify(output, null, 2));

  const digest = {
    iteration,
    timestamp: new Date().toISOString(),
    blocking_gaps: blocking.length,
    total_gaps: deduped.length,
    can_terminate: blocking.length === 0
  };
  fs.writeFileSync(path.join(controlDir, 'digest.json'), JSON.stringify(digest, null, 2));

  return output;
}

function printHuman(output) {
  console.log('='.repeat(70));
  console.log(`${BOLD}Gap Generation - Verification First Loop${NC}`);
  console.log('='.repeat(70));
  console.log(`Case: ${output.case_dir}`);
  console.log(`Time: ${output.generated_at}`);
  console.log('');

  console.log('-'.repeat(70));
  console.log(`${BOLD}Summary${NC}`);
  console.log(`  Total gaps: ${output.stats.total_gaps}`);
  console.log(`  Blocking: ${output.stats.blocking_count}`);
  console.log(`  High: ${output.stats.high_count}`);
  console.log(`  Medium: ${output.stats.medium_count}`);
  console.log(`  Low: ${output.stats.low_count}`);
  console.log('');

  if (output.stats.blocking_count > 0) {
    console.log(`${RED}${BOLD}BLOCKING GAPS (must fix before termination):${NC}`);
    for (const gap of (output.blocking || []).slice(0, 10)) {
      console.log(`  ${RED}[${gap.gap_id}]${NC} ${gap.type}: ${gap.message}`);
    }
    if (output.stats.blocking_count > 10) {
      console.log(`  ... and ${output.stats.blocking_count - 10} more`);
    }
  } else {
    console.log(`${GREEN}${BOLD}No blocking gaps - ready for termination check${NC}`);
  }

  console.log('');
  console.log(`Output: ${path.join(output.case_dir, output.paths.gaps_json)}`);
  console.log(`Duration: ${output.duration_ms}ms`);
}

async function cli() {
  const parsed = parseCliArgs(process.argv);
  if (!parsed.caseDir) {
    console.error('Usage: node scripts/generate-gaps.js <case_dir> [--json]');
    process.exit(1);
  }

  const output = await run(parsed.caseDir);
  if (parsed.jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printHuman(output);
  }
  process.exit(output.stats.blocking_count > 0 ? 1 : 0);
}

module.exports = { run };

if (require.main === module) {
  cli().catch(err => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
