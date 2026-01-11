#!/usr/bin/env node
/**
 * verify-sources.js - Verify source evidence integrity
 *
 * Usage:
 *   node scripts/verify-sources.js <case_dir>
 *   node scripts/verify-sources.js <case_dir> --json
 *   node scripts/verify-sources.js <case_dir> --fix
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
const config = require('./lib/config-loader');

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    caseDir: args.find(a => !a.startsWith('--')),
    jsonOutput: args.includes('--json'),
    fix: args.includes('--fix')
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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function manifestKeyForFilename(filename) {
  const lower = String(filename || '').toLowerCase();
  if (!lower) return 'file';
  if (lower.startsWith('capture.')) return lower.slice('capture.'.length).replace(/[^a-z0-9]+/g, '_');
  if (lower === 'content.md') return 'content_md';
  if (lower === 'extracted_text.txt') return 'extracted_text';
  return lower.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function computeFilesManifest(webDir) {
  const files = {};
  if (!fs.existsSync(webDir)) return files;

  const entries = fs.readdirSync(webDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name === 'metadata.json') continue;

    const filePath = path.join(webDir, entry.name);
    const stats = fs.statSync(filePath);

    const baseKey = manifestKeyForFilename(entry.name) || 'file';
    let key = baseKey;
    let counter = 2;
    while (Object.prototype.hasOwnProperty.call(files, key)) {
      key = `${baseKey}_${counter++}`;
    }

    files[key] = {
      path: entry.name,
      hash: hashFile(filePath),
      size: stats.size
    };
  }

  return files;
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

  const filesToScan = [...config.files_to_scan];

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

function verifyEvidence(caseDir, sourceId, options = {}) {
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

        if (!isPlainObject(metadata)) {
          results.errors.push('metadata.json must be a JSON object');
          results.status = 'partial';
          return results;
        }

        const metaSourceId = typeof metadata.source_id === 'string'
          ? metadata.source_id
          : (typeof metadata.sourceId === 'string' ? metadata.sourceId : null);

        if (!metaSourceId) {
          results.errors.push('metadata.json missing source_id');
        } else if (metaSourceId !== sourceId) {
          results.errors.push(`metadata.json source_id (${metaSourceId}) does not match folder (${sourceId})`);
        }

        let filesManifest = metadata.files;
        let hasFilesManifest = isPlainObject(filesManifest) && Object.keys(filesManifest).length > 0;

        const contentHash = typeof metadata.content_hash === 'string' ? metadata.content_hash.trim() : null;

        // Evidence Folder Contract:
        // - metadata.json must contain hashes under `files` OR an explicit `content_hash` for content.md.
        if (!hasFilesManifest && contentHash) {
          const contentPath = path.join(webDir, 'content.md');
          if (!fs.existsSync(contentPath)) {
            results.errors.push('metadata.json has content_hash but content.md is missing');
          } else if (!contentHash.startsWith('sha256:')) {
            results.errors.push('metadata.content_hash must start with sha256:');
          } else {
            const actual = hashFile(contentPath);
            if (actual !== contentHash) {
              results.errors.push('content.md hash does not match metadata.content_hash');
              results.files.content_md = { status: 'corrupted', path: contentPath, expected: contentHash, actual };
            } else {
              results.files.content_md = { status: 'valid', path: contentPath };
            }
          }
        }

        if (!hasFilesManifest && !contentHash) {
          if (options.fix === true) {
            const computed = computeFilesManifest(webDir);
            if (Object.keys(computed).length > 0) {
              metadata.files = computed;
              fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
              filesManifest = computed;
              hasFilesManifest = true;
            } else {
              results.errors.push('metadata.json missing files manifest and no payload files found to hash');
            }
          } else {
            results.errors.push('metadata.json missing `files` hash manifest (run with --fix to backfill from payload)');
          }
        }

        // Verify each file's hash
        if (hasFilesManifest) {
          for (const [fileType, fileInfo] of Object.entries(filesManifest)) {
            if (!isPlainObject(fileInfo)) {
              results.errors.push(`Invalid metadata.files entry for ${fileType}`);
              continue;
            }

            const relPath = fileInfo.path;
            const expectedHash = fileInfo.hash;
            if (typeof relPath !== 'string' || !relPath) {
              results.errors.push(`metadata.files.${fileType}.path missing`);
              continue;
            }
            if (typeof expectedHash !== 'string' || !expectedHash) {
              results.errors.push(`metadata.files.${fileType}.hash missing`);
              continue;
            }
            if (!expectedHash.startsWith('sha256:')) {
              results.errors.push(`metadata.files.${fileType}.hash must start with sha256:`);
              continue;
            }

            const filePath = path.join(webDir, relPath);
            if (!fs.existsSync(filePath)) {
              results.files[fileType] = { status: 'missing', path: filePath };
              results.errors.push(`Missing file: ${relPath}`);
              continue;
            }

            const actualHash = hashFile(filePath);
            if (actualHash === expectedHash) {
              results.files[fileType] = { status: 'valid', path: filePath };
            } else {
              results.files[fileType] = { status: 'corrupted', path: filePath, expected: expectedHash, actual: actualHash };
              results.errors.push(`Hash mismatch for ${fileType}`);
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

function run(caseDir, options = {}) {
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
    const result = verifyEvidence(caseDir, sourceId, options);
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
    ? ((stats.valid + stats.document) / stats.total * 100)
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
  const fix = parsed.fix;

  if (!caseDir) {
    console.error('Usage: node scripts/verify-sources.js <case_dir> [--json] [--fix]');
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
    const result = verifyEvidence(caseDir, sourceId, { fix });

    let statusIcon, statusColor;
    switch (result.status) {
      case 'valid':
        statusIcon = 'OK';
        statusColor = GREEN;
        stats.valid++;
        break;
      case 'partial':
        statusIcon = 'WARN';
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
        statusIcon = 'DOC';
        statusColor = GREEN;
        stats.document++;
        break;
      case 'missing':
        statusIcon = 'MISS';
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
        statusIcon = 'ERR';
        statusColor = YELLOW;
    }

    if (!jsonOutput) {
      const fileCount = Object.keys(result.files).length;
      console.log(`${statusColor}${statusIcon}${NC} ${sourceId}: ${result.status} (${fileCount} files)`);
    }
  }

  const captureRate = stats.total > 0
    ? ((stats.valid + stats.document) / stats.total * 100)
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
        console.log(`  ${RED}- ${error}${NC}`);
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
