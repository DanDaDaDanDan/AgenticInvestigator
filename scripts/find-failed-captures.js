#!/usr/bin/env node
/**
 * find-failed-captures.js - Audit capture quality
 *
 * Usage: node find-failed-captures.js <case-dir>
 *
 * Scans evidence/web/ for captures that may have failed:
 * - Non-200 HTTP status codes
 * - Error pages (404, access denied, bot blocked)
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node find-failed-captures.js <case-dir>');
  process.exit(1);
}

const caseDir = args[0];
const webDir = path.join(caseDir, 'evidence', 'web');

if (!fs.existsSync(webDir)) {
  console.error(`Error: evidence/web directory not found: ${webDir}`);
  process.exit(1);
}

const dirs = fs.readdirSync(webDir).filter(d => d.startsWith('S')).sort((a, b) => {
  const numA = parseInt(a.substring(1));
  const numB = parseInt(b.substring(1));
  return numA - numB;
});

const issues = [];
const good = [];

for (const id of dirs) {
  const metaPath = path.join(webDir, id, 'metadata.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const status = meta.http_status;
    const title = meta.title || '';
    const hasIssue = status !== 200 ||
      /404|not found|error|denied|automated|access|blocked/i.test(title);

    if (hasIssue) {
      issues.push({ id, status, title: title.substring(0, 60), url: meta.url });
    } else {
      good.push(id);
    }
  }
}

console.log('='.repeat(80));
console.log('CAPTURE QUALITY AUDIT');
console.log('='.repeat(80));
console.log(`Good captures: ${good.length}`);
console.log(`Problematic captures: ${issues.length}`);
console.log('');

// Categorize issues
const categories = {
  'SEC Bot Block': [],
  '404 Not Found': [],
  'Access Denied': [],
  'Other Error': []
};

for (const i of issues) {
  if (/SEC.*Automated|Undeclared Automated/i.test(i.title)) {
    categories['SEC Bot Block'].push(i);
  } else if (i.status === 404 || /404|not found/i.test(i.title)) {
    categories['404 Not Found'].push(i);
  } else if (/access denied|blocked/i.test(i.title)) {
    categories['Access Denied'].push(i);
  } else {
    categories['Other Error'].push(i);
  }
}

for (const [cat, items] of Object.entries(categories)) {
  if (items.length > 0) {
    console.log(`\n--- ${cat} (${items.length}) ---`);
    for (const i of items) {
      console.log(`${i.id} | HTTP ${i.status} | ${i.title}`);
      console.log(`   ${i.url}`);
    }
  }
}

// Output JSON for programmatic use
console.log('\n' + '='.repeat(80));
console.log('JSON OUTPUT');
console.log('='.repeat(80));
console.log(JSON.stringify({ good: good.length, issues: issues.length, categories: Object.fromEntries(
  Object.entries(categories).map(([k, v]) => [k, v.map(i => i.id)])
)}, null, 2));
