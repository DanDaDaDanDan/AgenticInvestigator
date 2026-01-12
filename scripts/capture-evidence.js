#!/usr/bin/env node
/**
 * capture-evidence.js - Complete evidence capture workflow
 *
 * Two capture methods:
 * 1. Firecrawl - Bot bypass + content extraction (HTML, markdown, screenshot)
 * 2. Browsertrix - Cloud browser with WARC archiving (optional)
 *
 * Plus PDF generation from captured HTML via Playwright.
 *
 * Usage:
 *   node scripts/capture-evidence.js <url-list> <case-dir> [--browsertrix]
 *
 * Environment:
 *   FIRECRAWL_API_KEY - Required for Firecrawl
 *   BROWSERTRIX_USERNAME, BROWSERTRIX_PASSWORD - Required for Browsertrix (optional)
 */

// Load .env from project root
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

const SCRIPTS_DIR = __dirname;

// Parse arguments
const args = process.argv.slice(2);
const useBrowsertrix = args.includes('--browsertrix');
const positionalArgs = args.filter(a => !a.startsWith('--'));

if (positionalArgs.length < 2) {
  console.error('Usage: node scripts/capture-evidence.js <url-list> <case-dir> [--browsertrix]');
  console.error('');
  console.error('Options:');
  console.error('  --browsertrix   Also create WARC archives via Browsertrix Cloud');
  console.error('');
  console.error('Environment:');
  console.error('  FIRECRAWL_API_KEY       API key from firecrawl.dev');
  console.error('  BROWSERTRIX_USERNAME    Browsertrix Cloud email (for --browsertrix)');
  console.error('  BROWSERTRIX_PASSWORD    Browsertrix Cloud password (for --browsertrix)');
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

  if (useBrowsertrix) {
    if (!process.env.BROWSERTRIX_USERNAME || !process.env.BROWSERTRIX_PASSWORD) {
      console.error('Error: BROWSERTRIX_USERNAME and BROWSERTRIX_PASSWORD required for --browsertrix');
      process.exit(1);
    }
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
      env: process.env,
      shell: true
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

// Run Browsertrix capture for each URL
async function runBrowsertrix(urlListFile, caseDir) {
  console.log('');
  console.log('='.repeat(60));
  console.log('STEP 2: BROWSERTRIX WARC ARCHIVE');
  console.log('='.repeat(60));
  console.log('');

  // Read URL list (format: sourceId|url|title)
  const content = fs.readFileSync(urlListFile, 'utf-8');
  const entries = content.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const parts = line.split('|');
      return { sourceId: parts[0]?.trim(), url: parts[1]?.trim() };
    })
    .filter(e => e.sourceId && e.url);

  console.log(`Processing ${entries.length} URLs for WARC archiving...`);

  for (let i = 0; i < entries.length; i++) {
    const { sourceId, url } = entries[i];

    const evidenceDir = path.join(caseDir, 'evidence', 'web', sourceId);

    console.log(`\n[${i + 1}/${entries.length}] ${sourceId}: ${url.substring(0, 50)}...`);

    await new Promise((resolve) => {
      const proc = spawn('node', [
        path.join(SCRIPTS_DIR, 'browsertrix-capture.js'),
        sourceId,
        url,
        evidenceDir,
        '--wait'
      ], {
        stdio: 'inherit',
        env: process.env,
        shell: true
      });

      proc.on('close', () => resolve());
      proc.on('error', () => resolve());
    });
  }
}

// Generate PDFs from captured HTML using Playwright
async function generatePdfs(caseDir) {
  console.log('');
  console.log('='.repeat(60));
  console.log('STEP 3: PDF GENERATION');
  console.log('='.repeat(60));
  console.log('');

  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.log('Playwright not installed, skipping PDF generation');
    console.log('Run: npm install playwright && npx playwright install chromium');
    return;
  }

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
      const absoluteHtmlPath = path.resolve(htmlPath);
      await page.goto(pathToFileURL(absoluteHtmlPath).href, { waitUntil: 'networkidle' });
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

      console.log(`  [${folder}] OK PDF generated`);
    } catch (err) {
      console.error(`  [${folder}] FAIL PDF failed: ${err.message}`);
    }
  }

  await browser.close();
}

// Run quality audit
function runAudit(caseDir) {
  console.log('');
  console.log('='.repeat(60));
  console.log('CAPTURE QUALITY AUDIT');
  console.log('='.repeat(60));
  console.log('');

  const evidenceDir = path.join(caseDir, 'evidence', 'web');
  if (!fs.existsSync(evidenceDir)) {
    console.log('No evidence directory');
    return;
  }

  const folders = fs.readdirSync(evidenceDir).filter(f =>
    fs.statSync(path.join(evidenceDir, f)).isDirectory()
  );

  let success = 0;
  let partial = 0;
  let failed = 0;

  for (const folder of folders) {
    const folderPath = path.join(evidenceDir, folder);
    const metaPath = path.join(folderPath, 'metadata.json');

    if (!fs.existsSync(metaPath)) {
      failed++;
      console.log(`  [${folder}] MISSING metadata.json`);
      continue;
    }

    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const fileCount = Object.keys(meta.files || {}).length;
    const hasErrors = (meta.errors || []).length > 0;

    if (fileCount === 0) {
      failed++;
      console.log(`  [${folder}] FAILED no files captured`);
    } else if (hasErrors) {
      partial++;
      console.log(`  [${folder}] PARTIAL ${fileCount} files, ${meta.errors.length} errors`);
    } else {
      success++;
    }
  }

  console.log('');
  console.log(`Summary: ${success} success, ${partial} partial, ${failed} failed`);
}

// Main workflow
async function main() {
  console.log('========================================');
  console.log('EVIDENCE CAPTURE WORKFLOW');
  console.log('========================================');
  console.log(`URL list: ${urlListFile}`);
  console.log(`Case dir: ${caseDir}`);
  console.log(`Browsertrix: ${useBrowsertrix ? 'enabled' : 'disabled'}`);

  checkPrereqs();

  const startTime = Date.now();

  // Step 1: Firecrawl capture (primary)
  await runFirecrawl(urlListFile, caseDir);

  // Step 2: Browsertrix WARC archive (optional)
  if (useBrowsertrix) {
    await runBrowsertrix(urlListFile, caseDir);
  }

  // Step 3: Generate PDFs from captured HTML
  await generatePdfs(caseDir);

  // Step 4: Audit
  runAudit(caseDir);

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('');
  console.log('========================================');
  console.log('WORKFLOW COMPLETE');
  console.log('========================================');
  console.log(`Total time: ${elapsed} minutes`);
  console.log(`Evidence: ${path.join(caseDir, 'evidence', 'web')}`);
}

main().catch(err => {
  console.error('');
  console.error('FATAL ERROR:', err.message);
  process.exit(1);
});
