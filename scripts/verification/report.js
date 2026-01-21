/**
 * report.js - Generate human-readable verification report
 *
 * Produces a markdown report from verification state that:
 * - Summarizes overall verification status
 * - Lists all blocking issues with context
 * - Provides actionable fix suggestions
 * - Shows chain hash for audit trail
 */

'use strict';

const CONST = require('./constants');

/**
 * Generate markdown report from verification state
 * @param {object} state - Verification state from pipeline
 * @returns {string} - Markdown report
 */
function generateReport(state) {
  const lines = [];

  // Header
  lines.push('# Verification Report');
  lines.push('');
  lines.push(`**Case:** ${state.case_id}`);
  lines.push(`**Generated:** ${state.generated_at}`);
  lines.push(`**Duration:** ${state.duration_ms}ms`);
  lines.push(`**Pipeline Version:** ${state.version}`);
  lines.push('');

  // Final Status Banner
  lines.push('---');
  lines.push('');
  const statusEmoji = getStatusEmoji(state.final_status);
  lines.push(`## ${statusEmoji} Final Status: ${state.final_status}`);
  lines.push('');

  // Article Info
  if (state.article) {
    lines.push('### Article');
    lines.push('');
    lines.push(`- **Path:** \`${state.article.path}\``);
    lines.push(`- **Words:** ${state.article.word_count.toLocaleString()}`);
    lines.push(`- **Citations:** ${state.article.citation_count}`);
    lines.push(`- **Hash:** \`${state.article.hash.substring(0, 40)}...\``);
    lines.push('');
  }

  // Summary Stats
  lines.push('### Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Steps Passed | ${state.summary.steps_passed} |`);
  lines.push(`| Steps Warned | ${state.summary.steps_warned} |`);
  lines.push(`| Steps Failed | ${state.summary.steps_failed} |`);
  lines.push(`| Steps Skipped | ${state.summary.steps_skipped} |`);
  lines.push(`| **Total Steps** | ${state.summary.total_steps} |`);
  lines.push('');

  // Pipeline Results
  lines.push('---');
  lines.push('');
  lines.push('## Pipeline Results');
  lines.push('');

  for (const step of state.pipeline) {
    const stepEmoji = getStepEmoji(step.status);
    const duration = step.duration_ms ? ` (${step.duration_ms}ms)` : '';

    lines.push(`### ${step.step}. ${step.name.toUpperCase()} ${stepEmoji}${duration}`);
    lines.push('');
    lines.push(`**Status:** ${step.status.toUpperCase()}`);
    lines.push('');

    // Metrics
    if (step.metrics && Object.keys(step.metrics).length > 0) {
      lines.push('**Metrics:**');
      lines.push('');
      for (const [key, value] of Object.entries(step.metrics)) {
        if (value > 0 || isImportantMetric(key)) {
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          lines.push(`- ${label}: ${value}`);
        }
      }
      lines.push('');
    }

    // Step-specific issues
    const stepIssues = state.blocking_issues.filter(i => i.step === step.name);
    if (stepIssues.length > 0) {
      lines.push('**Issues:**');
      lines.push('');
      for (const issue of stepIssues) {
        lines.push(`- ❌ **${issue.type}**: ${issue.message}`);
        if (issue.sourceId) {
          lines.push(`  - Source: ${issue.sourceId}`);
        }
        if (issue.details) {
          lines.push(`  - Details: \`${JSON.stringify(issue.details).substring(0, 100)}...\``);
        }
      }
      lines.push('');
    }

    // Step-specific warnings
    const stepWarnings = state.warnings.filter(w => w.step === step.name);
    if (stepWarnings.length > 0) {
      lines.push('**Warnings:**');
      lines.push('');
      for (const warning of stepWarnings) {
        lines.push(`- ⚠️ ${warning.type}: ${warning.message}`);
      }
      lines.push('');
    }
  }

  // Blocking Issues Summary
  if (state.blocking_issues.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## ❌ Blocking Issues');
    lines.push('');
    lines.push('The following issues MUST be fixed before the article can be published:');
    lines.push('');

    // Group by type
    const byType = groupByType(state.blocking_issues);
    for (const [type, issues] of Object.entries(byType)) {
      lines.push(`### ${type} (${issues.length})`);
      lines.push('');

      for (const issue of issues.slice(0, 10)) {
        lines.push(`1. **[${issue.step}]** ${issue.message}`);
        if (issue.sourceId) {
          lines.push(`   - Source: \`${issue.sourceId}\``);
        }
        if (issue.claim) {
          lines.push(`   - Claim: "${issue.claim}"`);
        }
        if (issue.context) {
          lines.push(`   - Context: "${issue.context.substring(0, 80)}..."`);
        }
        lines.push('');
      }

      if (issues.length > 10) {
        lines.push(`*...and ${issues.length - 10} more ${type} issues*`);
        lines.push('');
      }

      // Add fix suggestion
      const fix = getFixSuggestion(type);
      if (fix) {
        lines.push(`**Fix:** ${fix}`);
        lines.push('');
      }
    }
  }

  // Warnings Summary
  if (state.warnings.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## ⚠️ Warnings');
    lines.push('');
    lines.push('These items should be reviewed but do not block publication:');
    lines.push('');

    for (const warning of state.warnings.slice(0, 20)) {
      lines.push(`- **[${warning.step}]** ${warning.type}: ${warning.message}`);
    }

    if (state.warnings.length > 20) {
      lines.push(`\n*...and ${state.warnings.length - 20} more warnings*`);
    }
    lines.push('');
  }

  // Audit Trail
  lines.push('---');
  lines.push('');
  lines.push('## 🔐 Audit Trail');
  lines.push('');
  lines.push('This verification run produced a cryptographic chain hash that proves:');
  lines.push('1. All 5 steps were run in order');
  lines.push('2. Each step\'s output was included in the chain');
  lines.push('3. The article content matched what was verified');
  lines.push('');
  lines.push('**Chain Hash:**');
  lines.push('```');
  lines.push(state.chain_hash);
  lines.push('```');
  lines.push('');
  lines.push('*To verify: re-run the pipeline and compare chain hashes. If they differ, either the article or sources have changed.*');
  lines.push('');

  // Step Hashes
  lines.push('### Step Hashes');
  lines.push('');
  lines.push('| Step | Hash |');
  lines.push('|------|------|');
  for (const step of state.pipeline) {
    if (step.step_hash) {
      lines.push(`| ${step.step}. ${step.name} | \`${step.step_hash.substring(0, 20)}...\` |`);
    } else {
      lines.push(`| ${step.step}. ${step.name} | *(skipped)* |`);
    }
  }
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Report generated by Unified Verification Pipeline v${state.version}*`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Get emoji for final status
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'VERIFIED': return '✅';
    case 'NEEDS_REVIEW': return '⚠️';
    case 'FAILED': return '❌';
    case 'INCOMPLETE': return '⏳';
    default: return '❓';
  }
}

/**
 * Get emoji for step status
 */
function getStepEmoji(status) {
  switch (status) {
    case 'pass': return '✅';
    case 'warn': return '⚠️';
    case 'fail': return '❌';
    case 'error': return '💥';
    case 'skipped': return '⏭️';
    default: return '❓';
  }
}

/**
 * Check if metric should always be shown
 */
function isImportantMetric(key) {
  const important = [
    'sources_verified',
    'citations_verified',
    'claims_checked',
    'numbers_extracted'
  ];
  return important.includes(key);
}

/**
 * Group issues by type
 */
function groupByType(issues) {
  const grouped = {};
  for (const issue of issues) {
    if (!grouped[issue.type]) {
      grouped[issue.type] = [];
    }
    grouped[issue.type].push(issue);
  }
  return grouped;
}

/**
 * Get fix suggestion for issue type
 */
function getFixSuggestion(type) {
  const suggestions = {
    'SOURCE_NOT_CAPTURED': 'Run `/capture-source` for each missing source, or remove the citation from the article.',
    'NOT_IN_SOURCES_JSON': 'The citation exists in article but source is not registered. Run `/capture-source` to properly capture it.',
    'EVIDENCE_DIR_MISSING': 'Source was registered but not captured. Re-run `/capture-source` for the source URL.',
    'MISSING_SIGNATURE': 'Source may have been manually created. Re-capture using `/capture-source` to get proper verification.',
    'HASH_MISMATCH': 'Source content has been modified since capture. Re-capture to get fresh content.',
    'FABRICATION_DETECTED': 'Source appears to be manually created or synthesized. Replace with actual captured source.',
    'URL_MISMATCH': 'Citation URL, sources.json URL, and metadata.json URL must match. Update the mismatched URLs to point to the same resource.',
    'ORPHAN_CITATION': 'Citation references a source not in sources.json. Either add the source or remove the citation.',
    'CLAIM_NOT_SUPPORTED': 'The cited source does not contain evidence for this claim. Find a source that does, or rephrase/caveat the claim.',
    'STATISTIC_MISMATCH': 'The number in the article does not match the source. Verify the correct number and update the article.',
    'ARTICLE_MISSING': 'No article found at articles/full.md. Generate the article before running verification.',
    'SOURCES_JSON_MISSING': 'No sources.json found. Ensure sources have been captured before verification.'
  };

  return suggestions[type] || null;
}

/**
 * Generate a quick summary line for console output
 * @param {object} state - Verification state
 * @returns {string} - One-line summary
 */
function generateSummaryLine(state) {
  const { steps_passed, steps_failed, steps_warned, steps_skipped } = state.summary;
  const issues = state.blocking_issues.length;
  const warnings = state.warnings.length;

  return `${state.final_status}: ${steps_passed} passed, ${steps_failed} failed, ${steps_warned} warned, ${steps_skipped} skipped | ${issues} blocking, ${warnings} warnings`;
}

module.exports = { generateReport, generateSummaryLine };
