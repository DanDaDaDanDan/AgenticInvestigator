#!/usr/bin/env node
/**
 * ledger-append.js - Unified append-only ledger for investigation coordination
 *
 * The ledger is the single source of truth for all investigation actions.
 * Replaces scattered state files with one append-only log.
 *
 * Usage:
 *   node ledger-append.js <case_dir> --init                    # Initialize ledger
 *   node ledger-append.js <case_dir> <type> [opts]             # Append entry
 *
 * Entry Types:
 *   iteration_start  - Beginning of VERIFY -> PLAN -> EXECUTE cycle
 *   iteration_complete - End of iteration cycle
 *   phase_start      - Beginning of investigation phase
 *   phase_complete   - End of investigation phase
 *   agent_dispatch   - Sub-agent dispatched
 *   agent_complete   - Sub-agent finished
 *   task_create      - New task created
 *   task_assign      - Task assigned to agent
 *   task_complete    - Task finished with output
 *   source_capture   - Evidence captured for source
 *   claim_create     - New claim registered in claims/
 *   claim_update     - Claim sources/status updated
 *   gate_check       - Termination gate verification
 *   synthesis_complete - Final report generated
 *   file_lock        - File ownership claim (prevents race conditions)
 *   file_unlock      - File ownership released
 *
 * Examples:
 *   node ledger-append.js cases/topic --init
 *   node ledger-append.js cases/topic phase_start --phase RESEARCH --iteration 1
 *   node ledger-append.js cases/topic agent_dispatch --agent gemini-research --output research-leads/iteration-1-gemini.md
 *   node ledger-append.js cases/topic task_complete --task T001 --output findings/T001-findings.md --sources S001,S002
 *   node ledger-append.js cases/topic source_capture --source S001 --url "https://..." --path evidence/web/S001/
 *   node ledger-append.js cases/topic gate_check --gate sources --passed false --reason "5 sources missing"
 *   node ledger-append.js cases/topic file_lock --file articles/article-full.md --agent article-agent-1
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Must match firecrawl-capture.js
const CAPTURE_SIGNATURE_VERSION = 'v2';
const CAPTURE_SALT = 'firecrawl-capture-2026-integrity';

const args = process.argv.slice(2);

function printUsage() {
  console.log(`
Usage:
  node ledger-append.js <case_dir> --init              # Initialize ledger
  node ledger-append.js <case_dir> <type> [options]    # Append entry

Entry Types:
  iteration_start  --iteration N
  iteration_complete --iteration N [--blocking N] [--tasks N]
  phase_start      --phase NAME --iteration N
  phase_complete   --phase NAME --iteration N [--duration MS]
  agent_dispatch   --agent NAME [--task TASK] --output FILE
  agent_complete   --agent NAME --output FILE [--success true/false]
  task_create      --task ID --priority HIGH/MEDIUM/LOW [--perspective NAME] [--gap GXXXX]
  task_assign      --task ID --agent NAME
  task_complete    --task ID --output FILE [--sources S001,S002]
  source_capture   --source ID --url URL --path PATH [--files N]
  claim_create     --claim CXXXX --risk HIGH/MEDIUM/LOW [--type factual/attribution]
  claim_update     --claim CXXXX [--sources S001,S002] [--status verified/pending]
  gate_check       --gate NAME --passed true/false [--reason "..."]
  synthesis_complete --iteration N --output FILE [--claims N]
  file_lock        --file PATH --agent NAME
  file_unlock      --file PATH --agent NAME

Examples:
  node ledger-append.js cases/topic iteration_start --iteration 3
  node ledger-append.js cases/topic task_create --task R001 --priority HIGH --gap G0001
  node ledger-append.js cases/topic claim_update --claim C0042 --sources S014,S015 --status verified
  node ledger-append.js cases/topic gate_check --gate corroboration --passed false --reason "2 claims below threshold"
`);
}

if (args.length < 2) {
  printUsage();
  process.exit(1);
}

const caseDir = args[0];
const ledgerPath = path.join(caseDir, 'ledger.json');

// Handle --init
if (args[1] === '--init') {
  const initial = {
    case_id: path.basename(caseDir),
    created_at: new Date().toISOString(),
    entries: []
  };

  fs.writeFileSync(ledgerPath, JSON.stringify(initial, null, 2));
  console.log(`Initialized: ${ledgerPath}`);
  process.exit(0);
}

// Parse entry type
const entryType = args[1];

const VALID_TYPES = [
  'iteration_start', 'iteration_complete',
  'phase_start', 'phase_complete',
  'agent_dispatch', 'agent_complete',
  'task_create', 'task_assign', 'task_complete',
  'source_capture',
  'claim_create', 'claim_update',
  'gate_check',
  'synthesis_complete',
  'file_lock', 'file_unlock'
];

if (!VALID_TYPES.includes(entryType)) {
  console.error(`Error: Invalid entry type '${entryType}'`);
  console.error(`Valid types: ${VALID_TYPES.join(', ')}`);
  process.exit(1);
}

// Parse arguments
function parseArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx === args.length - 1) return null;
  return args[idx + 1];
}

function parseBool(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

/**
 * Verify capture signature - returns { valid: boolean, reason: string }
 * A valid signature proves the capture script ran (not LLM hallucination)
 */
function verifyCaptureSignature(meta) {
  // Check for LLM-written stub indicators (definitive hallucination markers)
  const stubFields = ['summary', 'key_facts', 'key_claims', 'category',
                      'credibility', 'relevance', 'independence', 'reliability'];
  for (const field of stubFields) {
    if (meta[field]) {
      return {
        valid: false,
        reason: `Metadata contains LLM-written field "${field}" - this is stub evidence, not a real capture`
      };
    }
  }

  // Check for uses "id" instead of "source_id" (LLM pattern)
  if (meta.id && !meta.source_id) {
    return {
      valid: false,
      reason: 'Metadata uses "id" instead of "source_id" - LLM-generated stub'
    };
  }

  // Require signature for new captures (v2+)
  if (!meta._capture_signature) {
    // Allow legacy captures that have proper files field
    if (meta.files && Object.keys(meta.files).length > 0 && meta.method) {
      return { valid: true, reason: 'Legacy capture (pre-signature) with valid files' };
    }
    return {
      valid: false,
      reason: 'Missing _capture_signature - evidence not created by capture script'
    };
  }

  if (!meta.files) {
    return { valid: false, reason: 'Missing files field - invalid capture' };
  }

  // Verify signature cryptographically
  const fileHashesSorted = Object.values(meta.files)
    .map(f => f.hash)
    .filter(Boolean)
    .sort()
    .join('|');

  const signatureInput = [
    meta._signature_version || CAPTURE_SIGNATURE_VERSION,
    meta.source_id,
    meta.url,
    meta.captured_at,
    fileHashesSorted,
    CAPTURE_SALT
  ].join(':');

  const expectedSig = `sig_${meta._signature_version || CAPTURE_SIGNATURE_VERSION}_${crypto.createHash('sha256').update(signatureInput).digest('hex').slice(0, 32)}`;

  if (meta._capture_signature !== expectedSig) {
    return {
      valid: false,
      reason: 'Invalid _capture_signature - signature mismatch (tampered or faked)'
    };
  }

  return { valid: true, reason: 'Valid capture signature' };
}

// Build entry based on type
function buildEntry(type, args) {
  const entry = {
    type,
    ts: new Date().toISOString()
  };

  switch (type) {
    case 'iteration_start':
    case 'iteration_complete':
      entry.iteration = parseInt(parseArg(args, '--iteration') || '1', 10);
      if (type === 'iteration_complete') {
        entry.blocking_gaps = parseInt(parseArg(args, '--blocking') || '0', 10);
        entry.tasks_completed = parseInt(parseArg(args, '--tasks') || '0', 10);
      }
      break;

    case 'phase_start':
    case 'phase_complete':
      entry.phase = parseArg(args, '--phase');
      entry.iteration = parseInt(parseArg(args, '--iteration') || '1', 10);
      if (type === 'phase_complete') {
        const duration = parseArg(args, '--duration');
        if (duration) entry.duration_ms = parseInt(duration, 10);
      }
      break;

    case 'agent_dispatch':
    case 'agent_complete':
      entry.agent = parseArg(args, '--agent');
      entry.output_expected = parseArg(args, '--output');
      const task = parseArg(args, '--task');
      if (task) entry.task_id = task;
      if (type === 'agent_complete') {
        entry.success = parseBool(parseArg(args, '--success') || 'true');
      }
      break;

    case 'task_create':
      entry.task_id = parseArg(args, '--task');
      entry.priority = parseArg(args, '--priority') || 'MEDIUM';
      entry.perspective = parseArg(args, '--perspective');
      entry.description = parseArg(args, '--description');
      const gapRef = parseArg(args, '--gap');
      if (gapRef) entry.gap_id = gapRef;
      break;

    case 'task_assign':
      entry.task_id = parseArg(args, '--task');
      entry.agent = parseArg(args, '--agent');
      break;

    case 'task_complete':
      entry.task_id = parseArg(args, '--task');
      entry.findings_file = parseArg(args, '--output');
      const sources = parseArg(args, '--sources');
      if (sources) entry.sources_added = sources.split(',');
      break;

    case 'source_capture': {
      entry.source_id = parseArg(args, '--source');
      entry.url = parseArg(args, '--url');
      entry.evidence_path = parseArg(args, '--path');

      // ENFORCEMENT: --path is required and evidence must exist
      if (!entry.evidence_path) {
        console.error('Error: source_capture requires --path argument');
        console.error('Evidence must be captured BEFORE logging. Run:');
        console.error(`  node scripts/capture.js ${entry.source_id} "${entry.url}" ${caseDir}`);
        process.exit(1);
      }

      // Verify evidence actually exists
      const evidenceFullPath = path.join(caseDir, entry.evidence_path);
      if (!fs.existsSync(evidenceFullPath)) {
        console.error(`Error: Evidence path does not exist: ${evidenceFullPath}`);
        console.error('Capture evidence BEFORE logging. Run:');
        console.error(`  node scripts/capture.js ${entry.source_id} "${entry.url}" ${caseDir}`);
        process.exit(1);
      }

      // Check for metadata.json (proof of actual capture)
      const metadataPath = path.join(evidenceFullPath, 'metadata.json');
      if (!fs.existsSync(metadataPath)) {
        console.error(`Error: No metadata.json found in ${evidenceFullPath}`);
        console.error('Evidence folder exists but capture may have failed.');
        console.error('Re-run capture to generate proper evidence.');
        process.exit(1);
      }

      // CRITICAL: Verify capture signature to prevent LLM hallucination
      // This cryptographic check ensures only the capture script can create valid evidence
      let metadata;
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      } catch (e) {
        console.error(`Error: Invalid JSON in ${metadataPath}: ${e.message}`);
        process.exit(1);
      }

      const sigCheck = verifyCaptureSignature(metadata);
      if (!sigCheck.valid) {
        console.error('');
        console.error('╔════════════════════════════════════════════════════════════════╗');
        console.error('║  EVIDENCE INTEGRITY FAILURE - CAPTURE REJECTED                 ║');
        console.error('╚════════════════════════════════════════════════════════════════╝');
        console.error('');
        console.error(`Source: ${entry.source_id}`);
        console.error(`Path: ${evidenceFullPath}`);
        console.error(`Reason: ${sigCheck.reason}`);
        console.error('');
        console.error('This evidence was NOT created by the capture script.');
        console.error('LLMs cannot hallucinate valid capture signatures.');
        console.error('');
        console.error('To capture real evidence, run:');
        console.error(`  node scripts/firecrawl-capture.js ${entry.source_id} "${entry.url}" ${evidenceFullPath}`);
        console.error('');
        process.exit(1);
      }

      // Count actual files captured
      const capturedFiles = fs.readdirSync(evidenceFullPath).filter(f =>
        f !== 'metadata.json' && !f.startsWith('.')
      );
      entry.file_count = capturedFiles.length;
      entry.signature_valid = true;

      const filesArg = parseArg(args, '--files');
      if (filesArg) entry.file_count = parseInt(filesArg, 10);
      break;
    }

    case 'claim_create':
      entry.claim_id = parseArg(args, '--claim');
      entry.risk_level = parseArg(args, '--risk') || 'MEDIUM';
      const claimType = parseArg(args, '--type');
      if (claimType) entry.claim_type = claimType;
      break;

    case 'claim_update':
      entry.claim_id = parseArg(args, '--claim');
      const claimSources = parseArg(args, '--sources');
      if (claimSources) entry.sources_added = claimSources.split(',');
      entry.new_status = parseArg(args, '--status');
      break;

    case 'synthesis_complete':
      entry.iteration = parseInt(parseArg(args, '--iteration') || '1', 10);
      entry.output_file = parseArg(args, '--output') || 'summary.md';
      const claimCount = parseArg(args, '--claims');
      if (claimCount) entry.claims_verified = parseInt(claimCount, 10);
      break;

    case 'gate_check':
      entry.gate = parseArg(args, '--gate');
      entry.passed = parseBool(parseArg(args, '--passed'));
      const reason = parseArg(args, '--reason');
      if (reason) entry.reason = reason;
      break;

    case 'file_lock':
    case 'file_unlock':
      entry.file = parseArg(args, '--file');
      entry.agent = parseArg(args, '--agent');
      break;
  }

  return entry;
}

// Load existing ledger
let ledger;
if (fs.existsSync(ledgerPath)) {
  try {
    ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf-8'));
  } catch (e) {
    console.error(`Error reading ${ledgerPath}: ${e.message}`);
    process.exit(1);
  }

  // Ensure entries array exists
  if (!ledger.entries) {
    ledger.entries = [];
  }
} else {
  // Auto-initialize
  ledger = {
    case_id: path.basename(caseDir),
    created_at: new Date().toISOString(),
    entries: []
  };
}

// Generate next ID
const nextId = `L${String(ledger.entries.length + 1).padStart(3, '0')}`;

// Build and add entry
const entry = buildEntry(entryType, args);
entry.id = nextId;

ledger.entries.push(entry);
ledger.last_updated = new Date().toISOString();

// Write atomically
const tempPath = `${ledgerPath}.tmp`;
fs.writeFileSync(tempPath, JSON.stringify(ledger, null, 2));
fs.renameSync(tempPath, ledgerPath);

// Output confirmation
const summary = Object.entries(entry)
  .filter(([k]) => k !== 'id' && k !== 'ts' && k !== 'type')
  .map(([k, v]) => `${k}=${v}`)
  .join(' ');

console.log(`${nextId} | ${entryType} | ${summary}`);
