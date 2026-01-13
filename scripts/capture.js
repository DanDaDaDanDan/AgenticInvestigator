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
 *
 * Environment variables for debugging:
 *   LOG_LEVEL=debug|info|warn|error (default: info)
 *   LOG_FILE=path/to/file.log (enables file logging)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const logger = require('./logger').create('capture');

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

  throw new Error('Could not resolve case directory. Provide [case_dir|case_id] or set active case by writing case-id to cases/.active');
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
  const op = logger.operation('downloadToFile', { url, filePath });

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const proto = parsed.protocol === 'https:' ? https : http;
    logger.debug(`Connecting to ${parsed.hostname} via ${parsed.protocol}`);

    const req = proto.get(parsed, { timeout: 60_000 }, res => {
      logger.debug(`Response: HTTP ${res.statusCode}`);

      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        logger.debug(`Redirecting to: ${res.headers.location}`);
        res.destroy();
        return resolve(downloadToFile(res.headers.location, filePath));
      }

      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        const err = new Error(`HTTP ${res.statusCode}`);
        op.fail(err);
        return reject(err);
      }

      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const out = fs.createWriteStream(filePath);
      const hash = crypto.createHash('sha256');
      let bytes = 0;

      res.on('data', chunk => {
        bytes += chunk.length;
        hash.update(chunk);
        if (bytes % 100000 < chunk.length) {
          logger.debug(`Downloaded ${bytes} bytes...`);
        }
      });

      res.pipe(out);
      out.on('finish', () => {
        out.close(() => {
          const result = { size: bytes, hash: `sha256:${hash.digest('hex')}` };
          op.success({ bytes, hash: result.hash.slice(0, 20) + '...' });
          resolve(result);
        });
      });

      out.on('error', err => {
        op.fail(err);
        reject(err);
      });
    });

    req.on('error', err => {
      op.fail(err);
      reject(err);
    });
    req.on('timeout', () => {
      const err = new Error('timeout');
      op.fail(err);
      req.destroy(err);
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
  const op = logger.operation('captureWeb', { sourceId, url });
  logger.info(`Capturing web source ${sourceId} from ${url}`);

  const evidenceDir = path.join(caseDir, 'evidence', 'web', sourceId);
  logger.debug(`Evidence directory: ${evidenceDir}`);

  try {
    const result = await require('./firecrawl-capture').run(sourceId, url, evidenceDir);
    if (result.success) {
      op.success({ files: result.files ? Object.keys(result.files).length : 0 });
    } else {
      op.fail(new Error(result.error || 'capture failed'), { errors: result.errors });
    }
    return result;
  } catch (err) {
    op.fail(err);
    throw err;
  }
}

async function captureDocument(sourceId, url, filename, caseDir) {
  const op = logger.operation('captureDocument', { sourceId, url, filename });
  logger.info(`Capturing document ${sourceId} from ${url}`);

  const docDir = path.join(caseDir, 'evidence', 'documents');
  fs.mkdirSync(docDir, { recursive: true });
  logger.debug(`Document directory: ${docDir}`);

  const baseName = filename
    ? safeFilename(filename)
    : safeFilename(path.basename(new URL(url).pathname) || `${sourceId}.bin`);

  const finalName = `${sourceId}_${baseName || 'document'}`;
  const filePath = path.join(docDir, finalName);
  logger.debug(`Target file: ${filePath}`);

  try {
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
    logger.debug(`Metadata written to ${filePath}.meta.json`);

    op.success({ size, hash: hash.slice(0, 20) + '...' });
    return { success: true, source_id: sourceId, url, file_path: filePath, size, hash };
  } catch (err) {
    op.fail(err);
    throw err;
  }
}

async function main() {
  logger.info('capture.js started', { args: process.argv.slice(2) });
  const mainOp = logger.operation('main');

  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const isDoc = args[0] === '--document' || args[0] === '-d';
  if (isDoc) {
    logger.info('Document capture mode');
    const sourceId = args[1];
    const url = args[2];
    let filename = null;
    let maybeCase = null;

    // Try to interpret argv[3] as case id/dir when it resolves to an existing case directory.
    if (args[3]) {
      const explicitCaseDir = resolveCaseDirFromExplicit(args[3]);
      if (explicitCaseDir) {
        maybeCase = args[3];
        logger.debug(`Resolved case from arg[3]: ${maybeCase}`);
      } else {
        filename = args[3];
        maybeCase = args[4] || null;
        logger.debug(`Using filename from arg[3]: ${filename}, case: ${maybeCase}`);
      }
    }

    if (!sourceId || !url) {
      logger.error('Missing required arguments: sourceId and url');
      printUsage();
      process.exit(1);
    }

    const caseDir = resolveCaseDir(maybeCase);
    logger.info(`Document capture: ${sourceId}`, { url, caseDir });
    console.log(`Downloading document for ${sourceId}`);
    console.log(`  URL: ${url}`);
    console.log(`  Case: ${caseDir}`);

    const result = await captureDocument(sourceId, url, filename, caseDir);
    console.log(`Saved: ${result.file_path}`);
    console.log(`Hash: ${result.hash}`);
    mainOp.success({ sourceId, type: 'document' });
    process.exit(0);
  }

  const sourceId = args[0];
  const url = args[1];
  const maybeCase = args[2];

  if (!sourceId || !url) {
    logger.error('Missing required arguments: sourceId and url');
    printUsage();
    process.exit(1);
  }

  const caseDir = resolveCaseDir(maybeCase);
  logger.info(`Web capture: ${sourceId}`, { url, caseDir });
  console.log(`Capturing ${sourceId}`);
  console.log(`  URL: ${url}`);
  console.log(`  Case: ${caseDir}`);

  const result = await captureWeb(sourceId, url, caseDir);
  console.log(`Success: ${result.success}`);
  if (result.errors && result.errors.length > 0) {
    logger.warn(`Capture completed with errors`, { errorCount: result.errors.length });
    console.log(`Errors: ${result.errors.length}`);
  }

  if (result.success) {
    mainOp.success({ sourceId, type: 'web' });
  } else {
    mainOp.fail(new Error('capture failed'));
  }
  process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
  main().catch(err => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  });
}
