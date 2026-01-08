#!/usr/bin/env node
/**
 * capture-evidence.js - Complete evidence capture workflow
 *
 * Combines:
 * 1. Firecrawl - Bot bypass + content extraction (HTML, screenshot)
 * 2. Playwright - PDF generation from captured HTML
 * 3. ArchiveBox - Optional WARC backup for forensic archive
 *
 * Usage:
 *   node capture-evidence.js <url-list> <case-dir> [--archivebox]
 *
 * Environment:
 *   FIRECRAWL_API_KEY - Required for Firecrawl
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCRIPTS_DIR = __dirname;

// Parse arguments
const args = process.argv.slice(2);
const useArchiveBox = args.includes('--archivebox');
const positionalArgs = args.filter(a => !a.startsWith('--'));

if (positionalArgs.length < 2) {
  console.error('Usage: node capture-evidence.js <url-list> <case-dir> [--archivebox]');
  console.error('');
  console.error('Options:');
  console.error('  --archivebox   Also create WARC backups via ArchiveBox');
  console.error('');
  console.error('Environment:');
  console.error('  FIRECRAWL_API_KEY   API key from firecrawl.dev');
  process.exit(1);
}

const [urlListFile, caseDir] = positionalArgs;

// Check prerequisites
function checkPrereqs() {
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error('Error: FIRECRAWL_API_KEY environment variable required');
    console.error('Get your API key from: https://app.firecrawl.dev');
    process.exit(1);
  }

  // Check Playwright
  try {
    require('playwright');
  } catch (e) {
    console.error('Error: Playwright not installed');
    console.error('Run: npm install playwright');
    process.exit(1);
  }
}

// Run Firecrawl batch capture
async function runFirecrawl(urlListFile, caseDir) {
  console.log('');
  console.log('='.repeat(60));
  console.log('STEP 1: FIRECRAWL CAPTURE');
  console.log('='.repeat(60));
  console.log('');

  return new Promise((resolve, reject) => {
    const proc = spawn('node', [
      path.join(SCRIPTS_DIR, 'firecrawl-capture.js'),
      '--batch',
      urlListFile,
      caseDir
    ], {
      stdio: 'inherit',
      env: process.env
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Firecrawl exited with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

// Generate PDFs from captured HTML using Playwright
async function generatePdfs(caseDir) {
  console.log('');
  console.log('='.repeat(60));
  console.log('STEP 2: PDF GENERATION');
  console.log('='.repeat(60));
  console.log('');

  const { chromium } = require('playwright');
  const evidenceDir = path.join(caseDir, 'evidence', 'web');

  if (!fs.existsSync(evidenceDir)) {
    console.log('No evidence directory found');
    return;
  }

  const folders = fs.readdirSync(evidenceDir).filter(f =>
    fs.statSync(path.join(evidenceDir, f)).isDirectory()
  );

  console.log(`Processing ${folders.length} evidence folders...`);

  const browser = await chromium.launch({ headless: true });

  for (const folder of folders) {
    const folderPath = path.join(evidenceDir, folder);
    const htmlPath = path.join(folderPath, 'capture.html');
    const pdfPath = path.join(folderPath, 'capture.pdf');
    const metaPath = path.join(folderPath, 'metadata.json');

    // Skip if no HTML or PDF already exists
    if (!fs.existsSync(htmlPath)) continue;
    if (fs.existsSync(pdfPath)) {
      console.log(`  [${folder}] PDF exists, skipping`);
      continue;
    }

    console.log(`  [${folder}] Generating PDF...`);

    try {
      const page = await browser.newPage();
      await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
      });
      await page.close();

      // Update metadata with PDF info
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const pdfBuffer = fs.readFileSync(pdfPath);
        meta.files = meta.files || {};
        meta.files.pdf = {
          path: 'capture.pdf',
          hash: `sha256:${crypto.createHash('sha256').update(pdfBuffer).digest('hex')}`,
          size: pdfBuffer.length
        };
        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
      }

      console.log(`  [${folder}] ✓ PDF generated`);
    } catch (err) {
      console.error(`  [${folder}] ✗ PDF failed: ${err.message}`);
    }
  }

  await browser.close();
}

// Run ArchiveBox backup
async function runArchiveBox(urlListFile, caseDir) {
  console.log('');
  console.log('='.repeat(60));
  console.log('STEP 3: ARCHIVEBOX WARC BACKUP');
  console.log('='.repeat(60));
  console.log('');

  const archiveDir = path.join(caseDir, 'evidence', 'archivebox');

  return new Promise((resolve, reject) => {
    const proc = spawn('node', [
      path.join(SCRIPTS_DIR, 'archivebox-backup.js'),
      urlListFile,
      archiveDir
    ], {
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      // Don't fail if ArchiveBox isn't available
      resolve();
    });

    proc.on('error', (err) => {
      console.log('ArchiveBox not available, skipping WARC backup');
      resolve();
    });
  });
}

// Run quality audit
function runAudit(caseDir) {
  console.log('');
  console.log('='.repeat(60));
  console.log('CAPTURE QUALITY AUDIT');
  console.log('='.repeat(60));
  console.log('');

  try {
    execSync(`node ${path.join(SCRIPTS_DIR, 'find-failed-captures.js')} ${caseDir}`, {
      stdio: 'inherit'
    });
  } catch (e) {
    console.log('Audit script not available');
  }
}

// Main workflow
async function main() {
  console.log('========================================');
  console.log('EVIDENCE CAPTURE WORKFLOW');
  console.log('========================================');
  console.log(`URL list: ${urlListFile}`);
  console.log(`Case dir: ${caseDir}`);
  console.log(`ArchiveBox: ${useArchiveBox ? 'enabled' : 'disabled'}`);

  checkPrereqs();

  const startTime = Date.now();

  // Step 1: Firecrawl capture
  await runFirecrawl(urlListFile, caseDir);

  // Step 2: Generate PDFs
  await generatePdfs(caseDir);

  // Step 3: ArchiveBox backup (optional)
  if (useArchiveBox) {
    await runArchiveBox(urlListFile, caseDir);
  }

  // Step 4: Audit
  runAudit(caseDir);

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('');
  console.log('========================================');
  console.log('WORKFLOW COMPLETE');
  console.log('========================================');
  console.log(`Total time: ${elapsed} minutes`);
  console.log(`Evidence: ${path.join(caseDir, 'evidence', 'web')}`);
  if (useArchiveBox) {
    console.log(`WARC backup: ${path.join(caseDir, 'evidence', 'archivebox')}`);
  }
}

main().catch(err => {
  console.error('');
  console.error('FATAL ERROR:', err.message);
  process.exit(1);
});
