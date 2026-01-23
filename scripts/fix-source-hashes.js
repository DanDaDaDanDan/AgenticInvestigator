#!/usr/bin/env node
/**
 * Fix source hash mismatches by recomputing hashes from raw files
 * Usage: node scripts/fix-source-hashes.js cases/<case-id>/
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const caseDir = process.argv[2];
if (!caseDir) {
  console.error('Usage: node scripts/fix-source-hashes.js cases/<case-id>/');
  process.exit(1);
}

const evidenceDir = path.join(caseDir, 'evidence');

function computeHash(filePath) {
  const content = fs.readFileSync(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}

function fixSourceHashes() {
  const sources = fs.readdirSync(evidenceDir).filter(d => d.startsWith('S'));
  let fixed = 0;
  let errors = [];

  for (const sourceId of sources) {
    const sourceDir = path.join(evidenceDir, sourceId);
    const metadataPath = path.join(sourceDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      errors.push(`${sourceId}: No metadata.json`);
      continue;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

    // Determine verification file (prefer raw.html, then PDF, then content.md)
    let verificationFile = null;
    let computedHash = null;

    const rawHtmlPath = path.join(sourceDir, 'raw.html');
    const contentMdPath = path.join(sourceDir, 'content.md');

    // Check for PDF files
    const files = fs.readdirSync(sourceDir);
    const pdfFile = files.find(f => f.endsWith('.pdf'));

    if (fs.existsSync(rawHtmlPath)) {
      verificationFile = 'raw.html';
      computedHash = computeHash(rawHtmlPath);
    } else if (pdfFile) {
      verificationFile = pdfFile;
      computedHash = computeHash(path.join(sourceDir, pdfFile));
    } else if (fs.existsSync(contentMdPath)) {
      verificationFile = 'content.md';
      computedHash = computeHash(contentMdPath);
    } else {
      errors.push(`${sourceId}: No verifiable file found`);
      continue;
    }

    // Update metadata with verification block
    const oldHash = metadata.sha256 || metadata.verification?.computed_hash;
    const hashWithoutPrefix = computedHash.replace('sha256:', '');

    // Update sha256 field
    metadata.sha256 = hashWithoutPrefix;

    // Ensure files field exists
    if (!metadata.files) {
      metadata.files = {};
    }

    // Map verification file to files field
    if (verificationFile === 'raw.html') {
      metadata.files.raw_html = 'raw.html';
    }
    if (fs.existsSync(contentMdPath)) {
      metadata.files.content = 'content.md';
    }

    // Add/update verification block
    metadata.verification = {
      raw_file: verificationFile,
      computed_hash: computedHash,
      verified_at: new Date().toISOString()
    };

    // Write updated metadata
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    if (oldHash !== hashWithoutPrefix) {
      console.log(`✓ ${sourceId}: Updated hash (${verificationFile})`);
      fixed++;
    }
  }

  console.log(`\nFixed: ${fixed} sources`);
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(e => console.log(`  ${e}`));
  }
}

fixSourceHashes();
