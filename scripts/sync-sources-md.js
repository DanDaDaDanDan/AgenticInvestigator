#!/usr/bin/env node
/**
 * sync-sources-md.js - Generate sources.md from evidence folders
 *
 * Creates a human-readable sources.md registry from evidence/web/ metadata.
 * This ensures sources.md stays in sync with actual captured evidence.
 *
 * Usage:
 *   node sync-sources-md.js <case_dir>
 *   node sync-sources-md.js <case_dir> --dry-run    # Preview without writing
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node sync-sources-md.js <case_dir> [--dry-run]');
  process.exit(1);
}

const caseDir = args[0];
const dryRun = args.includes('--dry-run');
const evidenceDir = path.join(caseDir, 'evidence', 'web');
const sourcesPath = path.join(caseDir, 'sources.md');

// Collect all sources from evidence folders
function collectSources() {
  const sources = [];

  if (!fs.existsSync(evidenceDir)) {
    console.log(`No evidence directory found: ${evidenceDir}`);
    return sources;
  }

  const folders = fs.readdirSync(evidenceDir).sort();

  for (const folder of folders) {
    if (!folder.match(/^S\d{3}$/)) continue;

    const folderPath = path.join(evidenceDir, folder);
    const metadataPath = path.join(folderPath, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      console.warn(`Warning: ${folder} missing metadata.json`);
      continue;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      sources.push({
        id: folder,
        url: metadata.url || metadata.source_url || 'unknown',
        captured: metadata.captured_at || metadata.timestamp || 'unknown',
        type: metadata.type || detectType(folderPath),
        title: metadata.title || metadata.description || extractTitle(folderPath),
        files: fs.readdirSync(folderPath).filter(f => f !== 'metadata.json')
      });
    } catch (e) {
      console.warn(`Warning: Error reading ${folder}/metadata.json: ${e.message}`);
    }
  }

  return sources;
}

// Detect capture type from files present
function detectType(folderPath) {
  const files = fs.readdirSync(folderPath);
  if (files.some(f => f.endsWith('.pdf'))) return 'pdf';
  if (files.some(f => f.endsWith('.html'))) return 'web';
  if (files.some(f => f.endsWith('.png') || f.endsWith('.jpg'))) return 'screenshot';
  return 'unknown';
}

// Try to extract title from HTML file
function extractTitle(folderPath) {
  const files = fs.readdirSync(folderPath);
  const htmlFile = files.find(f => f.endsWith('.html'));

  if (htmlFile) {
    try {
      const html = fs.readFileSync(path.join(folderPath, htmlFile), 'utf-8');
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        return titleMatch[1].trim().slice(0, 100);
      }
    } catch (e) {
      // Ignore errors
    }
  }

  return 'Untitled';
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr || dateStr === 'unknown') return 'unknown';
  try {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  } catch (e) {
    return dateStr;
  }
}

// Truncate URL for display
function truncateUrl(url, maxLen = 60) {
  if (!url || url === 'unknown') return 'unknown';
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen - 3) + '...';
}

// Generate markdown content
function generateMarkdown(sources) {
  const lines = [
    '# Sources',
    '',
    '**Auto-generated from evidence/web/ (do not edit manually).**',
    '',
    `Last synced: ${new Date().toISOString()}`,
    '',
    '---',
    '',
    '## Captured Sources',
    '',
    '| ID | URL | Captured | Type | Title |',
    '|----|-----|----------|------|-------|'
  ];

  for (const s of sources) {
    const url = truncateUrl(s.url);
    const date = formatDate(s.captured);
    const title = s.title.slice(0, 50);
    lines.push(`| ${s.id} | ${url} | ${date} | ${s.type} | ${title} |`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`Total captured: ${sources.length}`);
  lines.push('');

  return lines.join('\n');
}

// Main execution
const sources = collectSources();

console.log(`\nSource Sync: ${caseDir}`);
console.log(`${'='.repeat(50)}`);
console.log(`\nFound ${sources.length} captured sources in evidence/web/`);

const markdown = generateMarkdown(sources);

if (dryRun) {
  console.log('\n--- DRY RUN: Would write ---');
  console.log(markdown);
  console.log('--- END DRY RUN ---');
} else {
  fs.writeFileSync(sourcesPath, markdown);
  console.log(`\nWritten to: ${sourcesPath}`);
}

// Summary
console.log('\nSummary:');
for (const s of sources) {
  console.log(`  ${s.id}: ${s.type} - ${s.title.slice(0, 40)}`);
}

process.exit(0);
