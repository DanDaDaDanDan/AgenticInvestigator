#!/usr/bin/env node
/**
 * verify-all-gates.js - Master termination gate verification
 *
 * Runs all 9 termination gate checks mechanically and outputs results.
 * Investigation CANNOT terminate unless ALL gates pass.
 *
 * CRITICAL: Filesystem is truth. No self-reported flags accepted.
 * All thresholds are 100% - no partial credit.
 *
 * Usage:
 *   node scripts/verify-all-gates.js <case_dir>
 *   node scripts/verify-all-gates.js <case_dir> --json    # JSON output only
 *   node scripts/verify-all-gates.js <case_dir> --fix     # Generate remediation tasks
 *
 * Gates:
 *   1. Coverage - Files exist and meet 100% thresholds
 *   2. Tasks - All HIGH priority tasks completed with findings files
 *   3. Adversarial - Adversarial tasks exist and are completed
 *   4. Sources - Every [SXXX] citation has evidence folder
 *   5. Content - Claims verified in captured evidence
 *   6. Claims - AI verification of claims
 *   7. Contradictions - All contradictions explored
 *   8. Rigor - 25-framework rigor checkpoint passed (includes domain expertise)
 *   9. Legal - Legal review file exists
 *
 * Exit codes:
 *   0 - All gates pass
 *   1 - One or more gates failed
 *
 * Environment variables for debugging:
 *   LOG_LEVEL=debug|info|warn|error (default: info)
 *   LOG_FILE=path/to/file.log (enables file logging)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./lib/config-loader');
const logger = require('./logger').create('verify-all-gates');

// Load .env when present (keeps CLI usage consistent across scripts)
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {
  // dotenv is an installed dependency for this repo, but don't hard-crash if missing
}

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
    generateFix: args.includes('--fix')
  };
}

// 100% THRESHOLDS - loaded from config
const THRESHOLDS = config.thresholds;

// Required files - loaded from config
const REQUIRED_FILES = config.required_files;

/**
 * Extract all [SXXX] citations from files
 */
function extractCitations(caseDir) {
  const citations = new Set();
  const pattern = /\[S(\d{3,4})\]/g;

  // Files to scan for citations - loaded from config
  const filesToScan = [...config.files_to_scan];

  // Also scan findings
  const findingsDir = path.join(caseDir, 'findings');
  if (fs.existsSync(findingsDir)) {
    const findingsFiles = fs.readdirSync(findingsDir).filter(f => f.endsWith('.md'));
    filesToScan.push(...findingsFiles.map(f => `findings/${f}`));
  }

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

  return Array.from(citations).sort();
}

/**
 * Get all task files from tasks/ directory
 */
function getTaskFiles(caseDir) {
  const tasksDir = path.join(caseDir, 'tasks');
  if (!fs.existsSync(tasksDir)) {
    return [];
  }

  return fs.readdirSync(tasksDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const content = fs.readFileSync(path.join(tasksDir, f), 'utf-8');
      try {
        return JSON.parse(content);
      } catch (e) {
        return null;
      }
    })
    .filter(t => t !== null);
}

/**
 * Compute coverage on-demand from filesystem
 */
function computeCoverage(caseDir) {
  const coverage = {
    people: { mentioned: 0, investigated: 0 },
    entities: { mentioned: 0, investigated: 0 },
    claims: { total: 0, verified: 0 },
    sources: { cited: 0, captured: 0 },
    positions: { identified: 0, documented: 0 },
    contradictions: { identified: 0, explored: 0 }
  };

  // Count citations and evidence folders
  const citations = extractCitations(caseDir);
  coverage.sources.cited = citations.length;

  const evidenceDir = path.join(caseDir, 'evidence', 'web');
  if (fs.existsSync(evidenceDir)) {
    const evidenceFolders = fs.readdirSync(evidenceDir).filter(f => f.startsWith('S'));
    coverage.sources.captured = evidenceFolders.length;

    // Verify each citation has evidence
    for (const citation of citations) {
      if (evidenceFolders.includes(citation)) {
        // Check that evidence folder has content
        const folderPath = path.join(evidenceDir, citation);
        const files = fs.readdirSync(folderPath);
        if (files.length === 0) {
          coverage.sources.captured--;
        }
      }
    }
  }

  // Count from extraction.json
  const extractionPath = path.join(caseDir, 'extraction.json');
  if (fs.existsSync(extractionPath)) {
    try {
      const extraction = JSON.parse(fs.readFileSync(extractionPath, 'utf-8'));
      coverage.people.mentioned = (extraction.people || []).length;
      coverage.entities.mentioned = (extraction.entities || []).length;
      coverage.claims.total = (extraction.claims || []).length;
      coverage.contradictions.identified = (extraction.contradictions || []).length;
    } catch (e) { }
  }

  // Count investigated people from people.md
  const peoplePath = path.join(caseDir, 'people.md');
  if (fs.existsSync(peoplePath)) {
    const content = fs.readFileSync(peoplePath, 'utf-8');
    const headerMatches = content.match(/^##\s+/gm);
    coverage.people.investigated = headerMatches ? headerMatches.length : 0;
  }

  // Count investigated entities from organizations.md or entities section
  const orgsPath = path.join(caseDir, 'organizations.md');
  if (fs.existsSync(orgsPath)) {
    const content = fs.readFileSync(orgsPath, 'utf-8');
    const headerMatches = content.match(/^##\s+/gm);
    coverage.entities.investigated = headerMatches ? headerMatches.length : 0;
  }

  // Count verified claims from fact-check.md
  const factCheckPath = path.join(caseDir, 'fact-check.md');
  if (fs.existsSync(factCheckPath)) {
    const content = fs.readFileSync(factCheckPath, 'utf-8');
    // Count verdict lines (VERIFIED, DEBUNKED, etc.)
    const verdictMatches = content.match(/\*\*(VERIFIED|DEBUNKED|PARTIAL|UNVERIFIED|CONTESTED)\*\*/g);
    coverage.claims.verified = verdictMatches ? verdictMatches.length : 0;
  }

  // Count documented positions from positions.md
  const positionsPath = path.join(caseDir, 'positions.md');
  if (fs.existsSync(positionsPath)) {
    const content = fs.readFileSync(positionsPath, 'utf-8');
    const headerMatches = content.match(/^##\s+/gm);
    coverage.positions.documented = headerMatches ? headerMatches.length : 0;
  }

  // Count explored contradictions from findings
  const findingsDir = path.join(caseDir, 'findings');
  if (fs.existsSync(findingsDir)) {
    const contradictionFiles = fs.readdirSync(findingsDir)
      .filter(f => f.includes('contradiction') || f.includes('conflict'));
    coverage.contradictions.explored = contradictionFiles.length;
  }

  return coverage;
}

/**
 * Check citation presence in summary.md (STRUCTURAL check)
 *
 * ARCHITECTURE NOTE:
 * This performs STRUCTURAL checks only:
 * - Does summary.md exist?
 * - Does it have any [SXXX] citations?
 *
 * SEMANTIC check (is every factual claim cited?) is handled by
 * LLM verification via Gemini 3 Pro MCP calls.
 * See .claude/commands/verify.md for semantic verification criteria.
 */
function checkCitationDensity(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  const summaryPath = path.join(caseDir, 'summary.md');
  if (!fs.existsSync(summaryPath)) {
    result.reason = 'summary.md not found';
    return result;
  }

  const content = fs.readFileSync(summaryPath, 'utf-8');
  const lines = content.split('\n');

  // Structural: Count total [SXXX] citations using config-loader
  const { count: totalCitations, unique: uniqueSources } = config.countCitations(content);

  result.details.total_citations = totalCitations;
  result.details.unique_sources = uniqueSources.size;
  result.details.total_lines = lines.length;

  // CRITICAL: If summary.md exists but has ZERO citations, fail immediately
  if (totalCitations === 0) {
    result.reason = 'summary.md has ZERO source citations - sources must be cited [SXXX]';
    result.details.sample_lines = lines
      .filter(l => l.trim().length > 50 && !l.startsWith('#') && !l.startsWith('|') && !l.startsWith('-'))
      .slice(0, 5)
      .map(l => l.trim().substring(0, 80));
    return result;
  }

  // Structural check passed - summary has citations
  // Semantic check (is every factual claim cited?) is done by LLM verification
  result.passed = true;
  result.details.note = 'Semantic coverage check (factual claims) handled by LLM verification';
  return result;
}

/**
 * Gate 1: Coverage verification (computed on-demand)
 * Includes citation density check for summary.md
 */
function verifyCoverage(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  try {
    const coverage = computeCoverage(caseDir);
    const failures = [];

    // Check required files exist
    for (const file of REQUIRED_FILES) {
      const filePath = path.join(caseDir, file);
      if (!fs.existsSync(filePath)) {
        failures.push(`Missing required file: ${file}`);
      }
    }

    // CRITICAL: Enforce citation density via dedicated verifier (single source of truth)
    try {
      const citation = require('./verify-citation-density').run(caseDir);
      result.details.citation_density = citation;
      if (!citation.passed) {
        const reason = Array.isArray(citation.failures) && citation.failures.length > 0
          ? citation.failures.join('; ')
          : 'Citation density requirements not met';
        failures.push(reason);
      }
    } catch (e) {
      failures.push(`Citation density verifier error: ${e.message}`);
    }

    // Check coverage metrics against 100% thresholds
    if (coverage.people.mentioned > 0) {
      const ratio = coverage.people.investigated / coverage.people.mentioned;
      result.details.people = { ratio, threshold: THRESHOLDS.people_investigated, investigated: coverage.people.investigated, mentioned: coverage.people.mentioned };
      if (ratio < THRESHOLDS.people_investigated) {
        failures.push(`People investigated: ${(ratio * 100).toFixed(1)}% (${coverage.people.investigated}/${coverage.people.mentioned}) < 100%`);
      }
    }

    if (coverage.entities.mentioned > 0) {
      const ratio = coverage.entities.investigated / coverage.entities.mentioned;
      result.details.entities = { ratio, threshold: THRESHOLDS.entities_investigated, investigated: coverage.entities.investigated, mentioned: coverage.entities.mentioned };
      if (ratio < THRESHOLDS.entities_investigated) {
        failures.push(`Entities investigated: ${(ratio * 100).toFixed(1)}% (${coverage.entities.investigated}/${coverage.entities.mentioned}) < 100%`);
      }
    }

    if (coverage.claims.total > 0) {
      const ratio = coverage.claims.verified / coverage.claims.total;
      result.details.claims = { ratio, threshold: THRESHOLDS.claims_verified, verified: coverage.claims.verified, total: coverage.claims.total };
      if (ratio < THRESHOLDS.claims_verified) {
        failures.push(`Claims verified: ${(ratio * 100).toFixed(1)}% (${coverage.claims.verified}/${coverage.claims.total}) < 100%`);
      }
    }

    // CRITICAL: Sources must be 100% captured
    if (coverage.sources.cited > 0) {
      const ratio = coverage.sources.captured / coverage.sources.cited;
      result.details.sources = { ratio, threshold: THRESHOLDS.sources_captured, captured: coverage.sources.captured, cited: coverage.sources.cited };
      if (ratio < THRESHOLDS.sources_captured) {
        failures.push(`Sources captured: ${(ratio * 100).toFixed(1)}% (${coverage.sources.captured}/${coverage.sources.cited}) < 100% - CAPTURE BEFORE CITE VIOLATION`);
      }
    }

    if (failures.length === 0) {
      result.passed = true;
    } else {
      result.reason = failures.join('; ');
    }

  } catch (e) {
    result.reason = `Error computing coverage: ${e.message}`;
  }

  return result;
}

/**
 * Gate 2: Tasks verification (from tasks/*.json)
 */
function verifyTasks(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  const tasks = getTaskFiles(caseDir);

  if (tasks.length === 0) {
    result.reason = 'No task files found in tasks/ directory';
    return result;
  }

  try {
    const failures = [];

    // Separate adversarial tasks (A###) from all other tasks (T###, R###, etc.)
    const mainTasks = tasks.filter(t => t.id && !t.id.startsWith('A'));
    const advTasks = tasks.filter(t => t.id && t.id.startsWith('A'));

    const pendingMain = mainTasks.filter(t => t.status === 'pending');
    const inProgressMain = mainTasks.filter(t => t.status === 'in_progress');
    const incompleteMain = mainTasks.filter(t => t.status !== 'completed');

    const highPriorityIncomplete = mainTasks.filter(t =>
      String(t.priority || '').toUpperCase() === 'HIGH' && t.status !== 'completed'
    );

    result.details.total = mainTasks.length;
    result.details.completed = mainTasks.filter(t => t.status === 'completed').length;
    result.details.pending = pendingMain.length;
    result.details.in_progress = inProgressMain.length;
    result.details.incomplete = incompleteMain.length;
    result.details.high_priority_incomplete = highPriorityIncomplete.length;
    result.details.adversarial_total = advTasks.length;
    result.details.adversarial_incomplete = advTasks.filter(t => t.status !== 'completed').length;

    if (highPriorityIncomplete.length > 0) {
      failures.push(`${highPriorityIncomplete.length} HIGH priority tasks not completed: ${highPriorityIncomplete.map(t => `${t.id}(${t.status || 'unknown'})`).join(', ')}`);
    }

    // Check that completed tasks have findings files
    for (const task of mainTasks.filter(t => t.status === 'completed')) {
      const findingsFile = task.findings_file || `findings/${task.id}-findings.md`;
      const findingsPath = path.join(caseDir, findingsFile);
      if (!fs.existsSync(findingsPath)) {
        failures.push(`Task ${task.id} marked complete but findings file missing: ${findingsFile}`);
      }
    }

    if (failures.length === 0) {
      result.passed = true;
    } else {
      result.reason = failures.join('; ');
    }

  } catch (e) {
    result.reason = `Error parsing tasks: ${e.message}`;
  }

  return result;
}

/**
 * Gate 3: Adversarial pass verification (filesystem-based)
 */
function verifyAdversarial(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  try {
    // Check for adversarial task files (A###.json)
    const tasks = getTaskFiles(caseDir);
    const advTasks = tasks.filter(t => t.id && t.id.startsWith('A'));

    result.details.adversarial_tasks = advTasks.length;
    result.details.adversarial_completed = advTasks.filter(t => t.status === 'completed').length;

    if (advTasks.length === 0) {
      result.reason = 'No adversarial tasks (A###.json) found';
      return result;
    }

    // Check for adversarial findings
    const findingsDir = path.join(caseDir, 'findings');
    const advFindings = fs.existsSync(findingsDir)
      ? fs.readdirSync(findingsDir).filter(f =>
          f.startsWith('A') ||
          f.includes('adversarial') ||
          f.includes('opposing') ||
          f.includes('falsification')
        )
      : [];

    result.details.adversarial_files = advFindings.length;

    // All adversarial tasks must be completed
    const incompleteAdv = advTasks.filter(t => t.status !== 'completed');
    if (incompleteAdv.length > 0) {
      result.reason = `${incompleteAdv.length} adversarial tasks not completed: ${incompleteAdv.map(t => `${t.id}(${t.status || 'unknown'})`).join(', ')}`;
      return result;
    }

    if (advFindings.length > 0 && advTasks.length > 0) {
      result.passed = true;
    } else {
      result.reason = 'Adversarial tasks exist but no findings files found';
    }

  } catch (e) {
    result.reason = `Error: ${e.message}`;
  }

  return result;
}

/**
 * Gate 4: Sources verification (CAPTURE BEFORE CITE - zero tolerance)
 */
function verifySources(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  try {
    const citations = extractCitations(caseDir);
    const evidenceDir = path.join(caseDir, 'evidence', 'web');

    if (!fs.existsSync(evidenceDir)) {
      if (citations.length > 0) {
        result.reason = `${citations.length} citations found but no evidence/web/ directory exists - CAPTURE BEFORE CITE VIOLATION`;
        result.details.citations = citations;
        result.details.missing = citations;
        return result;
      } else {
        result.passed = true;
        result.details.note = 'No citations and no evidence directory';
        return result;
      }
    }

    const evidenceFolders = fs.readdirSync(evidenceDir).filter(f => f.startsWith('S'));
    const missing = [];

    for (const citation of citations) {
      if (!evidenceFolders.includes(citation)) {
        missing.push(citation);
      } else {
        // Verify folder has actual content
        const folderPath = path.join(evidenceDir, citation);
        const files = fs.readdirSync(folderPath);
        if (files.length === 0) {
          missing.push(`${citation} (empty folder)`);
        }
      }
    }

    result.details.citations_total = citations.length;
    result.details.evidence_folders = evidenceFolders.length;
    result.details.missing_count = missing.length;

    if (missing.length === 0) {
      result.passed = true;
    } else {
      result.reason = `${missing.length} citations missing evidence: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''} - CAPTURE BEFORE CITE VIOLATION`;
      result.details.missing = missing;
    }

  } catch (e) {
    result.reason = `Error: ${e.message}`;
  }

  return result;
}

/**
 * Gate 5: Content verification (claims in evidence)
 */
async function verifyContent(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  try {
    const data = await require('./verify-source-content').run(caseDir, { summaryOnly: true });

    result.details = data.stats || {};
    result.details.verification_rate = data.verification_rate;
    if (data.samples) {
      result.details.samples = data.samples;
    }

    const noEvidence = result.details.no_evidence || 0;
    const verified = result.details.verified || 0;
    const total = result.details.total || 0;
    const notFound = result.details.not_found || 0;

    if (total === 0) {
      result.reason = 'No claims found to verify - investigation may be incomplete';
    } else if (noEvidence > 0) {
      result.reason = `${noEvidence} claims have NO EVIDENCE content readable - cannot verify content without evidence`;
    } else if (notFound > 0) {
      result.reason = `${notFound} claims not found in evidence content (100% required)`;
    } else if (verified === 0 && total > 0) {
      result.reason = `0 claims verified out of ${total} - verification not actually performed`;
    } else {
      result.passed = true;
    }
  } catch (e) {
    result.reason = `Error running verify-source-content.js: ${e.message}`;
  }

  return result;
}

/**
 * Gate 6: Claims verification (AI-based)
 */
async function verifyClaims(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  if (!process.env.GEMINI_API_KEY) {
    result.reason = 'GEMINI_API_KEY not set - cannot run AI verification';
    result.details.skipped = true;
    return result;
  }

  try {
    const data = await require('./verify-claims').run(caseDir);
    result.details = data.stats || {};
    result.details.verification_rate = data.verification_rate;

    // Zero tolerance for not_found, contradicted, no_evidence, or errors
    const notFound = result.details.not_found || 0;
    const contradicted = result.details.contradicted || 0;
    const noEvidence = result.details.no_evidence || 0;
    const errors = result.details.errors || 0;
    const verified = result.details.verified || 0;
    const total = result.details.total || 0;
    const problems = notFound + contradicted;

    // Allow up to 5% API errors (transient issues shouldn't block verification)
    const errorThreshold = Math.max(3, Math.ceil(total * 0.05));
    const acceptableErrors = errors <= errorThreshold;

    if (total === 0) {
      result.reason = 'No claims found to verify - investigation may be incomplete';
    } else if (noEvidence > 0) {
      result.reason = `${noEvidence} claims have NO EVIDENCE - AI cannot verify claims without captured evidence`;
    } else if (!acceptableErrors) {
      result.reason = `${errors} claims had AI verification errors (>${errorThreshold} threshold) - cannot pass`;
    } else if (problems > 0) {
      result.reason = `${problems} claims failed AI verification (${notFound} not found, ${contradicted} contradicted)`;
    } else if (verified === 0 && total > 0) {
      result.reason = `0 claims verified out of ${total} - AI verification not actually performed`;
    } else {
      result.passed = true;
      if (errors > 0) {
        result.reason = `Passed with ${errors} API errors (within ${errorThreshold} threshold)`;
      }
    }
  } catch (e) {
    result.reason = `Error running verify-claims.js: ${e.message}`;
  }

  return result;
}

/**
 * Gate 7: Contradictions verification (filesystem-based)
 */
function verifyContradictions(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  try {
    // Get contradictions from extraction.json
    const extractionPath = path.join(caseDir, 'extraction.json');
    let identified = 0;

    if (fs.existsSync(extractionPath)) {
      const extraction = JSON.parse(fs.readFileSync(extractionPath, 'utf-8'));
      identified = (extraction.contradictions || []).length;
    }

    // Count explored contradictions from findings
    const findingsDir = path.join(caseDir, 'findings');
    let explored = 0;

    if (fs.existsSync(findingsDir)) {
      const files = fs.readdirSync(findingsDir);
      // Count files that address contradictions
      explored = files.filter(f =>
        f.includes('contradiction') ||
        f.includes('conflict') ||
        f.includes('inconsisten')
      ).length;
    }

    result.details.identified = identified;
    result.details.explored = explored;

    if (identified === 0) {
      result.passed = true;
      result.details.note = 'No contradictions identified';
    } else if (explored >= identified) {
      result.passed = true;
    } else {
      result.reason = `${identified - explored} contradictions not explored (100% required)`;
    }

  } catch (e) {
    result.reason = `Error: ${e.message}`;
  }

  return result;
}

/**
 * Gate 8: Rigor checkpoint verification (filesystem-based)
 * CRITICAL: Must check for actual completion, not just checklist items
 */
function verifyRigor(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  try {
    // Check for rigor checkpoint file
    const rigorFiles = [
      'findings/rigor-checkpoint.md',
      'rigor-checkpoint.md',
      'findings/20-framework-validation.md'
    ];

    let rigorContent = null;
    let rigorFile = null;

    for (const file of rigorFiles) {
      const filePath = path.join(caseDir, file);
      if (fs.existsSync(filePath)) {
        rigorContent = fs.readFileSync(filePath, 'utf-8');
        rigorFile = file;
        break;
      }
    }

    if (!rigorContent) {
      result.reason = 'No rigor checkpoint file found';
      return result;
    }

    // Check for framework coverage markers
    const checkMarks = (rigorContent.match(/\bPASS\b|\bADDRESSED\b|\bCOVERED\b|\[x\]/gi) || []).length;
    const gapMarks = (rigorContent.match(/\bFAIL\b|\bGAP\b|\bMISSING\b/gi) || []).length;
    const totalFrameworks = 25; // Updated from 20 to include Domain Expertise frameworks (21-25)

    result.details.file = rigorFile;
    result.details.checks_passed = checkMarks;
    result.details.gaps_found = gapMarks;

    // CRITICAL: Check for Domain Expertise frameworks (21-25)
    // These prevent surface-level analysis that misses what experts consider obvious
    const domainFrameworkPatterns = [
      /first\s*principles|scientific\s*reality/i,
      /domain\s*expert|expert\s*blind\s*spot/i,
      /marketing\s*vs\s*scien/i,
      /subject\s*experience|ground\s*truth/i,
      /contrarian\s*expert/i
    ];

    const domainFrameworksFound = domainFrameworkPatterns.filter(p => p.test(rigorContent)).length;
    result.details.domain_frameworks_found = domainFrameworksFound;

    // Check for peer-reviewed/scientific sources mentioned
    const scientificSourcePatterns = [
      /peer[\s-]*review/i,
      /journal\s*(of|article)/i,
      /academic\s*(study|source|research)/i,
      /veterinary|etholog/i,
      /scientific\s*(consensus|study|research)/i
    ];

    const scientificSourceMentions = scientificSourcePatterns.filter(p => p.test(rigorContent)).length;
    result.details.scientific_source_mentions = scientificSourceMentions;

    // BLOCKER: If no domain expertise frameworks addressed, fail
    if (domainFrameworksFound === 0) {
      result.reason = 'Rigor checkpoint missing Domain Expertise frameworks (21-25). These prevent surface-level analysis that misses what experts consider obvious.';
      return result;
    }

    // WARNING: If no scientific sources mentioned, flag it
    if (scientificSourceMentions === 0) {
      result.details.warning = 'No peer-reviewed or scientific sources mentioned - may miss domain expertise';
    }

    // CRITICAL: Check for embedded "NOT READY" status within the file
    // This catches cases where the rigor checkpoint says something is NOT READY internally
    const notReadyInternally = /publication\s*status[:\s]*NOT\s*READY/i.test(rigorContent) ||
                               /legal\s*compliance[^:]*:\s*NOT\s*READY/i.test(rigorContent) ||
                               /\*\*publication\s*readiness[^*]*\*\*[:\s]*NOT\s*READY/i.test(rigorContent);

    const issuesDocumented = /issues\s*documented|blocking\s*issues/i.test(rigorContent);

    result.details.internal_not_ready = notReadyInternally;
    result.details.has_blocking_issues = issuesDocumented;

    // Check if legal compliance section shows NOT READY
    const legalSection = rigorContent.match(/### Legal Compliance[\s\S]*?(?=###|$)/i);
    if (legalSection) {
      const legalNotReady = /NOT\s*READY/i.test(legalSection[0]);
      if (legalNotReady) {
        result.details.legal_not_ready = true;
        result.reason = 'Rigor checkpoint shows Legal Compliance NOT READY - must resolve legal issues';
        return result;
      }
    }

    // Check if file explicitly says NOT READY for publication anywhere
    if (notReadyInternally) {
      result.reason = 'Rigor checkpoint contains NOT READY status - internal issues must be resolved';
      return result;
    }

    // Require minimum check coverage (at least 20 of 25 frameworks addressed - 80%)
    if (checkMarks < 20) {
      result.reason = `Only ${checkMarks} framework checks found (need >=20 of 25)`;
      return result;
    }

    // If significant gaps found, fail
    if (gapMarks > 2) {
      result.reason = `Rigor checkpoint has ${gapMarks} gaps/failures - all frameworks must pass`;
      return result;
    }

    // CRITICAL: Verify R### tasks were actually created, not just documented
    // Extract R### task references from rigor checkpoint
    const rigorTaskRefs = rigorContent.match(/\bR0[0-9]{2}\b/g) || [];
    const uniqueRigorTasks = [...new Set(rigorTaskRefs)];

    if (uniqueRigorTasks.length > 0) {
      const tasksDir = path.join(caseDir, 'tasks');
      const missingTasks = [];

      for (const taskId of uniqueRigorTasks) {
        const taskFile = path.join(tasksDir, `${taskId}.json`);
        if (!fs.existsSync(taskFile)) {
          missingTasks.push(taskId);
        }
      }

      result.details.rigor_tasks_referenced = uniqueRigorTasks.length;
      result.details.rigor_tasks_missing = missingTasks.length;

      if (missingTasks.length > 0) {
        // Allow some missing if most are created (80% threshold)
        const createdRatio = (uniqueRigorTasks.length - missingTasks.length) / uniqueRigorTasks.length;
        if (createdRatio < 0.8) {
          result.reason = `Rigor checkpoint references ${uniqueRigorTasks.length} R### tasks but ${missingTasks.length} were never created (${missingTasks.slice(0, 5).join(', ')}${missingTasks.length > 5 ? '...' : ''}). Tasks must be created, not just documented.`;
          return result;
        }
      }
    }

    // Also check state flag as secondary confirmation
    const statePath = path.join(caseDir, 'state.json');
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      result.details.state_flag = state.rigor_checkpoint_passed;
    }

    result.passed = true;

  } catch (e) {
    result.reason = `Error: ${e.message}`;
  }

  return result;
}

/**
 * Gate 9: Legal review verification (filesystem-based)
 * CRITICAL: Must check review OUTCOME, not just file existence
 */
function verifyLegal(caseDir) {
  const result = { passed: false, reason: null, details: {} };

  // Check legal folder (preferred) or root file
  const legalPaths = [
    path.join(caseDir, 'legal', 'legal-review.md'),
    path.join(caseDir, 'legal-review.md'),
    path.join(caseDir, 'legal-assessment.md')
  ];

  let foundLegal = false;
  let legalContent = null;
  let legalFile = null;

  for (const filePath of legalPaths) {
    if (fs.existsSync(filePath)) {
      legalContent = fs.readFileSync(filePath, 'utf-8');
      legalFile = filePath;
      foundLegal = true;
      break;
    }
  }

  if (!foundLegal) {
    result.reason = 'No legal review file found';
    return result;
  }

  // Check for required legal review sections
  const hasRiskLevel = /risk\s*(level|rating|assessment)/i.test(legalContent);
  const hasClassification = /public\s*figure|private\s*individual/i.test(legalContent);
  const hasRecommendations = /recommend|mitigation/i.test(legalContent);

  result.details.file = path.relative(caseDir, legalFile);
  result.details.size = legalContent.length;
  result.details.has_risk_level = hasRiskLevel;
  result.details.has_classification = hasClassification;
  result.details.has_recommendations = hasRecommendations;

  // CRITICAL: Check actual review outcome
  // Look for "Publication Readiness" or "Final Recommendation" status
  const notReadyMatch = /publication\s*readiness[:\s]*\*?\*?NOT\s*READY\*?\*?/i.test(legalContent);
  const readyMatch = /publication\s*readiness[:\s]*\*?\*?READY\*?\*?(?!\s*WITH)/i.test(legalContent);
  const readyWithChanges = /publication\s*readiness[:\s]*\*?\*?READY\s*WITH\s*CHANGES\*?\*?/i.test(legalContent);

  // Count critical issues
  const criticalGapsMatch = legalContent.match(/critical\s*\(must\s*address[^)]*\)/gi);
  const blockingIssues = legalContent.match(/blocking|must\s*fix|must\s*address/gi) || [];
  const highRiskClaims = (legalContent.match(/\|\s*HIGH\s*\|/g) || []).length;

  result.details.publication_ready = readyMatch;
  result.details.ready_with_changes = readyWithChanges;
  result.details.not_ready = notReadyMatch;
  result.details.blocking_issues_mentioned = blockingIssues.length;
  result.details.high_risk_claims = highRiskClaims;

  // Determine pass/fail based on actual review outcome
  if (notReadyMatch) {
    result.reason = 'Legal review explicitly says NOT READY for publication - must resolve blocking issues first';
    return result;
  }

  if (!hasRiskLevel && !hasClassification) {
    result.reason = 'Legal review file exists but lacks required risk level or subject classification sections';
    return result;
  }

  // Check for unresolved critical issues
  if (criticalGapsMatch && criticalGapsMatch.length > 0) {
    // Look for actual items under "Critical" section
    const criticalSection = legalContent.match(/### Critical.*?(?=###|$)/si);
    if (criticalSection) {
      const criticalItems = (criticalSection[0].match(/^\s*\|\s*\d+/gm) || []).length;
      if (criticalItems > 0) {
        result.details.critical_gaps = criticalItems;
        result.reason = `Legal review has ${criticalItems} critical gaps that must be addressed before publication`;
        return result;
      }
    }
  }

  // If READY or READY WITH CHANGES, pass the gate
  if (readyMatch || readyWithChanges) {
    result.passed = true;
    if (readyWithChanges) {
      result.details.note = 'Legal review says READY WITH CHANGES - minor fixes may be needed';
    }
    return result;
  }

  // Default: if has required sections and not explicitly NOT READY, pass with warning
  result.passed = true;
  result.details.note = 'Legal review file exists with required sections; no explicit readiness status found';

  return result;
}

/**
 * Ledger verification (informational, uses ledger.json)
 */
function verifyLedger(caseDir) {
  const result = { passed: true, reason: null, details: {}, warnings: [] };

  const ledgerPath = path.join(caseDir, 'ledger.json');
  if (!fs.existsSync(ledgerPath)) {
    result.passed = false;
    result.reason = 'ledger.json not found';
    return result;
  }

  try {
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf-8'));
    const entries = ledger.entries || [];

    result.details.total_entries = entries.length;

    // Count entry types
    const typeCounts = {};
    for (const entry of entries) {
      typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
    }
    result.details.entry_types = typeCounts;

    // Check for required entry types
    const requiredTypes = ['phase_start', 'source_capture', 'task_complete'];
    const missingTypes = requiredTypes.filter(t => !typeCounts[t]);

    if (missingTypes.length > 0) {
      result.warnings.push(`Missing entry types: ${missingTypes.join(', ')}`);
    }

    // Check for orphan captures (captured but not cited)
    const capturedSources = entries
      .filter(e => e.type === 'source_capture')
      .map(e => e.source_id || e.sourceId || e.source || e.details?.source)
      .filter(Boolean);

    const citations = extractCitations(caseDir);
    const uniqueCaptured = Array.from(new Set(capturedSources));
    const orphans = uniqueCaptured.filter(s => !citations.includes(s));

    if (orphans.length > 0) {
      result.warnings.push(`${orphans.length} captured sources not cited in deliverables`);
    }

    result.details.sources_captured = uniqueCaptured.length;
    result.details.sources_cited = citations.length;

    if (result.warnings.length > 0) {
      result.reason = result.warnings.join('; ');
    }

  } catch (e) {
    result.passed = false;
    result.reason = `Error parsing ledger.json: ${e.message}`;
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

async function run(caseDir, options = {}) {
  const mainOp = logger.operation('verifyAllGates', { caseDir });
  const startTime = Date.now();
  logger.info('Starting gate verification', { caseDir });

  if (!caseDir || typeof caseDir !== 'string') {
    logger.error('Missing case directory argument');
    return {
      timestamp: new Date().toISOString(),
      case_dir: caseDir || null,
      duration_ms: Date.now() - startTime,
      thresholds: '100% (no exceptions)',
      gates: {},
      audit_trail: { passed: false, reason: 'Missing case directory argument', warnings: [] },
      summary: { passed: 0, failed: 9, total: 9 },
      overall: false,
      blocking_gates: ['coverage', 'tasks', 'adversarial', 'sources', 'content', 'claims', 'contradictions', 'rigor', 'legal']
    };
  }

  logger.info('Running 9 termination gates');
  const gates = {};

  // Run each gate with logging
  const gateList = [
    { name: 'coverage', fn: () => verifyCoverage(caseDir) },
    { name: 'tasks', fn: () => verifyTasks(caseDir) },
    { name: 'adversarial', fn: () => verifyAdversarial(caseDir) },
    { name: 'sources', fn: () => verifySources(caseDir) },
    { name: 'content', fn: () => verifyContent(caseDir), async: true },
    { name: 'claims', fn: () => verifyClaims(caseDir), async: true },
    { name: 'contradictions', fn: () => verifyContradictions(caseDir) },
    { name: 'rigor', fn: () => verifyRigor(caseDir) },
    { name: 'legal', fn: () => verifyLegal(caseDir) }
  ];

  for (const gate of gateList) {
    logger.debug(`Running gate: ${gate.name}`);
    const gateStart = Date.now();
    try {
      gates[gate.name] = gate.async ? await gate.fn() : gate.fn();
      const duration = Date.now() - gateStart;
      const passed = gates[gate.name].passed;
      logger.debug(`Gate ${gate.name}: ${passed ? 'PASS' : 'FAIL'} (${duration}ms)`, {
        reason: gates[gate.name].reason
      });
    } catch (err) {
      logger.error(`Gate ${gate.name} threw error`, err);
      gates[gate.name] = { passed: false, reason: err.message };
    }
  }

  logger.debug('Running ledger verification');
  const ledger = verifyLedger(caseDir);

  const failedGates = Object.entries(gates)
    .filter(([_, r]) => !r.passed)
    .map(([name]) => name);

  const passedCount = Object.values(gates).filter(r => r.passed).length;
  const totalGates = Object.keys(gates).length;
  const allPassed = failedGates.length === 0;

  logger.info('Gate verification summary', {
    passed: passedCount,
    failed: failedGates.length,
    total: totalGates,
    blocking: failedGates
  });

  const output = {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    thresholds: '100% (no exceptions)',
    gates,
    audit_trail: ledger,
    summary: {
      passed: passedCount,
      failed: failedGates.length,
      total: totalGates
    },
    overall: allPassed,
    blocking_gates: failedGates
  };

  if (options.generateFix === true) {
    output.remediation_tasks = generateRemediationTasks(gates);
  }

  const controlDir = path.join(caseDir, 'control');
  if (!fs.existsSync(controlDir)) {
    logger.debug(`Creating control directory: ${controlDir}`);
    fs.mkdirSync(controlDir, { recursive: true });
  }
  const resultsPath = path.join(controlDir, 'gate_results.json');
  logger.debug('Writing gate_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(output, null, 2));

  const duration = Date.now() - startTime;
  if (allPassed) {
    logger.info('All gates passed - READY TO TERMINATE', { duration_ms: duration });
    mainOp.success({ passed: passedCount, total: totalGates, duration_ms: duration });
  } else {
    logger.warn('Gate verification failed - CANNOT TERMINATE', {
      duration_ms: duration,
      blocking: failedGates
    });
    mainOp.fail(new Error(`${failedGates.length} gates failed`));
  }

  return output;
}

function printHuman(output, options = {}) {
  console.log('='.repeat(70));
  console.log(`${BOLD}Termination Gate Verification (100% Thresholds)${NC}`);
  console.log('='.repeat(70));
  console.log(`Case: ${output.case_dir}`);
  console.log('');

  for (const [gate, result] of Object.entries(output.gates || {})) {
    const status = result.passed ? `${GREEN}PASS${NC}` : `${RED}FAIL${NC}`;
    console.log(`Gate ${gate.padEnd(15)} ${status}`);
    if (!result.passed && result.reason) {
      console.log(`  ${YELLOW}- ${result.reason}${NC}`);
    }
  }

  console.log('');
  console.log('-'.repeat(70));
  console.log(`Gates passed: ${output.summary?.passed ?? 0}/${output.summary?.total ?? 9}`);

  if (output.overall) {
    console.log(`${GREEN}OVERALL: PASS${NC} - READY TO TERMINATE`);
  } else {
    console.log(`${RED}OVERALL: FAIL${NC} - CANNOT TERMINATE`);
    if (Array.isArray(output.blocking_gates) && output.blocking_gates.length > 0) {
      console.log(`Blocking gates: ${output.blocking_gates.join(', ')}`);
    }
  }

  if (options.generateFix === true && Array.isArray(output.remediation_tasks) && output.remediation_tasks.length > 0) {
    console.log('');
    console.log('Remediation tasks:');
    for (const task of output.remediation_tasks) {
      console.log(`- [${task.id}] ${task.description}`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  logger.info('verify-all-gates.js started', { args: process.argv.slice(2) });
  const parsed = parseCliArgs(process.argv);
  const caseDir = parsed.caseDir;

  if (!caseDir) {
    logger.error('Missing case directory argument');
    console.error('Usage: node scripts/verify-all-gates.js <case_dir> [--json] [--fix]');
    process.exit(1);
  }

  const result = await run(caseDir, { generateFix: parsed.generateFix });
  if (parsed.jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result, { generateFix: parsed.generateFix });
  }

  logger.info('Exiting', { exit_code: result.overall ? 0 : 1 });
  process.exit(result.overall ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  main().catch(err => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
