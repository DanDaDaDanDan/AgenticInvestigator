#!/usr/bin/env node
/**
 * find-wayback-url.js - Find Wayback Machine archived URLs via CDX API
 *
 * Usage: node find-wayback-url.js <url>
 *        node find-wayback-url.js <url> --json
 *        node find-wayback-url.js --batch <input-file> <output-file>
 *
 * Returns the most recent successful (HTTP 200) archive URL
 */

const https = require('https');

// Fetch URL via HTTPS
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

// Query Wayback CDX API
async function findWaybackUrl(originalUrl, options = {}) {
  const { preferYear, format = 'text' } = options;

  // CDX API endpoint
  const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(originalUrl)}&output=json&filter=statuscode:200&collapse=timestamp:8&limit=20`;

  try {
    const { status, data } = await fetch(cdxUrl);

    if (status !== 200) {
      return { found: false, error: `CDX API returned ${status}` };
    }

    const results = JSON.parse(data);

    // First row is headers: ["urlkey","timestamp","original","mimetype","statuscode","digest","length"]
    if (results.length <= 1) {
      return { found: false, error: 'No archives found' };
    }

    // Get results (skip header)
    const archives = results.slice(1).map(row => ({
      timestamp: row[1],
      original: row[2],
      mimetype: row[3],
      statuscode: row[4],
      date: `${row[1].slice(0,4)}-${row[1].slice(4,6)}-${row[1].slice(6,8)}`
    }));

    // Sort by timestamp descending (most recent first)
    archives.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // If preferYear specified, try to find one from that year
    let selected = archives[0];
    if (preferYear) {
      const yearMatch = archives.find(a => a.timestamp.startsWith(preferYear.toString()));
      if (yearMatch) selected = yearMatch;
    }

    const waybackUrl = `https://web.archive.org/web/${selected.timestamp}/${selected.original}`;

    return {
      found: true,
      waybackUrl,
      timestamp: selected.timestamp,
      date: selected.date,
      originalUrl: selected.original,
      totalArchives: archives.length
    };

  } catch (err) {
    return { found: false, error: err.message };
  }
}

// Batch process URLs from file
async function batchProcess(inputFile, outputFile) {
  const fs = require('fs');

  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  const results = [];

  for (const line of lines) {
    const parts = line.split('|');
    const sourceId = parts[0]?.trim() || '';
    const url = parts[1]?.trim() || line;
    const title = parts[2]?.trim() || '';

    console.log(`Searching: ${sourceId || url.substring(0, 50)}...`);

    const result = await findWaybackUrl(url);

    if (result.found) {
      console.log(`  ✓ Found: ${result.date} (${result.totalArchives} archives)`);
      results.push({
        sourceId,
        originalUrl: url,
        title,
        ...result
      });
    } else {
      console.log(`  ✗ Not found: ${result.error}`);
      results.push({
        sourceId,
        originalUrl: url,
        title,
        found: false,
        error: result.error
      });
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  // Write results
  const output = {
    timestamp: new Date().toISOString(),
    total: results.length,
    found: results.filter(r => r.found).length,
    notFound: results.filter(r => !r.found).length,
    results
  };

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`\nResults saved to: ${outputFile}`);
  console.log(`Found: ${output.found}/${output.total}`);

  // Also output as URL list format for batch-capture.js
  const urlListFile = outputFile.replace('.json', '-urls.txt');
  const urlList = results
    .filter(r => r.found)
    .map(r => `${r.sourceId}|${r.waybackUrl}|${r.title} (Wayback ${r.date})`)
    .join('\n');

  fs.writeFileSync(urlListFile, `# Wayback Machine URLs - Generated ${new Date().toISOString()}\n${urlList}\n`);
  console.log(`URL list saved to: ${urlListFile}`);
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node find-wayback-url.js <url>');
    console.log('  node find-wayback-url.js <url> --json');
    console.log('  node find-wayback-url.js --batch <input-file> <output-file>');
    process.exit(1);
  }

  if (args[0] === '--batch') {
    if (args.length < 3) {
      console.error('Batch mode requires input and output files');
      process.exit(1);
    }
    await batchProcess(args[1], args[2]);
    return;
  }

  const url = args[0];
  const jsonOutput = args.includes('--json');

  const result = await findWaybackUrl(url);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.found) {
    console.log(`Found: ${result.waybackUrl}`);
    console.log(`Date: ${result.date}`);
    console.log(`Total archives: ${result.totalArchives}`);
  } else {
    console.log(`Not found: ${result.error}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
