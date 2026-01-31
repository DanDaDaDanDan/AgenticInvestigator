#!/usr/bin/env node
/**
 * findings.js - Manage decomposed findings
 *
 * Usage:
 *   node scripts/findings.js list <case_dir>
 *   node scripts/findings.js read <case_dir> [finding_id]
 *   node scripts/findings.js add <case_dir> <title>
 *   node scripts/findings.js update <case_dir> <finding_id> <field> <value>
 *   node scripts/findings.js assemble <case_dir>  # Combine all findings into one document
 *
 * The findings architecture replaces monolithic summary.md with independent
 * finding files that have their own lifecycle.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Get the next finding ID
 */
function getNextFindingId(findingsDir) {
  const files = fs.readdirSync(findingsDir)
    .filter(f => f.match(/^F\d{3}\.md$/))
    .sort();

  if (files.length === 0) return 'F001';

  const lastNum = parseInt(files[files.length - 1].slice(1, 4));
  return `F${String(lastNum + 1).padStart(3, '0')}`;
}

/**
 * Parse finding frontmatter
 */
function parseFinding(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, content };

  const frontmatter = match[1];
  const body = match[2];
  const metadata = {};

  frontmatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      let value = valueParts.join(':').trim();
      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = JSON.parse(value);
      }
      metadata[key.trim()] = value;
    }
  });

  return { metadata, content: body.trim() };
}

/**
 * Generate finding frontmatter
 */
function generateFrontmatter(metadata) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(metadata)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/**
 * List all findings with status
 */
function listFindings(caseDir) {
  const findingsDir = path.join(caseDir, 'findings');
  const manifestPath = path.join(findingsDir, 'manifest.json');

  if (!fs.existsSync(findingsDir)) {
    console.error('Error: findings/ directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(findingsDir)
    .filter(f => f.match(/^F\d{3}\.md$/))
    .sort();

  console.log('Findings:\n');

  const findings = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(findingsDir, file), 'utf-8');
    const { metadata } = parseFinding(content);

    const status = metadata.status || 'unknown';
    const confidence = metadata.confidence || 'unknown';
    const sources = metadata.sources || [];

    const statusIcon = {
      sourced: '\x1b[32m✓\x1b[0m',
      draft: '\x1b[33m○\x1b[0m',
      stale: '\x1b[31m✗\x1b[0m',
      superseded: '\x1b[90m→\x1b[0m'
    }[status] || '?';

    console.log(`${statusIcon} ${metadata.id || file.replace('.md', '')} [${status}] (${confidence})`);
    console.log(`    Sources: ${sources.length > 0 ? sources.join(', ') : '(none)'}`);
    console.log(`    Updated: ${metadata.updated || 'unknown'}`);

    findings.push({ file, metadata });
  }

  console.log(`\nTotal: ${findings.length} findings`);
  console.log(`  Sourced: ${findings.filter(f => f.metadata.status === 'sourced').length}`);
  console.log(`  Draft: ${findings.filter(f => f.metadata.status === 'draft').length}`);
  console.log(`  Stale: ${findings.filter(f => f.metadata.status === 'stale').length}`);

  return findings;
}

/**
 * Read a specific finding or all findings
 */
function readFindings(caseDir, findingId) {
  const findingsDir = path.join(caseDir, 'findings');

  if (findingId) {
    const filePath = path.join(findingsDir, `${findingId}.md`);
    if (!fs.existsSync(filePath)) {
      console.error(`Error: Finding ${findingId} not found`);
      process.exit(1);
    }
    console.log(fs.readFileSync(filePath, 'utf-8'));
    return;
  }

  // Read all findings in assembly order
  const manifestPath = path.join(findingsDir, 'manifest.json');
  let assemblyOrder = [];

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assemblyOrder = manifest.assembly_order || [];
  }

  // Add any findings not in assembly order
  const allFiles = fs.readdirSync(findingsDir)
    .filter(f => f.match(/^F\d{3}\.md$/))
    .map(f => f.replace('.md', ''))
    .sort();

  const orderedFindings = [
    ...assemblyOrder,
    ...allFiles.filter(f => !assemblyOrder.includes(f))
  ];

  for (const id of orderedFindings) {
    const filePath = path.join(findingsDir, `${id}.md`);
    if (fs.existsSync(filePath)) {
      console.log(fs.readFileSync(filePath, 'utf-8'));
      console.log('\n---\n');
    }
  }
}

/**
 * Add a new finding
 */
function addFinding(caseDir, title) {
  const findingsDir = path.join(caseDir, 'findings');
  const manifestPath = path.join(findingsDir, 'manifest.json');

  const id = getNextFindingId(findingsDir);
  const now = new Date().toISOString().split('T')[0];

  const metadata = {
    id,
    status: 'draft',
    created: now,
    updated: now,
    sources: [],
    supersedes: 'null',
    superseded_by: 'null',
    confidence: 'low',
    related_leads: []
  };

  const content = `${generateFrontmatter(metadata)}

# Finding: ${title}

*Content to be added.*
`;

  fs.writeFileSync(path.join(findingsDir, `${id}.md`), content);
  console.log(`Created: findings/${id}.md`);

  // Update manifest
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    manifest.assembly_order.push(id);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  return id;
}

/**
 * Assemble all findings into a single document
 */
function assembleFindings(caseDir) {
  const findingsDir = path.join(caseDir, 'findings');
  const manifestPath = path.join(findingsDir, 'manifest.json');

  let assemblyOrder = [];
  let sections = {};

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assemblyOrder = manifest.assembly_order || [];
    sections = manifest.sections || {};
  }

  // Get all findings
  const allFiles = fs.readdirSync(findingsDir)
    .filter(f => f.match(/^F\d{3}\.md$/))
    .map(f => f.replace('.md', ''))
    .sort();

  // Add any not in assembly order
  const orderedFindings = [
    ...assemblyOrder,
    ...allFiles.filter(f => !assemblyOrder.includes(f))
  ];

  const output = [];
  const allSources = new Set();

  for (const id of orderedFindings) {
    const filePath = path.join(findingsDir, `${id}.md`);
    if (!fs.existsSync(filePath)) continue;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const { metadata, content } = parseFinding(raw);

    // Skip stale and superseded findings
    if (metadata.status === 'stale' || metadata.status === 'superseded') {
      continue;
    }

    output.push(content);

    // Collect sources
    if (metadata.sources && Array.isArray(metadata.sources)) {
      metadata.sources.forEach(s => allSources.add(s));
    }
  }

  // Output assembled document
  console.log(output.join('\n\n---\n\n'));
  console.log('\n---\n\n## Sources Referenced\n');
  console.log([...allSources].sort().map(s => `- ${s}`).join('\n'));
}

function printUsage() {
  console.log('findings.js - Manage decomposed findings');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/findings.js list <case_dir>');
  console.log('  node scripts/findings.js read <case_dir> [finding_id]');
  console.log('  node scripts/findings.js add <case_dir> <title>');
  console.log('  node scripts/findings.js assemble <case_dir>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/findings.js list cases/my-case');
  console.log('  node scripts/findings.js read cases/my-case F001');
  console.log('  node scripts/findings.js add cases/my-case "Key Player Analysis"');
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  const command = args[0];
  const caseDir = args[1];

  if (!caseDir) {
    console.error('Error: case_dir required');
    process.exit(1);
  }

  switch (command) {
    case 'list':
      listFindings(caseDir);
      break;
    case 'read':
      readFindings(caseDir, args[2]);
      break;
    case 'add':
      if (!args[2]) {
        console.error('Error: title required');
        process.exit(1);
      }
      addFinding(caseDir, args.slice(2).join(' '));
      break;
    case 'assemble':
      assembleFindings(caseDir);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

module.exports = {
  listFindings,
  readFindings,
  addFinding,
  assembleFindings,
  parseFinding,
  generateFrontmatter,
  getNextFindingId
};

if (require.main === module) {
  main();
}
