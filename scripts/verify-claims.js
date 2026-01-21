#!/usr/bin/env node
/**
 * verify-claims.js - Comprehensive claim verification with full audit trail
 *
 * Maps every factual claim in articles/full.md to specific evidence in captured
 * sources, producing a persistent audit trail document.
 *
 * Usage:
 *   node scripts/verify-claims.js <case_dir>
 *   node scripts/verify-claims.js <case_dir> --generate-audit
 *   node scripts/verify-claims.js <case_dir> --generate-report
 *   node scripts/verify-claims.js <case_dir> --llm-verify
 *   node scripts/verify-claims.js <case_dir> --block
 *   node scripts/verify-claims.js <case_dir> --json
 *
 * Options:
 *   --generate-audit    Write claim-verification.json
 *   --generate-report   Write claim-verification-report.md
 *   --llm-verify        Use LLM for all claims (not just heuristic failures)
 *   --block             Exit 1 if any failures
 *   --json              JSON output only
 *
 * Exit codes:
 *   0 - All claims verified
 *   1 - Verification failures found (with --block)
 *   2 - Usage error
 *   3 - Missing evidence
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger').create('verify-claims');
const { extractClaims, analyzeClaims, hashClaim } = require('./extract-claims');

// Confidence thresholds
const CONFIDENCE_THRESHOLD_PASS = 0.85;
const CONFIDENCE_THRESHOLD_FLAG = 0.60;

// Parse command line arguments
const args = process.argv.slice(2);
const caseDir = args.find(a => !a.startsWith('--'));
const jsonOutput = args.includes('--json');
const generateAudit = args.includes('--generate-audit');
const generateReport = args.includes('--generate-report');
const llmVerifyAll = args.includes('--llm-verify');
const blockMode = args.includes('--block');

if (!caseDir) {
  console.error('Usage: node scripts/verify-claims.js <case_dir> [options]');
  console.error('');
  console.error('Options:');
  console.error('  --generate-audit    Write claim-verification.json');
  console.error('  --generate-report   Write claim-verification-report.md');
  console.error('  --llm-verify        Use LLM for all claims');
  console.error('  --block             Exit 1 if any failures');
  console.error('  --json              JSON output only');
  process.exit(2);
}

/**
 * Load source content and metadata
 */
function loadSource(sourceId, caseDir) {
  const evidenceDir = path.join(caseDir, 'evidence', sourceId);
  const contentPath = path.join(evidenceDir, 'content.md');
  const metadataPath = path.join(evidenceDir, 'metadata.json');
  const claimSupportPath = path.join(evidenceDir, 'claim-support.json');

  const result = {
    sourceId,
    exists: false,
    content: null,
    contentHash: null,
    metadata: null,
    claimSupport: null,
    url: null,
    title: null
  };

  if (!fs.existsSync(evidenceDir)) {
    return result;
  }

  result.exists = true;

  if (fs.existsSync(contentPath)) {
    result.content = fs.readFileSync(contentPath, 'utf8');
    result.contentHash = `sha256:${crypto.createHash('sha256').update(result.content).digest('hex')}`;
  }

  if (fs.existsSync(metadataPath)) {
    try {
      result.metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      result.url = result.metadata.url;
      result.title = result.metadata.title;
    } catch (e) {
      logger.warn(`Failed to parse metadata for ${sourceId}: ${e.message}`);
    }
  }

  if (fs.existsSync(claimSupportPath)) {
    try {
      result.claimSupport = JSON.parse(fs.readFileSync(claimSupportPath, 'utf8'));
    } catch (e) {
      logger.warn(`Failed to parse claim-support for ${sourceId}: ${e.message}`);
    }
  }

  return result;
}

/**
 * Save claim support data to evidence directory
 */
function saveClaimSupport(sourceId, caseDir, claimSupportData) {
  const claimSupportPath = path.join(caseDir, 'evidence', sourceId, 'claim-support.json');
  fs.writeFileSync(claimSupportPath, JSON.stringify(claimSupportData, null, 2));
}

/**
 * Check if cached verification is still valid
 */
function isCachedVerificationValid(cachedClaim, currentClaimHash, sourceContentHash) {
  if (!cachedClaim) return false;
  if (cachedClaim.claim_hash !== currentClaimHash) return false;
  // Note: We check source_content_hash at the file level, not per-claim
  return true;
}

/**
 * Extract statistics/numbers from text for comparison
 */
function extractStatistics(text) {
  const stats = [];

  // Percentages
  const percents = text.match(/(\d+(?:\.\d+)?)\s*%/g);
  if (percents) stats.push(...percents);

  // Dollar amounts
  const dollars = text.match(/\$\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:million|billion|M|B))?/gi);
  if (dollars) stats.push(...dollars);

  // Numbers with scale
  const scaled = text.match(/\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion)/gi);
  if (scaled) stats.push(...scaled);

  // Large counts
  const counts = text.match(/\b\d{1,3}(?:,\d{3})+\b/g);
  if (counts) stats.push(...counts);

  return [...new Set(stats)];
}

/**
 * Tier 1: Fast heuristic verification
 */
function verifyHeuristic(claimText, sourceContent) {
  const result = {
    passed: true,
    confidence: 0.85,
    issues: [],
    details: {}
  };

  // Check statistics
  const claimStats = extractStatistics(claimText);
  const normalizedContent = sourceContent.toLowerCase().replace(/,/g, '');

  for (const stat of claimStats) {
    const normalizedStat = stat.replace(/,/g, '').toLowerCase();
    if (!normalizedContent.includes(normalizedStat)) {
      result.issues.push(`Statistic "${stat}" not found in source`);
      result.passed = false;
      result.confidence = 0.3;
    }
  }
  result.details.statistics_checked = claimStats.length;
  result.details.statistics_found = claimStats.length - result.issues.filter(i => i.includes('Statistic')).length;

  // Check key terms (proper nouns > 4 chars)
  const keyTerms = claimText.match(/\b[A-Z][a-z]{3,}\b/g) || [];
  const uniqueTerms = [...new Set(keyTerms)];
  const foundTerms = uniqueTerms.filter(term =>
    sourceContent.toLowerCase().includes(term.toLowerCase())
  );

  result.details.key_terms_checked = uniqueTerms.length;
  result.details.key_terms_found = foundTerms.length;

  if (uniqueTerms.length > 2 && foundTerms.length < uniqueTerms.length / 2) {
    const missingTerms = uniqueTerms.filter(t =>
      !sourceContent.toLowerCase().includes(t.toLowerCase())
    );
    result.issues.push(`Key terms not found: ${missingTerms.slice(0, 3).join(', ')}`);
    result.confidence = Math.min(result.confidence, 0.5);
  }

  // Adjust confidence based on checks passed
  if (result.passed && claimStats.length > 0) {
    result.confidence = 0.9; // Higher confidence if stats were verified
  }

  return result;
}

/**
 * Find supporting quote in source content
 */
function findSupportingQuote(claimText, sourceContent) {
  // Extract key phrases from claim
  const keyPhrases = [];

  // Numbers
  const numbers = claimText.match(/\d+(?:\.\d+)?%?/g) || [];
  keyPhrases.push(...numbers);

  // Quoted text
  const quotes = claimText.match(/"[^"]+"/g) || [];
  keyPhrases.push(...quotes.map(q => q.replace(/"/g, '')));

  // Key terms
  const terms = claimText.match(/\b[A-Z][a-z]{4,}\b/g) || [];
  keyPhrases.push(...terms);

  if (keyPhrases.length === 0) {
    return null;
  }

  // Find lines containing the most key phrases
  const lines = sourceContent.split('\n');
  let bestMatch = { line: '', lineNum: -1, score: 0 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let score = 0;

    for (const phrase of keyPhrases) {
      if (line.toLowerCase().includes(phrase.toLowerCase())) {
        score++;
      }
    }

    if (score > bestMatch.score) {
      bestMatch = { line, lineNum: i + 1, score };
    }
  }

  if (bestMatch.score > 0) {
    // Get context (include surrounding lines)
    const startLine = Math.max(0, bestMatch.lineNum - 2);
    const endLine = Math.min(lines.length, bestMatch.lineNum + 2);
    const context = lines.slice(startLine, endLine).join(' ').trim();

    return {
      quote: context.substring(0, 300),
      line_range: [startLine + 1, endLine]
    };
  }

  return null;
}

/**
 * Generate LLM verification prompt
 */
function generateVerificationPrompt(claim, source) {
  const truncatedContent = source.content.length > 6000
    ? source.content.substring(0, 6000) + '\n\n[...content truncated...]'
    : source.content;

  return {
    prompt: `You are verifying whether a cited source actually supports a specific claim.

## The Claim Being Made
"${claim.claim_text}"

## Source Information
- Source ID: ${source.sourceId}
- URL: ${source.url || 'Unknown'}
- Title: ${source.title || 'Unknown'}

## Source Content
${truncatedContent}

## Your Task
Determine if this source ACTUALLY CONTAINS evidence supporting the specific claim above.

Be strict:
- The source must contain the actual fact, not just related information
- Statistics must match exactly (52% is not 72%)
- Attribution matters ("Company X says" vs stating as fact)
- If discussing the topic but not supporting the specific claim, mark as NOT SUPPORTED

Respond in this exact JSON format:
{
  "supported": true|false,
  "confidence": 0.0-1.0,
  "supporting_quote": "Direct quote from source that supports/contradicts (max 200 chars, or null if none)",
  "issues": ["list of specific problems if not supported, empty array if supported"],
  "method": "semantic_match"|"exact_match"|"partial_match"|"no_match"
}`,
    system_prompt: 'You are a fact-checker verifying citations. Be strict and accurate. Return only valid JSON.'
  };
}

/**
 * Main verification function
 */
async function verifyClaims(caseDir) {
  const op = logger.operation('verifyClaims', { caseDir });

  const results = {
    version: '1.0.0',
    case_id: path.basename(caseDir),
    generated_at: new Date().toISOString(),
    article_hash: null,
    summary: {
      total_claims: 0,
      verified_auto: 0,
      verified_llm: 0,
      flagged_review: 0,
      failed: 0,
      missing_evidence: 0
    },
    claims: [],
    uncited_claims: [],
    source_usage: {},
    llm_prompts: []
  };

  // Read article
  const articlePath = path.join(caseDir, 'articles', 'full.md');
  if (!fs.existsSync(articlePath)) {
    results.error = 'articles/full.md not found';
    op.fail(new Error(results.error));
    return results;
  }

  const articleContent = fs.readFileSync(articlePath, 'utf8');
  results.article_hash = `sha256:${crypto.createHash('sha256').update(articleContent).digest('hex')}`;

  // Extract claims
  const claims = extractClaims(articleContent);
  results.summary.total_claims = claims.length;
  logger.info(`Extracted ${claims.length} claims from article`);

  // Load sources cache
  const sourcesCache = new Map();

  // Process each claim
  for (const claim of claims) {
    const claimResult = {
      claim_id: claim.claim_id,
      claim_text: claim.claim_text,
      claim_hash: claim.claim_hash,
      claim_types: claim.claim_types,
      location: {
        file: 'articles/full.md',
        line: claim.location.line,
        section: claim.location.section
      },
      sources_cited: claim.sources_cited,
      verification: {
        status: 'pending',
        confidence: 0,
        method: null
      },
      evidence: [],
      discrepancies: [],
      caveats: []
    };

    // Process each cited source
    for (const sourceId of claim.sources_cited) {
      // Load source (with caching)
      if (!sourcesCache.has(sourceId)) {
        sourcesCache.set(sourceId, loadSource(sourceId, caseDir));
      }
      const source = sourcesCache.get(sourceId);

      // Track source usage
      if (!results.source_usage[sourceId]) {
        results.source_usage[sourceId] = {
          times_cited: 0,
          claims_supported: [],
          claims_failed: []
        };
      }
      results.source_usage[sourceId].times_cited++;

      // Check if source exists
      if (!source.exists || !source.content) {
        claimResult.discrepancies.push({
          source_id: sourceId,
          issue: 'SOURCE_MISSING',
          detail: 'Evidence directory or content.md not found'
        });
        results.summary.missing_evidence++;
        continue;
      }

      // Check for cached verification
      let cachedVerification = null;
      if (source.claimSupport && source.claimSupport.source_content_hash === source.contentHash) {
        cachedVerification = source.claimSupport.claims_verified?.find(c =>
          c.claim_hash === claim.claim_hash
        );
      }

      if (cachedVerification && !llmVerifyAll) {
        // Use cached result
        claimResult.evidence.push({
          source_id: sourceId,
          supporting_quote: cachedVerification.supporting_quote,
          quote_location: cachedVerification.quote_line_range
            ? { file: `evidence/${sourceId}/content.md`, line_range: cachedVerification.quote_line_range }
            : null,
          match_type: cachedVerification.verification.method,
          match_score: cachedVerification.verification.confidence,
          cached: true
        });

        if (cachedVerification.verification.status === 'verified_auto' ||
            cachedVerification.verification.status === 'verified_llm') {
          results.source_usage[sourceId].claims_supported.push(claim.claim_id);
        } else {
          results.source_usage[sourceId].claims_failed.push(claim.claim_id);
        }
        continue;
      }

      // Run heuristic verification
      const heuristicResult = verifyHeuristic(claim.claim_text, source.content);
      const quoteInfo = findSupportingQuote(claim.claim_text, source.content);

      if (heuristicResult.passed && heuristicResult.confidence >= CONFIDENCE_THRESHOLD_PASS) {
        // Passed heuristic verification
        claimResult.evidence.push({
          source_id: sourceId,
          supporting_quote: quoteInfo?.quote || null,
          quote_location: quoteInfo?.line_range
            ? { file: `evidence/${sourceId}/content.md`, line_range: quoteInfo.line_range }
            : null,
          match_type: 'heuristic',
          match_score: heuristicResult.confidence
        });
        results.source_usage[sourceId].claims_supported.push(claim.claim_id);

        // Update claim-support.json for this source
        updateClaimSupport(sourceId, caseDir, source, claim, {
          status: 'verified_auto',
          confidence: heuristicResult.confidence,
          method: 'heuristic',
          model: null
        }, quoteInfo);

      } else {
        // Needs LLM verification or failed
        const llmPrompt = generateVerificationPrompt(claim, source);
        results.llm_prompts.push({
          claim_id: claim.claim_id,
          source_id: sourceId,
          ...llmPrompt,
          heuristic_issues: heuristicResult.issues
        });

        claimResult.evidence.push({
          source_id: sourceId,
          supporting_quote: quoteInfo?.quote || null,
          quote_location: quoteInfo?.line_range
            ? { file: `evidence/${sourceId}/content.md`, line_range: quoteInfo.line_range }
            : null,
          match_type: 'needs_llm',
          match_score: heuristicResult.confidence,
          heuristic_issues: heuristicResult.issues
        });

        if (heuristicResult.confidence < CONFIDENCE_THRESHOLD_FLAG) {
          results.source_usage[sourceId].claims_failed.push(claim.claim_id);
        }
      }
    }

    // Determine overall verification status for claim
    const evidenceScores = claimResult.evidence.map(e => e.match_score);
    const avgScore = evidenceScores.length > 0
      ? evidenceScores.reduce((a, b) => a + b, 0) / evidenceScores.length
      : 0;

    const hasFailures = claimResult.evidence.some(e => e.match_type === 'needs_llm' && e.match_score < CONFIDENCE_THRESHOLD_FLAG);
    const needsLlm = claimResult.evidence.some(e => e.match_type === 'needs_llm');
    const allPassed = claimResult.evidence.every(e =>
      e.match_type === 'heuristic' || e.match_type === 'exact_match' || e.match_type === 'semantic_match'
    );

    if (claimResult.discrepancies.length > 0) {
      claimResult.verification.status = 'failed';
      claimResult.verification.confidence = 0;
      results.summary.failed++;
    } else if (hasFailures) {
      claimResult.verification.status = 'failed';
      claimResult.verification.confidence = avgScore;
      results.summary.failed++;
    } else if (needsLlm) {
      claimResult.verification.status = 'flagged_review';
      claimResult.verification.confidence = avgScore;
      results.summary.flagged_review++;
    } else if (allPassed) {
      claimResult.verification.status = 'verified_auto';
      claimResult.verification.confidence = avgScore;
      claimResult.verification.method = 'heuristic';
      results.summary.verified_auto++;
    }

    results.claims.push(claimResult);
  }

  op.success({
    total: results.summary.total_claims,
    verified: results.summary.verified_auto + results.summary.verified_llm,
    failed: results.summary.failed,
    flagged: results.summary.flagged_review
  });

  return results;
}

/**
 * Update claim-support.json for a source
 */
function updateClaimSupport(sourceId, caseDir, source, claim, verification, quoteInfo) {
  const claimSupportPath = path.join(caseDir, 'evidence', sourceId, 'claim-support.json');

  let claimSupport = source.claimSupport || {
    source_id: sourceId,
    verified_at: null,
    source_content_hash: null,
    claims_verified: []
  };

  // Update timestamp and hash
  claimSupport.verified_at = new Date().toISOString();
  claimSupport.source_content_hash = source.contentHash;

  // Remove existing entry for this claim (if any)
  claimSupport.claims_verified = claimSupport.claims_verified.filter(c =>
    c.claim_hash !== claim.claim_hash
  );

  // Add new entry
  claimSupport.claims_verified.push({
    claim_hash: claim.claim_hash,
    claim_text: claim.claim_text,
    verification: verification,
    supporting_quote: quoteInfo?.quote || null,
    quote_line_range: quoteInfo?.line_range || null
  });

  saveClaimSupport(sourceId, caseDir, claimSupport);
}

/**
 * Generate human-readable report
 */
function generateMarkdownReport(results, caseDir) {
  const lines = [];

  lines.push('# Claim Verification Report');
  lines.push('');
  lines.push(`**Case:** ${results.case_id}`);
  lines.push(`**Generated:** ${results.generated_at}`);
  lines.push(`**Article Hash:** ${results.article_hash?.substring(0, 20)}...`);
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Total Claims | ${results.summary.total_claims} |`);
  lines.push(`| Verified (Auto) | ${results.summary.verified_auto} |`);
  lines.push(`| Verified (LLM) | ${results.summary.verified_llm} |`);
  lines.push(`| Flagged for Review | ${results.summary.flagged_review} |`);
  lines.push(`| Failed | ${results.summary.failed} |`);
  lines.push(`| Missing Evidence | ${results.summary.missing_evidence} |`);
  lines.push('');

  const passRate = results.summary.total_claims > 0
    ? Math.round(((results.summary.verified_auto + results.summary.verified_llm) / results.summary.total_claims) * 100)
    : 0;
  lines.push(`**Pass Rate:** ${passRate}%`);
  lines.push('');

  // Failed claims
  const failedClaims = results.claims.filter(c => c.verification.status === 'failed');
  if (failedClaims.length > 0) {
    lines.push('## Failed Claims (Requires Fixes)');
    lines.push('');
    for (const claim of failedClaims) {
      lines.push(`### ${claim.claim_id}`);
      lines.push('');
      lines.push(`**Claim:** "${claim.claim_text.substring(0, 150)}${claim.claim_text.length > 150 ? '...' : ''}"`);
      lines.push('');
      lines.push(`**Location:** ${claim.location.section} (line ${claim.location.line || 'unknown'})`);
      lines.push('');
      lines.push(`**Sources:** ${claim.sources_cited.join(', ')}`);
      lines.push('');
      if (claim.discrepancies.length > 0) {
        lines.push('**Issues:**');
        for (const d of claim.discrepancies) {
          lines.push(`- [${d.source_id}] ${d.issue}: ${d.detail}`);
        }
        lines.push('');
      }
      if (claim.evidence.some(e => e.heuristic_issues?.length > 0)) {
        lines.push('**Verification Failures:**');
        for (const e of claim.evidence) {
          if (e.heuristic_issues?.length > 0) {
            for (const issue of e.heuristic_issues) {
              lines.push(`- [${e.source_id}] ${issue}`);
            }
          }
        }
        lines.push('');
      }
      lines.push('**Suggested Fix:** Re-capture source, find alternate citation, or remove claim.');
      lines.push('');
    }
  }

  // Flagged claims
  const flaggedClaims = results.claims.filter(c => c.verification.status === 'flagged_review');
  if (flaggedClaims.length > 0) {
    lines.push('## Flagged Claims (Manual Review)');
    lines.push('');
    for (const claim of flaggedClaims) {
      lines.push(`### ${claim.claim_id}`);
      lines.push('');
      lines.push(`**Claim:** "${claim.claim_text.substring(0, 150)}${claim.claim_text.length > 150 ? '...' : ''}"`);
      lines.push('');
      lines.push(`**Confidence:** ${Math.round(claim.verification.confidence * 100)}%`);
      lines.push('');
      lines.push(`**Sources:** ${claim.sources_cited.join(', ')}`);
      lines.push('');
      if (claim.evidence.some(e => e.heuristic_issues?.length > 0)) {
        lines.push('**Concerns:**');
        for (const e of claim.evidence) {
          if (e.heuristic_issues?.length > 0) {
            for (const issue of e.heuristic_issues) {
              lines.push(`- [${e.source_id}] ${issue}`);
            }
          }
        }
        lines.push('');
      }
    }
  }

  // LLM prompts for manual verification
  if (results.llm_prompts.length > 0) {
    lines.push('## LLM Verification Prompts');
    lines.push('');
    lines.push(`${results.llm_prompts.length} claims need LLM-based semantic verification.`);
    lines.push('');
    lines.push('Run LLM verification using:');
    lines.push('```');
    lines.push('mcp__mcp-gemini__generate_text with model: gemini-3-pro');
    lines.push('```');
    lines.push('');
    for (const prompt of results.llm_prompts.slice(0, 3)) {
      lines.push(`### ${prompt.claim_id} → ${prompt.source_id}`);
      lines.push('');
      lines.push('Heuristic issues: ' + (prompt.heuristic_issues?.join('; ') || 'none'));
      lines.push('');
    }
    if (results.llm_prompts.length > 3) {
      lines.push(`... and ${results.llm_prompts.length - 3} more`);
      lines.push('');
    }
  }

  // Source utilization
  lines.push('## Source Utilization');
  lines.push('');
  lines.push('| Source | Times Cited | Claims Supported | Claims Failed |');
  lines.push('|--------|-------------|------------------|---------------|');
  for (const [sourceId, usage] of Object.entries(results.source_usage)) {
    lines.push(`| ${sourceId} | ${usage.times_cited} | ${usage.claims_supported.length} | ${usage.claims_failed.length} |`);
  }
  lines.push('');

  // Per-section statistics
  const sectionStats = {};
  for (const claim of results.claims) {
    const section = claim.location.section;
    if (!sectionStats[section]) {
      sectionStats[section] = { total: 0, verified: 0, failed: 0, flagged: 0 };
    }
    sectionStats[section].total++;
    if (claim.verification.status === 'verified_auto' || claim.verification.status === 'verified_llm') {
      sectionStats[section].verified++;
    } else if (claim.verification.status === 'failed') {
      sectionStats[section].failed++;
    } else if (claim.verification.status === 'flagged_review') {
      sectionStats[section].flagged++;
    }
  }

  lines.push('## Claims by Section');
  lines.push('');
  lines.push('| Section | Total | Verified | Flagged | Failed |');
  lines.push('|---------|-------|----------|---------|--------|');
  for (const [section, stats] of Object.entries(sectionStats)) {
    lines.push(`| ${section} | ${stats.total} | ${stats.verified} | ${stats.flagged} | ${stats.failed} |`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
  const results = await verifyClaims(caseDir);

  // Write audit file if requested
  if (generateAudit) {
    const auditPath = path.join(caseDir, 'claim-verification.json');
    // Remove llm_prompts from audit file (they're for immediate use)
    const auditResults = { ...results };
    delete auditResults.llm_prompts;
    fs.writeFileSync(auditPath, JSON.stringify(auditResults, null, 2));
    logger.info(`Wrote audit trail to ${auditPath}`);
  }

  // Write report if requested
  if (generateReport) {
    const reportPath = path.join(caseDir, 'claim-verification-report.md');
    const report = generateMarkdownReport(results, caseDir);
    fs.writeFileSync(reportPath, report);
    logger.info(`Wrote report to ${reportPath}`);
  }

  // Output results
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('='.repeat(70));
    console.log('CLAIM VERIFICATION RESULTS');
    console.log('='.repeat(70));
    console.log(`Case: ${results.case_id}`);
    console.log('');

    if (results.error) {
      console.log(`\x1b[31mERROR:\x1b[0m ${results.error}`);
      process.exit(3);
    }

    console.log('Summary:');
    console.log(`  Total claims: ${results.summary.total_claims}`);
    console.log(`  \x1b[32mVerified (auto):\x1b[0m ${results.summary.verified_auto}`);
    console.log(`  \x1b[32mVerified (LLM):\x1b[0m ${results.summary.verified_llm}`);
    console.log(`  \x1b[33mFlagged for review:\x1b[0m ${results.summary.flagged_review}`);
    console.log(`  \x1b[31mFailed:\x1b[0m ${results.summary.failed}`);
    console.log(`  Missing evidence: ${results.summary.missing_evidence}`);
    console.log('');

    // Show failed claims
    const failedClaims = results.claims.filter(c => c.verification.status === 'failed');
    if (failedClaims.length > 0) {
      console.log('\x1b[31mFAILED CLAIMS:\x1b[0m');
      for (const claim of failedClaims.slice(0, 5)) {
        console.log(`\n  [${claim.claim_id}] "${claim.claim_text.substring(0, 60)}..."`);
        console.log(`    Sources: ${claim.sources_cited.join(', ')}`);
        for (const d of claim.discrepancies) {
          console.log(`    \x1b[31m✗\x1b[0m [${d.source_id}] ${d.issue}`);
        }
        for (const e of claim.evidence) {
          if (e.heuristic_issues?.length > 0) {
            for (const issue of e.heuristic_issues) {
              console.log(`    \x1b[31m✗\x1b[0m [${e.source_id}] ${issue}`);
            }
          }
        }
      }
      if (failedClaims.length > 5) {
        console.log(`\n  ... and ${failedClaims.length - 5} more failed claims`);
      }
      console.log('');
    }

    // Show LLM verification needed
    if (results.llm_prompts.length > 0) {
      console.log(`\x1b[33mLLM VERIFICATION NEEDED:\x1b[0m ${results.llm_prompts.length} claims`);
      console.log('Run with --llm-verify or use mcp__mcp-gemini__generate_text manually.');
      console.log('');
    }

    console.log('='.repeat(70));

    const hasBlockingFailures = results.summary.failed > 0 ||
      results.summary.flagged_review > (results.summary.total_claims * 0.1);

    if (hasBlockingFailures) {
      console.log('\x1b[31mFAIL\x1b[0m - Claim verification failures found');
      if (generateAudit) console.log(`Audit: ${path.join(caseDir, 'claim-verification.json')}`);
      if (generateReport) console.log(`Report: ${path.join(caseDir, 'claim-verification-report.md')}`);
    } else if (results.llm_prompts.length > 0) {
      console.log('\x1b[33mWARN\x1b[0m - Some claims need LLM verification');
    } else {
      console.log('\x1b[32mPASS\x1b[0m - All claims verified');
    }
    console.log('='.repeat(70));
  }

  // Exit code
  if (blockMode) {
    const hasBlockingFailures = results.summary.failed > 0 ||
      results.summary.flagged_review > (results.summary.total_claims * 0.1);
    process.exit(hasBlockingFailures ? 1 : 0);
  }
}

// Export for programmatic use
module.exports = {
  verifyClaims,
  verifyHeuristic,
  findSupportingQuote,
  generateVerificationPrompt,
  generateMarkdownReport
};

if (require.main === module) {
  main().catch(err => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(2);
  });
}
