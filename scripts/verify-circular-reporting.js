#!/usr/bin/env node
/**
 * verify-circular-reporting.js - Heuristic circular reporting detection.
 *
 * Goal: prevent "fake corroboration" where multiple outlets publish the same wire copy
 * (AP/Reuters) or syndicate a single primary origin, inflating independence.
 *
 * This verifier flags claims whose supporting sources appear to share the same origin.
 *
 * Usage:
 *   node scripts/verify-circular-reporting.js <case_dir>
 *   node scripts/verify-circular-reporting.js <case_dir> --json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { detectSourceOrigin } = require('./lib/config-loader');

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    caseDir: args.find(a => !a.startsWith('--')),
    jsonOutput: args.includes('--json')
  };
}

function getDomain(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch (_) {
    return null;
  }
}

function readEvidenceSnippet(caseDir, sourceId, maxBytes = 300_000) {
  const webDir = path.join(caseDir, 'evidence', 'web', sourceId);
  const candidates = [
    path.join(webDir, 'extracted_text.txt'),
    path.join(webDir, 'capture.html'),
    path.join(webDir, 'content.md')
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const buf = fs.readFileSync(filePath);
      return buf.slice(0, maxBytes).toString('utf-8');
    } catch (_) {}
  }

  // Fallback: metadata title only
  const metaPath = path.join(webDir, 'metadata.json');
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      const title = typeof meta?.title === 'string' ? meta.title : '';
      return title;
    } catch (_) {}
  }

  return '';
}

// detectOrigin is now handled by config-loader.detectSourceOrigin

function loadSources(caseDir) {
  const sourcesPath = path.join(caseDir, 'sources.json');
  if (!fs.existsSync(sourcesPath)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function loadClaims(caseDir) {
  const claimsDir = path.join(caseDir, 'claims');
  if (!fs.existsSync(claimsDir)) return [];
  const files = fs.readdirSync(claimsDir).filter(f => /^C\d{4,}\.json$/i.test(f));
  const claims = [];
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(claimsDir, file), 'utf-8'));
      claims.push(data);
    } catch (_) {}
  }
  return claims;
}

function run(caseDir) {
  const startTime = Date.now();
  const sources = loadSources(caseDir);
  const claims = loadClaims(caseDir);
  const gaps = [];

  const originCache = new Map();
  function getOrigin(sourceId) {
    if (originCache.has(sourceId)) return originCache.get(sourceId);
    const record = sources[sourceId];
    const domain = record?.url ? getDomain(record.url) : null;
    const text = readEvidenceSnippet(caseDir, sourceId);
    const detected = detectSourceOrigin({ sourceRecord: record, domain, text });
    originCache.set(sourceId, detected);
    return detected;
  }

  let checked = 0;
  let flagged = 0;

  for (const claim of claims) {
    const claimId = typeof claim?.id === 'string' ? claim.id : null;
    const supporting = Array.isArray(claim?.supporting_sources) ? claim.supporting_sources.map(String) : [];
    if (supporting.length < 2) continue;

    checked++;

    const origins = supporting.map(sourceId => ({ source_id: sourceId, ...getOrigin(sourceId) }));
    const known = origins.filter(o => o.origin);
    if (known.length < 2) continue;

    const uniqueOrigins = Array.from(new Set(known.map(o => o.origin)));
    if (uniqueOrigins.length === 1) {
      const origin = uniqueOrigins[0];
      flagged++;
      gaps.push({
        type: 'CIRCULAR_REPORTING_RISK',
        object: { claim_id: claimId, origin, sources: supporting },
        message: `Claim ${claimId || '(unknown)'}: supporting sources likely share the same origin (${origin}); treat as 1 independent source`,
        suggested_actions: ['add_truly_independent_source', 'update_claim_corroboration', 'record_origin_metadata']
      });
    }
  }

  const passed = gaps.length === 0;
  return {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed,
    reason: passed ? 'No circular reporting risks detected' : `${gaps.length} circular reporting risk(s) detected`,
    stats: {
      claims_total: claims.length,
      claims_checked: checked,
      claims_flagged: flagged
    },
    gaps
  };
}

function printHuman(output) {
  console.log('='.repeat(60));
  console.log('Circular Reporting Check');
  console.log('='.repeat(60));
  console.log(`Case: ${output.case_dir}`);
  console.log('');
  console.log(`Claims checked: ${output.stats.claims_checked}`);
  console.log(`Claims flagged: ${output.stats.claims_flagged}`);
  console.log('');
  console.log(output.passed ? 'PASS' : `FAIL (${output.gaps.length} gap(s))`);
  if (!output.passed) {
    for (const gap of output.gaps.slice(0, 25)) {
      console.log(`- ${gap.message}`);
    }
  }
}

function cli() {
  const parsed = parseCliArgs(process.argv);
  if (!parsed.caseDir) {
    console.error('Usage: node scripts/verify-circular-reporting.js <case_dir> [--json]');
    process.exit(1);
  }

  const output = run(parsed.caseDir);
  if (parsed.jsonOutput) console.log(JSON.stringify(output, null, 2));
  else printHuman(output);
  process.exit(output.passed ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  cli();
}

