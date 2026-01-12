#!/usr/bin/env node
/**
 * capture.js - Cross-platform capture wrapper (Node).
 *
 * Mirrors the bash `scripts/capture` interface, but works in vanilla Windows too.
 *
 * Usage:
 *   node scripts/capture.js <source_id> <url> [case_dir|case_id]
 *   node scripts/capture.js --document <source_id> <url> [filename] [case_dir|case_id]
 *
 * Case resolution order:
 *   1) explicit case_dir arg (existing directory)
 *   2) explicit case_id arg (cases/<case_id>)
 *   3) cases/.active
 *   4) current directory (if it looks like a case dir)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

function projectRoot() {
  return path.join(__dirname, '..');
}

function readActiveCaseId() {
  const activePath = path.join(projectRoot(), 'cases', '.active');
  if (!fs.existsSync(activePath)) return null;
  const raw = fs.readFileSync(activePath, 'utf-8').trim();
  return raw ? raw : null;
}

function looksLikeCaseDir(dir) {
  return fs.existsSync(path.join(dir, 'sources.md')) || fs.existsSync(path.join(dir, 'state.json'));
}

function resolveCaseDir(maybeCase) {
  if (maybeCase && typeof maybeCase === 'string') {
    const candidatePath = path.isAbsolute(maybeCase) ? maybeCase : path.join(projectRoot(), maybeCase);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) return candidatePath;

    // Treat as case id
    const byId = path.join(projectRoot(), 'cases', maybeCase);
    if (fs.existsSync(byId) && fs.statSync(byId).isDirectory()) return byId;
  }

  const active = readActiveCaseId();
  if (active) {
    const byActive = path.join(projectRoot(), 'cases', active);
    if (fs.existsSync(byActive) && fs.statSync(byActive).isDirectory()) return byActive;
    throw new Error(`cases/.active points to missing directory: cases/${active}`);
  }

  const cwd = process.cwd();
  if (looksLikeCaseDir(cwd)) return cwd;

  throw new Error('Could not resolve case directory. Provide [case_dir|case_id] or set active case with: node scripts/active-case.js set <case-id>');
}

function resolveCaseDirFromExplicit(maybeCase) {
  if (!maybeCase || typeof maybeCase !== 'string') return null;
  const candidatePath = path.isAbsolute(maybeCase) ? maybeCase : path.join(projectRoot(), maybeCase);
  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) return candidatePath;
  const byId = path.join(projectRoot(), 'cases', maybeCase);
  if (fs.existsSync(byId) && fs.statSync(byId).isDirectory()) return byId;
  return null;
}

function safeFilename(name) {
  return String(name)
    .replace(/[<>:"/\\\\|?*]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 180);
}

function downloadToFile(url, filePath) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const proto = parsed.protocol === 'https:' ? https : http;

    const req = proto.get(parsed, { timeout: 60_000 }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.destroy();
        return resolve(downloadToFile(res.headers.location, filePath));
      }

      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const out = fs.createWriteStream(filePath);
      const hash = crypto.createHash('sha256');
      let bytes = 0;

      res.on('data', chunk => {
        bytes += chunk.length;
        hash.update(chunk);
      });

      res.pipe(out);
      out.on('finish', () => {
        out.close(() => {
          resolve({ size: bytes, hash: `sha256:${hash.digest('hex')}` });
        });
      });

      out.on('error', reject);
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });
  });
}

function printUsage() {
  console.log('capture.js - Capture URL evidence for source verification');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/capture.js <source_id> <url> [case_dir|case_id]');
  console.log('  node scripts/capture.js --document <source_id> <url> [filename] [case_dir|case_id]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/capture.js S001 https://example.com/article cases/my-case');
  console.log('  node scripts/capture.js --document S015 https://sec.gov/filing.pdf 10k.pdf cases/my-case');
}

async function captureWeb(sourceId, url, caseDir) {
  const evidenceDir = path.join(caseDir, 'evidence', 'web', sourceId);
  const result = await require('./firecrawl-capture').run(sourceId, url, evidenceDir);
  return result;
}

async function captureDocument(sourceId, url, filename, caseDir) {
  const docDir = path.join(caseDir, 'evidence', 'documents');
  fs.mkdirSync(docDir, { recursive: true });

  const baseName = filename
    ? safeFilename(filename)
    : safeFilename(path.basename(new URL(url).pathname) || `${sourceId}.bin`);

  const finalName = `${sourceId}_${baseName || 'document'}`;
  const filePath = path.join(docDir, finalName);

  const { size, hash } = await downloadToFile(url, filePath);

  const meta = {
    source_id: sourceId,
    url,
    filename: finalName,
    downloaded_at: new Date().toISOString(),
    size,
    hash
  };
  fs.writeFileSync(`${filePath}.meta.json`, JSON.stringify(meta, null, 2));

  return { success: true, source_id: sourceId, url, file_path: filePath, size, hash };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const isDoc = args[0] === '--document' || args[0] === '-d';
  if (isDoc) {
    const sourceId = args[1];
    const url = args[2];
    let filename = null;
    let maybeCase = null;

    // Try to interpret argv[3] as case id/dir when it resolves to an existing case directory.
    if (args[3]) {
      const explicitCaseDir = resolveCaseDirFromExplicit(args[3]);
      if (explicitCaseDir) {
        maybeCase = args[3];
      } else {
        filename = args[3];
        maybeCase = args[4] || null;
      }
    }

    if (!sourceId || !url) {
      printUsage();
      process.exit(1);
    }

    const caseDir = resolveCaseDir(maybeCase);
    console.log(`Downloading document for ${sourceId}`);
    console.log(`  URL: ${url}`);
    console.log(`  Case: ${caseDir}`);

    const result = await captureDocument(sourceId, url, filename, caseDir);
    console.log(`Saved: ${result.file_path}`);
    console.log(`Hash: ${result.hash}`);
    process.exit(0);
  }

  const sourceId = args[0];
  const url = args[1];
  const maybeCase = args[2];

  if (!sourceId || !url) {
    printUsage();
    process.exit(1);
  }

  const caseDir = resolveCaseDir(maybeCase);
  console.log(`Capturing ${sourceId}`);
  console.log(`  URL: ${url}`);
  console.log(`  Case: ${caseDir}`);

  const result = await captureWeb(sourceId, url, caseDir);
  console.log(`Success: ${result.success}`);
  if (result.errors && result.errors.length > 0) {
    console.log(`Errors: ${result.errors.length}`);
  }
  process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(err => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
