#!/usr/bin/env node
/**
 * process-verification-batches.js - Process claim verification batches
 *
 * Reads verification batch files and processes them with an LLM,
 * outputting response files for verify-article.js --merge-batches
 *
 * Usage:
 *   node scripts/process-verification-batches.js <case-dir> [options]
 *
 * Options:
 *   --batch <n>     Process only batch n (default: all)
 *   --dry-run       Show prompts without processing
 *   --parallel <n>  Process n prompts in parallel (default: 5)
 *
 * Note: This script outputs prompts for manual LLM processing.
 * For automated processing, use the MCP tools directly.
 */

const fs = require('fs');
const path = require('path');

function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log(`
Usage: node scripts/process-verification-batches.js <case-dir> [options]

Options:
  --batch <n>     Process only batch n (default: all)
  --dry-run       Show stats without processing
  --output-prompts  Output all prompts for manual processing

Example:
  node scripts/process-verification-batches.js cases/ice-in-minnesota/
`);
    process.exit(1);
  }

  const caseDir = args[0];
  let batchNum = null;
  let dryRun = false;
  let outputPrompts = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--batch' && args[i + 1]) {
      batchNum = parseInt(args[++i], 10);
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--output-prompts') {
      outputPrompts = true;
    }
  }

  // Find batch files
  const batchFiles = [];
  for (let n = 1; n <= 10; n++) {
    const batchPath = path.join(caseDir, `verification-batch-${n}.json`);
    if (fs.existsSync(batchPath)) {
      if (batchNum === null || batchNum === n) {
        batchFiles.push({ num: n, path: batchPath });
      }
    }
  }

  if (batchFiles.length === 0) {
    console.error('No batch files found. Run verify-article.js --generate-batches first.');
    process.exit(1);
  }

  console.log(`Found ${batchFiles.length} batch file(s)`);

  // Load and summarize batches
  for (const batch of batchFiles) {
    const data = JSON.parse(fs.readFileSync(batch.path, 'utf-8'));
    console.log(`  Batch ${batch.num}: ${data.prompts.length} prompts`);

    if (outputPrompts) {
      // Output prompts for manual processing
      const outputPath = path.join(caseDir, `verification-prompts-batch-${batch.num}.txt`);
      const lines = [];

      for (const item of data.prompts) {
        lines.push(`=== PROMPT ${item.index} ===`);
        lines.push(item.prompt);
        lines.push('');
        lines.push('Expected response format:');
        lines.push('```json');
        lines.push('{');
        lines.push('  "supported": true | false,');
        lines.push('  "confidence": 0.0 to 1.0,');
        lines.push('  "supporting_quote": "exact quote or null",');
        lines.push('  "reason": "explanation"');
        lines.push('}');
        lines.push('```');
        lines.push('');
        lines.push('-'.repeat(80));
        lines.push('');
      }

      fs.writeFileSync(outputPath, lines.join('\n'));
      console.log(`  → Wrote prompts to ${outputPath}`);
    }
  }

  if (dryRun) {
    console.log('\nDry run complete. Use --output-prompts to export prompts.');
    return;
  }

  // Create template response files
  for (const batch of batchFiles) {
    const data = JSON.parse(fs.readFileSync(batch.path, 'utf-8'));
    const responsePath = path.join(caseDir, `verification-responses-batch-${batch.num}.json`);

    if (!fs.existsSync(responsePath)) {
      // Create template
      const template = data.prompts.map(p => ({
        index: p.index,
        response: JSON.stringify({
          supported: false,
          confidence: 0,
          supporting_quote: null,
          reason: "NOT YET PROCESSED"
        })
      }));

      fs.writeFileSync(responsePath, JSON.stringify(template, null, 2));
      console.log(`  → Created template: ${responsePath}`);
    }
  }

  console.log(`
To process verification:

1. For each batch, use an LLM to process the prompts:
   - Load verification-batch-{N}.json
   - For each prompt, get LLM response in JSON format
   - Save to verification-responses-batch-{N}.json

2. Response format for each prompt:
   {
     "index": <prompt index>,
     "response": "<JSON string with supported, confidence, supporting_quote, reason>"
   }

3. After all batches processed, run:
   node scripts/claims/verify-article.js ${caseDir} --merge-batches ${batchFiles.length}
`);
}

main();
