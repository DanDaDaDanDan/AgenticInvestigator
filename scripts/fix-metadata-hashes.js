#!/usr/bin/env node
/**
 * Fix metadata.json files by adding file hash manifests
 * Usage: node scripts/fix-metadata-hashes.js cases/[case-id]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}

function fixMetadata(caseDir) {
  const evidenceDir = path.join(caseDir, 'evidence', 'web');

  if (!fs.existsSync(evidenceDir)) {
    console.error('Evidence directory not found:', evidenceDir);
    process.exit(1);
  }

  const sources = fs.readdirSync(evidenceDir).filter(d =>
    fs.statSync(path.join(evidenceDir, d)).isDirectory()
  );

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const sourceId of sources) {
    const sourceDir = path.join(evidenceDir, sourceId);
    const metadataPath = path.join(sourceDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      console.log(`[SKIP] ${sourceId}: No metadata.json`);
      skipped++;
      continue;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));

      // Get all files except metadata.json
      const files = fs.readdirSync(sourceDir).filter(f => f !== 'metadata.json');

      if (files.length === 0) {
        console.log(`[SKIP] ${sourceId}: No content files`);
        skipped++;
        continue;
      }

      // Build files hash manifest
      const filesHash = {};
      for (const file of files) {
        const filePath = path.join(sourceDir, file);
        if (fs.statSync(filePath).isFile()) {
          filesHash[file] = hashFile(filePath);
        }
      }

      // Update metadata
      metadata.files = filesHash;
      if (!metadata.source_id) {
        metadata.source_id = sourceId;
      }

      // Write back
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
      console.log(`[FIXED] ${sourceId}: ${Object.keys(filesHash).length} files hashed`);
      fixed++;

    } catch (err) {
      console.error(`[ERROR] ${sourceId}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Fixed: ${fixed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${sources.length}`);
}

const caseDir = process.argv[2];
if (!caseDir) {
  console.error('Usage: node scripts/fix-metadata-hashes.js cases/[case-id]');
  process.exit(1);
}

fixMetadata(caseDir);
