#!/usr/bin/env node
/**
 * find-alternative-source.js - Search for alternative sources for unverified claims
 *
 * Takes an unverified claim and searches for alternative sources that support it.
 * Uses OSINT tools to find credible sources.
 *
 * Usage:
 *   node find-alternative-source.js <case-dir> --claim "<claim text>" [options]
 *   node find-alternative-source.js <case-dir> --from-verification <verification-results.json>
 *
 * Options:
 *   --claim "<text>"           Single claim to search for
 *   --from-verification <file> Process all unverified claims from verification results
 *   --output <file>            Output search results to file
 *   --json                     Output as JSON
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Extract search queries from a claim
 *
 * Generates multiple search queries to maximize chances of finding supporting sources
 */
function generateSearchQueries(claimText, context = {}) {
  const queries = [];

  // Extract key facts from the claim
  const numbers = claimText.match(/\d+(?:,\d{3})*(?:\.\d+)?%?/g) || [];
  const quotedText = claimText.match(/"([^"]+)"/g) || [];
  const properNouns = claimText.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];

  // Query 1: Full claim (truncated)
  const truncated = claimText.length > 100 ? claimText.substring(0, 100) : claimText;
  queries.push({
    type: 'full_claim',
    query: truncated,
    priority: 'high'
  });

  // Query 2: Key numbers + context
  if (numbers.length > 0) {
    const numQuery = numbers.slice(0, 2).join(' ') + ' ' +
      properNouns.slice(0, 2).join(' ');
    queries.push({
      type: 'numbers_context',
      query: numQuery.trim(),
      priority: 'high'
    });
  }

  // Query 3: Quoted text (exact phrase search)
  for (const quote of quotedText.slice(0, 2)) {
    queries.push({
      type: 'exact_quote',
      query: quote,
      priority: 'high'
    });
  }

  // Query 4: Proper nouns combined
  if (properNouns.length >= 2) {
    queries.push({
      type: 'entities',
      query: properNouns.slice(0, 4).join(' '),
      priority: 'medium'
    });
  }

  // Query 5: Simplified claim (remove filler words)
  const simplified = claimText
    .replace(/\b(the|a|an|of|to|in|for|on|with|at|by|from|as|is|was|were|are|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|shall|can|need|dare|ought|used|according|reported|stated|said|noted|claimed)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);

  if (simplified.length > 20) {
    queries.push({
      type: 'simplified',
      query: simplified,
      priority: 'medium'
    });
  }

  return queries;
}

/**
 * Generate OSINT search prompts for a claim
 */
function generateOsintPrompts(claim, queries) {
  const prompts = [];

  // For news/web search
  prompts.push({
    tool: 'mcp__mcp-xai__web_search',
    params: {
      query: queries[0].query,
      max_results: 10
    },
    purpose: 'Find web sources supporting this claim'
  });

  // For news search
  prompts.push({
    tool: 'mcp__mcp-xai__news_search',
    params: {
      query: queries[0].query,
      max_results: 10
    },
    purpose: 'Find news articles supporting this claim'
  });

  // For exact quote search
  const quoteQuery = queries.find(q => q.type === 'exact_quote');
  if (quoteQuery) {
    prompts.push({
      tool: 'mcp__mcp-xai__web_search',
      params: {
        query: quoteQuery.query,
        max_results: 5
      },
      purpose: 'Find source of exact quote'
    });
  }

  return prompts;
}

/**
 * Analyze verification results and categorize unverified claims
 */
function analyzeUnverifiedClaims(verificationResults) {
  const unverified = verificationResults.results?.filter(r => r.status === 'UNVERIFIED') || [];

  const categorized = {
    missing_details: [],      // Source exists but missing specific facts
    wrong_phrasing: [],       // Different wording in source
    interpretive: [],         // Claim is editorial/interpretive
    source_issues: [],        // Source content problems
    needs_new_source: []      // Need to find alternative source
  };

  for (const item of unverified) {
    const reason = (item.reason || '').toLowerCase();

    if (reason.includes('does not contain') || reason.includes('does not mention') ||
        reason.includes('not mentioned') || reason.includes('missing')) {
      categorized.missing_details.push(item);
    } else if (reason.includes('phrase') || reason.includes('wording') ||
               reason.includes('different') || reason.includes('specific phrase')) {
      categorized.wrong_phrasing.push(item);
    } else if (reason.includes('interpretive') || reason.includes('synthesis') ||
               reason.includes('editorial') || reason.includes('conclusion')) {
      categorized.interpretive.push(item);
    } else if (reason.includes('error') || reason.includes('truncated') ||
               reason.includes('blocked') || reason.includes('template')) {
      categorized.source_issues.push(item);
    } else {
      categorized.needs_new_source.push(item);
    }
  }

  return categorized;
}

/**
 * Generate remediation plan for unverified claims
 */
function generateRemediationPlan(categorized) {
  const plan = {
    search_for_alternatives: [],
    fix_citations: [],
    add_caveats: [],
    remove_claims: []
  };

  // Missing details & source issues -> search for new sources
  for (const item of [...categorized.missing_details, ...categorized.source_issues, ...categorized.needs_new_source]) {
    const queries = generateSearchQueries(item.claim.text);
    plan.search_for_alternatives.push({
      claim: item.claim,
      sourceId: item.sourceId,
      reason: item.reason,
      searchQueries: queries,
      osintPrompts: generateOsintPrompts(item.claim, queries)
    });
  }

  // Wrong phrasing -> might just need quote fix or caveat
  for (const item of categorized.wrong_phrasing) {
    plan.fix_citations.push({
      claim: item.claim,
      sourceId: item.sourceId,
      reason: item.reason,
      suggestion: 'Update claim wording to match source, or search for source with exact phrasing'
    });
  }

  // Interpretive claims -> add caveats or remove
  for (const item of categorized.interpretive) {
    plan.add_caveats.push({
      claim: item.claim,
      sourceId: item.sourceId,
      reason: item.reason,
      suggestion: 'Add caveat language ("analysis suggests", "observers note") or remove interpretive language'
    });
  }

  return plan;
}

/**
 * Output remediation plan for use with OSINT tools
 */
function outputRemediationPlan(plan, options = {}) {
  const output = {
    generated_at: new Date().toISOString(),
    summary: {
      search_for_alternatives: plan.search_for_alternatives.length,
      fix_citations: plan.fix_citations.length,
      add_caveats: plan.add_caveats.length,
      total_actions: plan.search_for_alternatives.length + plan.fix_citations.length + plan.add_caveats.length
    },
    actions: plan
  };

  return output;
}

/**
 * CLI entry point
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node find-alternative-source.js <case-dir> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --from-verification <file>   Process unverified claims from verification results');
    console.log('  --output <file>              Output remediation plan to file');
    console.log('  --json                       Output as JSON');
    console.log('');
    console.log('Example:');
    console.log('  node find-alternative-source.js cases/my-case --from-verification verification-results.json');
    process.exit(args.length < 1 ? 1 : 0);
  }

  const caseDir = args[0];

  if (!fs.existsSync(caseDir)) {
    console.error(`Case directory not found: ${caseDir}`);
    process.exit(1);
  }

  // Parse options
  let verificationFile = null;
  let outputFile = null;
  let jsonOutput = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--from-verification' && args[i + 1]) {
      verificationFile = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[++i];
    } else if (args[i] === '--json') {
      jsonOutput = true;
    }
  }

  if (!verificationFile) {
    console.error('Error: --from-verification <file> is required');
    process.exit(1);
  }

  // Load verification results
  const verificationPath = path.isAbsolute(verificationFile)
    ? verificationFile
    : path.join(caseDir, verificationFile);

  if (!fs.existsSync(verificationPath)) {
    console.error(`Verification file not found: ${verificationPath}`);
    process.exit(1);
  }

  const verificationResults = JSON.parse(fs.readFileSync(verificationPath, 'utf-8'));

  // Analyze and categorize
  const categorized = analyzeUnverifiedClaims(verificationResults);
  const plan = generateRemediationPlan(categorized);
  const output = outputRemediationPlan(plan);

  // Output
  if (outputFile) {
    const outputPath = path.isAbsolute(outputFile) ? outputFile : path.join(caseDir, outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`Remediation plan saved to: ${outputPath}`);
  }

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else if (!outputFile) {
    // Human-readable output
    console.log('='.repeat(60));
    console.log('CLAIM REMEDIATION PLAN');
    console.log('='.repeat(60));
    console.log(`\nGenerated: ${output.generated_at}`);
    console.log('\n--- SUMMARY ---');
    console.log(`Claims needing alternative sources: ${output.summary.search_for_alternatives}`);
    console.log(`Claims needing citation fixes: ${output.summary.fix_citations}`);
    console.log(`Claims needing caveats: ${output.summary.add_caveats}`);
    console.log(`Total actions needed: ${output.summary.total_actions}`);

    if (plan.search_for_alternatives.length > 0) {
      console.log('\n--- SEARCH FOR ALTERNATIVE SOURCES ---');
      for (const item of plan.search_for_alternatives) {
        console.log(`\n  Line ${item.claim.line}: "${item.claim.text.substring(0, 60)}..."`);
        console.log(`    Current source: ${item.sourceId}`);
        console.log(`    Issue: ${item.reason.substring(0, 80)}...`);
        console.log(`    Search queries:`);
        for (const q of item.searchQueries.slice(0, 2)) {
          console.log(`      - [${q.type}] ${q.query.substring(0, 50)}`);
        }
      }
    }

    if (plan.fix_citations.length > 0) {
      console.log('\n--- FIX CITATIONS ---');
      for (const item of plan.fix_citations) {
        console.log(`\n  Line ${item.claim.line}: "${item.claim.text.substring(0, 60)}..."`);
        console.log(`    Suggestion: ${item.suggestion}`);
      }
    }

    if (plan.add_caveats.length > 0) {
      console.log('\n--- ADD CAVEATS ---');
      for (const item of plan.add_caveats) {
        console.log(`\n  Line ${item.claim.line}: "${item.claim.text.substring(0, 60)}..."`);
        console.log(`    Suggestion: ${item.suggestion}`);
      }
    }

    console.log('\n' + '='.repeat(60));
  }
}

module.exports = {
  generateSearchQueries,
  analyzeUnverifiedClaims,
  generateRemediationPlan
};

if (require.main === module) {
  main();
}
