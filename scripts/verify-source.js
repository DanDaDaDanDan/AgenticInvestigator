#!/usr/bin/env node
/**
 * verify-source.js - Verify evidence integrity via hash verification
 *
 * Detects fabricated sources by:
 * 1. Hash verification: SHA256 of raw content matches stored hash
 * 2. Structure validation: Required fields present
 * 3. Red flag detection: Round timestamps, suspicious patterns
 *
 * Usage:
 *   node scripts/verify-source.js <source_id> <case_dir>
 *   node scripts/verify-source.js --all <case_dir>
 *   node scripts/verify-source.js --check-article <case_dir>
 *
 * Exit codes:
 *   0 - All sources verified
 *   1 - Verification failures found
 *   2 - Usage error
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Red flag patterns that suggest fabrication
const FABRICATION_PATTERNS = {
  roundTimestamp: /T\d{2}:00:00\.000Z$/,
  compilationContent: /^(Research compilation|Summary of|Synthesis of|Overview of)/i,
  homepageUrl: /^https?:\/\/[^/]+\/?$/,
  suspiciousTitle: /(compilation|synthesis|summary|overview|aggregat)/i
};

function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function verifySource(sourceId, caseDir) {
  const evidenceDir = path.join(caseDir, 'evidence', sourceId);
  const metadataPath = path.join(evidenceDir, 'metadata.json');
  const result = {
    sourceId,
    valid: false,
    checks: [],
    errors: [],
    warnings: []
  };

  // Check 1: Evidence directory exists
  if (!fs.existsSync(evidenceDir)) {
    result.errors.push(`Evidence directory missing: evidence/${sourceId}/`);
    return result;
  }
  result.checks.push('directory_exists');

  // Check 2: metadata.json exists
  if (!fs.existsSync(metadataPath)) {
    result.errors.push('metadata.json missing - source may be fabricated');
    return result;
  }
  result.checks.push('metadata_exists');

  // Check 3: Parse metadata
  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  } catch (e) {
    result.errors.push(`metadata.json invalid JSON: ${e.message}`);
    return result;
  }
  result.checks.push('metadata_valid_json');

  // Check 4: Required fields
  // STRICT: Every source MUST have a valid URL (http/https)
  // No "synthesis" or "internal analysis" sources allowed - One Source = One URL
  const hasUrl = !!metadata.url;
  const hasCapturedAt = !!metadata.captured_at;
  const hasFiles = !!metadata.files;
  const hasSha256 = !!metadata.sha256;

  // Check for forbidden source types (synthesis sources are fabrication)
  const FORBIDDEN_TYPES = [
    'research_synthesis', 'synthesis', 'compilation',
    'internal_analysis', 'methodology_note', 'methodological_analysis',
    'academic_research_synthesis', 'literature_review_synthesis'
  ];
  if (FORBIDDEN_TYPES.includes(metadata.type)) {
    result.errors.push(`Forbidden source type: ${metadata.type} - One Source = One URL. No synthesis/compilation sources allowed.`);
  }
  // Also catch any type containing "synthesis" or "compilation"
  if (metadata.type && (metadata.type.includes('synthesis') || metadata.type.includes('compilation'))) {
    if (!FORBIDDEN_TYPES.includes(metadata.type)) {
      result.errors.push(`Forbidden source type pattern: ${metadata.type} - types containing 'synthesis' or 'compilation' are not allowed`);
    }
  }

  // URL is REQUIRED for all sources
  if (!hasUrl) {
    result.errors.push('Required field missing: url - every source must have a URL');
  } else {
    // Validate URL format - must be http or https
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(metadata.url)) {
      result.errors.push(`Invalid URL format: "${metadata.url}" - must start with http:// or https://`);
    }
    // Check for suspicious URLs that indicate fabrication
    if (metadata.url.includes('synthesis') || metadata.url.includes('compilation') || metadata.url.includes('multiple_sources')) {
      result.errors.push(`Fabricated URL detected: "${metadata.url}" - URLs cannot contain synthesis/compilation indicators`);
    }
  }
  if (!hasCapturedAt) result.errors.push('Required field missing: captured_at');
  if (!hasFiles && !hasSha256) result.errors.push('Required field missing: files or sha256');

  if (result.errors.length > 0) return result;
  result.checks.push('required_fields');

  // Check 5: Capture signature validation
  // Legitimate signatures from osint-save.js: sig_v2_[32 hex chars] or sig_v2_osint_[method]_[timestamp]
  // Fabricated signatures are human-readable: sig_v2_synthesis_topic_name
  if (metadata._capture_signature) {
    const sig = metadata._capture_signature;

    // Must start with sig_v2_
    if (!sig.startsWith('sig_v2_')) {
      result.errors.push(`Invalid capture signature format: "${sig}" - must start with sig_v2_`);
    } else {
      const sigSuffix = sig.slice(7); // After "sig_v2_"

      // Check for fabrication indicators in signature
      const fabricationWords = ['synthesis', 'compilation', 'aggregat', 'summary', 'overview', 'multiple'];
      const hasFabricationWord = fabricationWords.some(word => sigSuffix.toLowerCase().includes(word));

      if (hasFabricationWord) {
        result.errors.push(`Fabricated capture signature: "${sig}" - signatures cannot contain synthesis/compilation words`);
      } else {
        // Valid signature patterns:
        // 1. 32 hex chars: sig_v2_8cb2516b48e77f82f560e7966d6ab5fb
        // 2. osint prefix: sig_v2_osint_[method]_[something]
        // 3. Contains timestamp-like pattern
        const isHexHash = /^[a-f0-9]{32}$/.test(sigSuffix);
        const isOsintFormat = sigSuffix.startsWith('osint');
        const hasTimestamp = /\d{4}[-T]\d{2}/.test(sigSuffix); // YYYY-MM or YYYYTMM pattern

        if (isHexHash || isOsintFormat || hasTimestamp) {
          result.checks.push('capture_signature');
        } else {
          result.warnings.push(`Unusual capture signature format: "${sig}" - may be manually created`);
        }
      }
    }
  } else {
    // Not an error for direct mcp-osint captures
    result.warnings.push('No _capture_signature (direct mcp-osint capture)');
  }

  // Check 6: Hash verification - supports both formats
  // Format A (osint-save): verification.raw_file + verification.computed_hash
  // Format B (mcp-osint): files.raw_html + sha256
  let verificationPassed = false;

  if (metadata.verification && metadata.verification.raw_file) {
    // Format A: osint-save verification block
    const v = metadata.verification;
    const rawPath = path.join(evidenceDir, v.raw_file);

    if (fs.existsSync(rawPath)) {
      const actualHash = hashFile(rawPath);

      if (v.computed_hash && actualHash === v.computed_hash) {
        result.checks.push('hash_self_consistent');
        verificationPassed = true;
      } else if (v.computed_hash) {
        result.errors.push(`Hash mismatch: file=${actualHash}, stored=${v.computed_hash}`);
      }

      // Check against osint_get reported hash
      if (v.osint_reported_hash) {
        if (actualHash === v.osint_reported_hash) {
          result.checks.push('hash_matches_osint');
        } else {
          result.warnings.push(`Hash differs from osint_get: ${actualHash} vs ${v.osint_reported_hash}`);
        }
      }
    } else {
      result.errors.push(`Verification file missing: ${v.raw_file}`);
    }
  } else if (metadata.files && metadata.sha256) {
    // Format B: mcp-osint direct format (files.raw_html + sha256)
    const rawHtmlFile = metadata.files.raw_html;
    if (rawHtmlFile) {
      const rawPath = path.join(evidenceDir, rawHtmlFile);
      if (fs.existsSync(rawPath)) {
        const actualHash = hashFile(rawPath);
        const expectedHash = metadata.sha256.startsWith('sha256:') ? metadata.sha256 : `sha256:${metadata.sha256}`;

        if (actualHash === expectedHash) {
          result.checks.push('hash_verified_mcp_osint');
          verificationPassed = true;
        } else {
          result.errors.push(`Hash mismatch: file=${actualHash}, metadata=${expectedHash}`);
        }
      } else {
        result.errors.push(`Raw HTML file missing: ${rawHtmlFile}`);
      }
    }
  } else if (metadata.files) {
    // Legacy format - check files block for hashes (osint-save.js format)
    let hasVerifiableFile = false;

    for (const [key, fileInfo] of Object.entries(metadata.files)) {
      if (typeof fileInfo === 'object' && fileInfo.path && fileInfo.hash) {
        const filePath = path.join(evidenceDir, fileInfo.path);
        if (fs.existsSync(filePath)) {
          const actualHash = hashFile(filePath);
          if (actualHash === fileInfo.hash) {
            hasVerifiableFile = true;
            verificationPassed = true;
          } else {
            result.errors.push(`Hash mismatch for ${fileInfo.path}: actual=${actualHash}, stored=${fileInfo.hash}`);
          }
        }
      }
    }

    if (hasVerifiableFile) {
      result.checks.push('legacy_hash_verified');
    }
  }

  // Check 7: Red flags

  // Round timestamp
  if (metadata.captured_at && FABRICATION_PATTERNS.roundTimestamp.test(metadata.captured_at)) {
    result.warnings.push(`Suspicious round timestamp: ${metadata.captured_at}`);
  }

  // Homepage URL (not specific article)
  if (metadata.url && FABRICATION_PATTERNS.homepageUrl.test(metadata.url)) {
    result.warnings.push(`URL appears to be homepage, not specific article: ${metadata.url}`);
  }

  // Suspicious title
  if (metadata.title && FABRICATION_PATTERNS.suspiciousTitle.test(metadata.title)) {
    result.warnings.push(`Title suggests compilation, not single source: ${metadata.title}`);
  }

  // Check content.md for fabrication patterns
  const contentPath = path.join(evidenceDir, 'content.md');
  if (fs.existsSync(contentPath)) {
    const contentStart = fs.readFileSync(contentPath, 'utf-8').slice(0, 200);
    if (FABRICATION_PATTERNS.compilationContent.test(contentStart)) {
      result.errors.push('content.md starts with compilation pattern - likely fabricated');
    }
  }

  result.checks.push('red_flag_scan');

  // Final verdict
  result.valid = result.errors.length === 0;

  return result;
}

function extractCitedSources(articlePath) {
  if (!fs.existsSync(articlePath)) {
    return [];
  }

  const content = fs.readFileSync(articlePath, 'utf-8');
  const citations = content.match(/\[S\d{3}\]/g) || [];
  const unique = [...new Set(citations)].map(c => c.slice(1, -1));
  return unique;
}

function verifyAllSources(caseDir) {
  const evidenceDir = path.join(caseDir, 'evidence');

  if (!fs.existsSync(evidenceDir)) {
    return { sources: [], summary: { total: 0, valid: 0, invalid: 0 } };
  }

  const sources = fs.readdirSync(evidenceDir)
    .filter(d => d.match(/^S\d{3}$/))
    .sort();

  const results = sources.map(sourceId => verifySource(sourceId, caseDir));

  return {
    sources: results,
    summary: {
      total: results.length,
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length
    }
  };
}

function verifyArticleSources(caseDir) {
  const articlePath = path.join(caseDir, 'articles', 'full.md');
  const citedSources = extractCitedSources(articlePath);

  if (citedSources.length === 0) {
    return {
      cited: [],
      results: [],
      summary: { cited: 0, verified: 0, failed: 0, missing: 0 }
    };
  }

  const results = citedSources.map(sourceId => {
    const result = verifySource(sourceId, caseDir);
    result.citedInArticle = true;
    return result;
  });

  return {
    cited: citedSources,
    results,
    summary: {
      cited: citedSources.length,
      verified: results.filter(r => r.valid).length,
      failed: results.filter(r => !r.valid && r.checks.length > 0).length,
      missing: results.filter(r => r.checks.length === 0).length
    }
  };
}

function printResult(result, verbose = false) {
  const status = result.valid ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`${status} ${result.sourceId}`);

  if (!result.valid || verbose) {
    for (const error of result.errors) {
      console.log(`    \x1b[31mERROR:\x1b[0m ${error}`);
    }
  }

  if (verbose) {
    for (const warning of result.warnings) {
      console.log(`    \x1b[33mWARN:\x1b[0m ${warning}`);
    }
    console.log(`    Checks passed: ${result.checks.join(', ')}`);
  }
}

function printUsage() {
  console.log('verify-source.js - Verify evidence integrity');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/verify-source.js <source_id> <case_dir>   Verify single source');
  console.log('  node scripts/verify-source.js --all <case_dir>        Verify all sources');
  console.log('  node scripts/verify-source.js --check-article <case_dir>  Verify cited sources');
  console.log('');
  console.log('Options:');
  console.log('  --verbose, -v    Show detailed output');
  console.log('  --json           Output as JSON');
  console.log('');
  console.log('Exit codes:');
  console.log('  0 - All verified');
  console.log('  1 - Verification failures');
  console.log('  2 - Usage error');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(args.length === 0 ? 2 : 0);
  }

  const verbose = args.includes('--verbose') || args.includes('-v');
  const jsonOutput = args.includes('--json');
  const filteredArgs = args.filter(a => !a.startsWith('-'));

  let result;

  if (args.includes('--all')) {
    const caseDir = filteredArgs[0];
    if (!caseDir) {
      console.error('Error: case_dir required');
      process.exit(2);
    }

    result = verifyAllSources(caseDir);

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\nVerifying all sources in ${caseDir}/evidence/\n`);
      for (const r of result.sources) {
        printResult(r, verbose);
      }
      console.log(`\n${result.summary.valid}/${result.summary.total} sources verified`);
    }

    process.exit(result.summary.invalid > 0 ? 1 : 0);

  } else if (args.includes('--check-article')) {
    const caseDir = filteredArgs[0];
    if (!caseDir) {
      console.error('Error: case_dir required');
      process.exit(2);
    }

    result = verifyArticleSources(caseDir);

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\nVerifying sources cited in ${caseDir}/articles/full.md\n`);
      console.log(`Cited sources: ${result.cited.join(', ') || '(none)'}\n`);

      for (const r of result.results) {
        printResult(r, verbose);
      }

      const s = result.summary;
      console.log(`\n${s.verified}/${s.cited} sources verified`);
      if (s.failed > 0) console.log(`  ${s.failed} failed verification`);
      if (s.missing > 0) console.log(`  ${s.missing} missing evidence`);
    }

    process.exit(result.summary.failed > 0 || result.summary.missing > 0 ? 1 : 0);

  } else {
    const sourceId = filteredArgs[0];
    const caseDir = filteredArgs[1];

    if (!sourceId || !caseDir) {
      console.error('Error: source_id and case_dir required');
      process.exit(2);
    }

    result = verifySource(sourceId, caseDir);

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printResult(result, verbose || !result.valid);
    }

    process.exit(result.valid ? 0 : 1);
  }
}

// Export for programmatic use
module.exports = { verifySource, verifyAllSources, verifyArticleSources };

if (require.main === module) {
  main().catch(err => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(2);
  });
}
