#!/usr/bin/env node
/**
 * audit-sources.js - Audit source integrity for a case
 *
 * Checks for inconsistencies between:
 * - sources.json (claimed sources)
 * - evidence/ directory (actual captured content)
 * - claims.json (extracted claims)
 *
 * Reports:
 * - Sources marked captured but missing evidence
 * - Evidence directories with no source entry
 * - Duplicate URLs across sources
 * - Low-quality content (404s, nav pages)
 * - Sources with no extracted claims
 *
 * Usage:
 *   node scripts/audit-sources.js <case-dir> [options]
 *
 * Options:
 *   --json           Output as JSON
 *   --fix            Attempt to fix issues (update sources.json)
 *   --verbose        Show detailed information
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { normalizeUrl } = require('./osint-save');

/**
 * Content quality patterns that indicate low-value or problematic content
 */
const LOW_VALUE_PATTERNS = {
  // 404 and error pages - must be prominent/repeated
  error404: /^(?:[\s\S]{0,200}(?:404|page not found|the resource you are looking for has been removed)|(?:404|not found|error)[.\s\n]*(?:404|not found|error))/im,

  // Navigation/index pages - skip to content appearing multiple times indicates nav page
  navigation: /skip to (?:main )?content[\s\S]{0,500}skip to (?:main )?content/is,

  // Login/paywall pages - only match if in first 500 chars (not just mentioned in article)
  paywall: /^[\s\S]{0,500}(?:sign in to continue|subscribe to read|login required|please log in|create an account to)/i,

  // Empty or minimal content
  minimal: /^[\s\n]*$/,

  // Cookie/GDPR consent walls - only match if dominating first part of content
  consentWall: /^[\s\S]{0,300}(?:we use cookies|accept all cookies|cookie preferences|manage consent)/i
};

/**
 * Check if content is substantive enough for claim extraction
 *
 * @param {string} content - Source content to evaluate
 * @returns {object} - {isSubstantive: boolean, contentType: string, reason?: string}
 */
function evaluateContentQuality(content) {
  if (!content) {
    return { isSubstantive: false, contentType: 'empty', reason: 'No content provided' };
  }

  // Check minimum word count
  const words = content.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 50) {
    return { isSubstantive: false, contentType: 'minimal', reason: `Only ${words.length} words (minimum: 50)` };
  }

  // Check for 404/error page patterns
  const isError = LOW_VALUE_PATTERNS.error404.test(content);
  if (isError && words.length < 300) {
    return { isSubstantive: false, contentType: 'error', reason: '404 or error page detected' };
  }

  // Check for navigation-only pages
  if (LOW_VALUE_PATTERNS.navigation.test(content)) {
    const linkCount = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 100);
    if (linkCount > 10 && paragraphs.length < 3) {
      return { isSubstantive: false, contentType: 'navigation', reason: 'Navigation/index page detected' };
    }
  }

  // Check for paywall/login wall
  if (LOW_VALUE_PATTERNS.paywall.test(content) && words.length < 200) {
    return { isSubstantive: false, contentType: 'paywall', reason: 'Paywall or login required' };
  }

  // Check for cookie consent wall dominating content
  const consentMatches = content.match(LOW_VALUE_PATTERNS.consentWall);
  if (consentMatches && words.length < 150) {
    return { isSubstantive: false, contentType: 'consent_wall', reason: 'Cookie/consent wall detected' };
  }

  // Content passes quality checks
  return {
    isSubstantive: true,
    contentType: 'article',
    stats: {
      wordCount: words.length,
      paragraphCount: content.split(/\n\n+/).filter(p => p.trim().length > 50).length
    }
  };
}

/**
 * Load sources.json for a case
 */
function loadSources(caseDir) {
  const sourcesPath = path.join(caseDir, 'sources.json');
  if (!fs.existsSync(sourcesPath)) {
    return { sources: [] };
  }
  return JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
}

/**
 * Load claims.json for a case
 */
function loadClaims(caseDir) {
  const claimsPath = path.join(caseDir, 'claims.json');
  if (!fs.existsSync(claimsPath)) {
    return { claims: [] };
  }
  return JSON.parse(fs.readFileSync(claimsPath, 'utf-8'));
}

/**
 * Get list of evidence directories
 */
function getEvidenceDirectories(caseDir) {
  const evidenceDir = path.join(caseDir, 'evidence');
  if (!fs.existsSync(evidenceDir)) {
    return [];
  }

  return fs.readdirSync(evidenceDir)
    .filter(name => name.match(/^S\d{3}$/))
    .sort();
}

/**
 * Check if evidence directory has required files
 */
function checkEvidenceCompleteness(evidenceDir) {
  const requiredFiles = ['metadata.json', 'content.md'];
  const optionalFiles = ['raw.html', 'links.json', 'claim-support.json'];

  const result = {
    path: evidenceDir,
    hasRequiredFiles: true,
    missingRequired: [],
    hasOptionalFiles: [],
    missingOptional: []
  };

  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(evidenceDir, file))) {
      result.hasRequiredFiles = false;
      result.missingRequired.push(file);
    }
  }

  for (const file of optionalFiles) {
    if (fs.existsSync(path.join(evidenceDir, file))) {
      result.hasOptionalFiles.push(file);
    } else {
      result.missingOptional.push(file);
    }
  }

  return result;
}

/**
 * Audit a case for source integrity issues
 */
function auditCase(caseDir, options = {}) {
  const { verbose = false } = options;

  const sourcesData = loadSources(caseDir);
  const claimsData = loadClaims(caseDir);
  const evidenceDirs = getEvidenceDirectories(caseDir);

  const sources = sourcesData.sources || [];
  const claims = claimsData.claims || [];

  // Build lookup maps
  const sourceById = new Map(sources.map(s => [s.id, s]));
  const claimsBySource = new Map();
  for (const claim of claims) {
    if (!claimsBySource.has(claim.sourceId)) {
      claimsBySource.set(claim.sourceId, []);
    }
    claimsBySource.get(claim.sourceId).push(claim);
  }

  const issues = {
    missingEvidence: [],      // Sources marked captured but no evidence dir
    orphanedEvidence: [],     // Evidence dirs with no source entry
    duplicateUrls: [],        // Multiple sources with same URL
    lowQualityContent: [],    // 404s, nav pages, paywalls
    incompleteEvidence: [],   // Missing required files
    noClaims: [],             // Sources with no extracted claims
    capturedFlagMismatch: []  // captured: true but evidence missing, or vice versa
  };

  // Check for duplicate URLs
  const urlMap = new Map();
  for (const source of sources) {
    if (!source.url) continue;

    const normalized = normalizeUrl(source.url);
    if (urlMap.has(normalized)) {
      issues.duplicateUrls.push({
        url: source.url,
        normalizedUrl: normalized,
        sources: [urlMap.get(normalized), source.id]
      });
    } else {
      urlMap.set(normalized, source.id);
    }
  }

  // Check each source in sources.json
  for (const source of sources) {
    const evidenceDir = path.join(caseDir, 'evidence', source.id);
    const hasEvidence = fs.existsSync(evidenceDir);

    // Check captured flag consistency
    if (source.captured && !hasEvidence) {
      issues.missingEvidence.push({
        id: source.id,
        title: source.title,
        url: source.url,
        reason: 'Marked as captured but no evidence directory'
      });
      issues.capturedFlagMismatch.push({
        id: source.id,
        expected: 'evidence directory',
        actual: 'missing'
      });
    }

    if (!source.captured && hasEvidence) {
      issues.capturedFlagMismatch.push({
        id: source.id,
        expected: 'captured: false',
        actual: 'evidence directory exists'
      });
    }

    // Check evidence completeness
    if (hasEvidence) {
      const completeness = checkEvidenceCompleteness(evidenceDir);
      if (!completeness.hasRequiredFiles) {
        issues.incompleteEvidence.push({
          id: source.id,
          title: source.title,
          missingFiles: completeness.missingRequired
        });
      }

      // Check content quality
      const contentPath = path.join(evidenceDir, 'content.md');
      if (fs.existsSync(contentPath)) {
        const content = fs.readFileSync(contentPath, 'utf-8');
        const quality = evaluateContentQuality(content);

        if (!quality.isSubstantive) {
          issues.lowQualityContent.push({
            id: source.id,
            title: source.title,
            contentType: quality.contentType,
            reason: quality.reason
          });
        }
      }
    }

    // Check for extracted claims
    if (source.captured && !claimsBySource.has(source.id)) {
      issues.noClaims.push({
        id: source.id,
        title: source.title,
        url: source.url
      });
    }
  }

  // Check for orphaned evidence directories
  const sourceIds = new Set(sources.map(s => s.id));
  for (const dir of evidenceDirs) {
    if (!sourceIds.has(dir)) {
      issues.orphanedEvidence.push({
        id: dir,
        path: path.join(caseDir, 'evidence', dir)
      });
    }
  }

  // Calculate summary
  const summary = {
    totalSources: sources.length,
    capturedSources: sources.filter(s => s.captured).length,
    evidenceDirectories: evidenceDirs.length,
    totalClaims: claims.length,
    sourcesWithClaims: claimsBySource.size,
    issues: {
      missingEvidence: issues.missingEvidence.length,
      orphanedEvidence: issues.orphanedEvidence.length,
      duplicateUrls: issues.duplicateUrls.length,
      lowQualityContent: issues.lowQualityContent.length,
      incompleteEvidence: issues.incompleteEvidence.length,
      noClaims: issues.noClaims.length,
      capturedFlagMismatch: issues.capturedFlagMismatch.length
    },
    totalIssues: Object.values(issues).reduce((sum, arr) => sum + arr.length, 0)
  };

  return {
    caseDir,
    auditedAt: new Date().toISOString(),
    summary,
    issues
  };
}

/**
 * Attempt to fix detected issues
 */
function fixIssues(caseDir, audit, options = {}) {
  const { dryRun = false } = options;
  const fixes = [];

  const sourcesPath = path.join(caseDir, 'sources.json');
  const sourcesData = loadSources(caseDir);
  const sources = sourcesData.sources || [];
  let modified = false;

  // Fix captured flag mismatches
  for (const mismatch of audit.issues.capturedFlagMismatch) {
    const source = sources.find(s => s.id === mismatch.id);
    if (!source) continue;

    if (mismatch.actual === 'missing') {
      // Evidence missing - set captured to false
      if (!dryRun) {
        source.captured = false;
        modified = true;
      }
      fixes.push({
        action: 'SET_CAPTURED_FALSE',
        sourceId: mismatch.id,
        reason: 'No evidence directory found'
      });
    } else if (mismatch.actual === 'evidence directory exists') {
      // Evidence exists - set captured to true
      if (!dryRun) {
        source.captured = true;
        modified = true;
      }
      fixes.push({
        action: 'SET_CAPTURED_TRUE',
        sourceId: mismatch.id,
        reason: 'Evidence directory found'
      });
    }
  }

  // Save changes if not dry run
  if (modified && !dryRun) {
    fs.writeFileSync(sourcesPath, JSON.stringify(sourcesData, null, 2));
  }

  return {
    fixes,
    modified,
    dryRun
  };
}

/**
 * Generate human-readable report
 */
function generateReport(audit) {
  const lines = [];

  lines.push('='.repeat(60));
  lines.push('SOURCE AUDIT REPORT');
  lines.push('='.repeat(60));

  lines.push(`\nCase: ${audit.caseDir}`);
  lines.push(`Audited at: ${audit.auditedAt}`);

  lines.push('\n--- SUMMARY ---');
  lines.push(`Total sources: ${audit.summary.totalSources}`);
  lines.push(`Captured sources: ${audit.summary.capturedSources}`);
  lines.push(`Evidence directories: ${audit.summary.evidenceDirectories}`);
  lines.push(`Total claims: ${audit.summary.totalClaims}`);
  lines.push(`Sources with claims: ${audit.summary.sourcesWithClaims}`);
  lines.push(`Total issues: ${audit.summary.totalIssues}`);

  if (audit.summary.totalIssues > 0) {
    lines.push('\n--- ISSUES ---');

    if (audit.issues.missingEvidence.length > 0) {
      lines.push(`\n[MISSING EVIDENCE] (${audit.issues.missingEvidence.length})`);
      for (const issue of audit.issues.missingEvidence) {
        lines.push(`  ${issue.id}: ${issue.title}`);
        lines.push(`    URL: ${issue.url}`);
      }
    }

    if (audit.issues.orphanedEvidence.length > 0) {
      lines.push(`\n[ORPHANED EVIDENCE] (${audit.issues.orphanedEvidence.length})`);
      for (const issue of audit.issues.orphanedEvidence) {
        lines.push(`  ${issue.id}: No entry in sources.json`);
      }
    }

    if (audit.issues.duplicateUrls.length > 0) {
      lines.push(`\n[DUPLICATE URLs] (${audit.issues.duplicateUrls.length})`);
      for (const issue of audit.issues.duplicateUrls) {
        lines.push(`  ${issue.sources.join(' & ')}: ${issue.url}`);
      }
    }

    if (audit.issues.lowQualityContent.length > 0) {
      lines.push(`\n[LOW QUALITY CONTENT] (${audit.issues.lowQualityContent.length})`);
      for (const issue of audit.issues.lowQualityContent) {
        lines.push(`  ${issue.id}: ${issue.contentType} - ${issue.reason}`);
      }
    }

    if (audit.issues.incompleteEvidence.length > 0) {
      lines.push(`\n[INCOMPLETE EVIDENCE] (${audit.issues.incompleteEvidence.length})`);
      for (const issue of audit.issues.incompleteEvidence) {
        lines.push(`  ${issue.id}: Missing ${issue.missingFiles.join(', ')}`);
      }
    }

    if (audit.issues.noClaims.length > 0) {
      lines.push(`\n[NO EXTRACTED CLAIMS] (${audit.issues.noClaims.length})`);
      for (const issue of audit.issues.noClaims.slice(0, 20)) {
        lines.push(`  ${issue.id}: ${issue.title || issue.url}`);
      }
      if (audit.issues.noClaims.length > 20) {
        lines.push(`  ... and ${audit.issues.noClaims.length - 20} more`);
      }
    }
  } else {
    lines.push('\n✓ No issues found');
  }

  lines.push('\n' + '='.repeat(60));

  return lines.join('\n');
}

/**
 * CLI entry point
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/audit-sources.js <case-dir> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --json      Output as JSON');
    console.log('  --fix       Attempt to fix issues');
    console.log('  --dry-run   Show what --fix would do without making changes');
    console.log('  --verbose   Show detailed information');
    process.exit(args.length < 1 ? 1 : 0);
  }

  const caseDir = args[0];

  if (!fs.existsSync(caseDir)) {
    console.error(`Case directory not found: ${caseDir}`);
    process.exit(1);
  }

  const options = {
    json: args.includes('--json'),
    fix: args.includes('--fix'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose')
  };

  // Run audit
  const audit = auditCase(caseDir, options);

  // Fix if requested
  let fixResult = null;
  if (options.fix || options.dryRun) {
    fixResult = fixIssues(caseDir, audit, { dryRun: options.dryRun });
  }

  // Output
  if (options.json) {
    console.log(JSON.stringify({ audit, fixResult }, null, 2));
  } else {
    console.log(generateReport(audit));

    if (fixResult) {
      console.log('\n--- FIXES ---');
      if (fixResult.fixes.length === 0) {
        console.log('No automatic fixes available');
      } else {
        for (const fix of fixResult.fixes) {
          console.log(`  ${fix.action}: ${fix.sourceId} - ${fix.reason}`);
        }
        if (fixResult.dryRun) {
          console.log('\n(Dry run - no changes made)');
        } else {
          console.log(`\n${fixResult.fixes.length} fixes applied`);
        }
      }
    }
  }

  // Exit code based on issues
  process.exit(audit.summary.totalIssues > 0 ? 1 : 0);
}

// Export for programmatic use
module.exports = { auditCase, fixIssues, generateReport };

if (require.main === module) {
  main();
}
