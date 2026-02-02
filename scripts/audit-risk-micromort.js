#!/usr/bin/env node
/**
 * audit-risk-micromort.js - Enforce micromort conversion when publishing risk rates
 *
 * The /article skill requires: if the article publishes any *death-risk* rate ("1 in X", "Y%", "Z×"),
 * it must include a micromort conversion. Micromorts measure *death risk only* (not injury risk).
 *
 * This audit implements a conservative detector: it only triggers when a numeric sentence
 * contains death-specific keywords (death/fatality/mortality/etc).
 *
 * Usage:
 *   node scripts/audit-risk-micromort.js <case_dir> [--article <path>] [--block] [--json]
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

function loadArticleText(caseDir, articleRel) {
  const articlePath = path.isAbsolute(articleRel) ? articleRel : path.join(caseDir, articleRel);
  if (!fs.existsSync(articlePath)) {
    return { ok: false, error: 'ARTICLE_NOT_FOUND', articlePath };
  }
  return { ok: true, articlePath, text: fs.readFileSync(articlePath, 'utf-8') };
}

function auditRiskMicromort(caseDir, options = {}) {
  const articleRel = options.articleRel || path.join('articles', 'full.md');
  const loaded = loadArticleText(caseDir, articleRel);
  if (!loaded.ok) return { ok: false, ...loaded };

  const lines = loaded.text.split('\n');

  let inCodeBlock = false;
  let inSourcesSection = false;
  let sourcesHeadingLevel = null;
  const sourcesHeaderPattern = /^#+\s*(Sources?\s+(Cited|Consulted)|Sources?|References?|Works\s+Cited|Bibliography)\b/i;

  const deathRiskKeyword = /\b(death|deaths|fatal|fatality|fatalities|mortality|killed|kills)\b/i;
  const ratioPattern = /\b\d{1,3}(?:,\d{3})*\s*(?:in|out of)\s*\d{1,3}(?:,\d{3})*/i;
  const multiplierPattern = /\b\d{1,3}(?:,\d{3})*\s*(?:x|×|times)\b/i;
  const percentPattern = /\b\d+(?:\.\d+)?\s*(?:%|percent)\b/i;

  const examples = [];
  let riskRatesFound = 0;

  // Separate scan for micromort presence in non-sources body
  let micromortPresent = false;
  let micromortDeathOnlyDisclaimerPresent = false;
  const micromortDeathOnlyPatterns = [
    /\bmicromorts?\b[\s\S]{0,120}\b(death|fatal|mortality)\b[\s\S]{0,120}\bonly\b/i,
    /\bmicromorts?\b[\s\S]{0,160}\b(do(?:es)?\s+not|doesn['’]t|not)\b[\s\S]{0,160}\b(injury|injuries)\b/i
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

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

    if (!micromortPresent && /\bmicromorts?\b/i.test(line)) micromortPresent = true;
    if (!micromortDeathOnlyDisclaimerPresent && /\bmicromorts?\b/i.test(line)) {
      for (const re of micromortDeathOnlyPatterns) {
        if (re.test(line)) {
          micromortDeathOnlyDisclaimerPresent = true;
          break;
        }
      }
    }

    if (line.startsWith('---') || line.startsWith('#') || line.trim() === '') continue;

    const sentences = splitSentences(line);
    for (const sentence of sentences) {
      if (!/\d/.test(sentence)) continue;
      if (!deathRiskKeyword.test(sentence)) continue;

      const isRate = ratioPattern.test(sentence) || multiplierPattern.test(sentence) || percentPattern.test(sentence);
      if (!isRate) continue;

      riskRatesFound += 1;
      if (examples.length < 10) {
        examples.push({ line: i + 1, text: sentence.slice(0, 240) });
      }
    }
  }

  const ok =
    riskRatesFound > 0
      ? micromortPresent && micromortDeathOnlyDisclaimerPresent
      : (micromortPresent ? micromortDeathOnlyDisclaimerPresent : true);
  return {
    ok,
    articlePath: loaded.articlePath,
    riskRatesFound,
    micromortPresent,
    micromortDeathOnlyDisclaimerPresent,
    examples
  };
}

function printUsage() {
  console.log('audit-risk-micromort.js - Require micromorts when publishing risk rates');
  console.log('');
  console.log('Usage: node scripts/audit-risk-micromort.js <case_dir> [--article <path>] [--block] [--json]');
}

function main() {
  const args = process.argv.slice(2);
  const caseDir = args.find(a => !a.startsWith('--'));
  const jsonOutput = args.includes('--json');
  const block = args.includes('--block');

  if (!caseDir) {
    printUsage();
    process.exit(2);
  }
  if (!fs.existsSync(caseDir)) {
    const err = { error: 'CASE_DIR_NOT_FOUND', message: `Not found: ${caseDir}` };
    if (jsonOutput) console.log(JSON.stringify(err, null, 2));
    else console.error(err.message);
    process.exit(2);
  }

  let articleRel = path.join('articles', 'full.md');
  const idx = args.indexOf('--article');
  if (idx !== -1 && args[idx + 1]) articleRel = args[idx + 1];

  const res = auditRiskMicromort(caseDir, { articleRel });

  if (jsonOutput) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log('='.repeat(70));
    console.log('RISK MICROMORT AUDIT');
    console.log('='.repeat(70));
    if (res.error) {
      console.log(`Status: FAIL (${res.error})`);
      console.log(res.articlePath || '');
    } else {
      console.log(`File: ${res.articlePath}`);
      console.log(`Risk-rate sentences found: ${res.riskRatesFound}`);
      console.log(`Micromort present: ${res.micromortPresent ? 'YES' : 'NO'}`);
      if (res.micromortPresent) {
        console.log(`Micromort death-only disclaimer present: ${res.micromortDeathOnlyDisclaimerPresent ? 'YES' : 'NO'}`);
      }
      console.log(`Status: ${res.ok ? 'PASS' : 'FAIL'}`);
      if (!res.ok && res.examples.length > 0) {
        console.log('\n--- EXAMPLES ---');
        for (const ex of res.examples) console.log(`- Line ${ex.line}: ${ex.text}`);
      }
    }
    console.log('='.repeat(70));
  }

  if (block && !res.ok) process.exit(1);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { auditRiskMicromort };
