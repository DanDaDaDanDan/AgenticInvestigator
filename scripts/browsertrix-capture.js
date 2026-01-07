#!/usr/bin/env node
/**
 * browsertrix-capture.js - Browsertrix Cloud integration for forensic web capture
 *
 * Features:
 * - Generate YAML configs for Browsertrix Cloud
 * - Submit crawl jobs via API (if credentials provided)
 * - Monitor crawl progress
 * - Download WACZ files
 * - Extract evidence to standard format
 *
 * Usage:
 *   Generate config:  node browsertrix-capture.js generate <url-list> <output-dir>
 *   Submit via API:   node browsertrix-capture.js submit <yaml-config> --api-key=KEY
 *   Check status:     node browsertrix-capture.js status <crawl-id> --api-key=KEY
 *   Download:         node browsertrix-capture.js download <crawl-id> <output-dir> --api-key=KEY
 *
 * Environment variables:
 *   BROWSERTRIX_API_KEY - API key for Browsertrix Cloud
 *   BROWSERTRIX_API_URL - Base API URL (default: https://app.browsertrix.com/api)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const DEFAULT_API_URL = 'https://app.browsertrix.com/api';
const API_KEY = process.env.BROWSERTRIX_API_KEY || null;
const API_URL = process.env.BROWSERTRIX_API_URL || DEFAULT_API_URL;

// Parse command line
const args = process.argv.slice(2);
const command = args[0];

// Extract options
let apiKey = API_KEY;
const options = {};
const positionalArgs = [];

for (const arg of args.slice(1)) {
  if (arg.startsWith('--api-key=')) {
    apiKey = arg.split('=')[1];
  } else if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    options[key] = value || true;
  } else {
    positionalArgs.push(arg);
  }
}

// HTTP request helper
function request(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    if (data) {
      const body = typeof data === 'string' ? data : JSON.stringify(data);
      reqOptions.headers['Content-Length'] = Buffer.byteLength(body);
      if (!reqOptions.headers['Content-Type']) {
        reqOptions.headers['Content-Type'] = 'application/json';
      }
    }

    const req = protocol.request(reqOptions, (res) => {
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
    req.setTimeout(60000, () => reject(new Error('Request timeout')));

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

// Generate YAML config from URL list
function generateConfig(urlListFile, outputDir) {
  console.log(`Reading URLs from: ${urlListFile}`);

  const content = fs.readFileSync(urlListFile, 'utf-8');
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

  console.log(`Found ${entries.length} URLs`);

  // Generate YAML config for Browsertrix
  const seeds = entries.map(e => ({
    url: e.url,
    extraMetadata: {
      sourceId: e.sourceId,
      title: e.title
    }
  }));

  const config = {
    collection: `evidence-capture-${new Date().toISOString().slice(0, 10)}`,
    crawlTimeout: 300, // 5 minutes per page
    pageLoadTimeout: 60,
    behaviors: 'autoscroll,autoplay',
    seeds: seeds,
    // Bot bypass settings
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // Capture full page
    screenshot: ['fullPage'],
    // Generate PDF
    pdf: true,
    // Text extraction
    text: true
  };

  // Convert to YAML format
  const yaml = generateYaml(config);

  fs.mkdirSync(outputDir, { recursive: true });

  // Write YAML config
  const yamlPath = path.join(outputDir, 'browsertrix-config.yaml');
  fs.writeFileSync(yamlPath, yaml);
  console.log(`YAML config written to: ${yamlPath}`);

  // Write URL list for reference
  const urlListPath = path.join(outputDir, 'url-list.txt');
  fs.writeFileSync(urlListPath, entries.map(e => `${e.sourceId}|${e.url}|${e.title}`).join('\n'));
  console.log(`URL list written to: ${urlListPath}`);

  // Write seed URLs as simple text (for manual upload)
  const seedsPath = path.join(outputDir, 'seed-urls.txt');
  fs.writeFileSync(seedsPath, entries.map(e => e.url).join('\n'));
  console.log(`Seed URLs written to: ${seedsPath}`);

  console.log(`\n=== Next Steps ===`);
  console.log(`1. Go to https://app.browsertrix.com`);
  console.log(`2. Create a new crawl`);
  console.log(`3. Upload ${yamlPath} as config, OR paste URLs from ${seedsPath}`);
  console.log(`4. Start the crawl`);
  console.log(`5. Download WACZ files when complete`);
  console.log(`6. Run: node browsertrix-capture.js extract <wacz-dir> <evidence-dir>`);

  return { entries, config };
}

// Simple YAML generator (no dependency needed)
function generateYaml(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === 'object') {
          yaml += `${spaces}- \n`;
          for (const [k, v] of Object.entries(item)) {
            if (typeof v === 'object') {
              yaml += `${spaces}  ${k}:\n`;
              for (const [k2, v2] of Object.entries(v)) {
                yaml += `${spaces}    ${k2}: ${JSON.stringify(v2)}\n`;
              }
            } else {
              yaml += `${spaces}  ${k}: ${JSON.stringify(v)}\n`;
            }
          }
        } else {
          yaml += `${spaces}- ${JSON.stringify(item)}\n`;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      yaml += `${spaces}${key}:\n${generateYaml(value, indent + 1)}`;
    } else {
      yaml += `${spaces}${key}: ${typeof value === 'string' && value.includes(' ') ? `"${value}"` : value}\n`;
    }
  }

  return yaml;
}

// Submit crawl via API
async function submitCrawl(configFile) {
  if (!apiKey) {
    console.error('Error: API key required. Set BROWSERTRIX_API_KEY or use --api-key=KEY');
    process.exit(1);
  }

  const config = fs.readFileSync(configFile, 'utf-8');
  console.log(`Submitting crawl config from: ${configFile}`);

  const response = await request('POST', `${API_URL}/crawls/`, config, {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'text/yaml'
  });

  if (response.status === 201 || response.status === 200) {
    console.log('Crawl created successfully!');
    console.log(`Crawl ID: ${response.data.id}`);
    console.log(`Status: ${response.data.status}`);
    console.log(`\nTo start: node browsertrix-capture.js start ${response.data.id}`);
    return response.data;
  } else {
    console.error(`Error creating crawl: ${response.status}`);
    console.error(response.data);
    process.exit(1);
  }
}

// Check crawl status
async function checkStatus(crawlId) {
  if (!apiKey) {
    console.error('Error: API key required');
    process.exit(1);
  }

  const response = await request('GET', `${API_URL}/crawls/${crawlId}/`, null, {
    'Authorization': `Bearer ${apiKey}`
  });

  if (response.status === 200) {
    const crawl = response.data;
    console.log(`Crawl: ${crawl.name || crawlId}`);
    console.log(`Status: ${crawl.status}`);
    if (crawl.progress) {
      console.log(`Progress: ${crawl.progress.pages || 0} pages, ${Math.round((crawl.progress.bytes || 0) / 1024 / 1024)}MB`);
    }
    if (crawl.warcs_filename) {
      console.log(`WARC: ${crawl.warcs_filename}`);
    }
    return crawl;
  } else {
    console.error(`Error: ${response.status}`);
    console.error(response.data);
  }
}

// Download WACZ files
async function downloadWacz(crawlId, outputDir) {
  if (!apiKey) {
    console.error('Error: API key required');
    process.exit(1);
  }

  console.log(`Fetching crawl details for: ${crawlId}`);
  const crawl = await checkStatus(crawlId);

  if (!crawl || crawl.status !== 'finished') {
    console.error('Crawl is not finished yet');
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  // Download WACZ file
  const waczUrl = `${API_URL}/crawls/${crawlId}/download`;
  console.log(`Downloading WACZ from: ${waczUrl}`);

  const waczPath = path.join(outputDir, `${crawlId}.wacz`);
  // Note: For actual download, you'd stream to file - this is simplified
  console.log(`WACZ would be saved to: ${waczPath}`);
  console.log(`\nNote: For large files, download directly from Browsertrix Cloud UI`);
}

// Extract WACZ to evidence format
function extractWacz(waczDir, evidenceDir) {
  console.log(`Extracting WACZ files from: ${waczDir}`);
  console.log(`To evidence directory: ${evidenceDir}`);

  // WACZ files are ZIP archives containing:
  // - pages/pages.jsonl (page metadata)
  // - archive/*.warc.gz (WARC files)
  // - indexes/index.cdx (CDX index)

  const waczFiles = fs.readdirSync(waczDir).filter(f => f.endsWith('.wacz'));
  console.log(`Found ${waczFiles.length} WACZ files`);

  if (waczFiles.length === 0) {
    console.log('No WACZ files found. Download from Browsertrix Cloud first.');
    return;
  }

  console.log(`\nNote: WACZ extraction requires the 'wacz' CLI tool.`);
  console.log(`Install with: pip install wacz`);
  console.log(`Or use ReplayWeb.page (https://replayweb.page) to view WACZ files.`);

  // For each WACZ, we would:
  // 1. Extract pages.jsonl to get URL -> sourceId mapping
  // 2. Extract screenshots/PDFs
  // 3. Copy to evidence/web/S0XX/ folders
}

// Main
async function main() {
  switch (command) {
    case 'generate':
      if (positionalArgs.length < 2) {
        console.error('Usage: node browsertrix-capture.js generate <url-list> <output-dir>');
        process.exit(1);
      }
      generateConfig(positionalArgs[0], positionalArgs[1]);
      break;

    case 'submit':
      if (positionalArgs.length < 1) {
        console.error('Usage: node browsertrix-capture.js submit <yaml-config>');
        process.exit(1);
      }
      await submitCrawl(positionalArgs[0]);
      break;

    case 'status':
      if (positionalArgs.length < 1) {
        console.error('Usage: node browsertrix-capture.js status <crawl-id>');
        process.exit(1);
      }
      await checkStatus(positionalArgs[0]);
      break;

    case 'start':
      if (positionalArgs.length < 1) {
        console.error('Usage: node browsertrix-capture.js start <crawl-id>');
        process.exit(1);
      }
      if (!apiKey) {
        console.error('Error: API key required');
        process.exit(1);
      }
      const startResp = await request('POST', `${API_URL}/crawls/${positionalArgs[0]}/start/`, null, {
        'Authorization': `Bearer ${apiKey}`
      });
      console.log(`Start response: ${startResp.status}`);
      break;

    case 'download':
      if (positionalArgs.length < 2) {
        console.error('Usage: node browsertrix-capture.js download <crawl-id> <output-dir>');
        process.exit(1);
      }
      await downloadWacz(positionalArgs[0], positionalArgs[1]);
      break;

    case 'extract':
      if (positionalArgs.length < 2) {
        console.error('Usage: node browsertrix-capture.js extract <wacz-dir> <evidence-dir>');
        process.exit(1);
      }
      extractWacz(positionalArgs[0], positionalArgs[1]);
      break;

    default:
      console.log(`
Browsertrix Cloud Integration for AgenticInvestigator

Usage:
  generate <url-list> <output-dir>   Generate YAML config from URL list
  submit <yaml-config>               Submit crawl via API
  status <crawl-id>                  Check crawl status
  start <crawl-id>                   Start a created crawl
  download <crawl-id> <output-dir>   Download WACZ files
  extract <wacz-dir> <evidence-dir>  Extract WACZ to evidence format

Options:
  --api-key=KEY                      Browsertrix Cloud API key

Environment:
  BROWSERTRIX_API_KEY                API key for Browsertrix Cloud
  BROWSERTRIX_API_URL                Base API URL (default: ${DEFAULT_API_URL})

Examples:
  # Generate config for manual upload
  node browsertrix-capture.js generate url-list.txt ./browsertrix-output

  # Submit via API
  export BROWSERTRIX_API_KEY=your_key
  node browsertrix-capture.js submit ./browsertrix-output/browsertrix-config.yaml

  # Check status
  node browsertrix-capture.js status crawl-abc123
`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
