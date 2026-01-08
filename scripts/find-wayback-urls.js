#!/usr/bin/env node
/**
 * find-wayback-urls.js - Find valid Wayback Machine timestamps for URLs
 *
 * Uses the CDX API to find actual archived snapshots.
 *
 * Usage:
 *   node find-wayback-urls.js <url>
 *   node find-wayback-urls.js --file <url-list>
 */

const https = require('https');

function fetchCDX(url) {
  return new Promise((resolve, reject) => {
    // Extract the original URL from Wayback URL if needed
    let targetUrl = url;
    const waybackMatch = url.match(/web\.archive\.org\/web\/\d+\/(.+)/);
    if (waybackMatch) {
      targetUrl = waybackMatch[1];
    }

    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(targetUrl)}&output=json&limit=5&filter=statuscode:200`;

    https.get(cdxUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.length > 1) {
            // First row is headers
            const snapshots = json.slice(1).map(row => ({
              timestamp: row[1],
              original: row[2],
              statuscode: row[4],
              waybackUrl: `https://web.archive.org/web/${row[1]}/${row[2]}`
            }));
            resolve(snapshots);
          } else {
            resolve([]);
          }
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node find-wayback-urls.js <url>');
    console.error('       node find-wayback-urls.js --file <url-list>');
    process.exit(1);
  }

  if (args[0] === '--file') {
    const fs = require('fs');
    const content = fs.readFileSync(args[1], 'utf-8');
    const urls = content.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(line => {
        const parts = line.split('|');
        return { sourceId: parts[0]?.trim(), url: parts[1]?.trim() };
      })
      .filter(e => e.url);

    for (const entry of urls) {
      console.log(`\n${entry.sourceId}: ${entry.url.substring(0, 60)}...`);
      const snapshots = await fetchCDX(entry.url);
      if (snapshots.length > 0) {
        console.log(`  Found ${snapshots.length} snapshots:`);
        for (const s of snapshots.slice(0, 3)) {
          console.log(`    ${s.timestamp}: ${s.waybackUrl}`);
        }
      } else {
        console.log('  No snapshots found');
      }
    }
  } else {
    const url = args[0];
    console.log(`Looking up: ${url}\n`);
    const snapshots = await fetchCDX(url);
    if (snapshots.length > 0) {
      console.log(`Found ${snapshots.length} snapshots:`);
      for (const s of snapshots) {
        console.log(`  ${s.timestamp}: ${s.waybackUrl}`);
      }
    } else {
      console.log('No snapshots found');
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
