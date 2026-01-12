#!/usr/bin/env node
/**
 * fix-metadata-paths.js - Fix metadata.json file path references
 *
 * Fixes the mismatch where metadata.json references "content.md"
 * but the actual file is "capture.md".
 *
 * Usage:
 *   node scripts/fix-metadata-paths.js <case_dir>
 *   node scripts/fix-metadata-paths.js <case_dir> --dry-run
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI colors
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function run(caseDir, dryRun = false) {
  const evidenceWebDir = path.join(caseDir, 'evidence', 'web');

  if (!fs.existsSync(evidenceWebDir)) {
    console.error(`${RED}Error: Evidence directory not found: ${evidenceWebDir}${NC}`);
    return { fixed: 0, skipped: 0, errors: [] };
  }

  const sourceDirs = fs.readdirSync(evidenceWebDir)
    .filter(d => /^S\d{3,4}$/.test(d))
    .map(d => path.join(evidenceWebDir, d))
    .filter(d => fs.statSync(d).isDirectory());

  console.log(`${BOLD}Fixing Metadata Paths${NC}`);
  console.log(`Case: ${caseDir}`);
  console.log(`Found ${sourceDirs.length} source directories`);
  console.log(dryRun ? `${YELLOW}DRY RUN - no changes will be made${NC}` : '');
  console.log('');

  let fixed = 0;
  let skipped = 0;
  const errors = [];

  for (const sourceDir of sourceDirs) {
    const sourceId = path.basename(sourceDir);
    const metadataPath = path.join(sourceDir, 'metadata.json');
    const captureMdPath = path.join(sourceDir, 'capture.md');
    const contentMdPath = path.join(sourceDir, 'content.md');

    if (!fs.existsSync(metadataPath)) {
      console.log(`  ${YELLOW}[${sourceId}]${NC} No metadata.json - skipped`);
      skipped++;
      continue;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      let modified = false;
      const changes = [];

      // Check for content_md pointing to content.md
      if (metadata.files?.content_md?.path === 'content.md') {
        // Check what actually exists
        const hasCaptureFile = fs.existsSync(captureMdPath);
        const hasContentFile = fs.existsSync(contentMdPath);

        if (hasCaptureFile && !hasContentFile) {
          // Fix: point to capture.md and update hash/size
          const stats = fs.statSync(captureMdPath);
          const hash = hashFile(captureMdPath);

          changes.push(`content_md.path: "content.md" → "capture.md"`);
          changes.push(`content_md.hash: updated to sha256:${hash.substring(0, 16)}...`);
          changes.push(`content_md.size: ${metadata.files.content_md.size} → ${stats.size}`);

          metadata.files.content_md.path = 'capture.md';
          metadata.files.content_md.hash = `sha256:${hash}`;
          metadata.files.content_md.size = stats.size;
          modified = true;
        } else if (hasContentFile) {
          console.log(`  ${GREEN}[${sourceId}]${NC} Already correct (content.md exists)`);
          skipped++;
          continue;
        } else {
          console.log(`  ${RED}[${sourceId}]${NC} Neither capture.md nor content.md exists!`);
          errors.push({ sourceId, error: 'No markdown file found' });
          continue;
        }
      }

      // Also check if there's a markdown entry that's outdated
      if (metadata.files?.markdown?.path === 'content.md') {
        const hasCaptureFile = fs.existsSync(captureMdPath);
        if (hasCaptureFile) {
          const stats = fs.statSync(captureMdPath);
          const hash = hashFile(captureMdPath);

          changes.push(`markdown.path: "content.md" → "capture.md"`);
          metadata.files.markdown.path = 'capture.md';
          metadata.files.markdown.hash = `sha256:${hash}`;
          metadata.files.markdown.size = stats.size;
          modified = true;
        }
      }

      if (modified) {
        if (!dryRun) {
          fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        }
        console.log(`  ${GREEN}[${sourceId}]${NC} Fixed:`);
        for (const change of changes) {
          console.log(`    - ${change}`);
        }
        fixed++;
      } else {
        console.log(`  ${YELLOW}[${sourceId}]${NC} No changes needed`);
        skipped++;
      }

    } catch (err) {
      console.log(`  ${RED}[${sourceId}]${NC} Error: ${err.message}`);
      errors.push({ sourceId, error: err.message });
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(`${BOLD}Summary${NC}`);
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors.length}`);
  if (dryRun) {
    console.log(`${YELLOW}DRY RUN - run without --dry-run to apply changes${NC}`);
  }

  return { fixed, skipped, errors };
}

// CLI
const args = process.argv.slice(2);
const caseDir = args.find(a => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!caseDir) {
  console.error('Usage: node scripts/fix-metadata-paths.js <case_dir> [--dry-run]');
  process.exit(1);
}

const result = run(caseDir, dryRun);
process.exit(result.errors.length > 0 ? 1 : 0);
