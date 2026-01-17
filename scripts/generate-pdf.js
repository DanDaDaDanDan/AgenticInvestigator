#!/usr/bin/env node
/**
 * generate-pdf.js - Convert article markdown files to beautiful PDFs
 *
 * Usage: node scripts/generate-pdf.js <case-path>
 *
 * Converts articles/short.md, articles/medium.md, and articles/full.md to PDFs using md2pdf.
 * The PDFs use Kindle-style typography for comfortable reading.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Path to md2pdf (local copy in lib/)
const MD2PDF_PATH = path.resolve(__dirname, '../lib/md2pdf/src/cli.js');

async function generatePDF(casePath) {
  const resolvedPath = path.resolve(casePath);
  const articlesDir = path.join(resolvedPath, 'articles');

  // Check if articles directory exists
  if (!fs.existsSync(articlesDir)) {
    console.error(`Error: Articles directory not found: ${articlesDir}`);
    process.exit(1);
  }

  // Check if md2pdf exists
  if (!fs.existsSync(MD2PDF_PATH)) {
    console.error(`Error: md2pdf not found at: ${MD2PDF_PATH}`);
    console.error('Please run: cd lib/md2pdf && npm install');
    process.exit(1);
  }

  const results = [];

  // Convert short.md if it exists
  const shortMd = path.join(articlesDir, 'short.md');
  if (fs.existsSync(shortMd)) {
    console.log('Converting short.md to PDF...');
    try {
      const shortPdf = path.join(articlesDir, 'short.pdf');
      execSync(`node "${MD2PDF_PATH}" "${shortMd}" "${shortPdf}" --quiet`, {
        stdio: 'inherit',
        cwd: resolvedPath
      });
      results.push({ file: 'short.pdf', success: true });
      console.log(`  ✓ Created: ${shortPdf}`);
    } catch (error) {
      results.push({ file: 'short.pdf', success: false, error: error.message });
      console.error(`  ✗ Failed to convert short.md: ${error.message}`);
    }
  } else {
    console.log('  - short.md not found, skipping');
  }

  // Convert medium.md if it exists
  const mediumMd = path.join(articlesDir, 'medium.md');
  if (fs.existsSync(mediumMd)) {
    console.log('Converting medium.md to PDF...');
    try {
      const mediumPdf = path.join(articlesDir, 'medium.pdf');
      execSync(`node "${MD2PDF_PATH}" "${mediumMd}" "${mediumPdf}" --quiet`, {
        stdio: 'inherit',
        cwd: resolvedPath
      });
      results.push({ file: 'medium.pdf', success: true });
      console.log(`  ✓ Created: ${mediumPdf}`);
    } catch (error) {
      results.push({ file: 'medium.pdf', success: false, error: error.message });
      console.error(`  ✗ Failed to convert medium.md: ${error.message}`);
    }
  } else {
    console.log('  - medium.md not found, skipping');
  }

  // Convert full.md if it exists
  const fullMd = path.join(articlesDir, 'full.md');
  if (fs.existsSync(fullMd)) {
    console.log('Converting full.md to PDF...');
    try {
      const fullPdf = path.join(articlesDir, 'full.pdf');
      execSync(`node "${MD2PDF_PATH}" "${fullMd}" "${fullPdf}" --quiet`, {
        stdio: 'inherit',
        cwd: resolvedPath
      });
      results.push({ file: 'full.pdf', success: true });
      console.log(`  ✓ Created: ${fullPdf}`);
    } catch (error) {
      results.push({ file: 'full.pdf', success: false, error: error.message });
      console.error(`  ✗ Failed to convert full.md: ${error.message}`);
    }
  } else {
    console.log('  - full.md not found, skipping');
  }

  // Summary
  console.log('');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  if (successful > 0) {
    console.log(`✓ Generated ${successful} PDF(s)`);
  }
  if (failed > 0) {
    console.log(`✗ Failed to generate ${failed} PDF(s)`);
    process.exit(1);
  }

  return results;
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node scripts/generate-pdf.js <case-path>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/generate-pdf.js cases/my-investigation');
    process.exit(1);
  }

  generatePDF(args[0]).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

module.exports = { generatePDF };
