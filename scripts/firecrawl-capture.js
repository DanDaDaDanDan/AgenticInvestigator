#!/usr/bin/env node
/**
 * firecrawl-capture.js - Web capture using Firecrawl API (markdown only)
 *
 * Usage:
 *   Single URL:  node firecrawl-capture.js <source_id> <url> <evidence_dir>
 *   Batch:       node firecrawl-capture.js --batch <url-list> <case-dir>
 *
 * Environment:
 *   FIRECRAWL_API_KEY - Required API key from firecrawl.dev (or in .env)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const logger = require('./logger').create('firecrawl');

const API_KEY = process.env.FIRECRAWL_API_KEY;
const API_URL = 'https://api.firecrawl.dev/v1/scrape';

const args = process.argv.slice(2);

if (!API_KEY) {
  console.error('Error: FIRECRAWL_API_KEY environment variable required');
  console.error('Get your API key from: https://app.firecrawl.dev');
  process.exit(1);
}

function post(url, data) {
  const op = logger.operation('firecrawlAPI', { url: data.url?.substring(0, 50) });

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

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(responseBody);
          op.success({ status: res.statusCode });
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          op.success({ status: res.statusCode, parseError: true });
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', err => { op.fail(err); reject(err); });
    req.setTimeout(180000, () => {
      const err = new Error('Request timeout (180s)');
      op.fail(err);
      reject(err);
    });
    req.write(body);
    req.end();
  });
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Capture signature for verification
const CAPTURE_SALT = 'firecrawl-capture-2026';

function generateCaptureSignature(sourceId, url, capturedAt, files) {
  const fileHashes = Object.values(files).map(f => f.hash).filter(Boolean).sort().join('|');
  const input = ['v2', sourceId, url, capturedAt, fileHashes, CAPTURE_SALT].join(':');
  return `sig_v2_${crypto.createHash('sha256').update(input).digest('hex').slice(0, 32)}`;
}

async function captureUrl(sourceId, url, evidenceDir, attempt = 1) {
  const startTime = Date.now();
  logger.info(`Capturing ${sourceId} (attempt ${attempt})`, { url });
  console.log(`[${sourceId}] Capturing: ${url.substring(0, 60)}...`);

  fs.mkdirSync(evidenceDir, { recursive: true });

  try {
    // Only request markdown and links
    const response = await post(API_URL, {
      url: url,
      formats: ['markdown', 'links'],
      waitFor: 3000,
      timeout: 120000
    });

    if (response.status === 429) {
      if (attempt < 3) {
        const waitTime = 60000 * attempt;
        console.log(`  Rate limited, waiting ${waitTime / 1000}s...`);
        await new Promise(r => setTimeout(r, waitTime));
        return captureUrl(sourceId, url, evidenceDir, attempt + 1);
      }
      throw new Error('Rate limit exceeded after retries');
    }

    if (response.status !== 200) {
      throw new Error(`API error ${response.status}: ${JSON.stringify(response.data)}`);
    }

    const result = response.data;
    if (!result.success) {
      throw new Error(`Scrape failed: ${result.error || 'Unknown error'}`);
    }

    const data = result.data || result;
    const files = {};

    // Save markdown
    if (data.markdown) {
      const mdPath = path.join(evidenceDir, 'content.md');
      fs.writeFileSync(mdPath, data.markdown);
      files.markdown = {
        path: 'content.md',
        hash: `sha256:${hashBuffer(Buffer.from(data.markdown))}`,
        size: Buffer.byteLength(data.markdown)
      };
    }

    // Save links
    if (data.links && Array.isArray(data.links) && data.links.length > 0) {
      const linksPath = path.join(evidenceDir, 'links.json');
      const linksContent = JSON.stringify(data.links, null, 2);
      fs.writeFileSync(linksPath, linksContent);
      files.links = {
        path: 'links.json',
        hash: `sha256:${hashBuffer(Buffer.from(linksContent))}`,
        count: data.links.length
      };
    }

    // Create metadata
    const capturedAt = new Date().toISOString();
    const metadata = {
      source_id: sourceId,
      url: url,
      title: data.metadata?.title || '',
      description: data.metadata?.description || '',
      captured_at: capturedAt,
      capture_duration_ms: Date.now() - startTime,
      files: files,
      _capture_signature: generateCaptureSignature(sourceId, url, capturedAt, files)
    };

    fs.writeFileSync(path.join(evidenceDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    const duration = Date.now() - startTime;
    console.log(`  OK Captured (${Object.keys(files).length} files, ${duration}ms)`);

    return { success: true, sourceId, files: Object.keys(files) };

  } catch (err) {
    console.error(`  FAIL Error: ${err.message}`);

    if (attempt < 3 && (err.message.includes('timeout') || err.message.includes('ECONNRESET'))) {
      console.log(`  Retrying (attempt ${attempt + 1})...`);
      await new Promise(r => setTimeout(r, 5000 * attempt));
      return captureUrl(sourceId, url, evidenceDir, attempt + 1);
    }

    const metadata = {
      source_id: sourceId,
      url: url,
      captured_at: new Date().toISOString(),
      files: {},
      errors: [err.message]
    };
    fs.writeFileSync(path.join(evidenceDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

    return { success: false, sourceId, error: err.message };
  }
}

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

async function batchCapture(urlListFile, caseDir) {
  const entries = parseUrlList(urlListFile);
  console.log(`Found ${entries.length} URLs to capture\n`);

  const results = { success: [], failed: [], skipped: [] };

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const evidenceDir = path.join(caseDir, 'evidence', 'web', entry.sourceId);

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

    if (i < entries.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\nSuccess: ${results.success.length}, Skipped: ${results.skipped.length}, Failed: ${results.failed.length}`);
  return results;
}

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
      process.exit(1);
    }
    const result = await captureUrl(args[0], args[1], args[2]);
    process.exit(result.success ? 0 : 1);
  }
}

module.exports = { run: captureUrl, captureUrl, batchCapture };

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
