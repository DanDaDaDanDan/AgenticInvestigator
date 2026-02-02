#!/usr/bin/env node
/**
 * audit-leads.js - Lead hygiene audit
 *
 * Leads are intermediate artifacts that often leak into findings/articles. This audit
 * enforces a minimal sourcing discipline:
 *
 * - For investigated leads: if result contains digits (numbers/dates/stats), sources[] must be non-empty.
 * - Any referenced sources must exist in sources.json and have http(s) URLs (no synthesis placeholders).
 *
 * Usage:
 *   node scripts/audit-leads.js <case_dir> [--block] [--json]
 *
 * Exit codes:
 *   0 - OK (or non-blocking mode)
 *   1 - Errors found (when --block used)
 *   2 - Usage/config error
 */

'use strict';

const fs = require('fs');
const path = require('path');

function isHttpUrl(url) {
  return typeof url === 'string' && /^https?:\/\/.+/i.test(url.trim());
}

function isSourceId(value) {
  return typeof value === 'string' && /^S\d{3,}$/.test(value.trim());
}

function safeReadJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return { ok: false, error: 'NOT_FOUND' };
    return { ok: true, value: JSON.parse(fs.readFileSync(filePath, 'utf-8')) };
  } catch (e) {
    return { ok: false, error: 'INVALID_JSON', message: e.message };
  }
}

function auditLeads(caseDir) {
  const leadsPath = path.join(caseDir, 'leads.json');
  const sourcesPath = path.join(caseDir, 'sources.json');

  const leadsParsed = safeReadJson(leadsPath);
  if (!leadsParsed.ok) {
    return { ok: false, error: 'LEADS_JSON_INVALID', path: leadsPath, message: leadsParsed.message || leadsParsed.error };
  }

  const sourcesParsed = safeReadJson(sourcesPath);
  if (!sourcesParsed.ok) {
    return { ok: false, error: 'SOURCES_JSON_INVALID', path: sourcesPath, message: sourcesParsed.message || sourcesParsed.error };
  }

  const leads = Array.isArray(leadsParsed.value?.leads) ? leadsParsed.value.leads : [];
  const sources = Array.isArray(sourcesParsed.value?.sources) ? sourcesParsed.value.sources : [];
  const sourcesById = new Map(sources.map(s => [s.id, s]));

  const results = {
    caseDir,
    generatedAt: new Date().toISOString(),
    summary: {
      total: leads.length,
      investigated: 0,
      investigatedWithDigits: 0,
      investigatedMissingSources: 0,
      invalidSourceIds: 0,
      unknownSources: 0,
      nonHttpSources: 0,
      uncapturedSources: 0
    },
    errors: [],
    details: []
  };

  for (const lead of leads) {
    if (!lead || typeof lead !== 'object') continue;
    if (lead.status !== 'investigated') continue;

    results.summary.investigated += 1;

    const leadId = String(lead.id || '');
    const resultText = String(lead.result || '');
    const hasDigits = /\d/.test(resultText);
    const sourcesUsed = Array.isArray(lead.sources) ? lead.sources : [];

    if (hasDigits) results.summary.investigatedWithDigits += 1;

    const detail = {
      id: leadId || null,
      hasDigits,
      sourcesCount: sourcesUsed.length,
      errors: []
    };

    if (hasDigits && sourcesUsed.length === 0) {
      results.summary.investigatedMissingSources += 1;
      detail.errors.push('Investigated lead result contains digits but sources[] is empty');
    }

    for (const sourceId of sourcesUsed) {
      if (!isSourceId(sourceId)) {
        results.summary.invalidSourceIds += 1;
        detail.errors.push(`Invalid source id: "${sourceId}"`);
        continue;
      }

      const entry = sourcesById.get(sourceId);
      if (!entry) {
        results.summary.unknownSources += 1;
        detail.errors.push(`Source not found in sources.json: ${sourceId}`);
        continue;
      }

      if (!isHttpUrl(entry.url)) {
        results.summary.nonHttpSources += 1;
        detail.errors.push(`Non-http(s) URL in sources.json for ${sourceId}: "${entry.url}"`);
      }

      if (entry.captured !== true) {
        results.summary.uncapturedSources += 1;
        detail.errors.push(`captured is not true in sources.json for ${sourceId}: ${JSON.stringify(entry.captured)}`);
      }
    }

    if (detail.errors.length > 0) {
      results.details.push(detail);
    }
  }

  results.ok = results.details.length === 0 && !results.error;
  if (!results.ok) {
    results.errors = results.details.slice(0, 50);
  }

  return results;
}

function printUsage() {
  console.log('audit-leads.js - Lead hygiene audit');
  console.log('');
  console.log('Usage: node scripts/audit-leads.js <case_dir> [--block] [--json]');
}

function main() {
  const args = process.argv.slice(2);
  const caseDir = args.find(a => !a.startsWith('--'));
  const jsonOutput = args.includes('--json');
  const block = args.includes('--block');

  if (!caseDir) {
    printUsage();
    process.exit(2);
  }
  if (!fs.existsSync(caseDir)) {
    const err = { error: 'CASE_DIR_NOT_FOUND', message: `Not found: ${caseDir}` };
    if (jsonOutput) console.log(JSON.stringify(err, null, 2));
    else console.error(err.message);
    process.exit(2);
  }

  const res = auditLeads(caseDir);
  if (jsonOutput) console.log(JSON.stringify(res, null, 2));
  else {
    console.log('='.repeat(70));
    console.log('LEADS AUDIT');
    console.log('='.repeat(70));
    console.log(`Case: ${caseDir}`);
    if (res.error) {
      console.log(`Status: FAIL (${res.error})`);
      if (res.message) console.log(res.message);
    } else {
      console.log(`Status: ${res.ok ? 'PASS' : 'FAIL'}`);
      const s = res.summary;
      console.log(`Investigated leads: ${s.investigated}/${s.total}`);
      console.log(`Investigated with digits: ${s.investigatedWithDigits}`);
      console.log(`Investigated missing sources: ${s.investigatedMissingSources}`);
      console.log(`Invalid source IDs: ${s.invalidSourceIds}`);
      console.log(`Unknown sources: ${s.unknownSources}`);
      console.log(`Non-http sources: ${s.nonHttpSources}`);
      console.log(`Uncaptured sources: ${s.uncapturedSources}`);

      if (!res.ok && Array.isArray(res.details) && res.details.length > 0) {
        console.log('\n--- SAMPLE FAILURES ---');
        for (const d of res.details.slice(0, 20)) {
          console.log(`- ${d.id}: ${d.errors.join('; ')}`);
        }
      }
    }
    console.log('='.repeat(70));
  }

  if (block && !res.ok) process.exit(1);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { auditLeads };

