#!/usr/bin/env node
/**
 * verify-sources.js - Verify source evidence integrity
 *
 * Usage:
 *   node verify-sources.js <case_dir>
 *   node verify-sources.js <case_dir> --json
 *
 * Checks:
 *   - All cited sources have evidence folders
 *   - All evidence files match their recorded hashes
 *   - Reports missing or corrupted evidence
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    caseDir: args.find(a => !a.startsWith('--')),
    jsonOutput: args.includes('--json')
  };
}

// This file supports CLI execution and in-process usage via `run(caseDir)`.
// CLI globals are set inside `main()` only when executed as a script.
let caseDir = null;
let jsonOutput = false;

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}

function extractSourceIds(sourcesPath) {
  if (!fs.existsSync(sourcesPath)) return [];

  const content = fs.readFileSync(sourcesPath, 'utf-8');
  const sourceIds = [];

  // Match patterns like [S001], [S002], etc.
  const matches = content.matchAll(/\[S(\d{3,4})\]/g);
  for (const match of matches) {
    const id = `S${match[1].padStart(3, '0')}`;
    if (!sourceIds.includes(id)) {
      sourceIds.push(id);
    }
  }

  return sourceIds.sort();
}

function extractCitedSourceIds(caseDir) {
  const citations = new Set();
  const pattern = /\[S(\d{3,4})\]/g;

  const filesToScan = [
    'summary.md',
    'sources.md',
    'fact-check.md',
    'positions.md',
    'people.md',
    'timeline.md',
    'theories.md',
    'statements.md',
    'organizations.md'
  ];

  const findingsDir = path.join(caseDir, 'findings');
  if (fs.existsSync(findingsDir)) {
    const findings = fs.readdirSync(findingsDir).filter(f => f.endsWith('.md'));
    filesToScan.push(...findings.map(f => `findings/${f}`));
  }

  for (const relPath of filesToScan) {
    const filePath = path.join(caseDir, relPath);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    let match;
    while ((match = pattern.exec(content)) !== null) {
      citations.add(`S${String(match[1]).padStart(3, '0')}`);
    }
  }

  return Array.from(citations).sort();
}

function verifyEvidence(caseDir, sourceId) {
  const results = {
    sourceId,
    status: 'unknown',
    evidenceDir: null,
    files: {},
    errors: []
  };

  // Check web evidence
  const webDir = path.join(caseDir, 'evidence', 'web', sourceId);
  const docPattern = new RegExp(`^${sourceId}_`);

  if (fs.existsSync(webDir)) {
    results.evidenceDir = webDir;

    // Check metadata
    const metadataPath = path.join(webDir, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        results.metadata = metadata;

        // Verify each file's hash
        if (metadata.files) {
          for (const [fileType, fileInfo] of Object.entries(metadata.files)) {
            const filePath = path.join(webDir, fileInfo.path);
            if (fs.existsSync(filePath)) {
              const actualHash = hashFile(filePath);
              const expectedHash = fileInfo.hash;

              if (actualHash === expectedHash) {
                results.files[fileType] = { status: 'valid', path: filePath };
              } else {
                results.files[fileType] = {
                  status: 'corrupted',
                  path: filePath,
                  expected: expectedHash,
                  actual: actualHash
                };
                results.errors.push(`Hash mismatch for ${fileType}`);
              }
            } else {
              results.files[fileType] = { status: 'missing', path: filePath };
              results.errors.push(`Missing file: ${fileInfo.path}`);
            }
          }
        }
      } catch (e) {
        results.errors.push(`Invalid metadata.json: ${e.message}`);
      }
    } else {
      results.errors.push('Missing metadata.json');
    }

    results.status = results.errors.length === 0 ? 'valid' : 'partial';

  } else {
    // Check documents folder
    const docsDir = path.join(caseDir, 'evidence', 'documents');
    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir).filter(f => f.startsWith(sourceId + '_'));
      if (files.length > 0) {
        results.evidenceDir = docsDir;
        results.status = 'document';
        for (const file of files) {
          if (!file.endsWith('.meta.json')) {
            results.files[file] = {
              status: 'present',
              path: path.join(docsDir, file)
            };
          }
        }
      } else {
        results.status = 'missing';
        results.errors.push('No evidence found');
      }
    } else {
      results.status = 'missing';
      results.errors.push('No evidence found');
    }
  }

  return results;
}

function run(caseDir) {
  const startTime = Date.now();

  if (!caseDir || typeof caseDir !== 'string') {
    return {
      case_dir: caseDir || null,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      passed: false,
      stats: { total: 0, valid: 0, partial: 0, document: 0, missing: 0 },
      capture_rate: 0,
      issues: [],
      sources: [],
      gaps: [{
        type: 'STATE_INCONSISTENT',
        object: { field: 'case_dir' },
        message: 'Missing case directory argument',
        suggested_actions: ['provide_case_dir']
      }]
    };
  }

  // Prefer citations (CAPTURE BEFORE CITE). Fall back to sources.md if present.
  let sourceIds = extractCitedSourceIds(caseDir);
  if (sourceIds.length === 0) {
    const sourcesPath = path.join(caseDir, 'sources.md');
    if (fs.existsSync(sourcesPath)) {
      sourceIds = extractSourceIds(sourcesPath);
    }
  }

  const stats = {
    total: sourceIds.length,
    valid: 0,
    partial: 0,
    document: 0,
    missing: 0
  };

  const sources = [];
  const gaps = [];

  for (const sourceId of sourceIds) {
    const result = verifyEvidence(caseDir, sourceId);
    const fileCount = Object.keys(result.files || {}).length;

    sources.push({
      source_id: sourceId,
      status: result.status,
      file_count: fileCount,
      errors: result.errors || []
    });

    switch (result.status) {
      case 'valid':
        stats.valid++;
        break;
      case 'document':
        stats.document++;
        break;
      case 'missing':
        stats.missing++;
        gaps.push({
          type: 'MISSING_EVIDENCE',
          object: { source_id: sourceId },
          message: `${sourceId} is cited but evidence is missing`,
          suggested_actions: ['capture_source', 'remove_citation']
        });
        break;
      case 'partial':
      default:
        stats.partial++;
        gaps.push({
          type: 'MISSING_EVIDENCE',
          object: { source_id: sourceId },
          message: `${sourceId} evidence exists but is incomplete: ${(result.errors || []).join('; ') || 'unknown error'}`,
          suggested_actions: ['recapture_source', 'fix_metadata']
        });
        break;
    }
  }

  const captureRate = stats.total > 0
    ? ((stats.valid + stats.document + stats.partial) / stats.total * 100)
    : 100;

  const passed = gaps.length === 0;
  return {
    case_dir: caseDir,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startTime,
    passed,
    stats,
    capture_rate: Math.round(captureRate * 10) / 10,
    issues: sources
      .filter(s => s.status !== 'valid' && s.status !== 'document')
      .map(s => ({ source_id: s.source_id, status: s.status, errors: s.errors })),
    sources,
    gaps
  };
}

function main() {
  const parsed = parseCliArgs(process.argv);
  caseDir = parsed.caseDir;
  jsonOutput = parsed.jsonOutput;

  if (!caseDir) {
    console.error('Usage: node verify-sources.js <case_dir> [--json]');
    process.exit(1);
  }

  if (!jsonOutput) {
    console.log('='.repeat(60));
    console.log('Source Evidence Verification Report');
    console.log('='.repeat(60));
    console.log(`Case: ${caseDir}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('');
  }

  // Prefer citations (CAPTURE BEFORE CITE). Fall back to sources.md if present.
  let sourceIds = extractCitedSourceIds(caseDir);
  if (sourceIds.length === 0) {
    const sourcesPath = path.join(caseDir, 'sources.md');
    if (fs.existsSync(sourcesPath)) {
      sourceIds = extractSourceIds(sourcesPath);
    }
  }

  if (!jsonOutput) {
    console.log(`Found ${sourceIds.length} source IDs to verify`);
    console.log('');
  }

  // Verify each source
  const stats = {
    total: sourceIds.length,
    valid: 0,
    partial: 0,
    document: 0,
    missing: 0,
    corrupted: 0
  };

  const issues = [];
  const gaps = [];

  for (const sourceId of sourceIds) {
    const result = verifyEvidence(caseDir, sourceId);

    let statusIcon, statusColor;
    switch (result.status) {
      case 'valid':
        statusIcon = '✓';
        statusColor = GREEN;
        stats.valid++;
        break;
      case 'partial':
        statusIcon = '~';
        statusColor = YELLOW;
        stats.partial++;
        issues.push(result);
        gaps.push({
          type: 'MISSING_EVIDENCE',
          object: { source_id: sourceId },
          message: `${sourceId} evidence exists but is incomplete: ${result.errors.join('; ')}`,
          suggested_actions: ['recapture_source', 'fix_metadata']
        });
        break;
      case 'document':
        statusIcon = '📄';
        statusColor = GREEN;
        stats.document++;
        break;
      case 'missing':
        statusIcon = '✗';
        statusColor = RED;
        stats.missing++;
        issues.push(result);
        gaps.push({
          type: 'MISSING_EVIDENCE',
          object: { source_id: sourceId },
          message: `${sourceId} is cited but evidence is missing`,
          suggested_actions: ['capture_source', 'remove_citation']
        });
        break;
      default:
        statusIcon = '?';
        statusColor = YELLOW;
    }

    if (!jsonOutput) {
      const fileCount = Object.keys(result.files).length;
      console.log(`${statusColor}${statusIcon}${NC} ${sourceId}: ${result.status} (${fileCount} files)`);
    }
  }

  const captureRate = stats.total > 0
    ? ((stats.valid + stats.document + stats.partial) / stats.total * 100)
    : 100;

  // Summary
  if (!jsonOutput) {
    console.log('');
  console.log('-'.repeat(60));
  console.log('Summary');
  console.log('-'.repeat(60));
  console.log(`Total sources:     ${stats.total}`);
  console.log(`${GREEN}Valid (web):       ${stats.valid}${NC}`);
  console.log(`${GREEN}Valid (document):  ${stats.document}${NC}`);
  console.log(`${YELLOW}Partial:           ${stats.partial}${NC}`);
  console.log(`${RED}Missing:           ${stats.missing}${NC}`);
  console.log('');
  console.log(`Capture rate: ${captureRate.toFixed(1)}%`);

  // List issues
  if (issues.length > 0) {
    console.log('');
    console.log('-'.repeat(60));
    console.log('Issues Requiring Attention');
    console.log('-'.repeat(60));
    for (const issue of issues) {
      console.log(`\n${issue.sourceId}:`);
      for (const error of issue.errors) {
        console.log(`  ${RED}• ${error}${NC}`);
      }
    }
  }

  }

  const passed = gaps.length === 0;
  const output = {
    case_dir: caseDir,
    timestamp: new Date().toISOString(),
    passed,
    stats,
    capture_rate: Math.round(captureRate * 10) / 10,
    issues: issues.map(i => ({ source_id: i.sourceId, status: i.status, errors: i.errors })),
    gaps
  };

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  }

  process.exit(passed ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  main();
}
