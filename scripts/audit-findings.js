#!/usr/bin/env node
/**
 * audit-findings.js - Findings hygiene gate
 *
 * Prevents silent loss of critical context due to misnamed or duplicated findings.
 * In particular, findings.js only assembles canonical files named exactly F###.md.
 *
 * Usage:
 *   node scripts/audit-findings.js <case_dir>
 *   node scripts/audit-findings.js <case_dir> --block (exit 1 on any errors)
 *   node scripts/audit-findings.js <case_dir> --json
 *
 * Checks:
 *   - Each findings/*.md has valid frontmatter with id: F###
 *   - Filename matches the id exactly (F###.md). Misnamed files are ignored by assembly.
 *   - No duplicate ids across files
 *   - manifest.json assembly_order references existing canonical files
 *
 * Exit codes:
 *   0 - OK (or non-blocking mode)
 *   1 - Errors found (when --block used)
 *   2 - Usage/config error
 */

'use strict';

const fs = require('fs');
const path = require('path');

function parseFrontmatter(fileText) {
  const match = fileText.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { metadata: null, body: fileText, errors: ['Missing or invalid YAML frontmatter block'], warnings: [] };
  }

  const frontmatter = match[1];
  const body = match[2];
  const metadata = {};
  const errors = [];
  const warnings = [];

  for (const line of frontmatter.split('\n')) {
    if (!line.trim()) continue;
    const [rawKey, ...rest] = line.split(':');
    if (!rawKey || rest.length === 0) {
      warnings.push(`Unparseable frontmatter line: "${line}"`);
      continue;
    }

    const key = rawKey.trim();
    const rawValue = rest.join(':').trim();

    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      try {
        metadata[key] = JSON.parse(rawValue);
      } catch (e) {
        errors.push(`Frontmatter field "${key}" is not valid JSON array: ${e.message}`);
        metadata[key] = rawValue;
      }
    } else if (rawValue === 'null') {
      metadata[key] = null;
    } else if (rawValue === 'true') {
      metadata[key] = true;
    } else if (rawValue === 'false') {
      metadata[key] = false;
    } else {
      metadata[key] = rawValue;
    }
  }

  return { metadata, body, errors, warnings };
}

function isFindingId(value) {
  return typeof value === 'string' && /^F\d{3}$/.test(value);
}

function summarizeFindingFile(fileName, fileText) {
  const { metadata, errors, warnings } = parseFrontmatter(fileText);
  const idFromFilename = (fileName.match(/^(F\d{3})/) || [null, null])[1];
  const idFromFrontmatter = metadata?.id || null;
  const id = idFromFrontmatter || idFromFilename || null;

  const fileErrors = [...errors];

  if (!id) {
    fileErrors.push('Missing finding id (frontmatter id missing and filename not starting with F###)');
  } else if (!isFindingId(id)) {
    fileErrors.push(`Invalid finding id "${id}" (expected F###)`);
  }

  if (idFromFilename && idFromFrontmatter && idFromFilename !== idFromFrontmatter) {
    fileErrors.push(`Filename id ${idFromFilename} does not match frontmatter id ${idFromFrontmatter}`);
  }

  const expectedName = isFindingId(id) ? `${id}.md` : null;
  const isCanonicalName = expectedName ? fileName === expectedName : false;

  if (isFindingId(id) && !isCanonicalName) {
    fileErrors.push(`Non-canonical filename "${fileName}" (expected "${expectedName}") - will be ignored by findings.js assemble`);
  }

  return {
    file: fileName,
    id,
    idFromFilename,
    idFromFrontmatter,
    status: metadata?.status || null,
    confidence: metadata?.confidence || null,
    sourcesCount: Array.isArray(metadata?.sources) ? metadata.sources.length : null,
    relatedLeadsCount: Array.isArray(metadata?.related_leads) ? metadata.related_leads.length : null,
    isCanonicalName,
    errors: fileErrors,
    warnings
  };
}

function auditFindings(caseDir) {
  const findingsDir = path.join(caseDir, 'findings');
  const manifestPath = path.join(findingsDir, 'manifest.json');

  const results = {
    caseDir,
    findingsDir,
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: 0,
      canonicalFiles: 0,
      nonCanonicalFiles: 0,
      uniqueIds: 0,
      duplicateIds: 0,
      errors: 0,
      warnings: 0
    },
    manifest: {
      present: false,
      assemblyOrderCount: 0,
      missingCanonicalInAssemblyOrder: []
    },
    duplicates: [],
    details: []
  };

  if (!fs.existsSync(findingsDir)) {
    return {
      ...results,
      error: 'FINDINGS_DIR_NOT_FOUND',
      message: `findings/ directory not found: ${findingsDir}`
    };
  }

  const mdFiles = fs.readdirSync(findingsDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  const byId = new Map();

  for (const file of mdFiles) {
    const fullPath = path.join(findingsDir, file);
    const text = fs.readFileSync(fullPath, 'utf-8');
    const detail = summarizeFindingFile(file, text);

    results.details.push(detail);
    results.summary.totalFiles += 1;
    if (detail.isCanonicalName) results.summary.canonicalFiles += 1;
    else results.summary.nonCanonicalFiles += 1;

    if (detail.id) {
      const list = byId.get(detail.id) || [];
      list.push(detail.file);
      byId.set(detail.id, list);
    }
  }

  // Duplicates by id (regardless of canonical naming)
  for (const [id, files] of byId.entries()) {
    if (files.length > 1) {
      results.duplicates.push({ id, files });
    }
  }

  // Manifest checks
  if (fs.existsSync(manifestPath)) {
    results.manifest.present = true;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const order = Array.isArray(manifest.assembly_order) ? manifest.assembly_order : [];
      results.manifest.assemblyOrderCount = order.length;

      for (const id of order) {
        if (!isFindingId(id)) continue;
        const canonical = `${id}.md`;
        if (!fs.existsSync(path.join(findingsDir, canonical))) {
          results.manifest.missingCanonicalInAssemblyOrder.push({ id, expectedFile: canonical });
        }
      }
    } catch (e) {
      results.details.push({
        file: 'manifest.json',
        id: null,
        idFromFilename: null,
        idFromFrontmatter: null,
        status: null,
        confidence: null,
        sourcesCount: null,
        relatedLeadsCount: null,
        isCanonicalName: true,
        errors: [`Invalid manifest.json: ${e.message}`],
        warnings: []
      });
    }
  }

  // Error/warning totals
  for (const d of results.details) {
    results.summary.errors += (d.errors || []).length;
    results.summary.warnings += (d.warnings || []).length;
  }

  results.summary.uniqueIds = byId.size;
  results.summary.duplicateIds = results.duplicates.length;

  return results;
}

function printUsage() {
  console.log('audit-findings.js - Findings hygiene gate');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/audit-findings.js <case_dir> [--block] [--json]');
  console.log('');
  console.log('Exit codes:');
  console.log('  0 - OK');
  console.log('  1 - Errors found (only with --block)');
  console.log('  2 - Usage/config error');
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

  const results = auditFindings(caseDir);

  const hasConfigError = !!results.error;
  if (hasConfigError) {
    if (jsonOutput) console.log(JSON.stringify(results, null, 2));
    else {
      console.error(`ERROR: ${results.message || results.error}`);
    }
    process.exit(2);
  }

  const hasErrors =
    results.summary.errors > 0 ||
    results.duplicates.length > 0 ||
    (results.manifest.missingCanonicalInAssemblyOrder || []).length > 0;

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('='.repeat(70));
    console.log('FINDINGS HYGIENE AUDIT');
    console.log('='.repeat(70));
    console.log(`Case: ${results.caseDir}`);
    console.log(`Timestamp: ${results.timestamp}`);
    console.log('');

    const s = results.summary;
    console.log(`Files: ${s.totalFiles} (canonical: ${s.canonicalFiles}, non-canonical: ${s.nonCanonicalFiles})`);
    console.log(`IDs: ${s.uniqueIds} (duplicate IDs: ${s.duplicateIds})`);
    console.log(`Frontmatter issues: ${s.errors} errors, ${s.warnings} warnings`);
    console.log('');

    if (results.duplicates.length > 0) {
      console.log('-'.repeat(70));
      console.log('DUPLICATE FINDING IDS (must resolve):');
      for (const dup of results.duplicates) {
        console.log(`  ${dup.id}: ${dup.files.join(', ')}`);
      }
      console.log('');
    }

    if ((results.manifest.missingCanonicalInAssemblyOrder || []).length > 0) {
      console.log('-'.repeat(70));
      console.log('MANIFEST ERRORS (assembly_order references missing canonical files):');
      for (const miss of results.manifest.missingCanonicalInAssemblyOrder) {
        console.log(`  ${miss.id}: missing ${miss.expectedFile}`);
      }
      console.log('');
    }

    const fileIssues = results.details.filter(d => (d.errors || []).length > 0 || (d.warnings || []).length > 0);
    if (fileIssues.length > 0) {
      console.log('-'.repeat(70));
      console.log('FILE ISSUES:');
      for (const item of fileIssues) {
        console.log(`\n  ${item.file}${item.id ? ` (${item.id})` : ''}`);
        for (const err of item.errors || []) console.log(`    ERROR: ${err}`);
        for (const warn of item.warnings || []) console.log(`    WARN:  ${warn}`);
      }
      console.log('');
    }

    console.log('='.repeat(70));
    console.log(hasErrors ? 'AUDIT FAILED - Fix findings hygiene issues before writing.' : 'AUDIT PASSED');
    console.log('='.repeat(70));
  }

  if (blockMode && hasErrors) process.exit(1);
  process.exit(0);
}

module.exports = { auditFindings, parseFrontmatter, summarizeFindingFile };

if (require.main === module) {
  main();
}

