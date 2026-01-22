/**
 * verify-article.js - Verify Article Claims Against Registry
 *
 * The main verification entry point. Extracts claims from an article,
 * matches them against the claim registry using LLM semantic matching,
 * and reports results.
 *
 * Architecture:
 * 1. prepareVerification() extracts claims and generates LLM prompts
 * 2. Caller makes LLM calls (Gemini 3 Pro recommended)
 * 3. processVerificationResponses() updates results with LLM responses
 * 4. generateReport() produces human-readable output
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadRegistry } = require('./registry');
const {
  prepareMatching,
  processLLMResponse,
  getMatchSummary
} = require('./match');

/**
 * Prepare verification for an article
 *
 * Returns match data with LLM prompts. The caller should:
 * 1. Take items with status='PENDING' and prompt!=null
 * 2. Send each prompt to an LLM (Gemini 3 Pro recommended)
 * 3. Call processVerificationResponses() with the LLM responses
 *
 * @param {string} caseDir - Case directory
 * @param {object} options - Options
 * @param {string} options.articlePath - Path to article (default: articles/full.md)
 * @returns {object} - {matchData, prompts, stats, error?}
 */
function prepareVerification(caseDir, options = {}) {
  const articlePath = options.articlePath || path.join(caseDir, 'articles', 'full.md');

  // Check article exists
  if (!fs.existsSync(articlePath)) {
    return {
      error: 'ARTICLE_NOT_FOUND',
      message: `Article not found: ${articlePath}`
    };
  }

  // Read article
  const articleText = fs.readFileSync(articlePath, 'utf-8');

  // Prepare matching (extracts claims, generates prompts)
  const { articleClaims, matchData, registry, stats } = prepareMatching(caseDir, articleText);

  // Extract just the prompts for LLM calls
  const prompts = matchData
    .filter(m => m.prompt)
    .map((m, idx) => ({
      index: idx,
      prompt: m.prompt,
      articleClaim: m.articleClaim.text,
      line: m.articleClaim.line
    }));

  return {
    articlePath,
    preparedAt: new Date().toISOString(),
    matchData,
    prompts,
    stats,
    registry
  };
}

/**
 * Process LLM responses and update verification results
 *
 * @param {object} prepared - Output from prepareVerification()
 * @param {array} llmResponses - Array of {index, response} where response is the LLM output
 * @returns {object} - Final verification results
 */
function processVerificationResponses(prepared, llmResponses) {
  const { matchData, articlePath } = prepared;

  // Create a map of index -> response for quick lookup
  const responseMap = new Map(
    llmResponses.map(r => [r.index, r.response])
  );

  // Process each pending item
  const updatedMatchData = matchData.map((item, idx) => {
    if (item.status === 'PENDING' && responseMap.has(idx)) {
      return processLLMResponse(item, responseMap.get(idx));
    }
    return item;
  });

  // Calculate summary
  const summary = getMatchSummary(updatedMatchData);

  // Categorize results
  const verified = updatedMatchData.filter(r => r.status === 'VERIFIED');
  const unverified = updatedMatchData.filter(r => r.status === 'UNVERIFIED');
  const mismatched = updatedMatchData.filter(r => r.status === 'MISMATCH');
  const pending = updatedMatchData.filter(r => r.status === 'PENDING');

  // Determine overall status
  let status = 'VERIFIED';
  if (pending.length > 0) status = 'INCOMPLETE';
  if (unverified.length > 0) status = 'UNVERIFIED_CLAIMS';
  if (mismatched.length > 0) status = 'MISMATCHED_CLAIMS';
  if (unverified.length > 0 && mismatched.length > 0) status = 'MULTIPLE_ISSUES';

  return {
    status,
    articlePath,
    verifiedAt: new Date().toISOString(),
    summary,
    verified,
    unverified,
    mismatched,
    pending,
    allResults: updatedMatchData
  };
}

/**
 * Simple one-shot verification (for direct matches only)
 *
 * This returns immediate results for claims with direct CL### references.
 * Claims requiring LLM verification will have status='PENDING'.
 *
 * @param {string} caseDir - Case directory
 * @param {object} options - Options
 * @returns {object} - Partial verification results
 */
function verifyArticle(caseDir, options = {}) {
  const prepared = prepareVerification(caseDir, options);

  if (prepared.error) {
    return prepared;
  }

  // Return partial results (direct matches resolved, LLM matches pending)
  const summary = getMatchSummary(prepared.matchData);

  // Categorize current state
  const verified = prepared.matchData.filter(r => r.status === 'VERIFIED');
  const unverified = prepared.matchData.filter(r => r.status === 'UNVERIFIED');
  const pending = prepared.matchData.filter(r => r.status === 'PENDING');

  return {
    status: pending.length > 0 ? 'PENDING_LLM' : (unverified.length > 0 ? 'UNVERIFIED_CLAIMS' : 'VERIFIED'),
    articlePath: prepared.articlePath,
    verifiedAt: new Date().toISOString(),
    summary,
    verified,
    unverified,
    pending,
    prompts: prepared.prompts,
    allResults: prepared.matchData
  };
}

/**
 * Generate fix suggestions for unverified claims
 *
 * @param {array} unverifiedClaims - Claims that weren't found in registry
 * @param {string} caseDir - Case directory
 * @returns {array} - Array of {claim, suggestions}
 */
function generateFixSuggestions(unverifiedClaims, caseDir) {
  const registry = loadRegistry(caseDir);
  const suggestions = [];

  for (const result of unverifiedClaims) {
    const claim = result.articleClaim;
    const suggestion = {
      claim,
      options: []
    };

    // Option 1: Check if there's a similar claim in registry
    const similarClaims = registry.claims
      .map(regClaim => {
        const score = fuzzyScore(claim.normalized, regClaim.normalized);
        return { regClaim, score };
      })
      .filter(r => r.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (similarClaims.length > 0) {
      suggestion.options.push({
        action: 'REWORD',
        description: 'Similar claims exist in registry - consider rewording',
        candidates: similarClaims.map(s => ({
          id: s.regClaim.id,
          text: s.regClaim.text,
          similarity: Math.round(s.score * 100) + '%'
        }))
      });
    }

    // Option 2: Find a new source
    suggestion.options.push({
      action: 'FIND_SOURCE',
      description: 'Search for a source that supports this claim',
      searchQuery: generateSearchQuery(claim)
    });

    // Option 3: Add caveat or remove
    suggestion.options.push({
      action: 'CAVEAT_OR_REMOVE',
      description: 'Add caveat (e.g., "reportedly", "according to...") or remove the claim'
    });

    suggestions.push(suggestion);
  }

  return suggestions;
}

/**
 * Simple fuzzy scoring (Jaccard on word sets)
 */
function fuzzyScore(text1, text2) {
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return intersection / union;
}

/**
 * Generate search query from claim
 */
function generateSearchQuery(claim) {
  const text = claim.text;

  // Get key words (longer words, likely meaningful)
  const words = text.split(/\s+/)
    .filter(w => w.length > 4)
    .slice(0, 5)
    .join(' ');

  return words.trim();
}

/**
 * Prepare source search for an unverified claim
 *
 * @param {object} claim - Unverified article claim
 * @returns {object} - Search parameters and guidance
 */
function prepareSourceSearch(claim) {
  const searchQuery = generateSearchQuery(claim);

  return {
    claim: claim.text,
    searchQuery,
    searchGuidance: `Search for sources containing: "${searchQuery}"`,
    verificationGuidance: `After capturing a source, extract claims and check if any match: "${claim.text}"`,
    mcp_search_prompt: `Find authoritative sources that contain information about: ${searchQuery}. Look for official reports, news articles, or academic sources that specifically mention these facts.`
  };
}

/**
 * Verify and generate fix suggestions
 *
 * @param {string} caseDir - Case directory
 * @param {object} options - Options
 * @returns {object} - Verification results with fix guidance
 */
function verifyAndFix(caseDir, options = {}) {
  const verification = verifyArticle(caseDir, options);

  if (verification.error) {
    return verification;
  }

  // Generate fix suggestions for unverified
  if (verification.unverified && verification.unverified.length > 0) {
    verification.fixSuggestions = generateFixSuggestions(
      verification.unverified,
      caseDir
    );

    verification.searchPrompts = verification.unverified.map(u =>
      prepareSourceSearch(u.articleClaim)
    );
  }

  return verification;
}

/**
 * Generate human-readable report
 */
function generateReport(results) {
  const lines = [];

  lines.push('='.repeat(60));
  lines.push('ARTICLE VERIFICATION RESULTS');
  lines.push('='.repeat(60));

  if (results.error) {
    lines.push(`\nERROR: ${results.error}`);
    lines.push(results.message);
    return lines.join('\n');
  }

  lines.push(`\nStatus: ${results.status}`);
  lines.push(`Article: ${results.articlePath}`);
  lines.push(`Verified at: ${results.verifiedAt}`);

  lines.push('\nSummary:');
  lines.push(`  Total claims: ${results.summary.total}`);
  lines.push(`  Verified: ${results.summary.verified}`);
  lines.push(`  Unverified: ${results.summary.unverified}`);
  lines.push(`  Mismatch: ${results.summary.mismatch || 0}`);
  lines.push(`  Pending LLM: ${results.summary.pending || 0}`);

  if (results.pending && results.pending.length > 0) {
    lines.push('\n' + '-'.repeat(60));
    lines.push('PENDING LLM VERIFICATION:');
    lines.push('-'.repeat(60));
    lines.push(`\n${results.pending.length} claims require LLM semantic matching.`);
    lines.push('Run with LLM responses to complete verification.');
  }

  if (results.unverified && results.unverified.length > 0) {
    lines.push('\n' + '-'.repeat(60));
    lines.push('UNVERIFIED CLAIMS:');
    lines.push('-'.repeat(60));

    for (const u of results.unverified) {
      const text = u.articleClaim.text.substring(0, 80);
      lines.push(`\n  Line ${u.articleClaim.line}: "${text}${text.length >= 80 ? '...' : ''}"`);
      lines.push(`    Sources cited: ${u.articleClaim.sourceIds.join(', ') || 'none'}`);
      lines.push(`    Reason: ${u.reason || 'No matching claim in registry'}`);
    }
  }

  if (results.mismatched && results.mismatched.length > 0) {
    lines.push('\n' + '-'.repeat(60));
    lines.push('MISMATCHED CLAIMS:');
    lines.push('-'.repeat(60));

    for (const m of results.mismatched) {
      const text = m.articleClaim.text.substring(0, 80);
      lines.push(`\n  Line ${m.articleClaim.line}: "${text}${text.length >= 80 ? '...' : ''}"`);
      lines.push(`    Reason: ${m.reason || 'Claim contradicts or misrepresents source'}`);
    }
  }

  lines.push('\n' + '='.repeat(60));

  return lines.join('\n');
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage:');
    console.log('  node verify-article.js <case-dir> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --article <path>     Path to article (default: articles/full.md)');
    console.log('  --json               Output JSON');
    console.log('  --fix                Include fix suggestions');
    console.log('  --prompts-only       Output only LLM prompts (for batch processing)');
    console.log('  --responses <file>   JSON file with LLM responses to process');
    process.exit(1);
  }

  const caseDir = args[0];

  if (!fs.existsSync(caseDir)) {
    console.error(`Case directory not found: ${caseDir}`);
    process.exit(1);
  }

  // Parse options
  const options = {
    articlePath: null,
    json: false,
    fix: false,
    promptsOnly: false,
    responsesFile: null
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--article' && args[i + 1]) {
      options.articlePath = args[++i];
    } else if (args[i] === '--json') {
      options.json = true;
    } else if (args[i] === '--fix') {
      options.fix = true;
    } else if (args[i] === '--prompts-only') {
      options.promptsOnly = true;
    } else if (args[i] === '--responses' && args[i + 1]) {
      options.responsesFile = args[++i];
    }
  }

  // Mode 1: Just output prompts for LLM processing
  if (options.promptsOnly) {
    const prepared = prepareVerification(caseDir, options);
    if (prepared.error) {
      console.error(JSON.stringify(prepared, null, 2));
      process.exit(1);
    }
    console.log(JSON.stringify({
      prompts: prepared.prompts,
      stats: prepared.stats
    }, null, 2));
    return;
  }

  // Mode 2: Process LLM responses
  if (options.responsesFile) {
    const prepared = prepareVerification(caseDir, options);
    if (prepared.error) {
      console.error(JSON.stringify(prepared, null, 2));
      process.exit(1);
    }

    const responses = JSON.parse(fs.readFileSync(options.responsesFile, 'utf-8'));
    const result = processVerificationResponses(prepared, responses);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(generateReport(result));
    }

    process.exit(result.status === 'VERIFIED' ? 0 : 1);
    return;
  }

  // Mode 3: Standard verification (returns partial results, pending items need LLM)
  const result = options.fix
    ? verifyAndFix(caseDir, options)
    : verifyArticle(caseDir, options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(generateReport(result));

  // Exit code based on status
  if (result.status === 'VERIFIED') {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  prepareVerification,
  processVerificationResponses,
  verifyArticle,
  verifyAndFix,
  generateFixSuggestions,
  prepareSourceSearch,
  generateReport
};
