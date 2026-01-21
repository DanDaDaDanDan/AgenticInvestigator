/**
 * report.js - Generate Verification Reports
 *
 * Produces human-readable and machine-readable reports from verification results.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Generate markdown verification report
 *
 * @param {object} verification - Results from verifyArticle or verifyAndFix
 * @returns {string} - Markdown report
 */
function generateMarkdownReport(verification) {
  const lines = [];

  // Header
  lines.push('# Claim Verification Report');
  lines.push('');
  lines.push(`**Generated:** ${verification.verifiedAt}`);
  lines.push(`**Article:** ${verification.articlePath}`);
  lines.push(`**Status:** ${getStatusEmoji(verification.status)} ${verification.status}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Total claims | ${verification.summary.total} |`);
  lines.push(`| Verified | ${verification.summary.verified} |`);
  lines.push(`| Unverified | ${verification.summary.unverified} |`);
  lines.push(`| Source mismatch | ${verification.summary.sourceMismatch} |`);
  lines.push('');

  // Match type breakdown
  if (Object.keys(verification.summary.byMatchType).length > 0) {
    lines.push('### Match Types');
    lines.push('');
    for (const [type, count] of Object.entries(verification.summary.byMatchType)) {
      lines.push(`- ${type}: ${count}`);
    }
    lines.push('');
  }

  // Verified claims (collapsed by default in markdown)
  if (verification.verified.length > 0) {
    lines.push('## Verified Claims');
    lines.push('');
    lines.push('<details>');
    lines.push('<summary>Click to expand verified claims</summary>');
    lines.push('');

    for (const v of verification.verified) {
      lines.push(`### Line ${v.articleClaim.line}`);
      lines.push('');
      lines.push(`> ${v.articleClaim.text}`);
      lines.push('');
      lines.push(`- **Match type:** ${v.matchType}`);
      lines.push(`- **Score:** ${(v.score * 100).toFixed(0)}%`);
      lines.push(`- **Registry claim:** ${v.registryClaim.id}`);
      lines.push(`- **Source:** ${v.registryClaim.sourceId}`);
      lines.push('');
    }

    lines.push('</details>');
    lines.push('');
  }

  // Unverified claims
  if (verification.unverified.length > 0) {
    lines.push('## Unverified Claims');
    lines.push('');
    lines.push('These claims could not be matched to any registered claim.');
    lines.push('');

    for (const u of verification.unverified) {
      lines.push(`### Line ${u.articleClaim.line}`);
      lines.push('');
      lines.push(`> ${u.articleClaim.text}`);
      lines.push('');
      lines.push(`- **Cited sources:** ${u.articleClaim.sourceIds.join(', ') || 'none'}`);

      if (u.articleClaim.numbers.length > 0) {
        const nums = u.articleClaim.numbers
          .map(n => `${n.value} ${n.unit || ''}`)
          .join(', ');
        lines.push(`- **Numbers in claim:** ${nums}`);
      }

      lines.push('');

      // Add fix suggestions if available
      if (verification.fixSuggestions) {
        const suggestion = verification.fixSuggestions.find(
          s => s.claim.line === u.articleClaim.line
        );

        if (suggestion) {
          lines.push('**Fix options:**');
          lines.push('');

          for (const opt of suggestion.options) {
            lines.push(`1. **${opt.action}**: ${opt.description}`);

            if (opt.candidates) {
              lines.push('   - Similar claims in registry:');
              for (const c of opt.candidates) {
                lines.push(`     - [${c.id}] "${c.text}" (${c.similarity})`);
              }
            }

            if (opt.searchQuery) {
              lines.push(`   - Search query: \`${opt.searchQuery}\``);
            }
          }
          lines.push('');
        }
      }
    }
  }

  // Source mismatches
  if (verification.mismatched.length > 0) {
    lines.push('## Source Mismatches');
    lines.push('');
    lines.push('These claims were found in the registry but cited a different source.');
    lines.push('');

    for (const m of verification.mismatched) {
      lines.push(`### Line ${m.articleClaim.line}`);
      lines.push('');
      lines.push(`> ${m.articleClaim.text}`);
      lines.push('');
      lines.push(`- **Article cites:** ${m.articleClaim.sourceIds.join(', ')}`);
      lines.push(`- **Registry claim from:** ${m.registryClaim.sourceId}`);
      lines.push(`- **Registry claim ID:** ${m.registryClaim.id}`);
      lines.push('');
      lines.push('**Fix:** Update the citation to reference the correct source.');
      lines.push('');
    }
  }

  // Search prompts for unverified claims
  if (verification.searchPrompts && verification.searchPrompts.length > 0) {
    lines.push('## Source Search Guidance');
    lines.push('');
    lines.push('Use these search queries to find sources for unverified claims:');
    lines.push('');

    for (const sp of verification.searchPrompts) {
      lines.push(`### "${sp.claim.substring(0, 60)}..."`);
      lines.push('');
      lines.push('```');
      lines.push(sp.mcp_search_prompt);
      lines.push('```');
      lines.push('');
    }
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*Report generated by Claim Verification System*');

  return lines.join('\n');
}

/**
 * Get status emoji
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'VERIFIED': return '✅';
    case 'UNVERIFIED_CLAIMS': return '❌';
    case 'MISMATCHED_CLAIMS': return '⚠️';
    case 'MULTIPLE_ISSUES': return '🚨';
    default: return '❓';
  }
}

/**
 * Generate JSON report (for programmatic use)
 *
 * @param {object} verification - Results from verifyArticle
 * @returns {object} - Structured report
 */
function generateJsonReport(verification) {
  return {
    meta: {
      generated_at: verification.verifiedAt,
      article_path: verification.articlePath,
      status: verification.status
    },
    summary: verification.summary,
    claims: {
      verified: verification.verified.map(v => ({
        line: v.articleClaim.line,
        text: v.articleClaim.text,
        registry_claim_id: v.registryClaim.id,
        source_id: v.registryClaim.sourceId,
        match_type: v.matchType,
        score: v.score
      })),
      unverified: verification.unverified.map(u => ({
        line: u.articleClaim.line,
        text: u.articleClaim.text,
        cited_sources: u.articleClaim.sourceIds,
        numbers: u.articleClaim.numbers
      })),
      mismatched: verification.mismatched.map(m => ({
        line: m.articleClaim.line,
        text: m.articleClaim.text,
        cited_sources: m.articleClaim.sourceIds,
        registry_source: m.registryClaim.sourceId,
        registry_claim_id: m.registryClaim.id
      }))
    },
    fix_suggestions: verification.fixSuggestions || [],
    search_prompts: verification.searchPrompts || []
  };
}

/**
 * Save verification report to case directory
 *
 * @param {string} caseDir - Case directory
 * @param {object} verification - Verification results
 * @param {object} options - Options
 */
function saveReport(caseDir, verification, options = {}) {
  // Save markdown report
  const mdReport = generateMarkdownReport(verification);
  const mdPath = path.join(caseDir, 'claim-verification-report.md');
  fs.writeFileSync(mdPath, mdReport);

  // Save JSON report
  const jsonReport = generateJsonReport(verification);
  const jsonPath = path.join(caseDir, 'claim-verification.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));

  return { mdPath, jsonPath };
}

/**
 * Generate summary line for console output
 */
function generateSummaryLine(verification) {
  const s = verification.summary;
  const emoji = getStatusEmoji(verification.status);
  return `${emoji} ${verification.status}: ${s.verified}/${s.total} verified, ${s.unverified} unverified, ${s.sourceMismatch} mismatched`;
}

module.exports = {
  generateMarkdownReport,
  generateJsonReport,
  saveReport,
  generateSummaryLine
};
