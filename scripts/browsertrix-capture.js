#!/usr/bin/env node
/**
 * browsertrix-capture.js - Web capture using Browsertrix Cloud API
 *
 * Features:
 * - Cloud-based browser automation with WARC archiving
 * - Handles anti-bot protection via real browser
 * - Auto-scroll, autoplay, site-specific behaviors
 * - Produces WARC files with full page captures
 *
 * Usage:
 *   Single URL:  node browsertrix-capture.js <source_id> <url> <evidence_dir>
 *   With wait:   node browsertrix-capture.js <source_id> <url> <evidence_dir> --wait
 *
 * Environment:
 *   BROWSERTRIX_USERNAME - Email for browsertrix.com
 *   BROWSERTRIX_PASSWORD - Password
 *   BROWSERTRIX_API_URL  - API URL (default: https://app.browsertrix.com/api)
 */

'use strict';

// Load .env from project root
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Configuration
const API_URL = process.env.BROWSERTRIX_API_URL || 'https://app.browsertrix.com/api';
const USERNAME = process.env.BROWSERTRIX_USERNAME;
const PASSWORD = process.env.BROWSERTRIX_PASSWORD;

// ANSI colors
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const NC = '\x1b[0m';

/**
 * Make HTTP request
 */
function request(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'User-Agent': 'AgenticInvestigator/1.0',
        ...headers
      }
    };

    if (data) {
      const body = typeof data === 'string' ? data : JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = lib.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(responseBody);
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: responseBody });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => reject(new Error('Request timeout')));

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Download file from URL
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const file = fs.createWriteStream(destPath);

    lib.get(url, (res) => {
      // Handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
      }

      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(destPath);
      });
    }).on('error', (err) => {
      file.close();
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

/**
 * Calculate SHA256 hash of a buffer
 */
function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Browsertrix API Client
 */
class BrowsertrixClient {
  constructor() {
    this.apiUrl = API_URL;
    this.accessToken = null;
    this.orgId = null;

    if (!USERNAME || !PASSWORD) {
      throw new Error('BROWSERTRIX_USERNAME and BROWSERTRIX_PASSWORD must be set in .env');
    }
  }

  /**
   * Authenticate and get bearer token
   */
  async authenticate() {
    console.log('Authenticating with Browsertrix...');

    const formData = `username=${encodeURIComponent(USERNAME)}&password=${encodeURIComponent(PASSWORD)}&grant_type=password`;

    const response = await request('POST', `${this.apiUrl}/auth/jwt/login`, formData, {
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    if (response.status !== 200) {
      const detail = response.data?.detail || 'Unknown error';
      throw new Error(`Authentication failed: ${detail} (HTTP ${response.status})`);
    }

    this.accessToken = response.data.access_token;
    console.log(`  ${GREEN}Authenticated as ${USERNAME}${NC}`);
    return this.accessToken;
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get default organization ID
   */
  async getDefaultOrgId() {
    const response = await request('GET', `${this.apiUrl}/users/me`, null, this.getHeaders());

    if (response.status !== 200) {
      throw new Error(`Failed to get user info: HTTP ${response.status}`);
    }

    const orgs = response.data.orgs || [];
    if (orgs.length === 0) {
      throw new Error('User has no organizations');
    }

    // Find default org or use first one
    for (const org of orgs) {
      if (org.default) {
        this.orgId = org.id;
        console.log(`  Using organization: ${org.name || this.orgId}`);
        return this.orgId;
      }
    }

    this.orgId = orgs[0].id;
    console.log(`  Using organization: ${orgs[0].name || this.orgId}`);
    return this.orgId;
  }

  /**
   * Create a crawl configuration and start capture
   */
  async createCrawl(url, options = {}) {
    const {
      name = null,
      depth = 0,
      runNow = true,
      pageLoadTimeout = 120,
      behaviorTimeout = 90,
      browserWindows = 1
    } = options;

    if (!this.orgId) {
      await this.getDefaultOrgId();
    }

    // Generate name from URL if not provided
    const parsedUrl = new URL(url);
    const crawlName = name || `Capture: ${parsedUrl.hostname}${parsedUrl.pathname.substring(0, 30)}`;

    const payload = {
      name: crawlName,
      description: `Single page capture of ${url}`,
      config: {
        seeds: [{ url: url }],
        depth: depth,
        limit: depth === 0 ? 1 : 0,
        behaviors: 'autoscroll,autoplay,autofetch,siteSpecific',
        blockAds: true,
        pageLoadTimeout: pageLoadTimeout,
        behaviorTimeout: behaviorTimeout
      },
      runNow: runNow,
      crawlerChannel: 'default',
      browserWindows: browserWindows,
      tags: ['api-capture', 'agentic-investigator']
    };

    const response = await request(
      'POST',
      `${this.apiUrl}/orgs/${this.orgId}/crawlconfigs/`,
      payload,
      this.getHeaders()
    );

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Failed to create crawl: ${JSON.stringify(response.data)} (HTTP ${response.status})`);
    }

    const result = response.data;
    console.log(`  Created crawl config: ${result.id}`);
    if (result.run_now_job) {
      console.log(`  Started crawl job: ${result.run_now_job}`);
    }

    return result;
  }

  /**
   * Get crawl status
   */
  async getCrawlStatus(crawlId) {
    if (!this.orgId) {
      await this.getDefaultOrgId();
    }

    const response = await request(
      'GET',
      `${this.apiUrl}/orgs/${this.orgId}/crawls/${crawlId}/replay.json`,
      null,
      this.getHeaders()
    );

    if (response.status !== 200) {
      throw new Error(`Failed to get crawl status: HTTP ${response.status}`);
    }

    return response.data;
  }

  /**
   * Get crawl details including files (uses all-crawls endpoint for resources)
   */
  async getCrawlDetails(crawlId) {
    if (!this.orgId) {
      await this.getDefaultOrgId();
    }

    // Use all-crawls endpoint to get resources with download URLs
    const response = await request(
      'GET',
      `${this.apiUrl}/orgs/${this.orgId}/all-crawls/${crawlId}`,
      null,
      this.getHeaders()
    );

    if (response.status !== 200) {
      throw new Error(`Failed to get crawl details: HTTP ${response.status}`);
    }

    return response.data;
  }

  /**
   * Wait for crawl to complete
   */
  async waitForCrawl(crawlId, timeout = 600, pollInterval = 10) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout * 1000) {
      try {
        const status = await this.getCrawlStatus(crawlId);
        const state = status.state;

        process.stdout.write(`\r  Crawl status: ${state}       `);

        if (['complete', 'stopped', 'canceled', 'failed'].includes(state)) {
          console.log('');
          return status;
        }
      } catch (err) {
        if (!err.message.includes('404')) {
          throw err;
        }
        process.stdout.write('\r  Crawl not ready yet...     ');
      }

      await new Promise(r => setTimeout(r, pollInterval * 1000));
    }

    throw new Error(`Crawl did not complete within ${timeout} seconds`);
  }

  /**
   * Get WACZ file download URLs (WACZ = combined WARC archive)
   */
  async getWaczUrls(crawlId) {
    const details = await this.getCrawlDetails(crawlId);
    const resources = details.resources || [];

    return resources
      .filter(r => r.name && r.name.endsWith('.wacz'))
      .map(r => ({
        filename: r.name,
        size: r.size,
        hash: r.hash,
        // path contains pre-signed S3 URL
        url: r.path
      }));
  }
}

/**
 * Capture a single URL using Browsertrix
 */
async function captureUrl(sourceId, url, evidenceDir, options = {}) {
  const { wait = true, timeout = 600 } = options;
  const startTime = Date.now();
  const errors = [];

  console.log(`[${sourceId}] Capturing via Browsertrix: ${url.substring(0, 60)}...`);

  fs.mkdirSync(evidenceDir, { recursive: true });

  const client = new BrowsertrixClient();

  try {
    // Authenticate
    await client.authenticate();

    // Create and start crawl
    const crawlResult = await client.createCrawl(url, {
      name: `${sourceId}: ${new URL(url).hostname}`,
      depth: 0,
      runNow: true
    });

    const crawlId = crawlResult.run_now_job;
    if (!crawlId) {
      throw new Error('Crawl job was not started');
    }

    let finalStatus = { state: 'started', crawlId };
    let waczFiles = [];

    if (wait) {
      // Wait for completion
      console.log('  Waiting for capture to complete...');
      finalStatus = await client.waitForCrawl(crawlId, timeout);

      if (finalStatus.state === 'complete') {
        // Get WACZ file URLs (WACZ = combined WARC archive)
        console.log('  Getting WACZ files...');
        waczFiles = await client.getWaczUrls(crawlId);
        console.log(`  Found ${waczFiles.length} WACZ file(s)`);

        // Download WACZ files (pre-signed URLs, no auth needed)
        for (const wacz of waczFiles) {
          const waczPath = path.join(evidenceDir, wacz.filename);
          console.log(`  Downloading: ${wacz.filename} (${(wacz.size / 1024).toFixed(1)} KB)`);

          try {
            await downloadFile(wacz.url, waczPath);
            console.log(`    ${GREEN}Downloaded${NC}`);
          } catch (err) {
            console.log(`    ${RED}Failed: ${err.message}${NC}`);
            errors.push(`WACZ download failed: ${err.message}`);
          }
        }
      } else {
        errors.push(`Crawl ended with state: ${finalStatus.state}`);
      }
    }

    // Build WACZ file entries
    const waczFileEntries = {};
    for (const wacz of waczFiles) {
      const waczPath = path.join(evidenceDir, wacz.filename);
      if (fs.existsSync(waczPath)) {
        const content = fs.readFileSync(waczPath);
        waczFileEntries['wacz_' + wacz.filename.replace('.wacz', '')] = {
          path: wacz.filename,
          hash: `sha256:${hashBuffer(content)}`,
          size: content.length
        };
      }
    }

    // Merge with existing metadata if present (e.g., from firecrawl)
    const metadataPath = path.join(evidenceDir, 'metadata.json');
    let existingMeta = {};
    if (fs.existsSync(metadataPath)) {
      try {
        existingMeta = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      } catch (e) {
        // Ignore parse errors
      }
    }

    const metadata = {
      ...existingMeta,
      source_id: sourceId,
      url: url,
      // Keep original captured_at if exists, add browsertrix timestamp
      captured_at: existingMeta.captured_at || new Date().toISOString(),
      browsertrix_captured_at: new Date().toISOString(),
      browsertrix_duration_ms: Date.now() - startTime,
      // Keep original method, note browsertrix was also used
      method: existingMeta.method ? `${existingMeta.method}+browsertrix` : 'browsertrix',
      browsertrix_crawl_id: crawlId,
      browsertrix_state: finalStatus.state,
      // Merge files
      files: { ...(existingMeta.files || {}), ...waczFileEntries },
      errors: errors.length > 0 ? [...(existingMeta.errors || []), ...errors] : existingMeta.errors
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    const success = finalStatus.state === 'complete' && errors.length === 0;
    console.log(`  ${success ? GREEN + 'OK' : RED + 'PARTIAL'}${NC} Captured (${Object.keys(waczFileEntries).length} WACZ files, ${Date.now() - startTime}ms)`);

    return {
      success,
      sourceId,
      crawlId,
      state: finalStatus.state,
      files: Object.keys(waczFileEntries),
      errors
    };

  } catch (err) {
    console.error(`  ${RED}FAIL${NC} Error: ${err.message}`);
    errors.push(err.message);

    // Save error metadata
    const metadata = {
      source_id: sourceId,
      url: url,
      captured_at: new Date().toISOString(),
      method: 'browsertrix',
      files: {},
      errors: errors
    };

    fs.writeFileSync(
      path.join(evidenceDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    return { success: false, sourceId, error: err.message, errors };
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: node browsertrix-capture.js <source_id> <url> <evidence_dir> [--wait] [--no-wait]');
    console.error('');
    console.error('Options:');
    console.error('  --wait      Wait for crawl to complete (default)');
    console.error('  --no-wait   Start crawl and exit immediately');
    process.exit(1);
  }

  const sourceId = args[0];
  const url = args[1];
  const evidenceDir = args[2];
  const wait = !args.includes('--no-wait');

  const result = await captureUrl(sourceId, url, evidenceDir, { wait });
  process.exit(result.success ? 0 : 1);
}

module.exports = { captureUrl, BrowsertrixClient };

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
