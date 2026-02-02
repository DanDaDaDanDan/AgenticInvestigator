#!/usr/bin/env node
/**
 * audit-numerics.js - Numeric claim citation hygiene
 *
 * Flags sentences that contain digits but have no [S###] citation.
 * This is a blunt but effective guardrail to prevent "precise-looking numbers"
 * from appearing without traceable sourcing.
 *
 * Usage:
 *   node scripts/audit-numerics.js <case_dir> [--article <path>] [--block] [--json]
 *
 * Defaults:
 *   --article articles/full.md
 */

'use strict';

const fs = require('fs');
const path = require('path');

function splitSentences(line) {
  return line
    .split(/(?<=[.!?])\s+(?=[A-Z(])/)
    .map(s => s.trim())
    .filter(Boolean);
}

function auditFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.split('\n');

  const results = {
    file: filePath,
    totalNumericSentences: 0,
    uncitedNumericSentences: 0,
    details: []
  };

  let inCodeBlock = false;
  let inSourcesSection = false;
  let sourcesHeadingLevel = null;
  const citationPattern = /\[S\d{3}\](?:\([^)]+\))?/;
  const sourcesHeaderPattern = /^#+\s*(Sources?\s+(Cited|Consulted)|Sources?|References?|Works\s+Cited|Bibliography)\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // Headings toggle Sources/References sections
    if (sourcesHeaderPattern.test(line)) {
      inSourcesSection = true;
      sourcesHeadingLevel = (line.match(/^#+/) || ['##'])[0].length;
      continue;
    }
    if (inSourcesSection && /^#+\s+/.test(line)) {
      const level = (line.match(/^#+/) || ['##'])[0].length;
      if (sourcesHeadingLevel !== null && level <= sourcesHeadingLevel && !sourcesHeaderPattern.test(line)) {
        inSourcesSection = false;
        sourcesHeadingLevel = null;
      }
    }
    if (inSourcesSection) continue;

    // Skip frontmatter-ish separators and headers
    if (line.startsWith('---') || line.startsWith('#') || line.trim() === '') continue;

    // Tables: report but don't hard-fail (tables often cite in captions/footnotes)
    const isTableRow = /^\s*\|/.test(line);
    const sentences = isTableRow ? [line.trim()] : splitSentences(line);

    for (const sentence of sentences) {
      if (!/\d/.test(sentence)) continue;

      results.totalNumericSentences += 1;
      const hasCitation = citationPattern.test(sentence);
      if (!hasCitation) {
        results.uncitedNumericSentences += 1;
        results.details.push({
          line: i + 1,
          severity: isTableRow ? 'warning' : 'error',
          text: sentence.slice(0, 240)
        });
      }
    }
  }

  return results;
}

function printUsage() {
  console.log('audit-numerics.js - Numeric claim citation hygiene');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/audit-numerics.js <case_dir> [--article <path>] [--block] [--json]');
}

function main() {
  const args = process.argv.slice(2);
  const caseDir = args.find(a => !a.startsWith('--'));
  const jsonOutput = args.includes('--json');
  const blockMode = args.includes('--block');

  if (!caseDir) {
    printUsage();
    process.exit(2);
  }

  let articleRel = 'articles/full.md';
  const idx = args.indexOf('--article');
  if (idx !== -1 && args[idx + 1]) articleRel = args[idx + 1];

  const articlePath = path.isAbsolute(articleRel) ? articleRel : path.join(caseDir, articleRel);
  if (!fs.existsSync(articlePath)) {
    const err = { error: 'ARTICLE_NOT_FOUND', message: `Not found: ${articlePath}` };
    if (jsonOutput) console.log(JSON.stringify(err, null, 2));
    else console.error(err.message);
    process.exit(2);
  }

  const res = auditFile(articlePath);
  const hardErrors = res.details.filter(d => d.severity === 'error').length;

  if (jsonOutput) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log('='.repeat(70));
    console.log('NUMERIC CITATION AUDIT');
    console.log('='.repeat(70));
    console.log(`File: ${articlePath}`);
    console.log(`Numeric sentences: ${res.totalNumericSentences}`);
    console.log(`Uncited numeric sentences: ${res.uncitedNumericSentences}`);

    if (res.details.length > 0) {
      console.log('\n--- UNCITED NUMERICS ---');
      for (const d of res.details.slice(0, 50)) {
        console.log(`\n  Line ${d.line} (${d.severity}): ${d.text}`);
      }
      if (res.details.length > 50) console.log(`\n  ...and ${res.details.length - 50} more`);
    }

    console.log('\n' + '='.repeat(70));
  }

  if (blockMode && hardErrors > 0) process.exit(1);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { auditFile };
