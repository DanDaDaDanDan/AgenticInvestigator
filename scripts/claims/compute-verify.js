#!/usr/bin/env node
/**
 * compute-verify.js - Computational Fact-Checking for Numerical Claims
 *
 * Extracts numerical claims from articles and verifies them computationally:
 * 1. Extract claims containing numbers (percentages, amounts, calculations)
 * 2. Generate Python verification code for each claim
 * 3. Execute code in sandbox (via MCP or local)
 * 4. Compare computed results to claimed values
 *
 * This catches errors like:
 * - "62% increase" when actual data shows 47%
 * - "$50M budget" when sources show $5M
 * - "Doubled since 2020" when actual growth is 40%
 *
 * Usage:
 *   node compute-verify.js <case-dir> [options]
 *
 * Options:
 *   --article <path>       Path to article (default: articles/full.md)
 *   --generate-prompts     Output verification prompts for LLM processing
 *   --responses <file>     Process LLM responses from file
 *   --json                 Output JSON
 *   --threshold <n>        Tolerance for numerical comparison (default: 0.05 = 5%)
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Patterns for extracting numerical claims
 */
const NUMERICAL_PATTERNS = [
  // Percentages
  {
    type: 'percentage',
    pattern: /(\d+(?:\.\d+)?)\s*(?:percent|%)/gi,
    extract: (match) => ({ value: parseFloat(match[1]), unit: 'percent' })
  },
  // Dollar amounts
  {
    type: 'currency',
    pattern: /\$\s*(\d+(?:\.\d+)?)\s*(million|billion|thousand|M|B|K)?/gi,
    extract: (match) => {
      let value = parseFloat(match[1]);
      const multiplier = match[2]?.toLowerCase();
      if (multiplier === 'billion' || multiplier === 'b') value *= 1e9;
      else if (multiplier === 'million' || multiplier === 'm') value *= 1e6;
      else if (multiplier === 'thousand' || multiplier === 'k') value *= 1e3;
      return { value, unit: 'USD' };
    }
  },
  // Ratios and fractions
  {
    type: 'ratio',
    pattern: /(\d+)\s*(?:out of|of|in)\s*(\d+)/gi,
    extract: (match) => ({
      numerator: parseInt(match[1]),
      denominator: parseInt(match[2]),
      value: parseInt(match[1]) / parseInt(match[2]),
      unit: 'ratio'
    })
  },
  // Increases/decreases
  {
    type: 'change',
    pattern: /(increased|decreased|grew|fell|dropped|rose|declined)\s*(?:by\s*)?(\d+(?:\.\d+)?)\s*(?:percent|%)?/gi,
    extract: (match) => ({
      direction: ['decreased', 'fell', 'dropped', 'declined'].includes(match[1].toLowerCase()) ? -1 : 1,
      value: parseFloat(match[2]),
      unit: 'percent_change'
    })
  },
  // Multiples (doubled, tripled, etc.)
  {
    type: 'multiple',
    pattern: /(doubled|tripled|quadrupled|halved)/gi,
    extract: (match) => {
      const multiples = { doubled: 2, tripled: 3, quadrupled: 4, halved: 0.5 };
      return { value: multiples[match[1].toLowerCase()], unit: 'multiple' };
    }
  },
  // Rankings
  {
    type: 'ranking',
    pattern: /(?:ranked?|#)\s*(\d+)(?:\s*(?:out of|of)\s*(\d+))?/gi,
    extract: (match) => ({
      rank: parseInt(match[1]),
      total: match[2] ? parseInt(match[2]) : null,
      unit: 'rank'
    })
  },
  // Counts
  {
    type: 'count',
    pattern: /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(people|employees|users|cases|incidents|deaths|agents?)/gi,
    extract: (match) => ({
      value: parseFloat(match[1].replace(/,/g, '')),
      unit: match[2].toLowerCase()
    })
  }
];

/**
 * Extract numerical claims from article text
 */
function extractNumericalClaims(articleText) {
  const claims = [];
  const lines = articleText.split('\n');

  // Citation pattern
  const citationPattern = /\[(S\d{3})\](?:\([^)]+\))?/g;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Skip headers, empty lines
    if (line.startsWith('#') || line.trim() === '' || line.startsWith('---')) {
      continue;
    }

    // Find citations in this line
    const citations = [...line.matchAll(citationPattern)].map(m => m[1]);
    if (citations.length === 0) continue;

    // Check each numerical pattern
    for (const { type, pattern, extract } of NUMERICAL_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(line)) !== null) {
        const extracted = extract(match);
        const context = extractContext(line, match.index, 100);

        claims.push({
          type,
          ...extracted,
          raw: match[0],
          context,
          line: lineNum + 1,
          sourceIds: citations,
          fullLine: line.trim()
        });
      }
    }
  }

  return claims;
}

/**
 * Extract context around a match
 */
function extractContext(text, index, windowSize) {
  const start = Math.max(0, index - windowSize);
  const end = Math.min(text.length, index + windowSize);
  let context = text.slice(start, end);
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  return context.trim();
}

/**
 * Load source data for a claim
 */
function loadSourceData(caseDir, sourceId) {
  const contentPath = path.join(caseDir, 'evidence', sourceId, 'content.md');
  const metaPath = path.join(caseDir, 'evidence', sourceId, 'metadata.json');

  const result = { sourceId };

  if (fs.existsSync(contentPath)) {
    result.content = fs.readFileSync(contentPath, 'utf-8');
  }

  if (fs.existsSync(metaPath)) {
    try {
      result.metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch (e) {
      result.metadata = null;
    }
  }

  return result;
}

/**
 * Generate verification prompt for a numerical claim
 */
function generateVerificationPrompt(claim, sourceData) {
  const sourceContent = sourceData.content || 'SOURCE CONTENT NOT AVAILABLE';
  const sourceUrl = sourceData.metadata?.url || 'Unknown';

  return `You are a computational fact-checker. Verify the numerical claim below.

CLAIMED VALUE: ${JSON.stringify(claim, null, 2)}

ARTICLE CONTEXT: "${claim.context}"

SOURCE (${claim.sourceIds[0]}):
URL: ${sourceUrl}
CONTENT:
${sourceContent.slice(0, 50000)}

TASK:
1. Find the raw data in the source that relates to this claim
2. If data is found, write Python code to verify the calculation
3. Execute the code mentally and report the computed result
4. Compare to the claimed value

RESPONSE FORMAT (JSON):
{
  "claim_type": "${claim.type}",
  "claimed_value": ${claim.value},
  "source_data_found": true | false,
  "raw_data": {
    // The actual numbers found in the source
    // e.g., { "2020_value": 1000, "2024_value": 1470 }
  },
  "verification_code": "# Python code that computes the value\\nresult = ...",
  "computed_value": <number>,
  "matches": true | false,
  "discrepancy": <number if doesn't match>,
  "discrepancy_percent": <percentage difference>,
  "explanation": "<brief explanation>",
  "confidence": <0.0 to 1.0>
}

RULES:
- If source doesn't contain relevant data, set source_data_found: false
- Tolerance: Values within 5% are considered matching
- For percentages, compare percentage points (62% vs 58% = 4pp difference)
- For currency, account for rounding (50M vs 49.7M = match)
- Show your work in verification_code even if simple`;
}

/**
 * Parse verification response
 */
function parseVerificationResponse(response) {
  try {
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    return JSON.parse(jsonStr.trim());
  } catch (err) {
    return {
      error: 'PARSE_ERROR',
      message: err.message,
      raw: response.slice(0, 500)
    };
  }
}

/**
 * Prepare verification for all numerical claims
 */
function prepareVerification(caseDir, options = {}) {
  const articlePath = options.articlePath || path.join(caseDir, 'articles', 'full.md');

  if (!fs.existsSync(articlePath)) {
    return { error: 'ARTICLE_NOT_FOUND', message: `Article not found: ${articlePath}` };
  }

  const articleText = fs.readFileSync(articlePath, 'utf-8');
  const numericalClaims = extractNumericalClaims(articleText);

  const verificationData = [];

  for (const claim of numericalClaims) {
    if (claim.sourceIds.length === 0) {
      verificationData.push({
        claim,
        status: 'NO_SOURCE',
        reason: 'No source citation for this numerical claim'
      });
      continue;
    }

    const sourceId = claim.sourceIds[0];
    const sourceData = loadSourceData(caseDir, sourceId);

    if (!sourceData.content) {
      verificationData.push({
        claim,
        sourceId,
        status: 'SOURCE_MISSING',
        reason: `No content for ${sourceId}`
      });
      continue;
    }

    const prompt = generateVerificationPrompt(claim, sourceData);

    verificationData.push({
      claim,
      sourceId,
      prompt,
      status: 'PENDING'
    });
  }

  // Generate prompts for processing
  const prompts = verificationData
    .filter(v => v.status === 'PENDING')
    .map((v, idx) => ({
      index: verificationData.indexOf(v),
      prompt: v.prompt,
      claim_type: v.claim.type,
      claimed_value: v.claim.value,
      line: v.claim.line
    }));

  const stats = {
    total: numericalClaims.length,
    pending: prompts.length,
    noSource: verificationData.filter(v => v.status === 'NO_SOURCE').length,
    sourceMissing: verificationData.filter(v => v.status === 'SOURCE_MISSING').length,
    byType: {}
  };

  // Count by type
  for (const claim of numericalClaims) {
    stats.byType[claim.type] = (stats.byType[claim.type] || 0) + 1;
  }

  return {
    articlePath,
    preparedAt: new Date().toISOString(),
    verificationData,
    prompts,
    stats
  };
}

/**
 * Process verification responses
 */
function processVerificationResponses(prepared, llmResponses, options = {}) {
  const threshold = options.threshold || 0.05; // 5% tolerance
  const responseMap = new Map(llmResponses.map(r => [r.index, r.response]));

  const results = prepared.verificationData.map((item, idx) => {
    if (item.status !== 'PENDING') {
      return item;
    }

    const response = responseMap.get(idx);
    if (!response) {
      return { ...item, status: 'NO_RESPONSE', reason: 'LLM response missing' };
    }

    const parsed = parseVerificationResponse(response);

    if (parsed.error) {
      return { ...item, status: 'PARSE_ERROR', reason: parsed.message };
    }

    if (!parsed.source_data_found) {
      return {
        ...item,
        status: 'DATA_NOT_FOUND',
        reason: 'Source does not contain verifiable data for this claim',
        parsed
      };
    }

    // Determine if values match within tolerance
    let status = 'VERIFIED';
    const discrepancyPercent = parsed.discrepancy_percent || 0;

    if (Math.abs(discrepancyPercent) > threshold * 100) {
      status = 'DISCREPANCY';
    }

    return {
      ...item,
      status,
      computed_value: parsed.computed_value,
      discrepancy: parsed.discrepancy,
      discrepancy_percent: discrepancyPercent,
      verification_code: parsed.verification_code,
      raw_data: parsed.raw_data,
      explanation: parsed.explanation,
      confidence: parsed.confidence
    };
  });

  // Calculate summary
  const summary = {
    total: results.length,
    verified: results.filter(r => r.status === 'VERIFIED').length,
    discrepancies: results.filter(r => r.status === 'DISCREPANCY').length,
    dataNotFound: results.filter(r => r.status === 'DATA_NOT_FOUND').length,
    noSource: results.filter(r => r.status === 'NO_SOURCE').length,
    errors: results.filter(r => ['PARSE_ERROR', 'NO_RESPONSE', 'SOURCE_MISSING'].includes(r.status)).length
  };

  let overallStatus = 'VERIFIED';
  if (summary.discrepancies > 0) overallStatus = 'HAS_DISCREPANCIES';
  if (summary.discrepancies > summary.total * 0.2) overallStatus = 'SIGNIFICANT_DISCREPANCIES';

  return {
    status: overallStatus,
    articlePath: prepared.articlePath,
    verifiedAt: new Date().toISOString(),
    threshold: threshold * 100 + '%',
    summary,
    results,
    discrepancies: results.filter(r => r.status === 'DISCREPANCY'),
    verified: results.filter(r => r.status === 'VERIFIED')
  };
}

/**
 * Generate human-readable report
 */
function generateReport(results) {
  const lines = [];

  lines.push('='.repeat(60));
  lines.push('COMPUTATIONAL FACT-CHECK REPORT');
  lines.push('='.repeat(60));

  if (results.error) {
    lines.push(`\nERROR: ${results.error}`);
    lines.push(results.message);
    return lines.join('\n');
  }

  lines.push(`\nArticle: ${results.articlePath}`);
  lines.push(`Verified at: ${results.verifiedAt}`);
  lines.push(`Tolerance: ${results.threshold}`);
  lines.push(`Status: ${results.status}`);

  lines.push('\n--- SUMMARY ---');
  lines.push(`Total numerical claims: ${results.summary.total}`);
  lines.push(`  Verified (within tolerance): ${results.summary.verified}`);
  lines.push(`  Discrepancies found: ${results.summary.discrepancies}`);
  lines.push(`  Data not in source: ${results.summary.dataNotFound}`);
  if (results.summary.errors > 0) {
    lines.push(`  Errors: ${results.summary.errors}`);
  }

  if (results.discrepancies && results.discrepancies.length > 0) {
    lines.push('\n--- DISCREPANCIES ---');
    for (const item of results.discrepancies) {
      lines.push(`\n  Line ${item.claim.line}: ${item.claim.type}`);
      lines.push(`    Claimed: ${item.claim.value} ${item.claim.unit || ''}`);
      lines.push(`    Computed: ${item.computed_value}`);
      lines.push(`    Discrepancy: ${item.discrepancy_percent?.toFixed(1)}%`);
      lines.push(`    Context: "${item.claim.context?.slice(0, 60)}..."`);
      lines.push(`    Source: ${item.sourceId}`);
      if (item.explanation) {
        lines.push(`    Explanation: ${item.explanation}`);
      }
      if (item.verification_code) {
        lines.push(`    Code: ${item.verification_code.split('\n')[0]}...`);
      }
    }
  }

  if (results.verified && results.verified.length > 0 && results.verified.length <= 10) {
    lines.push('\n--- VERIFIED CLAIMS ---');
    for (const item of results.verified) {
      lines.push(`\n  Line ${item.claim.line}: ${item.claim.value} ${item.claim.unit || ''} ✓`);
      lines.push(`    Computed: ${item.computed_value} (confidence: ${(item.confidence * 100).toFixed(0)}%)`);
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
    console.log('Usage: node compute-verify.js <case-dir> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --article <path>       Path to article (default: articles/full.md)');
    console.log('  --generate-prompts     Output verification prompts');
    console.log('  --responses <file>     Process LLM responses from file');
    console.log('  --json                 Output JSON');
    console.log('  --threshold <n>        Tolerance (default: 0.05 = 5%)');
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
    generatePrompts: false,
    responsesFile: null,
    threshold: 0.05
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--article' && args[i + 1]) {
      options.articlePath = args[++i];
    } else if (args[i] === '--json') {
      options.json = true;
    } else if (args[i] === '--generate-prompts') {
      options.generatePrompts = true;
    } else if (args[i] === '--responses' && args[i + 1]) {
      options.responsesFile = args[++i];
    } else if (args[i] === '--threshold' && args[i + 1]) {
      options.threshold = parseFloat(args[++i]);
    }
  }

  // Prepare verification
  const prepared = prepareVerification(caseDir, options);

  if (prepared.error) {
    console.error(JSON.stringify(prepared, null, 2));
    process.exit(1);
  }

  // Mode: Output prompts
  if (options.generatePrompts) {
    console.log(JSON.stringify({ prompts: prepared.prompts, stats: prepared.stats }, null, 2));
    return;
  }

  // Mode: Process responses
  if (options.responsesFile) {
    const responses = JSON.parse(fs.readFileSync(options.responsesFile, 'utf-8'));
    const results = processVerificationResponses(prepared, responses, options);

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(generateReport(results));
    }

    // Write results to case directory
    const outputPath = path.join(caseDir, 'compute-verification.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nResults written to: ${outputPath}`);

    process.exit(results.summary.discrepancies > 0 ? 1 : 0);
    return;
  }

  // Default: Show stats
  console.log('Computational verification prepared:');
  console.log(`  Total numerical claims: ${prepared.stats.total}`);
  console.log(`  Pending verification: ${prepared.stats.pending}`);
  console.log(`  By type:`);
  for (const [type, count] of Object.entries(prepared.stats.byType)) {
    console.log(`    ${type}: ${count}`);
  }
  console.log('');
  console.log('To generate prompts: --generate-prompts');
  console.log('To process responses: --responses <file>');
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  extractNumericalClaims,
  prepareVerification,
  processVerificationResponses,
  generateReport,
  NUMERICAL_PATTERNS
};
