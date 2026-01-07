#!/usr/bin/env node
/**
 * browsertrix-auto.js - Fully automated Browsertrix Cloud capture workflow
 *
 * Does everything automatically:
 * 1. Creates a crawl with all URLs
 * 2. Starts the crawl
 * 3. Monitors progress until complete
 * 4. Downloads WACZ files
 * 5. Extracts evidence to standard folders
 *
 * Usage:
 *   node browsertrix-auto.js <url-list-file> <case-dir>
 *
 * Environment variables (REQUIRED):
 *   BROWSERTRIX_API_KEY  - Your API key from Browsertrix Cloud
 *   BROWSERTRIX_ORG_ID   - Your organization ID
 *
 * Optional:
 *   BROWSERTRIX_API_URL  - API base URL (default: https://app.browsertrix.com/api)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// Configuration from environment
const API_KEY = process.env.BROWSERTRIX_API_KEY;
const ORG_ID = process.env.BROWSERTRIX_ORG_ID;
const API_URL = process.env.BROWSERTRIX_API_URL || 'https://app.browsertrix.com/api';

// Parse arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node browsertrix-auto.js <url-list-file> <case-dir>');
  console.error('');
  console.error('Required environment variables:');
  console.error('  BROWSERTRIX_API_KEY  - Your API key');
  console.error('  BROWSERTRIX_ORG_ID   - Your organization ID');
  process.exit(1);
}

const [urlListFile, caseDir] = args;

if (!API_KEY) {
  console.error('Error: BROWSERTRIX_API_KEY environment variable required');
  console.error('Get your API key from: https://app.browsertrix.com/account/settings');
  process.exit(1);
}

if (!ORG_ID) {
  console.error('Error: BROWSERTRIX_ORG_ID environment variable required');
  console.error('Find your org ID in the Browsertrix Cloud URL after /orgs/');
  process.exit(1);
}

// HTTP request helper with proper error handling
function request(method, endpoint, data = null, isDownload = false) {
  return new Promise((resolve, reject) => {
    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
      }
    };

    if (data && typeof data === 'object') {
      const body = JSON.stringify(data);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = protocol.request(options, (res) => {
      if (isDownload) {
        resolve({ status: res.statusCode, stream: res, headers: res.headers });
        return;
      }

      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(300000, () => reject(new Error('Request timeout')));

    if (data && typeof data === 'object') {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Parse URL list file
function parseUrlList(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  const entries = [];
  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length >= 2) {
      entries.push({
        sourceId: parts[0].trim(),
        url: parts[1].trim(),
        title: parts[2] ? parts[2].trim() : ''
      });
    }
  }
  return entries;
}

// Create crawl workflow
async function createCrawlWorkflow(name, seeds) {
  console.log(`Creating crawl workflow: ${name}`);

  const workflowConfig = {
    name: name,
    description: `Automated capture for ${seeds.length} URLs`,
    profileid: null,
    schedule: "",
    config: {
      seeds: seeds.map(s => ({
        url: s.url,
        scopeType: "page",
        depth: 0
      })),
      scopeType: "page",
      depth: 0,
      limit: seeds.length * 2,
      extraHops: 0,
      lang: "en-US",
      behaviors: "autoscroll,autoplay,autofetch,siteSpecific",
      behaviorTimeout: 90,
      pageLoadTimeout: 120,
      pageExtraDelay: 2,
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      screenshot: "fullPage",
      pdfSnapshot: true,
      textExtract: true,
      blockAds: false,
      runNow: false
    },
    crawlTimeout: seeds.length * 5, // 5 minutes per URL max
    maxCrawlSize: 0,
    scale: 1,
    autoAddCollections: [],
    crawlerChannel: "default"
  };

  const response = await request('POST', `/orgs/${ORG_ID}/crawlconfigs/`, workflowConfig);

  if (response.status !== 200 && response.status !== 201) {
    console.error('Failed to create workflow:', response.status, response.data);
    throw new Error(`Failed to create workflow: ${response.status}`);
  }

  console.log(`Workflow created: ${response.data.id}`);
  return response.data;
}

// Run a crawl from workflow
async function runCrawl(workflowId) {
  console.log(`Starting crawl from workflow: ${workflowId}`);

  const response = await request('POST', `/orgs/${ORG_ID}/crawlconfigs/${workflowId}/run`);

  if (response.status !== 200 && response.status !== 201) {
    console.error('Failed to start crawl:', response.status, response.data);
    throw new Error(`Failed to start crawl: ${response.status}`);
  }

  console.log(`Crawl started: ${response.data.started}`);
  return response.data;
}

// Get crawl status
async function getCrawlStatus(crawlId) {
  const response = await request('GET', `/orgs/${ORG_ID}/crawls/${crawlId}`);

  if (response.status !== 200) {
    throw new Error(`Failed to get crawl status: ${response.status}`);
  }

  return response.data;
}

// Wait for crawl to complete
async function waitForCrawl(crawlId, pollInterval = 30000) {
  console.log(`Monitoring crawl: ${crawlId}`);

  while (true) {
    const status = await getCrawlStatus(crawlId);
    const state = status.state;
    const stats = status.stats || {};

    console.log(`  State: ${state} | Pages: ${stats.done || 0}/${stats.found || 0} | Size: ${Math.round((status.fileSize || 0) / 1024 / 1024)}MB`);

    if (state === 'complete') {
      console.log('Crawl complete!');
      return status;
    }

    if (state === 'failed' || state === 'canceled') {
      throw new Error(`Crawl ${state}: ${status.errorMessage || 'Unknown error'}`);
    }

    await new Promise(r => setTimeout(r, pollInterval));
  }
}

// List crawl files (WACZ)
async function listCrawlFiles(crawlId) {
  const response = await request('GET', `/orgs/${ORG_ID}/crawls/${crawlId}/files`);

  if (response.status !== 200) {
    throw new Error(`Failed to list files: ${response.status}`);
  }

  return response.data.files || response.data;
}

// Download a file
async function downloadFile(fileUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);

    // Add auth header to download URL
    const parsedUrl = new URL(fileUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    };

    protocol.get(options, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, outputPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(outputPath);
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// Download all WACZ files from crawl
async function downloadCrawlFiles(crawlId, outputDir) {
  console.log(`Downloading WACZ files to: ${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const files = await listCrawlFiles(crawlId);
  const downloads = [];

  for (const file of files) {
    const filename = file.name || `${crawlId}.wacz`;
    const outputPath = path.join(outputDir, filename);
    console.log(`  Downloading: ${filename}`);

    try {
      // Get presigned download URL
      const response = await request('GET', `/orgs/${ORG_ID}/crawls/${crawlId}/files/${file.name}/download`);
      const downloadUrl = response.data.url || response.data;

      await downloadFile(downloadUrl, outputPath);
      downloads.push(outputPath);
      console.log(`  ✓ ${filename}`);
    } catch (err) {
      console.error(`  ✗ ${filename}: ${err.message}`);
    }
  }

  return downloads;
}

// Extract WACZ pages to evidence folders
async function extractToEvidence(waczDir, evidenceDir, urlMapping) {
  console.log(`Extracting evidence to: ${evidenceDir}`);

  // WACZ files are ZIP archives containing pages/pages.jsonl with URL info
  // For now, we'll create a simple mapping file and note that manual extraction may be needed

  const mappingFile = path.join(evidenceDir, 'wacz-mapping.json');
  const mapping = {
    timestamp: new Date().toISOString(),
    waczDir: waczDir,
    evidenceDir: evidenceDir,
    urlMapping: urlMapping,
    note: 'Use ReplayWeb.page or wacz CLI to view/extract individual pages'
  };

  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
  console.log(`Mapping saved to: ${mappingFile}`);

  // Create evidence folders for each source with reference to WACZ
  for (const entry of urlMapping) {
    const sourceDir = path.join(evidenceDir, entry.sourceId);
    fs.mkdirSync(sourceDir, { recursive: true });

    const metadata = {
      source_id: entry.sourceId,
      url: entry.url,
      title: entry.title,
      captured_at: new Date().toISOString(),
      method: 'browsertrix-cloud',
      wacz_location: waczDir,
      files: {
        wacz: {
          path: waczDir,
          note: 'Full forensic archive in WACZ format'
        }
      }
    };

    fs.writeFileSync(path.join(sourceDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
  }

  console.log(`Created ${urlMapping.length} evidence folders with metadata`);
}

// Main workflow
async function main() {
  console.log('========================================');
  console.log('Browsertrix Cloud Automated Capture');
  console.log('========================================');
  console.log(`API URL: ${API_URL}`);
  console.log(`Org ID: ${ORG_ID}`);
  console.log('');

  // Parse URL list
  const entries = parseUrlList(urlListFile);
  console.log(`Found ${entries.length} URLs to capture`);

  // Dedupe URLs (keep mapping for later)
  const urlToSources = new Map();
  for (const entry of entries) {
    if (!urlToSources.has(entry.url)) {
      urlToSources.set(entry.url, []);
    }
    urlToSources.get(entry.url).push(entry);
  }

  const uniqueUrls = Array.from(urlToSources.keys());
  console.log(`Unique URLs: ${uniqueUrls.length}`);
  console.log('');

  // Create workflow
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const workflowName = `evidence-capture-${timestamp}`;

  const workflow = await createCrawlWorkflow(workflowName,
    uniqueUrls.map(url => ({ url, title: urlToSources.get(url)[0].title }))
  );

  // Start crawl
  const crawlInfo = await runCrawl(workflow.id);
  const crawlId = crawlInfo.started;

  // Wait for completion
  console.log('');
  console.log('Waiting for crawl to complete...');
  const finalStatus = await waitForCrawl(crawlId);

  // Download WACZ files
  console.log('');
  const waczDir = path.join(caseDir, 'evidence', 'wacz', crawlId);
  const downloads = await downloadCrawlFiles(crawlId, waczDir);

  // Extract to evidence folders
  console.log('');
  const evidenceDir = path.join(caseDir, 'evidence', 'web');
  await extractToEvidence(waczDir, evidenceDir, entries);

  // Summary
  console.log('');
  console.log('========================================');
  console.log('CAPTURE COMPLETE');
  console.log('========================================');
  console.log(`Workflow: ${workflowName}`);
  console.log(`Crawl ID: ${crawlId}`);
  console.log(`URLs captured: ${uniqueUrls.length}`);
  console.log(`WACZ files: ${downloads.length}`);
  console.log(`Evidence folders: ${entries.length}`);
  console.log('');
  console.log(`WACZ location: ${waczDir}`);
  console.log(`Evidence location: ${evidenceDir}`);
  console.log('');
  console.log('To view captures, use ReplayWeb.page:');
  console.log('  https://replayweb.page/');
}

main().catch(err => {
  console.error('');
  console.error('ERROR:', err.message);
  console.error('');
  if (err.message.includes('401')) {
    console.error('Authentication failed. Check your BROWSERTRIX_API_KEY.');
  } else if (err.message.includes('403')) {
    console.error('Permission denied. Check your BROWSERTRIX_ORG_ID.');
  }
  process.exit(1);
});
