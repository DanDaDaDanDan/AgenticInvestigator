#!/usr/bin/env node
/**
 * verify-sources-dedup.js - Detect duplicate URLs mapped to multiple source IDs.
 *
 * Duplicate URLs can inflate "independent corroboration" and should be resolved by
 * merging sources or explicitly marking the duplicate with a reason.
 *
 * Usage:
 *   node scripts/verify-sources-dedup.js <case_dir>
 *   node scripts/verify-sources-dedup.js <case_dir> --json
 *
 * sources.json schema expected: { "S001": { "url": "..." }, ... }
 *
 * Allowing duplicates (optional):
 * - Add to the duplicate source record:
 *   - `duplicate_of: "S001"` and `duplicate_reason: "..."`, OR
 *   - `allow_duplicate: true` and `duplicate_reason: "..."`
 */

'use strict';

const fs = require('fs');
const path = require('path');

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    caseDir: args.find(a => !a.startsWith('--')),
    jsonOutput: args.includes('--json')
  };
}

function canonicalizeUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    url.hash = '';

    // Normalize host
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');

    // Drop default ports
    if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) {
      url.port = '';
    }

    // Strip common tracking params
    const trackingPrefixes = ['utm_', 'mc_', 'fbclid', 'gclid', 'igshid'];
    for (const key of Array.from(url.searchParams.keys())) {
      const lower = key.toLowerCase();
      if (trackingPrefixes.some(p => lower === p || lower.startsWith(p))) {
        url.searchParams.delete(key);
      }
    }

    // Normalize path (remove trailing slash unless root)
    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    // Sort params for stability
    const params = Array.from(url.searchParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    url.search = params.length ? `?${params.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}` : '';

    return url.toString();
  } catch (_) {
    return null;
  }
}

function isAllowedDuplicate(record, groupIds) {
  if (!record || typeof record !== 'object') return false;
  const reason = typeof record.duplicate_reason === 'string' ? record.duplicate_reason.trim() : '';

  if (record.allow_duplicate === true && reason) return true;

  const dupOf = typeof record.duplicate_of === 'string' ? record.duplicate_of.trim() : '';
  if (dupOf && groupIds.includes(dupOf) && reason) return true;

  return false;
}

function run(caseDir) {
  const startTime = Date.now();

  const sourcesPath = path.join(caseDir, 'sources.json');
  if (!fs.existsSync(sourcesPath)) {
    return {
      timestamp: new Date().toISOString(),
      case_dir: caseDir,
      duration_ms: Date.now() - startTime,
      passed: true,
      reason: 'sources.json not found',
      stats: { total_sources: 0, with_url: 0, duplicate_groups: 0, duplicate_sources: 0 },
      duplicates: [],
      gaps: []
    };
  }

  let sources;
  try {
    sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
  } catch (e) {
    return {
      timestamp: new Date().toISOString(),
      case_dir: caseDir,
      duration_ms: Date.now() - startTime,
      passed: false,
      reason: `Failed to parse sources.json: ${e.message}`,
      stats: { total_sources: 0, with_url: 0, duplicate_groups: 0, duplicate_sources: 0 },
      duplicates: [],
      gaps: [{
        type: 'SCHEMA_INVALID',
        object: { file: 'sources.json' },
        message: `sources.json is not valid JSON: ${e.message}`,
        suggested_actions: ['fix_sources_json']
      }]
    };
  }

  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) {
    return {
      timestamp: new Date().toISOString(),
      case_dir: caseDir,
      duration_ms: Date.now() - startTime,
      passed: false,
      reason: 'sources.json must be an object mapping S### -> metadata',
      stats: { total_sources: 0, with_url: 0, duplicate_groups: 0, duplicate_sources: 0 },
      duplicates: [],
      gaps: [{
        type: 'SCHEMA_INVALID',
        object: { file: 'sources.json' },
        message: 'sources.json must be an object mapping S### -> metadata (not an array)',
        suggested_actions: ['fix_sources_json_schema']
      }]
    };
  }

  const entries = Object.entries(sources).filter(([id]) => /^S\d{3,4}$/.test(id));
  const byCanonical = new Map();

  let withUrl = 0;
  for (const [sourceId, record] of entries) {
    const url = record && typeof record === 'object' ? record.url : null;
    const canonical = canonicalizeUrl(url);
    if (!canonical) continue;
    withUrl++;
    const list = byCanonical.get(canonical) || [];
    list.push({ source_id: sourceId, url: String(url) });
    byCanonical.set(canonical, list);
  }

  const duplicates = [];
  const gaps = [];

  for (const [canonicalUrl, group] of byCanonical.entries()) {
    if (group.length < 2) continue;

    const groupIds = group.map(g => g.source_id);
    const unallowed = group.filter(g => {
      const record = sources[g.source_id];
      return !isAllowedDuplicate(record, groupIds);
    });

    duplicates.push({
      canonical_url: canonicalUrl,
      sources: group
    });

    if (unallowed.length > 0) {
      gaps.push({
        type: 'DUPLICATE_SOURCE_URL',
        object: { canonical_url: canonicalUrl, sources: groupIds },
        message: `Duplicate URL captured under multiple source IDs: ${groupIds.join(', ')}`,
        suggested_actions: ['merge_sources', 'deduplicate_sources_json', 'record_duplicate_reason']
      });
    }
  }

  const duplicateSources = duplicates.reduce((sum, d) => sum + d.sources.length, 0);

  const passed = gaps.length === 0;
  return {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed,
    reason: passed ? 'No duplicate source URLs detected' : `${gaps.length} duplicate URL group(s) found`,
    stats: {
      total_sources: entries.length,
      with_url: withUrl,
      duplicate_groups: duplicates.length,
      duplicate_sources: duplicateSources
    },
    duplicates,
    gaps
  };
}

function printHuman(output) {
  console.log('='.repeat(60));
  console.log('Source Deduplication Check');
  console.log('='.repeat(60));
  console.log(`Case: ${output.case_dir}`);
  console.log('');
  console.log(`Total sources: ${output.stats.total_sources}`);
  console.log(`With URL: ${output.stats.with_url}`);
  console.log(`Duplicate groups: ${output.stats.duplicate_groups}`);
  console.log('');

  for (const dup of output.duplicates.slice(0, 25)) {
    const ids = dup.sources.map(s => s.source_id).join(', ');
    console.log(`- ${ids}`);
    console.log(`  ${dup.canonical_url}`);
  }

  if (output.duplicates.length > 25) {
    console.log(`... and ${output.duplicates.length - 25} more`);
  }

  console.log('');
  console.log(output.passed ? 'PASS' : 'FAIL');
}

function cli() {
  const parsed = parseCliArgs(process.argv);
  if (!parsed.caseDir) {
    console.error('Usage: node scripts/verify-sources-dedup.js <case_dir> [--json]');
    process.exit(1);
  }

  const output = run(parsed.caseDir);
  if (parsed.jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    printHuman(output);
  }

  process.exit(output.passed ? 0 : 1);
}

module.exports = { run };

if (require.main === module) {
  cli();
}

