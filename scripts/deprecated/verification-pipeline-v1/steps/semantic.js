/**
 * semantic.js - Step 4: Claim-evidence semantic verification
 *
 * Verifies that each claim in the article is actually supported by
 * its cited source. Uses a two-tier approach:
 *
 * Tier 1 (Heuristic): Fast checks for statistics and key terms
 * Tier 2 (LLM): Semantic verification for claims failing heuristics
 *
 * This step prevents "citation laundering" - attaching citations to
 * claims they don't actually support.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CONST = require('../constants');
const {
  readJsonSafe,
  readTextSafe,
  extractClaimsWithCitations,
  extractStatistics,
  findNumberInText,
  checkKeyTerms,
  computeHash,
  writeJson
} = require('../utils');

/**
 * Run semantic verification step
 * @param {string} caseDir - Path to case directory
 * @param {object} context - Pipeline context
 * @returns {object} - Step result
 */
function run(caseDir, context) {
  const startTime = Date.now();

  const result = {
    step: 4,
    name: 'semantic',
    status: 'pending',
    started_at: new Date().toISOString(),
    completed_at: null,
    metrics: {
      claims_extracted: 0,
      claims_checked: 0,
      verified_heuristic: 0,
      verified_llm: 0,
      flagged_review: 0,
      failed: 0,
      source_missing: 0
    },
    issues: [],
    details: [],
    llm_prompts: [] // For claims needing LLM verification
  };

  try {
    // Get article
    const article = context.article || readTextSafe(path.join(caseDir, CONST.PATHS.ARTICLE));
    if (!article) {
      result.status = 'fail';
      result.issues.push({
        type: 'ARTICLE_MISSING',
        severity: 'blocking',
        message: 'articles/full.md not found'
      });
      result.completed_at = new Date().toISOString();
      result.duration_ms = Date.now() - startTime;
      return result;
    }

    // Extract claims
    const claims = extractClaimsWithCitations(article);
    result.metrics.claims_extracted = claims.length;

    // Process each claim
    for (const claim of claims) {
      result.metrics.claims_checked++;

      const claimResult = {
        claim_id: `C${String(result.metrics.claims_checked).padStart(3, '0')}`,
        claim_text: claim.claim,
        claim_hash: computeHash(claim.claim + claim.sourceId),
        source_id: claim.sourceId,
        line: claim.line,
        verification: {
          status: 'pending',
          confidence: 0,
          method: null
        },
        checks: [],
        supporting_quote: null
      };

      // Load source content
      const contentPath = path.join(caseDir, CONST.PATHS.EVIDENCE_DIR, claim.sourceId, CONST.PATHS.CONTENT);
      const sourceContent = readTextSafe(contentPath);

      if (!sourceContent) {
        claimResult.verification.status = 'failed';
        claimResult.checks.push({
          check: 'source_exists',
          passed: false,
          message: 'Source content not found'
        });
        result.metrics.source_missing++;
        result.metrics.failed++;
        result.details.push(claimResult);
        continue;
      }

      // ============================================================
      // TIER 1: HEURISTIC VERIFICATION
      // ============================================================

      let heuristicPassed = true;
      let confidence = CONST.CONFIDENCE.PASS;
      const issues = [];

      // Check 1: Statistics in claim appear in source
      const claimStats = extractStatistics(claim.claim);
      for (const stat of claimStats) {
        const found = findNumberInText(sourceContent, stat.value);
        if (!found.found) {
          heuristicPassed = false;
          confidence = Math.min(confidence, CONST.CONFIDENCE.FAIL);
          issues.push(`Statistic "${stat.raw}" not found in source`);
          claimResult.checks.push({
            check: 'statistic_match',
            passed: false,
            statistic: stat.raw,
            message: 'Not found in source'
          });
        } else {
          claimResult.checks.push({
            check: 'statistic_match',
            passed: true,
            statistic: stat.raw,
            found_as: found.match,
            exact: found.exact
          });
        }
      }

      // Check 2: Key terms from claim appear in source
      const termCheck = checkKeyTerms(claim.claim, sourceContent);
      if (!termCheck.passed) {
        heuristicPassed = false;
        confidence = Math.min(confidence, CONST.CONFIDENCE.FLAG);
        issues.push(`Key terms not found: ${termCheck.missing.slice(0, 3).join(', ')}`);
        claimResult.checks.push({
          check: 'key_terms',
          passed: false,
          found: termCheck.found,
          total: termCheck.total,
          missing: termCheck.missing.slice(0, 5)
        });
      } else {
        claimResult.checks.push({
          check: 'key_terms',
          passed: true,
          found: termCheck.found,
          total: termCheck.total
        });
      }

      // Find supporting quote
      const quote = findSupportingQuote(claim.claim, sourceContent);
      if (quote) {
        claimResult.supporting_quote = quote.text;
        claimResult.quote_line_range = quote.lineRange;
      }

      // ============================================================
      // DETERMINE VERIFICATION STATUS
      // ============================================================

      if (heuristicPassed && confidence >= CONST.CONFIDENCE.PASS) {
        // Passed heuristic verification
        claimResult.verification.status = 'verified_heuristic';
        claimResult.verification.confidence = confidence;
        claimResult.verification.method = 'heuristic';
        result.metrics.verified_heuristic++;

        // Update claim-support.json for this source
        updateClaimSupport(caseDir, claim.sourceId, claimResult);

      } else if (confidence >= CONST.CONFIDENCE.FLAG) {
        // Needs LLM verification
        claimResult.verification.status = 'needs_llm';
        claimResult.verification.confidence = confidence;
        claimResult.verification.issues = issues;
        result.metrics.flagged_review++;

        // Generate LLM prompt
        const prompt = generateLlmPrompt(claim, sourceContent, caseDir);
        result.llm_prompts.push({
          claim_id: claimResult.claim_id,
          source_id: claim.sourceId,
          ...prompt,
          issues
        });

      } else {
        // Failed verification
        claimResult.verification.status = 'failed';
        claimResult.verification.confidence = confidence;
        claimResult.verification.issues = issues;
        result.metrics.failed++;

        result.issues.push({
          type: 'CLAIM_NOT_SUPPORTED',
          severity: 'blocking',
          sourceId: claim.sourceId,
          claimId: claimResult.claim_id,
          message: `Claim not supported by source: ${issues.join('; ')}`,
          claim: claim.claim.substring(0, 100) + (claim.claim.length > 100 ? '...' : '')
        });
      }

      result.details.push(claimResult);
    }

    // ============================================================
    // DETERMINE OVERALL STATUS
    // ============================================================

    const totalClaims = result.metrics.claims_checked;
    const failedPercent = totalClaims > 0 ? result.metrics.failed / totalClaims : 0;
    const flaggedPercent = totalClaims > 0 ? result.metrics.flagged_review / totalClaims : 0;

    if (failedPercent > CONST.BLOCKING.MAX_FAILED_CLAIMS_PERCENT) {
      result.status = 'fail';
    } else if (flaggedPercent > CONST.BLOCKING.MAX_FLAGGED_CLAIMS_PERCENT) {
      result.status = 'warn';
    } else if (result.metrics.failed > 0) {
      result.status = 'warn';
    } else {
      result.status = 'pass';
    }

    // Compute step hash
    const inputHash = computeHash(article);
    const outputHash = computeHash(JSON.stringify(result.metrics));
    result.step_hash = computeHash(inputHash + outputHash + (context.previousStepHash || ''));

  } catch (error) {
    result.status = 'error';
    result.issues.push({
      type: 'UNEXPECTED_ERROR',
      severity: 'blocking',
      message: error.message
    });
  }

  result.completed_at = new Date().toISOString();
  result.duration_ms = Date.now() - startTime;

  return result;
}

/**
 * Find supporting quote in source content
 * @param {string} claim - Claim text
 * @param {string} source - Source content
 * @returns {object|null} - Quote info or null
 */
function findSupportingQuote(claim, source) {
  // Extract searchable terms from claim
  const terms = [];

  // Numbers
  const numbers = claim.match(/\d+(?:\.\d+)?%?/g) || [];
  terms.push(...numbers);

  // Key capitalized words
  const words = claim.match(/\b[A-Z][a-z]{4,}\b/g) || [];
  terms.push(...words);

  if (terms.length === 0) {
    return null;
  }

  // Find lines containing the most terms
  const lines = source.split('\n');
  let bestMatch = { lineNum: -1, score: 0, line: '' };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (line.includes(term.toLowerCase())) {
        score++;
      }
    }

    if (score > bestMatch.score) {
      bestMatch = { lineNum: i, score, line: lines[i] };
    }
  }

  if (bestMatch.score > 0) {
    // Get context (surrounding lines)
    const start = Math.max(0, bestMatch.lineNum - 1);
    const end = Math.min(lines.length, bestMatch.lineNum + 2);
    const context = lines.slice(start, end).join(' ').trim();

    return {
      text: context.substring(0, 300),
      lineRange: [start + 1, end]
    };
  }

  return null;
}

/**
 * Generate LLM verification prompt
 * @param {object} claim - Claim object
 * @param {string} sourceContent - Source content
 * @param {string} caseDir - Case directory
 * @returns {object} - Prompt info
 */
function generateLlmPrompt(claim, sourceContent, caseDir) {
  const metadataPath = path.join(caseDir, CONST.PATHS.EVIDENCE_DIR, claim.sourceId, CONST.PATHS.METADATA);
  const metadata = readJsonSafe(metadataPath) || {};

  const truncatedContent = sourceContent.length > CONST.LLM.MAX_CONTENT_LENGTH
    ? sourceContent.substring(0, CONST.LLM.MAX_CONTENT_LENGTH) + '\n\n[...content truncated...]'
    : sourceContent;

  return {
    prompt: `You are verifying whether a cited source actually supports a specific claim.

## The Claim Being Made
"${claim.claim}"

## Source Information
- Source ID: ${claim.sourceId}
- URL: ${metadata.url || 'Unknown'}
- Title: ${metadata.title || 'Unknown'}

## Source Content
${truncatedContent}

## Your Task
Determine if this source ACTUALLY CONTAINS evidence supporting the specific claim above.

Be strict:
- The source must contain the actual fact, not just related information
- Statistics must match exactly (52% is not 72%)
- Attribution matters ("Company X says" vs stating as fact)
- If discussing the topic but not supporting the specific claim, return supported: false

Respond in this exact JSON format:
{
  "supported": true|false,
  "confidence": 0.0-1.0,
  "supporting_quote": "Direct quote from source (max 200 chars, or null)",
  "issues": ["list of specific problems if not supported"],
  "method": "semantic_match"|"exact_match"|"partial_match"|"no_match"
}`,
    system_prompt: 'You are a fact-checker verifying citations. Be strict and accurate. Return only valid JSON.'
  };
}

/**
 * Update claim-support.json for a source
 * @param {string} caseDir - Case directory
 * @param {string} sourceId - Source ID
 * @param {object} claimResult - Verification result for this claim
 */
function updateClaimSupport(caseDir, sourceId, claimResult) {
  const claimSupportPath = path.join(caseDir, CONST.PATHS.EVIDENCE_DIR, sourceId, CONST.PATHS.CLAIM_SUPPORT);

  let claimSupport = readJsonSafe(claimSupportPath) || {
    source_id: sourceId,
    verified_at: null,
    source_content_hash: null,
    claims_verified: []
  };

  // Update timestamp
  claimSupport.verified_at = new Date().toISOString();

  // Compute content hash
  const contentPath = path.join(caseDir, CONST.PATHS.EVIDENCE_DIR, sourceId, CONST.PATHS.CONTENT);
  const content = readTextSafe(contentPath);
  if (content) {
    claimSupport.source_content_hash = computeHash(content);
  }

  // Remove existing entry for this claim
  claimSupport.claims_verified = claimSupport.claims_verified.filter(c =>
    c.claim_hash !== claimResult.claim_hash
  );

  // Add new entry
  claimSupport.claims_verified.push({
    claim_hash: claimResult.claim_hash,
    claim_text: claimResult.claim_text,
    verification: claimResult.verification,
    supporting_quote: claimResult.supporting_quote,
    quote_line_range: claimResult.quote_line_range
  });

  writeJson(claimSupportPath, claimSupport);
}

module.exports = { run, findSupportingQuote, generateLlmPrompt };
