#!/usr/bin/env node
/**
 * ingest-feedback.js - Start a revision cycle from one or more feedback files.
 *
 * Usage:
 *   node scripts/ingest-feedback.js <case_dir> <feedback_file> [feedback_file2 ...]
 *
 * Creates:
 *   cases/<case>/feedback/revisionN.md   (verbatim feedback preserved)
 *
 * Updates:
 *   cases/<case>/state.json
 *     - phase: REVISION
 *     - revision: { number, feedback_file, started_at }
 *     - resets gates 2-10 to false (planning/questions preserved as true)
 */

'use strict';

const fs = require('fs');
const path = require('path');

function printUsage() {
  console.log('ingest-feedback.js - start revision cycle from feedback files');
  console.log('');
  console.log('Usage: node scripts/ingest-feedback.js <case_dir> <feedback_file> [feedback_file2 ...]');
}

function readTextOrThrow(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function main() {
  const args = process.argv.slice(2);
  const caseDir = args[0];
  const feedbackFiles = args.slice(1);

  if (!caseDir || feedbackFiles.length === 0) {
    printUsage();
    process.exit(2);
  }
  if (!fs.existsSync(caseDir)) {
    console.error(`Case directory not found: ${caseDir}`);
    process.exit(2);
  }

  const statePath = path.join(caseDir, 'state.json');
  if (!fs.existsSync(statePath)) {
    console.error(`state.json not found: ${statePath}`);
    process.exit(2);
  }

  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
  const now = new Date().toISOString();

  const priorRevisionNumber = Number(state.revision?.number || 0);
  const revisionNumber = Number.isFinite(priorRevisionNumber) && priorRevisionNumber > 0
    ? priorRevisionNumber + 1
    : 1;

  const feedbackDir = path.join(caseDir, 'feedback');
  ensureDir(feedbackDir);

  const feedbackRelPath = path.join('feedback', `revision${revisionNumber}.md`).replace(/\\/g, '/');
  const feedbackOutPath = path.join(caseDir, feedbackRelPath);

  const blocks = feedbackFiles.map((f) => {
    const contents = readTextOrThrow(f);
    const name = path.basename(f);
    return `### ${name}\n\n\`\`\`\n${contents.trim()}\n\`\`\`\n`;
  }).join('\n');

  const out = [
    `# Revision ${revisionNumber} Feedback`,
    '',
    `**Received:** ${now}`,
    '**From:** User',
    '',
    '## Original Feedback',
    '',
    blocks,
    '',
    '## Analysis',
    '',
    '(to be filled by /case-feedback sub-agent)',
    '',
    '## Scope Assessment',
    '- [ ] Requires new research',
    '- [ ] Requires new leads',
    '- [ ] Requires source updates',
    '- [ ] Requires perspective additions',
    '- [ ] Tone/style changes only',
    '',
    '## New Leads to Pursue',
    '- L_R1: (to be filled)',
    '',
    '## Questions to Revisit',
    '- (to be filled)',
    '',
    '## Article Changes',
    '',
    '(This section is READ BY /article during revision cycles.)',
    '',
    '- **Section:** (to be filled)',
    '',
    '## Estimated Impact',
    '(Minor/Moderate/Significant)',
    ''
  ].join('\n');

  fs.writeFileSync(feedbackOutPath, out);

  state.phase = 'REVISION';
  state.revision = {
    number: revisionNumber,
    feedback_file: feedbackRelPath,
    started_at: now
  };

  state.gates = state.gates || {};
  state.gates.planning = true;
  state.gates.questions = true;
  state.gates.curiosity = false;
  state.gates.reconciliation = false;
  state.gates.article = false;
  state.gates.sources = false;
  state.gates.integrity = false;
  state.gates.legal = false;
  state.gates.balance = false;
  state.gates.completeness = false;
  state.gates.significance = false;

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  console.log(`Created: ${feedbackOutPath}`);
  console.log(`Updated: ${statePath} (phase: REVISION, revision: ${revisionNumber})`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

