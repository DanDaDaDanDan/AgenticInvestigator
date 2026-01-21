/**
 * verify-article.js - Verify Article Claims Against Registry
 *
 * The main verification entry point. Extracts claims from an article,
 * matches them against the claim registry, and reports results.
 *
 * Unverified claims can optionally trigger source search and capture.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadRegistry } = require('./registry');
const { matchAllClaims, getMatchSummary, extractArticleClaims } = require('./match');
const { prepareSourceForExtraction, registerExtractedClaims } = require('./capture-integration');

/**
 * Verify all claims in an article
 *
 * @param {string} caseDir - Case directory
 * @param {object} options - Options
 * @param {string} options.articlePath - Path to article (default: articles/full.md)
 * @param {boolean} options.verbose - Verbose output
 * @returns {object} - Verification results
 */
function verifyArticle(caseDir, options = {}) {
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

  // Match all claims
  const results = matchAllClaims(caseDir, articleText);
  const summary = getMatchSummary(results);

  // Categorize results
  const verified = results.filter(r => r.status === 'VERIFIED');
  const unverified = results.filter(r => r.status === 'UNVERIFIED');
  const mismatched = results.filter(r => r.status === 'SOURCE_MISMATCH');

  // Determine overall status
  let status = 'VERIFIED';
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
    allResults: results
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

    // Option 1: Check if there's a similar claim in registry (maybe just needs rewording)
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
  // Extract key terms (nouns, numbers, proper nouns)
  const text = claim.text;

  // Get numbers
  const numbers = claim.numbers.map(n => `${n.value} ${n.unit || ''}`).join(' ');

  // Get key words (longer words, likely meaningful)
  const words = text.split(/\s+/)
    .filter(w => w.length > 4)
    .slice(0, 5)
    .join(' ');

  return `${numbers} ${words}`.trim();
}

/**
 * Handle unverified claim by searching for a source
 *
 * This function prepares search parameters. The caller should:
 * 1. Use these parameters to search (MCP tools)
 * 2. Capture promising sources
 * 3. Extract claims from new sources
 * 4. Re-run verification
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
    mcp_search_prompt: `Find authoritative sources that contain information about: ${searchQuery}. Look for official reports, news articles, or academic sources that specifically mention these figures or facts.`
  };
}

/**
 * Verify and attempt to fix unverified claims
 *
 * This is an orchestration function that:
 * 1. Verifies the article
 * 2. For each unverified claim, provides fix guidance
 * 3. Returns actionable results
 *
 * @param {string} caseDir - Case directory
 * @param {object} options - Options
 * @returns {object} - Verification results with fix guidance
 */
function verifyAndFix(caseDir, options = {}) {
  // Step 1: Verify article
  const verification = verifyArticle(caseDir, options);

  if (verification.error) {
    return verification;
  }

  // Step 2: Generate fix suggestions for unverified
  if (verification.unverified.length > 0) {
    verification.fixSuggestions = generateFixSuggestions(
      verification.unverified,
      caseDir
    );

    verification.searchPrompts = verification.unverified.map(u =>
      prepareSourceSearch(u.articleClaim)
    );
  }

  // Step 3: Generate fix suggestions for mismatched
  if (verification.mismatched.length > 0) {
    verification.mismatchFixes = verification.mismatched.map(m => ({
      claim: m.articleClaim,
      registryClaim: m.registryClaim,
      action: 'UPDATE_CITATION',
      description: `Article cites ${m.articleClaim.sourceIds.join(', ')} but claim is from ${m.registryClaim.sourceId}`,
      fix: `Change citation to [${m.registryClaim.sourceId}] or find alternate source`
    }));
  }

  return verification;
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
    console.log('  --article <path>  Path to article (default: articles/full.md)');
    console.log('  --json            Output JSON');
    console.log('  --verbose         Verbose output');
    console.log('  --fix             Include fix suggestions');
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
    verbose: false,
    fix: false
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--article' && args[i + 1]) {
      options.articlePath = args[++i];
    } else if (args[i] === '--json') {
      options.json = true;
    } else if (args[i] === '--verbose') {
      options.verbose = true;
    } else if (args[i] === '--fix') {
      options.fix = true;
    }
  }

  // Run verification
  const result = options.fix
    ? verifyAndFix(caseDir, options)
    : verifyArticle(caseDir, options);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Human-readable output
  console.log('\n' + '='.repeat(60));
  console.log('ARTICLE VERIFICATION RESULTS');
  console.log('='.repeat(60));

  if (result.error) {
    console.log(`\nERROR: ${result.error}`);
    console.log(result.message);
    process.exit(1);
  }

  console.log(`\nStatus: ${result.status}`);
  console.log(`Article: ${result.articlePath}`);
  console.log(`Verified at: ${result.verifiedAt}`);

  console.log('\nSummary:');
  console.log(`  Total claims: ${result.summary.total}`);
  console.log(`  Verified: ${result.summary.verified}`);
  console.log(`  Unverified: ${result.summary.unverified}`);
  console.log(`  Source mismatch: ${result.summary.sourceMismatch}`);

  if (result.summary.unverified > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('UNVERIFIED CLAIMS:');
    console.log('-'.repeat(60));

    for (const u of result.unverified) {
      console.log(`\n  Line ${u.articleClaim.line}: "${u.articleClaim.text.substring(0, 80)}..."`);
      console.log(`    Sources cited: ${u.articleClaim.sourceIds.join(', ') || 'none'}`);

      if (options.fix && result.fixSuggestions) {
        const suggestion = result.fixSuggestions.find(
          s => s.claim.line === u.articleClaim.line
        );
        if (suggestion) {
          console.log('    Fix options:');
          for (const opt of suggestion.options) {
            console.log(`      - ${opt.action}: ${opt.description}`);
          }
        }
      }
    }
  }

  if (result.summary.sourceMismatch > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log('SOURCE MISMATCHES:');
    console.log('-'.repeat(60));

    for (const m of result.mismatched) {
      console.log(`\n  Line ${m.articleClaim.line}: "${m.articleClaim.text.substring(0, 80)}..."`);
      console.log(`    Cites: ${m.articleClaim.sourceIds.join(', ')}`);
      console.log(`    But matched claim is from: ${m.registryClaim.sourceId}`);
    }
  }

  console.log('\n' + '='.repeat(60));

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
  verifyArticle,
  verifyAndFix,
  generateFixSuggestions,
  prepareSourceSearch
};
