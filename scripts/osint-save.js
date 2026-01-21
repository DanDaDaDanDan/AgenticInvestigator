#!/usr/bin/env node
/**
 * osint-save.js - Save osint_get output as verifiable evidence
 *
 * Converts mcp-osint osint_get response to standard evidence format with
 * hash verification support to prevent source fabrication.
 *
 * Usage:
 *   node scripts/osint-save.js <source_id> <case_dir> <json_file>
 *   node scripts/osint-save.js <source_id> <case_dir> --stdin
 *   node scripts/osint-save.js <source_id> <case_dir> --url <url> --markdown <md_file> [--title "Title"]
 *
 * Input JSON format (osint_get response - save FULL response):
 *   {
 *     "format": "markdown",
 *     "content": "# Article...",      // Markdown content
 *     "raw_html": "<html>...",        // CRITICAL: Raw HTML for verification
 *     "metadata": {
 *       "url": "https://...",
 *       "title": "Page Title",
 *       "sha256": "abc123...",        // Hash from osint_get
 *       "size_bytes": 12345,
 *       "captured_at": "..."
 *     },
 *     "links": ["url1", "url2"],
 *     "provenance": { "source": "firecrawl", "method": "scrape", "cache_hit": false }
 *   }
 *
 * Output (evidence/S###/):
 *   - content.md (markdown for reading)
 *   - raw.html (original HTML for verification)
 *   - links.json (extracted links)
 *   - metadata.json (with verification block and capture signature)
 *
 * Verification: The SHA256 of raw.html should match metadata.sha256 from osint_get.
 * This proves the content was actually fetched, not fabricated.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger').create('osint-save');

// Capture signature generation for evidence verification
const CAPTURE_SALT = 'osint-capture-2026';

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function generateCaptureSignature(sourceId, url, capturedAt, files) {
  const fileHashes = Object.values(files).map(f => f.hash).filter(Boolean).sort().join('|');
  const input = ['v2', sourceId, url, capturedAt, fileHashes, CAPTURE_SALT].join(':');
  return `sig_v2_${crypto.createHash('sha256').update(input).digest('hex').slice(0, 32)}`;
}

function projectRoot() {
  return path.join(__dirname, '..');
}

function resolveCaseDir(maybeCase) {
  if (!maybeCase) {
    throw new Error('Case directory required');
  }

  // Try as absolute path
  if (path.isAbsolute(maybeCase) && fs.existsSync(maybeCase)) {
    return maybeCase;
  }

  // Try as relative path from project root
  const candidatePath = path.join(projectRoot(), maybeCase);
  if (fs.existsSync(candidatePath)) {
    return candidatePath;
  }

  // Try as case ID
  const byId = path.join(projectRoot(), 'cases', maybeCase);
  if (fs.existsSync(byId)) {
    return byId;
  }

  throw new Error(`Cannot resolve case directory: ${maybeCase}`);
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      let chunk;
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk;
      }
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function saveEvidence(sourceId, caseDir, osintData) {
  const op = logger.operation('saveEvidence', { sourceId, url: osintData.url?.substring(0, 50) });
  const startTime = Date.now();

  const evidenceDir = path.join(caseDir, 'evidence', sourceId);
  fs.mkdirSync(evidenceDir, { recursive: true });

  const files = {};
  let verificationFile = null;
  let verificationHash = null;

  // Save raw_html for web pages (CRITICAL for verification)
  // osint_get computes SHA256 of raw_html, so we need this to verify
  if (osintData.raw_html) {
    const rawPath = path.join(evidenceDir, 'raw.html');
    const rawBuffer = Buffer.from(osintData.raw_html);
    fs.writeFileSync(rawPath, rawBuffer);
    files.raw_html = {
      path: 'raw.html',
      hash: `sha256:${hashBuffer(rawBuffer)}`,
      size: rawBuffer.length
    };
    verificationFile = 'raw.html';
    verificationHash = files.raw_html.hash;
    logger.debug(`Saved raw.html (${rawBuffer.length} bytes)`);
  }

  // Save markdown content (for reading)
  if (osintData.markdown || osintData.content) {
    const mdPath = path.join(evidenceDir, 'content.md');
    const mdContent = osintData.markdown || osintData.content;
    const mdBuffer = Buffer.from(mdContent);
    fs.writeFileSync(mdPath, mdBuffer);
    files.content = {
      path: 'content.md',
      hash: `sha256:${hashBuffer(mdBuffer)}`,
      size: mdBuffer.length
    };
    // If no raw_html, use content.md for verification (resource_id case)
    if (!verificationFile) {
      verificationFile = 'content.md';
      verificationHash = files.content.hash;
    }
    logger.debug(`Saved content.md (${mdBuffer.length} bytes)`);
  }

  // Save links
  if (osintData.links && Array.isArray(osintData.links) && osintData.links.length > 0) {
    const linksPath = path.join(evidenceDir, 'links.json');
    const linksContent = JSON.stringify(osintData.links, null, 2);
    const linksBuffer = Buffer.from(linksContent);
    fs.writeFileSync(linksPath, linksBuffer);
    files.links = {
      path: 'links.json',
      hash: `sha256:${hashBuffer(linksBuffer)}`,
      count: osintData.links.length
    };
    logger.debug(`Saved links.json (${osintData.links.length} links)`);
  }

  // Extract osint_get's reported hash (from metadata.sha256)
  const osintReportedHash = osintData.metadata?.sha256
    ? (osintData.metadata.sha256.startsWith('sha256:') ? osintData.metadata.sha256 : `sha256:${osintData.metadata.sha256}`)
    : null;

  // Generate metadata with verification block
  const capturedAt = new Date().toISOString();
  const metadata = {
    source_id: sourceId,
    url: osintData.url || '',
    title: osintData.title || osintData.metadata?.title || '',
    description: osintData.description || osintData.metadata?.description || '',
    captured_at: capturedAt,
    capture_duration_ms: Date.now() - startTime,
    capture_method: 'osint_get',
    files: files,
    // Verification block - enables hash verification
    verification: {
      raw_file: verificationFile,
      computed_hash: verificationHash,
      osint_reported_hash: osintReportedHash,
      verified: osintReportedHash ? (verificationHash === osintReportedHash) : null
    },
    // Provenance from osint_get response
    provenance: osintData.provenance || null,
    _capture_signature: generateCaptureSignature(sourceId, osintData.url || '', capturedAt, files)
  };

  fs.writeFileSync(path.join(evidenceDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  logger.debug(`Saved metadata.json`);

  // Initialize empty claim-support.json for claim verification tracking
  const claimSupportPath = path.join(evidenceDir, 'claim-support.json');
  if (!fs.existsSync(claimSupportPath)) {
    const claimSupport = {
      source_id: sourceId,
      verified_at: null,
      source_content_hash: verificationHash,
      claims_verified: []
    };
    fs.writeFileSync(claimSupportPath, JSON.stringify(claimSupport, null, 2));
    logger.debug(`Initialized claim-support.json`);
  }

  // Warn if hash mismatch
  if (osintReportedHash && verificationHash !== osintReportedHash) {
    logger.warn(`Hash mismatch for ${sourceId}: computed=${verificationHash}, osint_reported=${osintReportedHash}`);
  }

  op.success({ files: Object.keys(files).length, verified: metadata.verification.verified });

  return {
    success: true,
    sourceId,
    evidenceDir,
    files: Object.keys(files),
    verified: metadata.verification.verified
  };
}

function printUsage() {
  console.log('osint-save.js - Save osint_get web page output as evidence');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/osint-save.js <source_id> <case_dir> <json_file>  (RECOMMENDED)');
  console.log('  node scripts/osint-save.js <source_id> <case_dir> --url <url> --markdown <md_file>');
  console.log('  node scripts/osint-save.js <source_id> <case_dir> --stdin      (Unix only)');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/osint-save.js S001 cases/my-case osint-output.json');
  console.log('  node scripts/osint-save.js S001 cases/my-case --url https://example.com --markdown content.md --title "Title"');
  console.log('');
  console.log('NOTE: On Windows, always use the JSON file method. Stdin/echo breaks JSON escaping.');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const sourceId = args[0];
  const maybeCaseDir = args[1];

  if (!sourceId || !maybeCaseDir) {
    console.error('Error: source_id and case_dir are required');
    printUsage();
    process.exit(1);
  }

  const caseDir = resolveCaseDir(maybeCaseDir);
  logger.info(`Saving evidence ${sourceId} to ${caseDir}`);

  let osintData;

  // Mode 1: --stdin
  if (args[2] === '--stdin') {
    logger.debug('Reading from stdin');
    const stdinData = await readStdin();
    try {
      osintData = JSON.parse(stdinData);
    } catch (e) {
      console.error('Error: Invalid JSON from stdin');
      process.exit(1);
    }
  }
  // Mode 2: --url with --markdown
  else if (args[2] === '--url') {
    osintData = { url: args[3] };

    // Parse remaining args
    for (let i = 4; i < args.length; i += 2) {
      const flag = args[i];
      const value = args[i + 1];

      if (flag === '--markdown' && value) {
        const mdPath = path.isAbsolute(value) ? value : path.join(process.cwd(), value);
        if (fs.existsSync(mdPath)) {
          osintData.markdown = fs.readFileSync(mdPath, 'utf-8');
        } else {
          console.error(`Error: Markdown file not found: ${value}`);
          process.exit(1);
        }
      } else if (flag === '--title') {
        osintData.title = value;
      } else if (flag === '--links' && value) {
        const linksPath = path.isAbsolute(value) ? value : path.join(process.cwd(), value);
        if (fs.existsSync(linksPath)) {
          osintData.links = JSON.parse(fs.readFileSync(linksPath, 'utf-8'));
        }
      }
    }
  }
  // Mode 3: JSON file
  else if (args[2]) {
    const jsonPath = path.isAbsolute(args[2]) ? args[2] : path.join(process.cwd(), args[2]);
    if (!fs.existsSync(jsonPath)) {
      console.error(`Error: JSON file not found: ${args[2]}`);
      process.exit(1);
    }
    try {
      osintData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (e) {
      console.error(`Error: Invalid JSON in file: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.error('Error: No input specified');
    printUsage();
    process.exit(1);
  }

  // Validate osintData
  if (!osintData.markdown && !osintData.url) {
    console.error('Error: Input must contain at least url or markdown');
    process.exit(1);
  }

  console.log(`Saving evidence ${sourceId}`);
  console.log(`  URL: ${osintData.url || '(not provided)'}`);
  console.log(`  Case: ${caseDir}`);

  const result = await saveEvidence(sourceId, caseDir, osintData);

  console.log(`  Files: ${result.files.join(', ')}`);
  console.log(`  Saved to: ${result.evidenceDir}`);

  process.exit(0);
}

// Export for programmatic use
module.exports = { saveEvidence };

if (require.main === module) {
  main().catch(err => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
