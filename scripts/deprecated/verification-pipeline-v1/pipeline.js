/**
 * pipeline.js - Orchestrates the 5-step verification pipeline
 *
 * Runs all verification steps in order, building a cryptographic chain
 * hash that proves the steps were run in sequence. Stops on blocking
 * failures and produces a comprehensive verification state.
 *
 * Steps:
 * 1. CAPTURE - Verify source capture exists
 * 2. INTEGRITY - Hash verification and red flag detection
 * 3. BINDING - Citation URL consistency (NEW)
 * 4. SEMANTIC - Claim-evidence verification
 * 5. STATISTICS - Number matching
 */

'use strict';

const fs = require('fs');
const path = require('path');
const CONST = require('./constants');
const { readJsonSafe, readTextSafe, writeJson, computeHash, computeChainHash } = require('./utils');

// Import step modules
const captureStep = require('./steps/capture');
const integrityStep = require('./steps/integrity');
const bindingStep = require('./steps/binding');
const semanticStep = require('./steps/semantic');
const statisticsStep = require('./steps/statistics');

const STEPS = [
  { module: captureStep, ...CONST.STEPS[0] },
  { module: integrityStep, ...CONST.STEPS[1] },
  { module: bindingStep, ...CONST.STEPS[2] },
  { module: semanticStep, ...CONST.STEPS[3] },
  { module: statisticsStep, ...CONST.STEPS[4] }
];

/**
 * Run the full verification pipeline
 * @param {string} caseDir - Path to case directory
 * @param {object} options - Pipeline options
 * @returns {object} - Complete verification state
 */
function runPipeline(caseDir, options = {}) {
  const {
    stopOnFail = true,      // Stop pipeline on blocking failure
    generateState = true,   // Write verification-state.json
    verbose = false         // Log progress
  } = options;

  const startTime = Date.now();

  // Initialize verification state
  const state = {
    version: CONST.VERSION,
    case_id: path.basename(caseDir),
    generated_at: new Date().toISOString(),
    article: null,
    pipeline: [],
    chain_hash: null,
    final_status: 'pending',
    blocking_issues: [],
    warnings: [],
    summary: {
      total_steps: STEPS.length,
      steps_passed: 0,
      steps_failed: 0,
      steps_warned: 0,
      steps_skipped: 0
    }
  };

  // Load shared context
  const context = {
    sourcesJson: readJsonSafe(path.join(caseDir, CONST.PATHS.SOURCES_JSON)),
    article: readTextSafe(path.join(caseDir, CONST.PATHS.ARTICLE)),
    previousStepHash: null
  };

  // Get article info
  if (context.article) {
    const wordCount = context.article.split(/\s+/).length;
    const citationCount = (context.article.match(CONST.CITATION.ANY) || []).length;
    state.article = {
      path: CONST.PATHS.ARTICLE,
      hash: computeHash(context.article),
      word_count: wordCount,
      citation_count: citationCount
    };
  }

  const stepHashes = [];
  let shouldStop = false;

  // Run each step
  for (const step of STEPS) {
    if (shouldStop) {
      state.pipeline.push({
        step: step.id,
        name: step.name,
        status: 'skipped',
        reason: 'Previous step failed'
      });
      state.summary.steps_skipped++;
      continue;
    }

    if (verbose) {
      console.log(`Running step ${step.id}: ${step.name}...`);
    }

    // Run the step
    const result = step.module.run(caseDir, context);

    // Update context for next step
    context.previousStepHash = result.step_hash;

    // Store result
    state.pipeline.push(result);
    stepHashes.push(result.step_hash);

    // Collect issues
    if (result.issues) {
      const blocking = result.issues.filter(i => i.severity === 'blocking');
      const warnings = result.issues.filter(i => i.severity === 'warning');

      state.blocking_issues.push(...blocking.map(i => ({
        step: step.name,
        ...i
      })));
      state.warnings.push(...warnings.map(i => ({
        step: step.name,
        ...i
      })));
    }

    // Update summary
    if (result.status === 'pass') {
      state.summary.steps_passed++;
    } else if (result.status === 'fail' || result.status === 'error') {
      state.summary.steps_failed++;
      if (stopOnFail) {
        shouldStop = true;
      }
    } else if (result.status === 'warn') {
      state.summary.steps_warned++;
    }

    if (verbose) {
      console.log(`  Status: ${result.status} (${result.duration_ms}ms)`);
    }
  }

  // Compute chain hash
  state.chain_hash = computeChainHash(stepHashes);

  // Determine final status
  if (state.summary.steps_failed > 0) {
    state.final_status = 'FAILED';
  } else if (state.summary.steps_warned > 0) {
    state.final_status = 'NEEDS_REVIEW';
  } else if (state.summary.steps_passed === state.summary.total_steps) {
    state.final_status = 'VERIFIED';
  } else {
    state.final_status = 'INCOMPLETE';
  }

  state.duration_ms = Date.now() - startTime;

  // Write verification state
  if (generateState) {
    const statePath = path.join(caseDir, CONST.PATHS.VERIFICATION_STATE);
    writeJson(statePath, state);
  }

  return state;
}

/**
 * Run a single step (for debugging/testing)
 * @param {string} caseDir - Path to case directory
 * @param {string} stepName - Step name to run
 * @returns {object} - Step result
 */
function runSingleStep(caseDir, stepName) {
  const step = STEPS.find(s => s.name === stepName);
  if (!step) {
    throw new Error(`Unknown step: ${stepName}. Available: ${STEPS.map(s => s.name).join(', ')}`);
  }

  const context = {
    sourcesJson: readJsonSafe(path.join(caseDir, CONST.PATHS.SOURCES_JSON)),
    article: readTextSafe(path.join(caseDir, CONST.PATHS.ARTICLE)),
    previousStepHash: null
  };

  return step.module.run(caseDir, context);
}

/**
 * Get verification summary from existing state
 * @param {string} caseDir - Path to case directory
 * @returns {object|null} - Summary or null if no state
 */
function getVerificationSummary(caseDir) {
  const state = readJsonSafe(path.join(caseDir, CONST.PATHS.VERIFICATION_STATE));
  if (!state) {
    return null;
  }

  return {
    case_id: state.case_id,
    final_status: state.final_status,
    generated_at: state.generated_at,
    chain_hash: state.chain_hash,
    summary: state.summary,
    blocking_issues_count: state.blocking_issues.length,
    warnings_count: state.warnings.length
  };
}

/**
 * Check if verification is current (article hasn't changed)
 * @param {string} caseDir - Path to case directory
 * @returns {object} - Status and reason
 */
function isVerificationCurrent(caseDir) {
  const state = readJsonSafe(path.join(caseDir, CONST.PATHS.VERIFICATION_STATE));
  if (!state) {
    return { current: false, reason: 'No verification state found' };
  }

  const article = readTextSafe(path.join(caseDir, CONST.PATHS.ARTICLE));
  if (!article) {
    return { current: false, reason: 'Article not found' };
  }

  const currentHash = computeHash(article);
  if (state.article && state.article.hash !== currentHash) {
    return { current: false, reason: 'Article has changed since verification' };
  }

  return { current: true, state };
}

module.exports = {
  runPipeline,
  runSingleStep,
  getVerificationSummary,
  isVerificationCurrent,
  STEPS
};
