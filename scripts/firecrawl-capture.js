#!/usr/bin/env node
/**
 * firecrawl-capture.js - Web capture using Firecrawl API
 *
 * Features:
 * - Excellent bot bypass (Cloudflare, Akamai, etc.)
 * - Returns HTML, screenshot (PNG), PDF in one call
 * - Full JavaScript rendering
 * - Automatic retry with backoff
 *
 * Usage:
 *   Single URL:  node firecrawl-capture.js <source_id> <url> <evidence_dir>
 *   Batch:       node firecrawl-capture.js --batch <url-list> <case-dir>
 *
 * Environment:
 *   FIRECRAWL_API_KEY - Required API key from firecrawl.dev (or in .env)
 *   LOG_LEVEL=debug|info|warn|error (default: info)
 *   LOG_FILE=path/to/file.log (enables file logging)
 */

// Load .env from project root
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const logger = require('./logger').create('firecrawl');

const API_KEY = process.env.FIRECRAWL_API_KEY;
const API_URL = 'https://api.firecrawl.dev/v1/scrape';

// Parse arguments
const args = process.argv.slice(2);

if (!API_KEY) {
  console.error('Error: FIRECRAWL_API_KEY environment variable required');
  console.error('Get your API key from: https://app.firecrawl.dev');
  process.exit(1);
}

// HTTP POST request
function post(url, data) {
  const op = logger.operation('firecrawlAPI', { url: data.url?.substring(0, 50) });
  logger.debug('Sending request to Firecrawl API', {
    endpoint: url,
    formats: data.formats,
    timeout: data.timeout
  });

  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    logger.debug(`Connecting to ${parsedUrl.hostname}...`);
    const req = https.request(options, (res) => {
      logger.debug(`Response received: HTTP ${res.statusCode}`);
      let responseBody = '';
      let receivedBytes = 0;

      res.on('data', chunk => {
        responseBody += chunk;
        receivedBytes += chunk.length;
        // Log every 100KB
        if (receivedBytes % 100000 < chunk.length) {
          logger.debug(`Receiving response: ${receivedBytes} bytes...`);
        }
      });

      res.on('end', () => {
        logger.debug(`Response complete: ${receivedBytes} bytes total`);
        try {
          const json = JSON.parse(responseBody);
          op.success({ status: res.statusCode, bytes: receivedBytes });
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          logger.warn(`Response is not JSON (${receivedBytes} bytes)`);
          op.success({ status: res.statusCode, bytes: receivedBytes, parseError: true });
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', err => {
      logger.error('Request error', err);
      op.fail(err);
      reject(err);
    });
    req.setTimeout(180000, () => {
      const err = new Error('Request timeout (180s)');
      logger.error('Request timeout after 180 seconds');
      op.fail(err);
      reject(err);
    });
    req.write(body);
    req.end();
    logger.debug('Request sent, waiting for response...');
  });
}

// Calculate SHA256 hash
function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Save base64 data to file
function saveBase64(base64Data, filePath) {
  // Handle data URL format
  let data = base64Data;
  if (data.includes(',')) {
    data = data.split(',')[1];
  }
  const buffer = Buffer.from(data, 'base64');
  fs.writeFileSync(filePath, buffer);
  return buffer;
}

// Capture single URL via Firecrawl
async function captureUrl(sourceId, url, evidenceDir, attempt = 1) {
  const op = logger.operation('captureUrl', { sourceId, url: url.substring(0, 60), attempt });
  const startTime = Date.now();
  const errors = [];

  logger.info(`Capturing ${sourceId} (attempt ${attempt})`, { url });
  console.log(`[${sourceId}] Capturing: ${url.substring(0, 60)}...`);

  logger.debug(`Creating evidence directory: ${evidenceDir}`);
  fs.mkdirSync(evidenceDir, { recursive: true });

  try {
    // Call Firecrawl API (v2 format)
    logger.debug('Calling Firecrawl API with formats: html, rawHtml, markdown, screenshot');
    const response = await post(API_URL, {
      url: url,
      formats: ['html', 'rawHtml', 'markdown', 'screenshot@fullPage'],
      waitFor: 3000,
      timeout: 120000
    });
    logger.debug(`API response status: ${response.status}`);

    if (response.status === 429) {
      // Rate limited - wait and retry
      if (attempt < 3) {
        const waitTime = 60000 * attempt;
        logger.warn(`Rate limited, waiting ${waitTime / 1000}s before retry...`);
        console.log(`  Rate limited, waiting ${waitTime / 1000}s...`);
        await new Promise(r => setTimeout(r, waitTime));
        return captureUrl(sourceId, url, evidenceDir, attempt + 1);
      }
      const err = new Error('Rate limit exceeded after retries');
      op.fail(err);
      throw err;
    }

    if (response.status !== 200) {
      const err = new Error(`API error ${response.status}: ${JSON.stringify(response.data)}`);
      op.fail(err);
      throw err;
    }

    const result = response.data;

    if (!result.success) {
      const err = new Error(`Scrape failed: ${result.error || 'Unknown error'}`);
      op.fail(err);
      throw err;
    }

    const data = result.data || result;
    const files = {};
    logger.debug('Processing capture results');

    // Save HTML
    if (data.html || data.rawHtml) {
      const htmlPath = path.join(evidenceDir, 'capture.html');
      const htmlContent = data.html || data.rawHtml;
      fs.writeFileSync(htmlPath, htmlContent);
      files.html = {
        path: 'capture.html',
        hash: `sha256:${hashBuffer(Buffer.from(htmlContent))}`,
        size: Buffer.byteLength(htmlContent)
      };
      logger.debug(`Saved HTML: ${files.html.size} bytes`);
    }

    // Save markdown
    if (data.markdown) {
      const mdPath = path.join(evidenceDir, 'capture.md');
      fs.writeFileSync(mdPath, data.markdown);
      files.markdown = {
        path: 'capture.md',
        hash: `sha256:${hashBuffer(Buffer.from(data.markdown))}`,
        size: Buffer.byteLength(data.markdown)
      };
      logger.debug(`Saved markdown: ${files.markdown.size} bytes`);
    }

    // Save screenshot
    if (data.screenshot) {
      const pngPath = path.join(evidenceDir, 'capture.png');
      const pngBuffer = saveBase64(data.screenshot, pngPath);
      files.png = {
        path: 'capture.png',
        hash: `sha256:${hashBuffer(pngBuffer)}`,
        size: pngBuffer.length
      };
      logger.debug(`Saved screenshot: ${files.png.size} bytes`);
    }

    // Note: Firecrawl v1 API doesn't include PDF directly
    // We'll generate PDF from HTML using Playwright in a separate step

    // Create metadata
    const metadata = {
      source_id: sourceId,
      url: url,
      title: data.metadata?.title || '',
      description: data.metadata?.description || '',
      captured_at: new Date().toISOString(),
      capture_duration_ms: Date.now() - startTime,
      method: 'firecrawl',
      firecrawl_version: 'v1',
      http_status: data.metadata?.statusCode || 200,
      files: files,
      errors: errors.length > 0 ? errors : undefined
    };

    fs.writeFileSync(
      path.join(evidenceDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    logger.debug('Saved metadata.json');

    const duration = Date.now() - startTime;
    logger.info(`Capture successful: ${sourceId}`, {
      files: Object.keys(files).length,
      duration_ms: duration
    });
    console.log(`  OK Captured (${Object.keys(files).length} files, ${duration}ms)`);
    op.success({ files: Object.keys(files).length, duration_ms: duration });

    return { success: true, sourceId, files: Object.keys(files) };

  } catch (err) {
    logger.error(`Capture failed for ${sourceId}`, err);
    console.error(`  FAIL Error: ${err.message}`);
    errors.push(err.message);

    // Retry on transient errors
    if (attempt < 3 && (err.message.includes('timeout') || err.message.includes('ECONNRESET'))) {
      logger.info(`Retrying ${sourceId} after transient error (attempt ${attempt + 1})`);
      console.log(`  Retrying (attempt ${attempt + 1})...`);
      await new Promise(r => setTimeout(r, 5000 * attempt));
      return captureUrl(sourceId, url, evidenceDir, attempt + 1);
    }

    // Save error metadata
    logger.debug('Saving error metadata');
    const metadata = {
      source_id: sourceId,
      url: url,
      captured_at: new Date().toISOString(),
      method: 'firecrawl',
      http_status: null,
      files: {},
      errors: errors
    };

    fs.writeFileSync(
      path.join(evidenceDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    op.fail(err);
    return { success: false, sourceId, error: err.message };
  }
}

// Parse URL list file
function parseUrlList(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(line => {
      const parts = line.split('|');
      return {
        sourceId: parts[0]?.trim() || '',
        url: parts[1]?.trim() || line,
        title: parts[2]?.trim() || ''
      };
    })
    .filter(e => e.url);
}

// Batch capture
async function batchCapture(urlListFile, caseDir) {
  const entries = parseUrlList(urlListFile);
  console.log(`Found ${entries.length} URLs to capture`);
  console.log('');

  const results = { success: [], failed: [], skipped: [] };
  const startTime = Date.now();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const evidenceDir = path.join(caseDir, 'evidence', 'web', entry.sourceId);

    // Skip if already captured successfully
    const metaPath = path.join(evidenceDir, 'metadata.json');
    if (fs.existsSync(metaPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (Object.keys(meta.files || {}).length > 0 && !meta.errors) {
          console.log(`[${i + 1}/${entries.length}] SKIP ${entry.sourceId} - already captured`);
          results.skipped.push(entry);
          continue;
        }
      } catch (e) {}
    }

    console.log(`[${i + 1}/${entries.length}]`);
    const result = await captureUrl(entry.sourceId, entry.url, evidenceDir);

    if (result.success) {
      results.success.push(entry);
    } else {
      results.failed.push({ ...entry, error: result.error });
    }

    // Rate limiting: wait between requests
    if (i < entries.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('='.repeat(60));
  console.log('FIRECRAWL BATCH CAPTURE SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total time: ${elapsed}s`);
  console.log(`Success: ${results.success.length}`);
  console.log(`Skipped: ${results.skipped.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('');
    console.log('Failed captures:');
    for (const f of results.failed) {
      console.log(`  ${f.sourceId}: ${f.error}`);
    }
  }

  // Save results
  const resultsFile = path.join(caseDir, 'firecrawl-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    elapsed_seconds: parseFloat(elapsed),
    results
  }, null, 2));

  console.log(`\nResults saved to: ${resultsFile}`);

  return results;
}

// Main
async function main() {
  if (args[0] === '--batch') {
    if (args.length < 3) {
      console.error('Usage: node firecrawl-capture.js --batch <url-list> <case-dir>');
      process.exit(1);
    }
    await batchCapture(args[1], args[2]);
  } else {
    if (args.length < 3) {
      console.error('Usage: node firecrawl-capture.js <source_id> <url> <evidence_dir>');
      console.error('       node firecrawl-capture.js --batch <url-list> <case-dir>');
      process.exit(1);
    }
    const result = await captureUrl(args[0], args[1], args[2]);
    process.exit(result.success ? 0 : 1);
  }
}

// Export for programmatic use
module.exports = { run: captureUrl, captureUrl, batchCapture };

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
