#!/usr/bin/env node
/**
 * verify-article.js - Verify Article Claims Against Source Content
 *
 * Simple, direct verification flow:
 * 1. Extract claims from article (sentences with [S###] citations)
 * 2. For each claim, load the cited source content
 * 3. Ask LLM: "Does this source support this claim?"
 * 4. Report results
 *
 * No registry, no fuzzy matching - just direct LLM verification.
 *
 * Usage:
 *   node verify-article.js <case-dir> [options]
 *
 * Options:
 *   --article <path>     Path to article (default: articles/full.md)
 *   --prompts-only       Output LLM prompts (for batch processing)
 *   --responses <file>   Process LLM responses from file
 *   --json               Output JSON
 *   --batch-size <n>     Split into batches of size n (default: 30)
 *   --generate-batches   Generate batch files for parallel processing
 *   --merge-batches <n>  Merge n batch response files
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Patterns that indicate a claim is a source reference, not a factual claim
 */
const SOURCE_REFERENCE_PATTERNS = [
  /^[-*]\s*[-*]?\s*[A-Z][^:]+:\s*[A-Z]/,  // "- Wikipedia: Operation Metro Surge"
  /^[-*]\s*[-*]?\s*\[[^\]]+\]\s*$/,        // "- [Source Name]"
  /Portal$/i,
  /Index$/i,
  /Methodology$/i,
  /Official Statement$/i,
  /Data Files?$/i,
  /Reports? Directory$/i,
  /Overview$/i,
  /Quick Facts$/i,
];

/**
 * Check if text is a source reference rather than a factual claim
 */
function isSourceReference(text, line, articleText) {
  for (const pattern of SOURCE_REFERENCE_PATTERNS) {
    if (pattern.test(text)) {
      return { isSourceRef: true, reason: 'Matches source reference pattern' };
    }
  }

  // Check if in "Sources Consulted" section
  if (articleText) {
    const lines = articleText.split('\n');
    for (let i = line - 1; i >= Math.max(0, line - 50); i--) {
      const headerLine = lines[i] || '';
      if (/^#+\s*Sources?\s+Consulted/i.test(headerLine) ||
          /^#+\s*References?/i.test(headerLine)) {
        return { isSourceRef: true, reason: 'In Sources Consulted section' };
      }
      if (/^##?\s+[A-Z]/.test(headerLine) && !/Sources|References/i.test(headerLine)) {
        break;
      }
    }
  }

  // Short text with colon that looks like a title
  const words = text.split(/\s+/);
  if (words.length <= 4 && text.includes(':') && /^[A-Z][A-Za-z\s\-:]+$/.test(text)) {
    return { isSourceRef: true, reason: 'Appears to be a source title' };
  }

  return { isSourceRef: false };
}

/**
 * Extract claims from article text
 *
 * Finds sentences/passages that contain citations [S###]
 */
function extractArticleClaims(articleText) {
  const claims = [];
  const lines = articleText.split('\n');

  // Pattern for citations: [S001], [S001](url)
  const citationPattern = /\[(S\d{3})\](?:\([^)]+\))?/g;

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    // Skip headers, empty lines, metadata
    if (line.startsWith('#') || line.trim() === '' || line.startsWith('---')) {
      continue;
    }

    // Find all citations in this line
    const matches = [...line.matchAll(citationPattern)];
    if (matches.length === 0) continue;

    // Split line into sentences
    const sentences = line
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .filter(s => s.trim().length > 0);

    for (const sentence of sentences) {
      const sentenceMatches = [...sentence.matchAll(citationPattern)];
      if (sentenceMatches.length === 0) continue;

      // Extract the claim text (sentence without citation markup)
      const claimText = sentence
        .replace(/\[(S\d{3})\](?:\([^)]+\))?/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (claimText.length < 10) continue;

      // Get source IDs referenced
      const sourceIds = [...new Set(sentenceMatches.map(m => m[1]))];

      // Check if this is a source reference
      const sourceRefCheck = isSourceReference(claimText, lineNum + 1, articleText);

      claims.push({
        text: claimText,
        line: lineNum + 1,
        sourceIds,
        raw: sentence.trim(),
        isSourceRef: sourceRefCheck.isSourceRef,
        sourceRefReason: sourceRefCheck.reason || null
      });
    }
  }

  return claims;
}

/**
 * Load source content from evidence directory
 */
function loadSourceContent(caseDir, sourceId) {
  const contentPath = path.join(caseDir, 'evidence', sourceId, 'content.md');

  if (!fs.existsSync(contentPath)) {
    return { error: 'SOURCE_NOT_FOUND', message: `No content.md for ${sourceId}` };
  }

  const content = fs.readFileSync(contentPath, 'utf-8');

  // No truncation - Gemini has 1M+ token context window
  return { content, fullLength: content.length };
}

/**
 * Load source metadata
 */
function loadSourceMetadata(caseDir, sourceId) {
  const metaPath = path.join(caseDir, 'evidence', sourceId, 'metadata.json');

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/**
 * Generate LLM prompt for direct claim verification
 */
function generateVerificationPrompt(claim, sourceContent, sourceUrl) {
  return `Verify if this source content supports the following claim.

CLAIM: "${claim.text}"

SOURCE URL: ${sourceUrl || 'Unknown'}

SOURCE CONTENT:
${sourceContent}

Instructions:
1. Read the source content carefully
2. Determine if the source DIRECTLY supports the claim
3. If supported, quote the EXACT text from the source that supports it
4. Numbers must match exactly (62% ≠ 60%, $50M ≠ $5M)

Respond in JSON format:
{
  "supported": true | false,
  "confidence": <0.0 to 1.0>,
  "supporting_quote": "<exact quote from source that supports the claim, or null if not supported>",
  "reason": "<brief explanation of why the claim is or isn't supported>"
}

Rules:
- Only mark as supported if the source EXPLICITLY states the claimed information
- Do NOT mark as supported based on inference or implication
- The supporting_quote must be VERBATIM from the source content
- If the claim is partially supported, mark as false and explain in reason`;
}

/**
 * Parse LLM verification response
 */
function parseVerificationResponse(response) {
  try {
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());

    return {
      supported: !!parsed.supported,
      confidence: parsed.confidence || 0,
      supportingQuote: parsed.supporting_quote || null,
      reason: parsed.reason || ''
    };
  } catch (err) {
    return {
      supported: false,
      confidence: 0,
      supportingQuote: null,
      reason: `Failed to parse response: ${err.message}`
    };
  }
}

/**
 * Prepare verification for an article
 *
 * Returns claims with LLM prompts for verification
 */
function prepareVerification(caseDir, options = {}) {
  const articlePath = options.articlePath || path.join(caseDir, 'articles', 'full.md');

  if (!fs.existsSync(articlePath)) {
    return { error: 'ARTICLE_NOT_FOUND', message: `Article not found: ${articlePath}` };
  }

  const articleText = fs.readFileSync(articlePath, 'utf-8');
  const articleClaims = extractArticleClaims(articleText);

  const verificationData = [];

  for (const claim of articleClaims) {
    // Skip source references
    if (claim.isSourceRef) {
      verificationData.push({
        claim,
        status: 'SKIPPED',
        reason: claim.sourceRefReason || 'Source reference'
      });
      continue;
    }

    // For each cited source, generate verification prompt
    if (claim.sourceIds.length === 0) {
      verificationData.push({
        claim,
        status: 'NO_SOURCE',
        reason: 'No source citation found'
      });
      continue;
    }

    // Use the first cited source (primary citation)
    const sourceId = claim.sourceIds[0];
    const sourceData = loadSourceContent(caseDir, sourceId);

    if (sourceData.error) {
      verificationData.push({
        claim,
        sourceId,
        status: 'SOURCE_MISSING',
        reason: sourceData.message
      });
      continue;
    }

    const metadata = loadSourceMetadata(caseDir, sourceId);
    const sourceUrl = metadata?.url || '';

    const prompt = generateVerificationPrompt(claim, sourceData.content, sourceUrl);

    verificationData.push({
      claim,
      sourceId,
      sourceUrl,
      prompt,
      status: 'PENDING'
    });
  }

  // Generate prompts array for LLM processing
  const prompts = verificationData
    .filter(v => v.status === 'PENDING')
    .map((v, idx) => ({
      index: verificationData.indexOf(v),
      prompt: v.prompt,
      claim: v.claim.text,
      sourceId: v.sourceId,
      line: v.claim.line
    }));

  const stats = {
    total: articleClaims.length,
    pending: prompts.length,
    skipped: verificationData.filter(v => v.status === 'SKIPPED').length,
    noSource: verificationData.filter(v => v.status === 'NO_SOURCE').length,
    sourceMissing: verificationData.filter(v => v.status === 'SOURCE_MISSING').length
  };

  return {
    articlePath,
    preparedAt: new Date().toISOString(),
    verificationData,
    prompts,
    stats
  };
}

/**
 * Process LLM responses and finalize verification
 */
function processVerificationResponses(prepared, llmResponses) {
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

    return {
      ...item,
      status: parsed.supported ? 'VERIFIED' : 'UNVERIFIED',
      confidence: parsed.confidence,
      supportingQuote: parsed.supportingQuote,
      reason: parsed.reason
    };
  });

  // Calculate summary
  const summary = {
    total: results.length,
    verified: results.filter(r => r.status === 'VERIFIED').length,
    unverified: results.filter(r => r.status === 'UNVERIFIED').length,
    skipped: results.filter(r => r.status === 'SKIPPED').length,
    noSource: results.filter(r => r.status === 'NO_SOURCE').length,
    sourceMissing: results.filter(r => r.status === 'SOURCE_MISSING').length,
    noResponse: results.filter(r => r.status === 'NO_RESPONSE').length
  };

  // Determine overall status
  let overallStatus = 'VERIFIED';
  if (summary.unverified > 0) overallStatus = 'HAS_UNVERIFIED';
  if (summary.sourceMissing > 0) overallStatus = 'HAS_MISSING_SOURCES';

  return {
    status: overallStatus,
    articlePath: prepared.articlePath,
    verifiedAt: new Date().toISOString(),
    summary,
    results,
    verified: results.filter(r => r.status === 'VERIFIED'),
    unverified: results.filter(r => r.status === 'UNVERIFIED'),
    skipped: results.filter(r => r.status === 'SKIPPED')
  };
}

/**
 * Generate human-readable report
 */
function generateReport(results) {
  const lines = [];

  lines.push('='.repeat(60));
  lines.push('ARTICLE CLAIM VERIFICATION REPORT');
  lines.push('='.repeat(60));

  if (results.error) {
    lines.push(`\nERROR: ${results.error}`);
    lines.push(results.message);
    return lines.join('\n');
  }

  lines.push(`\nArticle: ${results.articlePath}`);
  lines.push(`Verified at: ${results.verifiedAt}`);
  lines.push(`Status: ${results.status}`);

  lines.push('\n--- SUMMARY ---');
  lines.push(`Total claims: ${results.summary.total}`);
  lines.push(`  Verified: ${results.summary.verified}`);
  lines.push(`  Unverified: ${results.summary.unverified}`);
  lines.push(`  Skipped (source refs): ${results.summary.skipped}`);
  if (results.summary.sourceMissing > 0) {
    lines.push(`  Missing sources: ${results.summary.sourceMissing}`);
  }

  if (results.unverified && results.unverified.length > 0) {
    lines.push('\n--- UNVERIFIED CLAIMS ---');
    for (const item of results.unverified) {
      const text = item.claim.text.substring(0, 70);
      lines.push(`\n  Line ${item.claim.line}: "${text}${text.length >= 70 ? '...' : ''}"`);
      lines.push(`    Source: ${item.sourceId}`);
      lines.push(`    Reason: ${item.reason}`);
    }
  }

  if (results.verified && results.verified.length > 0 && results.verified.length <= 20) {
    lines.push('\n--- VERIFIED CLAIMS ---');
    for (const item of results.verified) {
      const text = item.claim.text.substring(0, 70);
      lines.push(`\n  Line ${item.claim.line}: "${text}${text.length >= 70 ? '...' : ''}"`);
      lines.push(`    Source: ${item.sourceId} (confidence: ${(item.confidence * 100).toFixed(0)}%)`);
    }
  }

  lines.push('\n' + '='.repeat(60));

  return lines.join('\n');
}

/**
 * Split prompts into batches
 */
function splitIntoBatches(prompts, batchSize) {
  const batches = [];
  for (let i = 0; i < prompts.length; i += batchSize) {
    batches.push({
      batchIndex: Math.floor(i / batchSize) + 1,
      startIndex: i,
      prompts: prompts.slice(i, i + batchSize)
    });
  }
  return batches;
}

/**
 * Generate batch files for parallel processing
 */
function generateBatchFiles(caseDir, prepared, batchSize) {
  const batches = splitIntoBatches(prepared.prompts, batchSize);

  const outputFiles = batches.map((batch, idx) => {
    const fileName = `verification-batch-${idx + 1}.json`;
    const filePath = path.join(caseDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify({
      batch: idx + 1,
      totalBatches: batches.length,
      prompts: batch.prompts
    }, null, 2));

    return {
      batch: idx + 1,
      file: fileName,
      promptCount: batch.prompts.length
    };
  });

  return { batches: batches.length, outputFiles };
}

/**
 * Merge batch response files
 * Supports multiple formats:
 * - Array format: [{ index, response }, ...]
 * - Object format: { batch, responses: [{ index, response }, ...] }
 * - response can be string or object (will be stringified if object)
 */
function mergeBatchResponses(caseDir, totalBatches) {
  const allResponses = [];

  for (let i = 1; i <= totalBatches; i++) {
    // Try multiple file name patterns
    const patterns = [
      `verification-responses-batch${i}.json`,
      `verification-responses-batch-${i}.json`
    ];

    let found = false;
    for (const pattern of patterns) {
      const responseFile = path.join(caseDir, pattern);
      if (fs.existsSync(responseFile)) {
        const content = JSON.parse(fs.readFileSync(responseFile, 'utf-8'));

        // Handle different formats
        let responses;
        if (Array.isArray(content)) {
          responses = content;
        } else if (content.responses && Array.isArray(content.responses)) {
          responses = content.responses;
        } else {
          console.error(`Invalid format in ${pattern}`);
          continue;
        }

        // Normalize response format (stringify objects)
        for (const r of responses) {
          if (typeof r.response === 'object') {
            r.response = JSON.stringify(r.response);
          }
          allResponses.push(r);
        }

        console.log(`  Loaded ${responses.length} responses from ${pattern}`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.error(`Missing: verification-responses-batch${i}.json (or batch-${i})`);
    }
  }

  allResponses.sort((a, b) => a.index - b.index);
  return allResponses;
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node verify-article.js <case-dir> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --article <path>     Path to article (default: articles/full.md)');
    console.log('  --prompts-only       Output LLM prompts for processing');
    console.log('  --responses <file>   Process LLM responses from file');
    console.log('  --json               Output JSON');
    console.log('  --batch-size <n>     Batch size (default: 30)');
    console.log('  --generate-batches   Generate batch files');
    console.log('  --merge-batches <n>  Merge n batch response files');
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
    promptsOnly: false,
    responsesFile: null,
    batchSize: 30,
    generateBatches: false,
    mergeBatches: null
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--article' && args[i + 1]) {
      options.articlePath = args[++i];
    } else if (args[i] === '--json') {
      options.json = true;
    } else if (args[i] === '--prompts-only') {
      options.promptsOnly = true;
    } else if (args[i] === '--responses' && args[i + 1]) {
      options.responsesFile = args[++i];
    } else if (args[i] === '--batch-size' && args[i + 1]) {
      options.batchSize = parseInt(args[++i], 10);
    } else if (args[i] === '--generate-batches') {
      options.generateBatches = true;
    } else if (args[i] === '--merge-batches' && args[i + 1]) {
      options.mergeBatches = parseInt(args[++i], 10);
    }
  }

  // Prepare verification
  const prepared = prepareVerification(caseDir, options);

  if (prepared.error) {
    console.error(JSON.stringify(prepared, null, 2));
    process.exit(1);
  }

  // Mode: Output prompts only
  if (options.promptsOnly) {
    console.log(JSON.stringify({ prompts: prepared.prompts, stats: prepared.stats }, null, 2));
    return;
  }

  // Mode: Generate batch files
  if (options.generateBatches) {
    const { batches, outputFiles } = generateBatchFiles(caseDir, prepared, options.batchSize);

    console.log(`Generated ${batches} batch files:`);
    outputFiles.forEach(f => console.log(`  ${f.file}: ${f.promptCount} prompts`));
    console.log(`\nProcess each batch with LLM, save responses to verification-responses-batch{N}.json`);
    console.log(`Then run: node verify-article.js ${caseDir} --merge-batches ${batches}`);
    return;
  }

  // Mode: Merge and process batch responses
  if (options.mergeBatches) {
    console.log(`Merging ${options.mergeBatches} batch files...`);
    const responses = mergeBatchResponses(caseDir, options.mergeBatches);
    console.log(`Found ${responses.length} responses`);

    const results = processVerificationResponses(prepared, responses);

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(generateReport(results));
    }

    process.exit(results.summary.unverified > 0 ? 1 : 0);
    return;
  }

  // Mode: Process responses from file
  if (options.responsesFile) {
    const responses = JSON.parse(fs.readFileSync(options.responsesFile, 'utf-8'));
    const results = processVerificationResponses(prepared, responses);

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(generateReport(results));
    }

    process.exit(results.summary.unverified > 0 ? 1 : 0);
    return;
  }

  // Default: Show stats and prompts info
  console.log('Verification prepared:');
  console.log(`  Total claims: ${prepared.stats.total}`);
  console.log(`  Pending verification: ${prepared.stats.pending}`);
  console.log(`  Skipped (source refs): ${prepared.stats.skipped}`);
  console.log(`  Missing sources: ${prepared.stats.sourceMissing}`);
  console.log('');
  console.log('To generate LLM prompts: --prompts-only');
  console.log('To generate batch files: --generate-batches');
  console.log('To process responses: --responses <file>');
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  extractArticleClaims,
  prepareVerification,
  processVerificationResponses,
  generateReport,
  isSourceReference
};
