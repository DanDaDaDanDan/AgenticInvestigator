#!/usr/bin/env node
/**
 * verify-corroboration.js - Verify claim corroboration requirements
 *
 * Checks that all claims in claims/*.json meet their corroboration requirements:
 * - min_sources threshold
 * - independence rules
 * - primary source requirements
 *
 * Usage:
 *   node scripts/verify-corroboration.js <case_dir>
 *   node scripts/verify-corroboration.js <case_dir> --json
 *
 * Exit codes:
 *   0 - All claims meet corroboration requirements
 *   1 - One or more claims below threshold
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ANSI colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m';

function parseCliArgs(argv) {
  const args = argv.slice(2);
  return {
    caseDir: args.find(a => !a.startsWith('--')),
    jsonOutput: args.includes('--json')
  };
}

/**
 * Get domain from URL
 */
function getDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

/**
 * Normalize a captured source into a category used by corroboration rules.
 * If sources.json doesn't include `category`, derive it from `source_type`.
 */
function getSourceCategory(source) {
  if (!source || typeof source !== 'object') return null;
  if (typeof source.category === 'string' && source.category.trim()) {
    return source.category.trim().toLowerCase();
  }

  const sourceType = typeof source.source_type === 'string' ? source.source_type.toLowerCase() : '';
  if (!sourceType) return null;

  if (sourceType.includes('primary')) return 'primary';
  if (sourceType.includes('official') || sourceType.includes('government') || sourceType.includes('court') || sourceType.includes('database')) return 'government';
  if (sourceType.includes('news') || sourceType.includes('press')) return 'news';
  if (sourceType.includes('social') || sourceType.includes('twitter') || sourceType.includes('x_')) return 'social';

  return null;
}

/**
 * Check if sources are independent based on rule
 */
function checkIndependence(sources, rule, sourcesData) {
  if (sources.length < 2) return false;

  switch (rule) {
    case 'different_domain': {
      const domains = new Set();
      for (const sourceId of sources) {
        const source = sourcesData[sourceId];
        if (source?.url) {
          const domain = getDomain(source.url);
          if (domain) domains.add(domain);
        }
      }
      return domains.size >= 2;
    }

    case 'primary_plus_secondary': {
      const hasPrimary = sources.some(s => getSourceCategory(sourcesData[s]) === 'primary');
      const hasSecondary = sources.some(s => getSourceCategory(sourcesData[s]) !== 'primary');
      return hasPrimary && hasSecondary;
    }

    case 'different_domain_or_primary': {
      // Either different domains OR has a primary source
      const hasPrimary = sources.some(s => getSourceCategory(sourcesData[s]) === 'primary');
      if (hasPrimary) return true;

      const domains = new Set();
      for (const sourceId of sources) {
        const source = sourcesData[sourceId];
        if (source?.url) {
          const domain = getDomain(source.url);
          if (domain) domains.add(domain);
        }
      }
      return domains.size >= 2;
    }

    default:
      return true; // Unknown rule, pass
  }
}

/**
 * Main function
 */
async function main() {
  const claimsDir = path.join(caseDir, 'claims');

  if (!fs.existsSync(claimsDir)) {
    const result = {
      passed: true,
      reason: 'No claims directory found',
      stats: { total: 0, verified: 0, insufficient: 0 },
      gaps: []
    };

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('No claims directory found - skipping corroboration check');
    }
    process.exit(0);
  }

  // Load sources data
  const sourcesPath = path.join(caseDir, 'sources.json');
  let sourcesData = {};
  if (fs.existsSync(sourcesPath)) {
    try {
      sourcesData = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
    } catch (e) {}
  }

  // Process claims
  const claimFiles = fs.readdirSync(claimsDir)
    .filter(f => f.startsWith('C') && f.endsWith('.json'));

  const results = {
    total: 0,
    verified: 0,
    insufficient: 0,
    pending: 0,
    details: [],
    gaps: []
  };

  let gapCounter = 1;

  for (const file of claimFiles) {
    try {
      const claimPath = path.join(claimsDir, file);
      const claim = JSON.parse(fs.readFileSync(claimPath, 'utf-8'));

      results.total++;

      const supportingSources = claim.supporting_sources || [];
      const minSources = claim.corroboration?.min_sources || 1;
      const independenceRule = claim.corroboration?.independence_rule;
      const requiresPrimary = claim.corroboration?.requires_primary || false;

      const detail = {
        id: claim.id,
        claim: claim.claim?.substring(0, 50) + '...',
        sources: supportingSources.length,
        min_required: minSources,
        status: 'verified'
      };

      let isVerified = true;
      const issues = [];

      // Check min sources
      if (supportingSources.length < minSources) {
        isVerified = false;
        issues.push(`Has ${supportingSources.length} sources, requires ${minSources}`);
      }

      // Check independence
      if (independenceRule && supportingSources.length >= 2) {
        if (!checkIndependence(supportingSources, independenceRule, sourcesData)) {
          isVerified = false;
          issues.push(`Sources do not meet independence rule: ${independenceRule}`);
        }
      }

      // Check primary requirement
      if (requiresPrimary) {
        const hasPrimary = supportingSources.some(s => getSourceCategory(sourcesData[s]) === 'primary');
        if (!hasPrimary) {
          isVerified = false;
          issues.push('Requires primary source but none found');
        }
      }

      if (isVerified) {
        results.verified++;
        detail.status = 'verified';
      } else {
        results.insufficient++;
        detail.status = 'insufficient';
        detail.issues = issues;

        // Generate gaps
        for (const issue of issues) {
          results.gaps.push({
            gap_id: `G${String(gapCounter++).padStart(4, '0')}`,
            type: 'INSUFFICIENT_CORROBORATION',
            object: { claim_id: claim.id },
            severity: 'BLOCKER',
            message: `Claim ${claim.id}: ${issue}`,
            suggested_actions: ['find_corroborating_source', 'capture', 'update_claim']
          });
        }
      }

      results.details.push(detail);

    } catch (e) {
      // Skip malformed files
    }
  }

  const passed = results.insufficient === 0;

  const output = {
    passed,
    reason: passed
      ? 'All claims meet corroboration requirements'
      : `${results.insufficient} claims below threshold`,
    stats: {
      total: results.total,
      verified: results.verified,
      insufficient: results.insufficient
    },
    verification_rate: results.total > 0
      ? `${((results.verified / results.total) * 100).toFixed(1)}%`
      : 'N/A',
    details: results.details,
    gaps: results.gaps
  };

  if (jsonOutput) {
    console.log(JSON.stringify(output, null, 2));
  } else {
    console.log('='.repeat(60));
    console.log('Corroboration Verification');
    console.log('='.repeat(60));
    console.log(`Case: ${caseDir}`);
    console.log('');
    console.log(`Total claims: ${results.total}`);
    console.log(`${GREEN}Verified: ${results.verified}${NC}`);
    console.log(`${RED}Insufficient: ${results.insufficient}${NC}`);
    console.log(`Verification rate: ${output.verification_rate}`);
    console.log('');

    if (results.insufficient > 0) {
      console.log(`${RED}Claims below threshold:${NC}`);
      for (const detail of results.details.filter(d => d.status === 'insufficient')) {
        console.log(`  [${detail.id}] ${detail.sources}/${detail.min_required} sources`);
        for (const issue of detail.issues || []) {
          console.log(`    - ${issue}`);
        }
      }
    }

    console.log('');
    console.log(passed
      ? `${GREEN}PASS: All claims corroborated${NC}`
      : `${RED}FAIL: ${results.insufficient} claims need more sources${NC}`
    );
  }

  process.exit(passed ? 0 : 1);
}

function run(caseDir) {
  const startTime = Date.now();

  if (!caseDir || typeof caseDir !== 'string') {
    return {
      timestamp: new Date().toISOString(),
      case_dir: caseDir || null,
      duration_ms: Date.now() - startTime,
      passed: false,
      reason: 'Missing case directory argument',
      stats: { total: 0, verified: 0, insufficient: 0 },
      details: [],
      gaps: [{
        type: 'STATE_INCONSISTENT',
        object: { field: 'case_dir' },
        message: 'Missing case directory argument',
        suggested_actions: ['provide_case_dir']
      }]
    };
  }

  const claimsDir = path.join(caseDir, 'claims');
  if (!fs.existsSync(claimsDir)) {
    return {
      timestamp: new Date().toISOString(),
      case_dir: caseDir,
      duration_ms: Date.now() - startTime,
      passed: true,
      reason: 'No claims directory found',
      stats: { total: 0, verified: 0, insufficient: 0 },
      details: [],
      gaps: []
    };
  }

  // Load sources data
  const sourcesPath = path.join(caseDir, 'sources.json');
  let sourcesData = {};
  if (fs.existsSync(sourcesPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        sourcesData = parsed;
      }
    } catch (_) {}
  }

  const claimFiles = fs.readdirSync(claimsDir).filter(f => /^C\d{4,}\.json$/i.test(f));

  const results = {
    total: 0,
    verified: 0,
    insufficient: 0,
    details: [],
    gaps: []
  };

  for (const file of claimFiles) {
    try {
      const claimPath = path.join(claimsDir, file);
      const claim = JSON.parse(fs.readFileSync(claimPath, 'utf-8'));

      const claimId = claim.id || path.basename(file, '.json');
      const supportingSources = Array.isArray(claim.supporting_sources) ? claim.supporting_sources.map(String) : [];
      const minSources = claim.corroboration?.min_sources || 1;
      const independenceRule = claim.corroboration?.independence_rule;
      const requiresPrimary = claim.corroboration?.requires_primary === true;

      results.total++;

      const issues = [];

      if (supportingSources.length < minSources) {
        issues.push(`Has ${supportingSources.length} sources, requires ${minSources}`);
      }

      if (independenceRule && supportingSources.length >= 2) {
        if (!checkIndependence(supportingSources, independenceRule, sourcesData)) {
          issues.push(`Sources do not meet independence rule: ${independenceRule}`);
        }
      }

      if (requiresPrimary) {
        const hasPrimary = supportingSources.some(s => getSourceCategory(sourcesData[s]) === 'primary');
        if (!hasPrimary) {
          issues.push('Requires primary source but none found');
        }
      }

      const detail = {
        id: claimId,
        sources: supportingSources.length,
        min_required: minSources,
        status: issues.length === 0 ? 'verified' : 'insufficient',
        issues
      };

      results.details.push(detail);

      if (issues.length === 0) {
        results.verified++;
      } else {
        results.insufficient++;
        for (const issue of issues) {
          results.gaps.push({
            type: 'INSUFFICIENT_CORROBORATION',
            object: { claim_id: claimId },
            message: `Claim ${claimId}: ${issue}`,
            suggested_actions: ['find_corroborating_source', 'capture', 'update_claim']
          });
        }
      }
    } catch (_) {
      // Skip malformed files
    }
  }

  const passed = results.insufficient === 0;
  return {
    timestamp: new Date().toISOString(),
    case_dir: caseDir,
    duration_ms: Date.now() - startTime,
    passed,
    reason: passed
      ? 'All claims meet corroboration requirements'
      : `${results.insufficient} claims below threshold`,
    stats: {
      total: results.total,
      verified: results.verified,
      insufficient: results.insufficient
    },
    verification_rate: results.total > 0
      ? Math.round((results.verified / results.total) * 1000) / 10
      : null,
    details: results.details,
    gaps: results.gaps
  };
}

function printHuman(output) {
  console.log('='.repeat(60));
  console.log('Corroboration Verification');
  console.log('='.repeat(60));
  console.log(`Case: ${output.case_dir}`);
  console.log('');
  console.log(`Total claims: ${output.stats.total}`);
  console.log(`${GREEN}Verified: ${output.stats.verified}${NC}`);
  console.log(`${RED}Insufficient: ${output.stats.insufficient}${NC}`);
  console.log('');

  if (output.stats.insufficient > 0) {
    console.log(`${RED}Claims below threshold:${NC}`);
    for (const detail of (output.details || []).filter(d => d.status === 'insufficient').slice(0, 25)) {
      console.log(`  [${detail.id}] ${detail.sources}/${detail.min_required} sources`);
      for (const issue of detail.issues || []) {
        console.log(`    - ${issue}`);
      }
    }
    if (output.stats.insufficient > 25) {
      console.log(`  ... and ${output.stats.insufficient - 25} more`);
    }
  }

  console.log('');
  console.log(output.passed
    ? `${GREEN}PASS${NC}: All claims corroborated`
    : `${RED}FAIL${NC}: ${output.stats.insufficient} claim(s) need more sources`
  );
}

function cli() {
  const parsed = parseCliArgs(process.argv);
  if (!parsed.caseDir) {
    console.error('Usage: node scripts/verify-corroboration.js <case_dir> [--json]');
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
