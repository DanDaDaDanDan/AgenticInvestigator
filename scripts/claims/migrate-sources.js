#!/usr/bin/env node
/**
 * migrate-sources.js - Extract claims from existing sources using LLM
 *
 * This script helps extract claims from existing case sources.
 * All extraction is LLM-based for comprehensive claim capture.
 *
 * Usage:
 *   node scripts/claims/migrate-sources.js <case-dir> status
 *   node scripts/claims/migrate-sources.js <case-dir> prompt <source-id>
 *   node scripts/claims/migrate-sources.js <case-dir> prompt-all > prompts.json
 *   node scripts/claims/migrate-sources.js <case-dir> register <source-id> <response-file>
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadRegistry } = require('./registry');
const {
  prepareSourceForExtraction,
  registerExtractedClaims,
  getExtractionStatus
} = require('./capture-integration');

/**
 * Get detailed status of claim extraction
 */
function showStatus(caseDir) {
  const status = getExtractionStatus(caseDir);

  console.log('\n' + '='.repeat(60));
  console.log('CLAIM REGISTRY STATUS');
  console.log('='.repeat(60));
  console.log(`\nCase: ${caseDir}`);
  console.log(`\nSources:`);
  console.log(`  Total: ${status.totalSources}`);
  console.log(`  With content: ${status.sourcesWithContent}`);
  console.log(`  With claims extracted: ${status.sourcesWithClaims}`);
  console.log(`  Needing extraction: ${status.sourcesNeedingExtraction}`);
  console.log(`\nClaims:`);
  console.log(`  Total registered: ${status.totalClaims}`);

  if (status.sourcesNeedingExtraction > 0) {
    console.log(`\nSources needing extraction:`);
    const pending = status.sources.filter(s => s.hasContent && !s.hasClaims);
    for (const s of pending.slice(0, 20)) {
      console.log(`  ${s.sourceId}`);
    }
    if (pending.length > 20) {
      console.log(`  ... and ${pending.length - 20} more`);
    }
  }

  console.log('\n' + '='.repeat(60));

  // Return exit code
  return status.sourcesNeedingExtraction === 0 ? 0 : 1;
}

/**
 * Generate prompt for a single source
 */
function generatePrompt(caseDir, sourceId) {
  const result = prepareSourceForExtraction(caseDir, sourceId);

  if (result.error) {
    console.error(`Error: ${result.error}`);
    return null;
  }

  if (result.alreadyExtracted) {
    console.log(`Source ${sourceId} already has ${result.existingClaimCount} claims`);
    return null;
  }

  return {
    sourceId: result.sourceId,
    sourceUrl: result.sourceUrl,
    prompt: result.prompt
  };
}

/**
 * Generate prompts for all sources needing extraction
 */
function generateAllPrompts(caseDir) {
  const status = getExtractionStatus(caseDir);
  const pending = status.sources.filter(s => s.hasContent && !s.hasClaims);

  const prompts = [];

  for (const source of pending) {
    const result = prepareSourceForExtraction(caseDir, source.sourceId);

    if (result.error || result.alreadyExtracted) {
      continue;
    }

    prompts.push({
      sourceId: result.sourceId,
      sourceUrl: result.sourceUrl,
      prompt: result.prompt
    });
  }

  return prompts;
}

/**
 * Register claims from LLM response file
 */
function registerFromFile(caseDir, sourceId, responseFile) {
  // Read response file
  if (!fs.existsSync(responseFile)) {
    console.error(`Response file not found: ${responseFile}`);
    return null;
  }

  const llmResponse = fs.readFileSync(responseFile, 'utf-8');

  // Get source info
  const evidenceDir = path.join(caseDir, 'evidence', sourceId);
  const metadataPath = path.join(evidenceDir, 'metadata.json');
  const contentPath = path.join(evidenceDir, 'content.md');

  if (!fs.existsSync(contentPath)) {
    console.error(`Content file not found: ${contentPath}`);
    return null;
  }

  let sourceUrl = '';
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      sourceUrl = metadata.url || '';
    } catch (e) {
      // Ignore
    }
  }

  const content = fs.readFileSync(contentPath, 'utf-8');

  // Register claims
  const result = registerExtractedClaims(caseDir, sourceId, sourceUrl, llmResponse, content);

  console.log(`\nRegistered claims for ${sourceId}:`);
  console.log(`  Registered: ${result.registered}`);
  console.log(`  Duplicates: ${result.duplicates}`);
  console.log(`  Unverified (quote not found): ${result.unverified}`);

  return result;
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage:');
    console.log('  node migrate-sources.js <case-dir> status');
    console.log('  node migrate-sources.js <case-dir> prompt <source-id>');
    console.log('  node migrate-sources.js <case-dir> prompt-all');
    console.log('  node migrate-sources.js <case-dir> register <source-id> <response-file>');
    console.log('');
    console.log('Commands:');
    console.log('  status      - Show extraction status');
    console.log('  prompt      - Generate LLM prompt for one source');
    console.log('  prompt-all  - Generate prompts for all sources (JSON output)');
    console.log('  register    - Register claims from LLM response file');
    console.log('');
    console.log('Workflow:');
    console.log('  1. Run "status" to see which sources need extraction');
    console.log('  2. Run "prompt <source-id>" to get the extraction prompt');
    console.log('  3. Send prompt to LLM (Gemini 3 Pro recommended)');
    console.log('  4. Save LLM response to a file');
    console.log('  5. Run "register <source-id> <response-file>" to register claims');
    process.exit(1);
  }

  const caseDir = args[0];
  const command = args[1];

  if (!fs.existsSync(caseDir)) {
    console.error(`Case directory not found: ${caseDir}`);
    process.exit(1);
  }

  switch (command) {
    case 'status': {
      const exitCode = showStatus(caseDir);
      process.exit(exitCode);
      break;
    }

    case 'prompt': {
      const sourceId = args[2];
      if (!sourceId) {
        console.error('Source ID required');
        process.exit(1);
      }

      const result = generatePrompt(caseDir, sourceId);
      if (result) {
        console.log('\n=== PROMPT FOR ' + sourceId + ' ===\n');
        console.log(result.prompt);
        console.log('\n=== END PROMPT ===\n');
      }
      break;
    }

    case 'prompt-all': {
      const prompts = generateAllPrompts(caseDir);
      console.log(JSON.stringify(prompts, null, 2));
      break;
    }

    case 'register': {
      const sourceId = args[2];
      const responseFile = args[3];

      if (!sourceId || !responseFile) {
        console.error('Source ID and response file required');
        process.exit(1);
      }

      registerFromFile(caseDir, sourceId, responseFile);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = {
  showStatus,
  generatePrompt,
  generateAllPrompts,
  registerFromFile
};
