#!/usr/bin/env node
/**
 * audit-article-outline.js - Enforce an explicit outline/scope-control artifact
 *
 * Articles often drift into narratively compelling tangents unless the writer has an explicit
 * outline tied back to the refined prompt's deliverables. This audit checks that a case has
 * `articles/outline.md` and that it contains the required sections described in the /article skill.
 *
 * Usage:
 *   node scripts/audit-article-outline.js <case_dir> [--block] [--json]
 *
 * Exit codes:
 *   0 - OK (or non-blocking mode)
 *   1 - Errors found (when --block used)
 *   2 - Usage/config error
 */

'use strict';

const fs = require('fs');
const path = require('path');

function parseSections(text) {
  const lines = String(text || '').split(/\r?\n/);
  const sections = [];

  let current = { heading: null, level: null, lines: [] };
  function flush() {
    if (current.heading) sections.push(current);
    current = { heading: null, level: null, lines: [] };
  }

  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (m) {
      flush();
      current.heading = m[2].trim();
      current.level = m[1].length;
      continue;
    }
    current.lines.push(line);
  }

  flush();
  return sections;
}

function sectionHasListItems(section) {
  if (!section) return false;
  return section.lines.some(l => /^\s*(?:[-*+]\s+|\d+\.\s+)\S+/.test(l));
}

function findSection(sections, predicate) {
  for (const s of sections) {
    if (predicate(String(s.heading || ''))) return s;
  }
  return null;
}

function auditArticleOutline(caseDir) {
  const outlinePath = path.join(caseDir, 'articles', 'outline.md');

  const res = {
    caseDir,
    outlinePath,
    ok: false,
    required: {
      deliverables: { ok: false },
      sectionOutline: { ok: false },
      quantClaimsPlan: { ok: false },
      tangentBudget: { ok: false }
    },
    errors: [],
    warnings: []
  };

  if (!fs.existsSync(outlinePath)) {
    res.errors.push('Missing required outline file: articles/outline.md');
    return res;
  }

  const text = fs.readFileSync(outlinePath, 'utf-8');
  const sections = parseSections(text);

  const deliverables = findSection(sections, h => /deliverables?\b/i.test(h));
  const sectionOutline = findSection(sections, h => /\bsection\s+outline\b/i.test(h) || /^outline\b/i.test(h));
  const quantClaimsPlan = findSection(sections, h => /\b(quant|numerical|numbers?)\b/i.test(h) && /\b(plan|claims?)\b/i.test(h));
  const tangentBudget = findSection(sections, h => /\btangent\b/i.test(h) && /\bbudget\b/i.test(h));

  // Deliverables: must have a checklist (list items).
  res.required.deliverables.ok = !!deliverables && sectionHasListItems(deliverables);
  if (!deliverables) res.errors.push('Missing required section: Deliverables checklist');
  else if (!res.required.deliverables.ok) res.errors.push('Deliverables section found but has no checklist items');

  // Section outline: must have some content (prefer list items).
  res.required.sectionOutline.ok = !!sectionOutline && sectionOutline.lines.some(l => l.trim().length > 0);
  if (!sectionOutline) res.errors.push('Missing required section: Section outline');

  // Quant claims plan: must have at least one list item (planned numbers + sources).
  res.required.quantClaimsPlan.ok = !!quantClaimsPlan && sectionHasListItems(quantClaimsPlan);
  if (!quantClaimsPlan) res.errors.push('Missing required section: Quant claims plan');
  else if (!res.required.quantClaimsPlan.ok) res.errors.push('Quant claims plan section found but has no list items');

  // Tangent budget: must exist and contain some non-empty text.
  res.required.tangentBudget.ok = !!tangentBudget && tangentBudget.lines.some(l => l.trim().length > 0);
  if (!tangentBudget) res.errors.push('Missing required section: Tangent budget');

  res.ok = res.errors.length === 0;
  return res;
}

function printUsage() {
  console.log('audit-article-outline.js - Enforce article outline/scope-control artifact');
  console.log('');
  console.log('Usage: node scripts/audit-article-outline.js <case_dir> [--block] [--json]');
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

  const res = auditArticleOutline(caseDir);

  if (jsonOutput) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log('='.repeat(70));
    console.log('ARTICLE OUTLINE AUDIT');
    console.log('='.repeat(70));
    console.log(`Case: ${caseDir}`);
    console.log(`Outline: ${res.outlinePath}`);
    console.log(`Status: ${res.ok ? 'PASS' : 'FAIL'}`);
    if (res.errors.length > 0) {
      console.log('\n--- ERRORS ---');
      for (const e of res.errors) console.log(`- ${e}`);
    }
    if (res.warnings.length > 0) {
      console.log('\n--- WARNINGS ---');
      for (const w of res.warnings) console.log(`- ${w}`);
    }
    console.log('\n' + '='.repeat(70));
  }

  if (block && !res.ok) process.exit(1);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { auditArticleOutline };

