/**
 * capture-integration.js - Integrate Claim Extraction into Source Capture
 *
 * This module is called after a source is captured to extract and
 * register claims using LLM. All extraction is LLM-based.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { addClaim, loadRegistry, findClaimsBySource } = require('./registry');
const { prepareExtraction, parseExtractionResponse, postProcessClaims } = require('./extract');

/**
 * Process a single captured source and prepare for claim extraction
 *
 * This function:
 * 1. Reads the source content from evidence/S###/content.md
 * 2. Generates an extraction prompt for the LLM
 * 3. Returns the prompt (caller must send to LLM and call registerExtractedClaims)
 *
 * @param {string} caseDir - Case directory
 * @param {string} sourceId - Source ID (S###)
 * @returns {object} - {prompt, sourceId, sourceUrl, content} or {error}
 */
function prepareSourceForExtraction(caseDir, sourceId) {
  const evidenceDir = path.join(caseDir, 'evidence', sourceId);

  // Check source exists
  if (!fs.existsSync(evidenceDir)) {
    return { error: `Evidence directory not found: ${evidenceDir}` };
  }

  // Read content
  const contentPath = path.join(evidenceDir, 'content.md');
  if (!fs.existsSync(contentPath)) {
    return { error: `Content file not found: ${contentPath}` };
  }

  const content = fs.readFileSync(contentPath, 'utf-8');

  // Read metadata for URL
  const metadataPath = path.join(evidenceDir, 'metadata.json');
  let sourceUrl = '';
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      sourceUrl = metadata.url || '';
    } catch (err) {
      // Ignore metadata errors
    }
  }

  // Check if claims already extracted for this source
  const existingClaims = findClaimsBySource(caseDir, sourceId);
  if (existingClaims.length > 0) {
    return {
      sourceId,
      sourceUrl,
      alreadyExtracted: true,
      existingClaimCount: existingClaims.length
    };
  }

  // Prepare extraction prompt
  const { prompt } = prepareExtraction(content, sourceUrl);

  return {
    sourceId,
    sourceUrl,
    content,
    prompt,
    alreadyExtracted: false
  };
}

/**
 * Register claims extracted by LLM
 *
 * @param {string} caseDir - Case directory
 * @param {string} sourceId - Source ID
 * @param {string} sourceUrl - Source URL
 * @param {string} llmResponse - LLM response (JSON)
 * @param {string} content - Original source content (for verification)
 * @returns {object} - {registered: number, duplicates: number, unverified: number, claims: array}
 */
function registerExtractedClaims(caseDir, sourceId, sourceUrl, llmResponse, content) {
  // Parse LLM response
  const claims = parseExtractionResponse(llmResponse);

  if (claims.length === 0) {
    return { registered: 0, duplicates: 0, unverified: 0, claims: [] };
  }

  // Post-process to verify quotes
  const processedClaims = postProcessClaims(claims, content);

  // Filter out claims where quote wasn't found
  const verifiedClaims = processedClaims.filter(c => c.quote_verified);

  // Register each claim
  let registered = 0;
  let duplicates = 0;
  const registeredClaims = [];

  for (const claim of verifiedClaims) {
    const result = addClaim(caseDir, {
      text: claim.text,
      type: claim.type,
      numbers: claim.numbers,
      entities: claim.entities,
      sourceId,
      sourceUrl,
      supporting_quote: claim.supporting_quote,
      quote_location: claim.quote_location,
      extraction_method: 'llm'
    });

    if (result.duplicate) {
      duplicates++;
    } else {
      registered++;
      registeredClaims.push(result);
    }
  }

  return {
    registered,
    duplicates,
    unverified: claims.length - verifiedClaims.length,
    claims: registeredClaims
  };
}

/**
 * Get all sources that need claim extraction
 *
 * @param {string} caseDir - Case directory
 * @returns {array} - Array of {sourceId, hasContent, hasClaims}
 */
function getSourcesNeedingExtraction(caseDir) {
  const evidenceDir = path.join(caseDir, 'evidence');

  if (!fs.existsSync(evidenceDir)) {
    return [];
  }

  const sources = [];
  const registry = loadRegistry(caseDir);

  // Get source IDs from evidence directory
  const entries = fs.readdirSync(evidenceDir);

  for (const entry of entries) {
    if (!entry.startsWith('S')) continue;

    const sourceDir = path.join(evidenceDir, entry);
    const stat = fs.statSync(sourceDir);

    if (!stat.isDirectory()) continue;

    const contentPath = path.join(sourceDir, 'content.md');
    const hasContent = fs.existsSync(contentPath);

    const existingClaims = registry.claims.filter(c => c.sourceId === entry);
    const hasClaims = existingClaims.length > 0;

    sources.push({
      sourceId: entry,
      hasContent,
      hasClaims,
      claimCount: existingClaims.length
    });
  }

  return sources;
}

/**
 * Get extraction status for a case
 */
function getExtractionStatus(caseDir) {
  const sources = getSourcesNeedingExtraction(caseDir);
  const registry = loadRegistry(caseDir);

  return {
    totalSources: sources.length,
    sourcesWithContent: sources.filter(s => s.hasContent).length,
    sourcesWithClaims: sources.filter(s => s.hasClaims).length,
    sourcesNeedingExtraction: sources.filter(s => s.hasContent && !s.hasClaims).length,
    totalClaims: registry.claims.length,
    sources
  };
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage:');
    console.log('  node capture-integration.js <case-dir> status');
    console.log('  node capture-integration.js <case-dir> prepare <source-id>');
    console.log('  node capture-integration.js <case-dir> list-pending');
    process.exit(1);
  }

  const caseDir = args[0];
  const command = args[1] || 'status';

  if (!fs.existsSync(caseDir)) {
    console.error(`Case directory not found: ${caseDir}`);
    process.exit(1);
  }

  switch (command) {
    case 'status': {
      const status = getExtractionStatus(caseDir);
      console.log('\nClaim Extraction Status');
      console.log('========================');
      console.log(`Total sources: ${status.totalSources}`);
      console.log(`Sources with content: ${status.sourcesWithContent}`);
      console.log(`Sources with claims: ${status.sourcesWithClaims}`);
      console.log(`Sources needing extraction: ${status.sourcesNeedingExtraction}`);
      console.log(`Total claims registered: ${status.totalClaims}`);
      break;
    }

    case 'prepare': {
      const sourceId = args[2];
      if (!sourceId) {
        console.error('Source ID required');
        process.exit(1);
      }

      const result = prepareSourceForExtraction(caseDir, sourceId);

      if (result.error) {
        console.error(result.error);
        process.exit(1);
      }

      if (result.alreadyExtracted) {
        console.log(`Source ${sourceId} already has ${result.existingClaimCount} claims`);
        process.exit(0);
      }

      console.log('\n=== EXTRACTION PROMPT ===\n');
      console.log(result.prompt);
      console.log('\n=== END PROMPT ===\n');
      break;
    }

    case 'list-pending': {
      const sources = getSourcesNeedingExtraction(caseDir);
      const pending = sources.filter(s => s.hasContent && !s.hasClaims);

      if (pending.length === 0) {
        console.log('No sources pending extraction');
      } else {
        console.log('Sources needing claim extraction:');
        for (const s of pending) {
          console.log(`  ${s.sourceId}`);
        }
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
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
  prepareSourceForExtraction,
  registerExtractedClaims,
  getSourcesNeedingExtraction,
  getExtractionStatus
};
