#!/usr/bin/env node
/**
 * capture-url.js - Capture web page evidence for source verification
 *
 * Usage: node scripts/capture-url.js <source_id> <url> <evidence_dir>
 *
 * Creates:
 *   - capture.png (full-page screenshot)
 *   - capture.pdf (PDF rendering)
 *   - capture.html (raw HTML source)
 *   - metadata.json (capture metadata with hashes)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Calculate SHA-256 hash of a file
function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Submit URL to Wayback Machine
async function submitToWayback(url) {
  return new Promise((resolve) => {
    const saveUrl = `https://web.archive.org/save/${url}`;
    https.get(saveUrl, { timeout: 10000 }, (res) => {
      // Check for the archived URL in headers
      const archiveUrl = res.headers['content-location'] || res.headers['location'];
      resolve({
        submitted: true,
        status: res.statusCode,
        archiveUrl: archiveUrl ? `https://web.archive.org${archiveUrl}` : null
      });
    }).on('error', (err) => {
      resolve({ submitted: false, error: err.message });
    }).on('timeout', () => {
      resolve({ submitted: false, error: 'timeout' });
    });
  });
}

// Fetch raw HTML via HTTP (fallback if Playwright fails)
async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ html: data, status: res.statusCode }));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

async function run(sourceId, url, evidenceDir, options = {}) {
  const startTime = new Date();
  const errors = [];

  // Create evidence directory
  fs.mkdirSync(evidenceDir, { recursive: true });

  const log = options.quiet === true ? () => {} : (options.log || console.log);
  const warn = options.quiet === true ? () => {} : (options.warn || console.warn);
  const errLog = options.quiet === true ? () => {} : (options.error || console.error);

  // Validate URL
  try {
    new URL(url);
  } catch (_) {
    return {
      success: false,
      source_id: sourceId,
      url,
      evidence_dir: evidenceDir,
      files: [],
      errors: [`Invalid URL: ${url}`]
    };
  }

  log(`Capturing ${sourceId}: ${url}`);
  log(`Evidence directory: ${evidenceDir}`);

  let browser;
  let pageTitle = '';
  let httpStatus = null;
  let playwrightVersion = null;

  try {
    let chromium = null;
    try {
      ({ chromium } = require('playwright'));
      try {
        playwrightVersion = require('playwright/package.json').version;
      } catch (_) {}
    } catch (e) {
      errors.push(`Playwright not installed: ${e.message}`);
    }

    if (!chromium) {
      throw new Error('Playwright unavailable');
    }

    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    // Navigate to URL
    log('Loading page...');
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    httpStatus = response ? response.status() : null;
    pageTitle = await page.title();

    log(`Page loaded: "${pageTitle}" (HTTP ${httpStatus})`);

    // Wait a bit for any lazy-loaded content
    await page.waitForTimeout(2000);

    // Capture screenshot (full page)
    log('Capturing screenshot...');
    const screenshotPath = path.join(evidenceDir, 'capture.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png'
    });
    log(`  Screenshot: ${screenshotPath}`);

    // Capture PDF
    log('Capturing PDF...');
    const pdfPath = path.join(evidenceDir, 'capture.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
    });
    log(`  PDF: ${pdfPath}`);

    // Capture HTML
    log('Capturing HTML...');
    const htmlPath = path.join(evidenceDir, 'capture.html');
    const htmlContent = await page.content();
    fs.writeFileSync(htmlPath, htmlContent);
    log(`  HTML: ${htmlPath}`);

    await browser.close();

  } catch (err) {
    if (err.message !== 'Playwright unavailable') {
      errors.push(`Playwright capture failed: ${err.message}`);
      errLog(`Playwright error: ${err.message}`);
    }

    if (browser) {
      await browser.close().catch(() => {});
    }

    // Fallback: try to at least get HTML via HTTP
    log('Attempting fallback HTML fetch...');
    try {
      const { html, status } = await fetchHtml(url);
      httpStatus = status;
      const htmlPath = path.join(evidenceDir, 'capture.html');
      fs.writeFileSync(htmlPath, html);
      log(`  Fallback HTML saved: ${htmlPath}`);
    } catch (fetchErr) {
      errors.push(`Fallback fetch failed: ${fetchErr.message}`);
    }
  }

  // Submit to Wayback Machine (async, don't block on it)
  log('Submitting to Wayback Machine...');
  const waybackResult = await submitToWayback(url);
  if (waybackResult.submitted) {
    log(`  Wayback: submitted (status ${waybackResult.status})`);
    if (waybackResult.archiveUrl) {
      log(`  Archive URL: ${waybackResult.archiveUrl}`);
    }
  } else {
    warn(`  Wayback: failed (${waybackResult.error})`);
    errors.push(`Wayback submission failed: ${waybackResult.error}`);
  }

  // Calculate hashes for all captured files
  log('Calculating hashes...');
  const files = {};
  const filesToHash = ['capture.png', 'capture.pdf', 'capture.html'];

  for (const filename of filesToHash) {
    const filePath = path.join(evidenceDir, filename);
    if (fs.existsSync(filePath)) {
      const hash = hashFile(filePath);
      const stats = fs.statSync(filePath);
      files[filename.replace('capture.', '')] = {
        path: filename,
        hash: `sha256:${hash}`,
        size: stats.size
      };
      log(`  ${filename}: sha256:${hash.substring(0, 16)}...`);
    }
  }

  // Create metadata
  const metadata = {
    source_id: sourceId,
    url: url,
    title: pageTitle,
    captured_at: startTime.toISOString(),
    capture_duration_ms: Date.now() - startTime.getTime(),
    method: playwrightVersion ? 'playwright' : 'http_fallback',
    playwright_version: playwrightVersion || undefined,
    viewport: { width: 1920, height: 1080 },
    http_status: httpStatus,
    files: files,
    wayback: waybackResult,
    errors: errors.length > 0 ? errors : undefined
  };

  // Write metadata
  const metadataPath = path.join(evidenceDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  log(`Metadata: ${metadataPath}`);

  return {
    success: errors.length === 0 || Object.keys(files).length > 0,
    source_id: sourceId,
    url,
    title: pageTitle,
    http_status: httpStatus,
    evidence_dir: evidenceDir,
    files: Object.keys(files),
    errors,
    metadata_path: metadataPath,
    wayback: waybackResult
  };
}

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    sourceId: args[0],
    url: args[1],
    evidenceDir: args[2]
  };
}

async function cli() {
  const { sourceId, url, evidenceDir } = parseCliArgs(process.argv);
  if (!sourceId || !url || !evidenceDir) {
    console.error('Usage: node scripts/capture-url.js <source_id> <url> <evidence_dir>');
    console.error('Example: node scripts/capture-url.js S001 https://example.com cases/my-case/evidence/web/S001');
    process.exit(1);
  }

  const result = await run(sourceId, url, evidenceDir);

  console.log('\n--- Capture Summary ---');
  console.log(`Source ID: ${result.source_id}`);
  console.log(`URL: ${result.url}`);
  console.log(`Title: ${result.title || ''}`);
  console.log(`HTTP Status: ${result.http_status}`);
  console.log(`Files captured: ${result.files.length}`);
  console.log(`Errors: ${result.errors.length}`);

  console.log('\n--- JSON Output ---');
  console.log(JSON.stringify(result, null, 2));

  process.exit(result.success ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  cli().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
