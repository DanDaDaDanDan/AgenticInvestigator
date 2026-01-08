#!/usr/bin/env node
/**
 * archivebox-backup.js - Create WARC backups using ArchiveBox
 *
 * ArchiveBox produces forensic-grade archives including:
 * - WARC files (ISO standard web archive format)
 * - DOM snapshots
 * - Screenshots and PDFs
 * - Full-text search index
 *
 * Usage:
 *   node archivebox-backup.js <url-list> <archive-dir>
 *
 * Prerequisites:
 *   - ArchiveBox installed: pip install archivebox
 *   - Or Docker: docker pull archivebox/archivebox
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node archivebox-backup.js <url-list> <archive-dir>');
  console.error('');
  console.error('Prerequisites:');
  console.error('  pip install archivebox');
  console.error('  OR');
  console.error('  docker pull archivebox/archivebox');
  process.exit(1);
}

const [urlListFile, archiveDir] = args;

// Check if ArchiveBox is available
function checkArchiveBox() {
  try {
    execSync('archivebox version', { stdio: 'pipe' });
    return 'native';
  } catch (e) {
    try {
      execSync('docker images archivebox/archivebox -q', { stdio: 'pipe' });
      return 'docker';
    } catch (e2) {
      return null;
    }
  }
}

// Initialize ArchiveBox archive
function initArchive(dir, mode) {
  console.log(`Initializing ArchiveBox archive in: ${dir}`);
  fs.mkdirSync(dir, { recursive: true });

  if (mode === 'docker') {
    execSync(`docker run -v "${dir}:/data" archivebox/archivebox init`, {
      stdio: 'inherit'
    });
  } else {
    execSync('archivebox init', {
      cwd: dir,
      stdio: 'inherit'
    });
  }
}

// Add URLs to archive
function addUrls(urls, dir, mode) {
  console.log(`Adding ${urls.length} URLs to archive...`);

  // Write URLs to temp file
  const urlFile = path.join(dir, 'urls-to-add.txt');
  fs.writeFileSync(urlFile, urls.join('\n'));

  const extractors = 'title,favicon,screenshot,pdf,dom,singlefile,warc';

  if (mode === 'docker') {
    execSync(
      `docker run -v "${dir}:/data" archivebox/archivebox add --extract="${extractors}" < /data/urls-to-add.txt`,
      { stdio: 'inherit', shell: true }
    );
  } else {
    execSync(
      `archivebox add --extract="${extractors}" < "${urlFile}"`,
      { cwd: dir, stdio: 'inherit', shell: true }
    );
  }

  // Clean up
  fs.unlinkSync(urlFile);
}

// Parse URL list
function parseUrlList(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(line => {
      const parts = line.split('|');
      return parts[1]?.trim() || line;
    })
    .filter(Boolean);
}

// Main
async function main() {
  const mode = checkArchiveBox();

  if (!mode) {
    console.error('Error: ArchiveBox not found.');
    console.error('');
    console.error('Install with:');
    console.error('  pip install archivebox');
    console.error('  OR');
    console.error('  docker pull archivebox/archivebox');
    process.exit(1);
  }

  console.log(`Using ArchiveBox (${mode} mode)`);
  console.log('');

  const urls = parseUrlList(urlListFile);
  console.log(`Found ${urls.length} URLs to archive`);

  // Check if archive exists
  const indexPath = path.join(archiveDir, 'index.sqlite3');
  if (!fs.existsSync(indexPath)) {
    initArchive(archiveDir, mode);
  }

  // Add URLs
  addUrls(urls, archiveDir, mode);

  console.log('');
  console.log('='.repeat(60));
  console.log('ARCHIVEBOX BACKUP COMPLETE');
  console.log('='.repeat(60));
  console.log(`Archive location: ${archiveDir}`);
  console.log('');
  console.log('Contents:');
  console.log('  - WARC files (forensic web archives)');
  console.log('  - SingleFile HTML (self-contained pages)');
  console.log('  - Screenshots and PDFs');
  console.log('  - DOM snapshots');
  console.log('');
  console.log('To browse: archivebox server');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
