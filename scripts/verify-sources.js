#!/usr/bin/env node
/**
 * verify-sources.js - Verify source evidence integrity
 *
 * Usage: node verify-sources.js <case_dir>
 *
 * Checks:
 *   - All sources in sources.md have evidence folders
 *   - All evidence files match their recorded hashes
 *   - Reports missing or corrupted evidence
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node verify-sources.js <case_dir>');
  process.exit(1);
}

const caseDir = args[0];

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
  if (!fs.existsSync(sourcesPath)) {
    console.error(`${RED}sources.md not found: ${sourcesPath}${NC}`);
    return [];
  }

  const content = fs.readFileSync(sourcesPath, 'utf-8');
  const sourceIds = [];

  // Match patterns like [S001], [S002], etc.
  const matches = content.matchAll(/\[S(\d+)\]/g);
  for (const match of matches) {
    const id = `S${match[1].padStart(3, '0')}`;
    if (!sourceIds.includes(id)) {
      sourceIds.push(id);
    }
  }

  return sourceIds.sort();
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

function main() {
  console.log('='.repeat(60));
  console.log('Source Evidence Verification Report');
  console.log('='.repeat(60));
  console.log(`Case: ${caseDir}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');

  // Extract source IDs from sources.md
  const sourcesPath = path.join(caseDir, 'sources.md');
  const sourceIds = extractSourceIds(sourcesPath);

  console.log(`Found ${sourceIds.length} source IDs in sources.md`);
  console.log('');

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
        break;
      default:
        statusIcon = '?';
        statusColor = YELLOW;
    }

    const fileCount = Object.keys(result.files).length;
    console.log(`${statusColor}${statusIcon}${NC} ${sourceId}: ${result.status} (${fileCount} files)`);
  }

  // Summary
  console.log('');
  console.log('-'.repeat(60));
  console.log('Summary');
  console.log('-'.repeat(60));
  console.log(`Total sources:     ${stats.total}`);
  console.log(`${GREEN}Valid (web):       ${stats.valid}${NC}`);
  console.log(`${GREEN}Valid (document):  ${stats.document}${NC}`);
  console.log(`${YELLOW}Partial:           ${stats.partial}${NC}`);
  console.log(`${RED}Missing:           ${stats.missing}${NC}`);

  const captureRate = ((stats.valid + stats.document + stats.partial) / stats.total * 100).toFixed(1);
  console.log('');
  console.log(`Capture rate: ${captureRate}%`);

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

  // Output JSON for programmatic use
  console.log('');
  console.log('-'.repeat(60));
  console.log('JSON Summary');
  console.log('-'.repeat(60));
  console.log(JSON.stringify({
    case_dir: caseDir,
    timestamp: new Date().toISOString(),
    stats,
    capture_rate: parseFloat(captureRate),
    issues: issues.map(i => ({ source_id: i.sourceId, errors: i.errors }))
  }, null, 2));

  process.exit(stats.missing > 0 ? 1 : 0);
}

main();
